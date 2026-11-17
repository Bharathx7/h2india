import { schema, type Database } from "@h2india/db";
import { and, eq, inArray, isNull } from "drizzle-orm";
import type { Actor } from "../authz/actor";
import { assertCan } from "../authz/can";
import { Money } from "../money";
import { must } from "../must";
import { viewCart } from "./cart";
import { approvalRoute } from "./flow";
import { OrderError } from "./records";

// Checkout (step 10.2): four steps, Delivery (80:6431), Billing (768:47189), Payment (80:6464) and Review (80:6687).
// The choices are kept on the cart between steps; the order is placed only from Review, priced again on the server.

export const PAYMENT_METHODS = ["bank_transfer", "online", "pay_later", "letter_of_credit"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export interface CheckoutChoices {
  deliverySiteId?: string | null;
  receiverName?: string | null;
  receiverMobile?: string | null;
  billingGstinId?: string | null;
  poNumber?: string | null;
  poFileId?: string | null;
  paymentMethod?: PaymentMethod | null;
}

async function cartRow(db: Database, organisationId: string, userId: string) {
  const [cart] = await db
    .select()
    .from(schema.carts)
    .where(and(eq(schema.carts.organisationId, organisationId), eq(schema.carts.userId, userId)));
  return cart ?? null;
}

/** What every checkout step shows: the cart, the company's sites and GSTINs, the saved choices, and approvals. */
export async function checkoutView(db: Database, actor: Actor, organisationId: string) {
  assertCan(actor, "order.place", { organisationId });
  const userId = must(actor.userId);
  const cart = await viewCart(db, actor, organisationId);
  const row = await cartRow(db, organisationId, userId);
  const sites = await db
    .select()
    .from(schema.deliverySites)
    .where(eq(schema.deliverySites.organisationId, organisationId));
  const gstins = await db
    .select()
    .from(schema.organisationGstins)
    .where(
      and(eq(schema.organisationGstins.organisationId, organisationId), isNull(schema.organisationGstins.retiredAt)),
    );
  const [org] = await db.select().from(schema.organisations).where(eq(schema.organisations.id, organisationId));
  const route = cart.totalPaise > 0n ? await approvalRoute(db, organisationId, userId, cart.totalPaise) : [];
  const ids = [...new Set(route.flatMap((r) => r.approverIds))];
  const approvers = ids.length
    ? await db
        .select({ id: schema.users.id, name: schema.users.name })
        .from(schema.users)
        .where(inArray(schema.users.id, ids))
    : [];
  const [seat] = await db
    .select({ limit: schema.memberships.orderLimitPaise })
    .from(schema.memberships)
    .where(and(eq(schema.memberships.organisationId, organisationId), eq(schema.memberships.userId, userId)));
  const site = sites.find((x) => x.id === row?.deliverySiteId) ?? sites.find((x) => x.isDefault) ?? sites[0] ?? null;
  const gstinOf = (id: string | null | undefined) => gstins.find((g) => g.id === id) ?? null;
  const choices = {
    deliverySiteId: site?.id ?? null,
    receiverName: row?.receiverName ?? site?.contacts[0]?.name ?? null,
    receiverMobile: row?.receiverMobile ?? site?.contacts[0]?.mobile ?? null,
    billingGstinId:
      row?.billingGstinId ??
      site?.gstinId ??
      gstins.find((g) => g.isDefault && g.portalStatus === "Active")?.id ??
      null,
    poNumber: row?.poNumber ?? null,
    poFileId: row?.poFileId ?? null,
    paymentMethod: (row?.paymentMethod as PaymentMethod | null | undefined) ?? null,
  };
  return {
    cart,
    company: { legalName: org?.legalName ?? "", address: org?.registeredAddress ?? null, state: org?.state ?? null },
    sites: sites.map((x) => ({
      id: x.id,
      name: x.name,
      address: [x.address, x.city, x.state, x.pincode].filter(Boolean).join(", "),
      state: x.state,
      gstin: gstinOf(x.gstinId)?.gstin ?? null,
      hours: x.hours,
      contacts: x.contacts,
    })),
    gstins: gstins.map((g) => ({
      id: g.id,
      gstin: g.gstin,
      state: g.place ?? g.stateCode,
      active: g.portalStatus === "Active",
    })),
    choices,
    approval: route.length
      ? {
          approvers: route.map((r) =>
            r.approverIds.map((id) => approvers.find((a) => a.id === id)?.name ?? "").filter(Boolean),
          ),
          ownLimit: seat?.limit ? Money.format(seat.limit) : null,
        }
      : null,
  };
}
export type CheckoutView = Awaited<ReturnType<typeof checkoutView>>;

/** Saves the choices of one step (they're checked again when the order is placed). */
export async function saveCheckout(db: Database, actor: Actor, organisationId: string, patch: CheckoutChoices) {
  assertCan(actor, "order.place", { organisationId });
  const userId = must(actor.userId);
  const row = await cartRow(db, organisationId, userId);
  if (!row) throw new OrderError("Your cart is empty");
  const errors: Record<string, string> = {};
  if (patch.deliverySiteId) {
    const [x] = await db
      .select({ id: schema.deliverySites.id })
      .from(schema.deliverySites)
      .where(
        and(eq(schema.deliverySites.id, patch.deliverySiteId), eq(schema.deliverySites.organisationId, organisationId)),
      );
    if (!x) errors.deliverySiteId = "Choose one of your delivery sites";
  }
  if (patch.billingGstinId) {
    const [g] = await db
      .select()
      .from(schema.organisationGstins)
      .where(
        and(
          eq(schema.organisationGstins.id, patch.billingGstinId),
          eq(schema.organisationGstins.organisationId, organisationId),
          isNull(schema.organisationGstins.retiredAt),
        ),
      );
    if (!g) errors.billingGstinId = "Choose one of your GSTINs";
    else if (g.portalStatus !== "Active") errors.billingGstinId = "Bill to a verified GSTIN";
  }
  if (
    patch.receiverMobile !== undefined &&
    patch.receiverMobile !== null &&
    !/^[6-9]\d{9}$/.test(patch.receiverMobile.replace(/\D/g, "").slice(-10))
  )
    errors.receiverMobile = "Enter a 10-digit mobile number";
  if (patch.paymentMethod && !PAYMENT_METHODS.includes(patch.paymentMethod))
    errors.paymentMethod = "Choose how you'll pay";
  if (Object.keys(errors).length) throw new OrderError("Check the highlighted fields", errors);
  const set = Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined));
  await db
    .update(schema.carts)
    .set({ ...set, updatedAt: new Date() })
    .where(eq(schema.carts.id, row.id));
}
