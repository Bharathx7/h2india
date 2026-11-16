import { getDb } from "@h2india/core";
import { loadActor, scopeFor } from "@h2india/core/authz";
import { buyerOf, companySettings } from "@h2india/core/buyer";
import { productDetail } from "@h2india/core/products";
import { buyerRfq } from "@h2india/core/rfq";
import { GST_STATES } from "@h2india/core/companies/client";
import { formatIstDate } from "@h2india/core/time";
import type { Metadata } from "next";
import { showSample } from "@/cms/sample";
import { catalogue } from "@/marketplace/data";
import { RfqWizard, type WizardSetup } from "@/rfq/Wizard";
import { EMPTY_WIZARD, type WizardState } from "@/rfq/wizard-state";
import { getSession } from "@/server/auth";

// Request a quote (step 9.3; 365:27762): four steps, then the sent confirmation. Starts from a product, a category,
// compare, a project list, a supplier profile or the header button. Signed-out visitors can fill it in; it waits in
// their browser until they sign in or join (399:11005). ?draft= resumes a draft or a returned RFQ (399:11227).
export const metadata: Metadata = {
  title: "Request a quote · H2 Economy",
  description: "One request, up to 5 verified suppliers.",
  alternates: { canonical: "/rfq/new" },
};
export const dynamic = "force-dynamic";

const day = (d: Date | null) => (d ? new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(d) : "");

export default async function RequestQuotePage({
  searchParams,
}: {
  searchParams: Promise<{
    product?: string;
    products?: string;
    category?: string;
    supplier?: string;
    draft?: string;
    step?: string;
  }>;
}) {
  const sp = await searchParams;
  const db = getDb();
  const session = await getSession();
  const actor = session ? await loadActor(db, session.user.id) : null;
  const buyer = actor ? await buyerOf(db, actor) : null;
  const cat = await catalogue();
  const categories = cat.classes.flatMap((c) =>
    c.categories.flatMap((k) => [
      { id: k.id, slug: k.slug, label: `${c.label} › ${k.label}` },
      ...k.children.map((x) => ({ id: x.id, slug: x.slug, label: `${k.label} › ${x.label}` })),
    ]),
  );

  const start: WizardState = { ...EMPTY_WIZARD };
  let returned: WizardSetup["returned"] = null;
  if (sp.product) {
    const p = await productDetail(db, sp.product, { includeSample: showSample() });
    if (p) {
      const c = p.sub ?? p.category;
      start.categoryId = c.id;
      start.categoryLabel = categories.find((x) => x.id === c.id)?.label ?? c.label;
      start.title = p.name;
      start.productId = p.id;
      start.source = "product";
      if (p.supplier.verified) {
        start.supplierIds = [p.supplier.organisationId];
        start.supplierNames = { [p.supplier.organisationId]: p.supplier.name };
      }
    }
  } else if (sp.category) {
    const c = categories.find((x) => x.slug === sp.category || x.id === sp.category);
    if (c) {
      start.categoryId = c.id;
      start.categoryLabel = c.label;
      start.source = "category";
    }
  } else if (sp.products) start.source = "compare";

  let draftStatus: string | null = null;
  if (sp.draft && buyer && actor) {
    const d = await buyerRfq(db, scopeFor(actor), buyer.organisationId, sp.draft);
    if (d && (d.rfq.status === "Draft" || d.rfq.status === "Returned")) {
      draftStatus = d.rfq.status;
      const item = d.items[0];
      Object.assign(start, {
        draftId: d.rfq.id,
        categoryId: d.rfq.categoryId ?? "",
        categoryLabel: categories.find((x) => x.id === d.rfq.categoryId)?.label ?? "",
        title: d.rfq.title,
        quantity: item ? String(item.quantity) : "",
        unit: item?.unit ?? "units",
        specs: Object.fromEntries(Object.entries(item?.specs ?? {}).map(([k, v]) => [k, String(v)])),
        requirements: d.rfq.requirements ?? "",
        supplierIds: d.suppliers.map((x) => x.rs.organisationId),
        supplierNames: Object.fromEntries(d.suppliers.map((x) => [x.rs.organisationId, x.name ?? x.legalName])),
        suggest: d.rfq.suggestSuppliers,
        siteId: d.rfq.deliverySiteId ?? "",
        requiredBy: day(d.rfq.requiredBy),
        offerDeadline: day(d.rfq.offerDeadline),
        deliveryTerms: d.rfq.deliveryTerms ?? "",
        paymentTerms: d.rfq.paymentTerms ?? "",
        gstinId: d.rfq.billingGstinId ?? "",
        source: d.rfq.source ?? "header",
      } satisfies Partial<WizardState>);
      const last = d.decisions.find((x) => x.decision === "Returned");
      if (d.rfq.status === "Returned" && last)
        returned = { on: formatIstDate(last.at), reasons: last.reasons, note: last.note };
    }
  }

  let sites: WizardSetup["sites"] = [];
  let gstins: WizardSetup["gstins"] = [];
  if (buyer && actor) {
    const settings = await companySettings(db, scopeFor(actor), buyer.organisationId);
    sites = (settings?.sites ?? []).map((s) => ({
      id: s.id,
      label: [s.name, s.address, s.city, s.state].filter(Boolean).join(", "),
      state: s.state ?? "",
      gstinId: s.gstinId ?? "",
      isDefault: s.isDefault,
    }));
    gstins = (settings?.gstins ?? []).map((g) => ({
      id: g.id,
      label: `${g.gstin}${g.place ? ` · ${g.place}` : ""}`,
      isDefault: g.isDefault,
    }));
    const site = sites.find((s) => s.id === start.siteId) ?? sites.find((s) => s.isDefault);
    if (!start.siteId && site) {
      start.siteId = site.id;
      start.deliveryState = site.state;
    } else if (site) start.deliveryState = site.state;
    if (!start.gstinId) start.gstinId = site?.gstinId || (gstins.find((g) => g.isDefault)?.id ?? "");
  }

  const setup: WizardSetup = {
    signedIn: Boolean(session),
    buyer: buyer ? { name: buyer.legalName, canSend: buyer.seat.permissions.has("rfq.create") } : null,
    categories,
    states: [...new Set(Object.values(GST_STATES))].sort((a, b) => a.localeCompare(b, "en-IN")),
    sites,
    gstins,
    returned,
    draftStatus,
    today: day(new Date()),
  };
  return <RfqWizard setup={setup} start={start} />;
}
