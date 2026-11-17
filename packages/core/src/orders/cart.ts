import { schema, type Database } from "@h2india/db";
import { and, asc, eq, isNull, sql } from "drizzle-orm";
import type { Actor } from "../authz/actor";
import { assertCan } from "../authz/can";
import { OrderError, orderFigures, requireTransactions } from "./records";
import { gstRows } from "./tax";
import { must } from "../must";

// The cart (step 10.2, 80:5973): fixed-price items from one supplier at a time. Adding from another supplier asks
// first (replace: true empties the cart). Prices shown here are re-read from the products on every view and again
// when the order is placed; the browser never sends a price.

async function cartOf(db: Database, organisationId: string, userId: string) {
  const [have] = await db
    .select()
    .from(schema.carts)
    .where(and(eq(schema.carts.organisationId, organisationId), eq(schema.carts.userId, userId)));
  if (have) return have;
  const [made] = await db.insert(schema.carts).values({ organisationId, userId }).onConflictDoNothing().returning();
  return (
    made ??
    must(
      (
        await db
          .select()
          .from(schema.carts)
          .where(and(eq(schema.carts.organisationId, organisationId), eq(schema.carts.userId, userId)))
      )[0],
    )
  );
}

export class OtherSupplierInCart extends OrderError {
  constructor(readonly supplierName: string) {
    super("other_supplier");
  }
}

export async function addToCart(
  db: Database,
  actor: Actor,
  organisationId: string,
  input: { productId: string; quantity: number; replace?: boolean },
  opts: { flags?: Record<string, string | undefined> } = {},
) {
  await requireTransactions(db, [organisationId], opts.flags);
  assertCan(actor, "order.place", { organisationId });
  if (!Number.isInteger(input.quantity) || input.quantity < 1) throw new OrderError("Enter a quantity");
  const [product] = await db
    .select()
    .from(schema.products)
    .where(
      and(
        eq(schema.products.id, input.productId),
        eq(schema.products.status, "Live"),
        isNull(schema.products.deletedAt),
      ),
    );
  if (!product || product.pricing !== "fixed" || !product.pricePaise)
    throw new OrderError("This product needs a quote");
  if (product.organisationId === organisationId) throw new OrderError("You can't order your own product");
  const cart = await cartOf(db, organisationId, must(actor.userId));
  if (cart.supplierId && cart.supplierId !== product.organisationId) {
    if (!input.replace) {
      const [s] = await db
        .select({ name: schema.organisations.legalName, trade: schema.companyProfiles.tradeName })
        .from(schema.organisations)
        .leftJoin(schema.companyProfiles, eq(schema.companyProfiles.organisationId, schema.organisations.id))
        .where(eq(schema.organisations.id, cart.supplierId));
      throw new OtherSupplierInCart(s?.trade ?? s?.name ?? "another supplier");
    }
    await db.delete(schema.cartItems).where(eq(schema.cartItems.cartId, cart.id));
  }
  await db.transaction(async (tx) => {
    await tx.update(schema.carts).set({ supplierId: product.organisationId }).where(eq(schema.carts.id, cart.id));
    await tx
      .insert(schema.cartItems)
      .values({ cartId: cart.id, productId: product.id, quantity: input.quantity })
      .onConflictDoUpdate({
        target: [schema.cartItems.cartId, schema.cartItems.productId],
        set: { quantity: input.quantity },
      });
  });
}

export async function setCartQuantity(
  db: Database,
  actor: Actor,
  organisationId: string,
  input: { itemId: string; quantity: number },
) {
  assertCan(actor, "order.place", { organisationId });
  const cart = await cartOf(db, organisationId, must(actor.userId));
  if (input.quantity <= 0) {
    await db
      .delete(schema.cartItems)
      .where(and(eq(schema.cartItems.id, input.itemId), eq(schema.cartItems.cartId, cart.id)));
    const left = await db.select().from(schema.cartItems).where(eq(schema.cartItems.cartId, cart.id));
    if (!left.length) await db.update(schema.carts).set({ supplierId: null }).where(eq(schema.carts.id, cart.id));
    return;
  }
  await db
    .update(schema.cartItems)
    .set({ quantity: input.quantity })
    .where(and(eq(schema.cartItems.id, input.itemId), eq(schema.cartItems.cartId, cart.id)));
}

