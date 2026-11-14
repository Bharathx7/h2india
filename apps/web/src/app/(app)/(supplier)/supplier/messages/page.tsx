import { getDb } from "@h2india/core";
import { rfqThread } from "@h2india/core/messages";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Inbox } from "@/messages/Inbox";
import { requireSupplier, SupplierShell } from "@/supplier/shell";

// Supplier messages (the supplier side of 572:8), step 9.7. ?rfq= (Message the buyer on an RFQ) opens that conversation.
export const metadata: Metadata = { title: "Messages · H2 India", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function SupplierMessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ thread?: string; kind?: string; q?: string; state?: string; rfq?: string }>;
}) {
  const sp = await searchParams;
  const page = await requireSupplier("/supplier/messages");
  if (sp.rfq) {
    const thread = await rfqThread(getDb(), page.actor, {
      rfqId: sp.rfq,
      supplierId: page.supplier.organisationId,
    }).catch(() => null);
    redirect(thread ? `/supplier/messages?thread=${thread.id}` : "/supplier/messages");
  }
  return (
    <SupplierShell page={page} current="/supplier/messages" title="Messages">
      <Inbox
        actor={page.actor}
        side="supplier"
        organisationId={page.supplier.organisationId}
        ownName={page.supplier.tradeName}
        base="/supplier/messages"
        sp={sp}
      />
    </SupplierShell>
  );
}
