import { getDb } from "@h2india/core";
import { rfqThread } from "@h2india/core/messages";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { BuyerWorkspace, requireBuyer } from "@/buyer/shell";
import { Inbox } from "@/messages/Inbox";

// Buyer messages (572:8), step 9.7. ?rfq=&supplier= (the Message button on 560:8) opens that conversation.
export const metadata: Metadata = { title: "Messages · H2 Economy", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function BuyerMessagesPage({
  searchParams,
}: {
  searchParams: Promise<{
    thread?: string;
    kind?: string;
    q?: string;
    state?: string;
    rfq?: string;
    supplier?: string;
  }>;
}) {
  const sp = await searchParams;
  const page = await requireBuyer("/buyer/messages");
  if (sp.rfq && sp.supplier) {
    const thread = await rfqThread(getDb(), page.actor, { rfqId: sp.rfq, supplierId: sp.supplier }).catch(() => null);
    redirect(thread ? `/buyer/messages?thread=${thread.id}` : "/buyer/messages");
  }
  return (
    <BuyerWorkspace page={page} current="/buyer/messages">
      <Inbox
        actor={page.actor}
        side="buyer"
        organisationId={page.buyer.organisationId}
        ownName={page.buyer.legalName}
        base="/buyer/messages"
        sp={sp}
      />
    </BuyerWorkspace>
  );
}