/** The cart as the Cart page and checkout steps show it, priced from the products now. */
export async function viewCart(db: Database, actor: Actor, organisationId: string) {
  assertCan(actor, "order.view", { organisationId });
  const cart = await cartOf(db, organisationId, must(actor.userId));
  const rows = await db
    .select({ item: schema.cartItems, product: schema.products })
    .from(schema.cartItems)
    .innerJoin(schema.products, eq(schema.products.id, schema.cartItems.productId))
    .where(eq(schema.cartItems.cartId, cart.id))
    .orderBy(asc(schema.cartItems.addedAt));
  const [supplier] = cart.supplierId
    ? await db
        .select({
          name: schema.organisations.legalName,
          trade: schema.companyProfiles.tradeName,
          slug: schema.companyProfiles.slug,
          city: schema.companyProfiles.city,
          state: schema.organisations.state,
          verified: schema.organisations.verification,
          gstin: sql<
            string | null
          >`(select g.gstin from core.organisation_gstins g where g.organisation_id = ${cart.supplierId}
            and g.portal_status = 'Active' order by g.is_default desc, g.created_at limit 1)`,
        })
        .from(schema.organisations)
        .leftJoin(schema.companyProfiles, eq(schema.companyProfiles.organisationId, schema.organisations.id))
        .where(eq(schema.organisations.id, cart.supplierId))
    : [];
  const [buyer] = await db
    .select({ state: schema.organisations.state })
    .from(schema.organisations)
    .where(eq(schema.organisations.id, organisationId));
  const items = rows.map(({ item, product }) => ({
    id: item.id,
    productId: product.id,
    slug: product.slug,
    name: product.name,
    quantity: item.quantity,
    minOrder: product.minOrder,
    unitPricePaise: product.pricePaise ?? 0n,
    gstRateBps: product.gstRateBps ?? 0,
    available: product.status === "Live" && !product.deletedAt && product.pricing === "fixed" && !!product.pricePaise,
    stockLeft: product.stock === "in_stock" ? product.stockQty : null,
    shipDays: product.shipDays,
    image: product.images[0]?.fileId ?? null,
  }));
  const figures = orderFigures(
    items
      .filter((i) => i.available)
      .map((i) => ({
        description: i.name,
        quantity: i.quantity,
        unitPricePaise: i.unitPricePaise,
        gstRateBps: i.gstRateBps,
      })),
  );
  const live = items.filter((i) => i.available);
  const rates = new Set(live.map((i) => i.gstRateBps));
  return {
    supplier: supplier
      ? {
          id: must(cart.supplierId),
          name: supplier.trade ?? supplier.name,
          legalName: supplier.name,
          slug: supplier.slug,
          city: supplier.city,
          state: supplier.state,
          verified: supplier.verified === "Verified",
          gstin: supplier.gstin,
        }
      : null,
    items,
    ...figures,
    gst: gstRows({
      gstPaise: figures.gstPaise,
      rateBps: rates.size === 1 ? ([...rates][0] ?? null) : null,
      supplierState: supplier?.state ?? null,
      buyerState: buyer?.state ?? null,
    }),
  };
}
export type CartView = Awaited<ReturnType<typeof viewCart>>;

/** A live fixed-price product's id by its address (the product page's Add to cart and Buy now links). */
export async function cartProductId(db: Database, slug: string): Promise<{ id: string; minOrder: number } | null> {
  const [p] = await db
    .select({ id: schema.products.id, minOrder: schema.products.minOrder })
    .from(schema.products)
    .where(and(eq(schema.products.slug, slug), eq(schema.products.status, "Live"), isNull(schema.products.deletedAt)));
  return p ? { id: p.id, minOrder: Math.max(1, p.minOrder ?? 1) } : null;
}
