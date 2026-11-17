import { getDb } from "@h2india/core";
import type { Actor } from "@h2india/core/authz";
import { listThreads, markThreadRead, threadMessages, type Side } from "@h2india/core/messages";
import { formatIstDayMonth } from "@h2india/core/time";
import { buttonClasses, cx, EmptyState, Icon, Skeleton, VerifiedBadge } from "@h2india/ui";
import Link from "next/link";
import { LiveSection } from "@/components/LiveSection";
import { forcedState } from "@/lib/dev-state";
import { Conversation } from "./Conversation";
import { ListPager } from "@/components/ListPager";
import { pageOf, pageRequest, pagingQuery } from "@/lib/paging";

// Messages (572:8; phones 573:8 list and 573:467 conversation; states 573:571), step 9.7, for both buyers and
// suppliers. The list and the open conversation share the page; on phones one shows at a time.

const FILTERS = [
  { key: "", label: "All" },
  { key: "rfq", label: "RFQs" },
  { key: "order", label: "Orders" },
  { key: "question", label: "Technical questions" },
] as const;

const initials = (n: string) =>
  n
    .split(/\s+/)
    .map((w) => w.charAt(0))
    .join("")
    .slice(0, 2)
    .toUpperCase();

const when = (d: Date) => {
  const today = new Date().toDateString();
  return d.toDateString() === today
    ? new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", hour: "numeric", minute: "2-digit" }).format(d)
    : formatIstDayMonth(d);
};

export async function Inbox({
  actor,
  side,
  organisationId,
  ownName,
  base,
  sp,
}: {
  actor: Actor;
  side: Side;
  organisationId: string;
  ownName: string;
  base: string;
  sp: { thread?: string; kind?: string; q?: string; state?: string; page?: string; perPage?: string };
}) {
  const db = getDb();
  const kind = FILTERS.find((f) => f.key === sp.kind)?.key || undefined;
  const threads = await listThreads(db, actor, { organisationId, side, kind, q: sp.q });
  const all = kind || sp.q ? await listThreads(db, actor, { organisationId, side }) : threads;
  const unread = all.reduce((n, x) => n + x.unread, 0);
  const open = sp.thread ? await threadMessages(db, actor, sp.thread) : null;
  if (open) await markThreadRead(db, actor, open.thread.id);
  const current = open ? all.find((x) => x.id === open.thread.id) : undefined;
  const paged = pageOf(threads, pageRequest(sp));
  const link = (p: Record<string, string | undefined>) => {
    const q = new URLSearchParams(
      Object.entries({ kind, q: sp.q, page: sp.page, perPage: sp.perPage, ...p }).filter((e): e is [string, string] =>
        Boolean(e[1]),
      ),
    );
    const s = q.toString();
    return s ? `${base}?${s}` : base;
  };
  return (
    <>
      <div>
        <h1 className="type-h2">Messages</h1>
        <p className="type-body-sm text-secondary">
          Conversations with {side === "buyer" ? "suppliers" : "buyers"} about your RFQs and orders.
          {unread ? ` ${String(unread)} unread.` : ""}
        </p>
      </div>
      <LiveSection
        label="Messages"
        state={forcedState(sp.state) ?? (all.length ? "ready" : "empty")}
        skeleton={
          <div className="flex flex-col gap-2">
            <Skeleton kind="table-row" />
            <Skeleton kind="table-row" />
            <Skeleton kind="table-row" />
            <Skeleton kind="table-row" />
          </div>
        }
        empty={
          <div className="rounded-card border border-default bg-page">
            <EmptyState
              icon="message-square"
              title="No messages yet"
              action={
                side === "buyer" ? (
                  <Link href="/rfq/new" className={buttonClasses({})}>
                    Request a quote
                  </Link>
                ) : undefined
              }
            >
              {side === "buyer"
                ? "When a supplier replies to your RFQ or you ask them a question, the conversation shows up here."
                : "When a buyer writes about an RFQ or you message them, the conversation shows up here."}
            </EmptyState>
          </div>
        }
      >
        <div className="grid min-h-[560px] grid-cols-[minmax(0,1fr)] overflow-hidden rounded-card border border-default bg-page lg:grid-cols-[340px_minmax(0,1fr)]">
          <div className={cx("flex flex-col border-default lg:border-r", open ? "hidden lg:flex" : "flex")}>
            <div className="flex flex-col gap-3 border-b border-default p-3">
              <form method="get">
                {kind ? <input type="hidden" name="kind" value={kind} /> : null}
                <input
                  name="q"
                  defaultValue={sp.q}
                  aria-label="Search messages"
                  placeholder="Search messages"
                  className="h-11 w-full rounded-control border-[1.5px] border-control bg-page px-3 type-body"
                />
              </form>
              <div className="flex flex-wrap gap-2">
                {FILTERS.map((f) => (
                  <Link
                    key={f.key}
                    href={link({ kind: f.key || undefined, thread: undefined, page: undefined })}
                    aria-current={(kind ?? "") === f.key ? "page" : undefined}
                    className={cx(
                      "inline-flex h-8 items-center rounded-pill border-[1.5px] px-3 type-label-sm",
                      (kind ?? "") === f.key ? "border-transparent bg-inverse text-inverse" : "border-control",
                    )}
                  >
                    {f.label}
                  </Link>
                ))}
              </div>
            </div>
            {threads.length ? (
              <>
                <ul className="flex flex-col divide-y divide-default overflow-y-auto">
                  {paged.rows.map((x) => (
                    <li key={x.id}>
                      <Link
                        href={link({ thread: x.id })}
                        aria-current={x.id === open?.thread.id ? "page" : undefined}
                        className={cx("flex gap-3 p-3 hover:bg-subtle", x.id === open?.thread.id ? "bg-mint" : "")}
                      >
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-pill bg-subtle type-label">
                          {initials(x.with)}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex justify-between gap-2">
                            <span className="truncate type-label">{x.with}</span>
                            <span className="shrink-0 type-caption text-secondary">{when(x.lastAt)}</span>
                          </span>
                          <span className="block type-mono text-secondary">
                            {x.reference ?? (x.kind === "question" ? "Technical question" : "")}
                          </span>
                          <span className="flex justify-between gap-2">
                            <span className="truncate type-body-sm">{x.last}</span>
                            {x.unread ? (
                              <span className="flex size-5 shrink-0 items-center justify-center rounded-pill bg-inverse type-caption text-inverse">
                                {x.unread}
                                <span className="sr-only"> unread</span>
                              </span>
                            ) : null}
                          </span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
                <ListPager paged={paged} query={pagingQuery(sp)} className="mt-auto border-t border-default p-3" />
              </>
            ) : (
              <EmptyState kind="no-results" title={sp.q ? `No messages match "${sp.q}"` : "Nothing here"}>
                Try the {side === "buyer" ? "supplier's" : "buyer's"} name or an RFQ or order number.
              </EmptyState>
            )}
          </div>
          <div className={cx("flex-col", open ? "flex" : "hidden lg:flex")}>
            {open ? (
              <>
                <div className="flex items-center justify-between gap-3 border-b border-default p-4">
                  <div className="flex items-center gap-3">
                    <Link href={link({ thread: undefined })} className="lg:hidden" aria-label="Back to messages">
                      <Icon name="arrow-left" size={18} />
                    </Link>
                    <span className="flex size-10 items-center justify-center rounded-pill bg-subtle type-label">
                      {initials(current?.with ?? "")}
                    </span>
                    <span>
                      <span className="flex flex-wrap items-center gap-2 type-h4">
                        {current?.with}
                        {current?.verified ? <VerifiedBadge kind="supplier" /> : null}
                      </span>
                      {current?.reference ? (
                        <span className="block type-caption text-secondary">
                          About {current.reference} · {current.about}
                        </span>
                      ) : null}
                    </span>
                  </div>
                  {current?.rfqId ? (
                    <Link
                      href={side === "buyer" ? `/buyer/rfqs/${current.rfqId}` : `/supplier/rfqs/${current.rfqId}`}
                      className={buttonClasses({ variant: "outline", size: "sm" })}
                    >
                      Open RFQ
                    </Link>
                  ) : null}
                </div>
                <Conversation
                  key={open.thread.id}
                  threadId={open.thread.id}
                  organisationId={organisationId}
                  withName={current?.with ?? ""}
                  ownName={ownName}
                  start={open.messages.map((m) => ({ ...m, at: m.at.toISOString() }))}
                />
              </>
            ) : (
              <div className="flex flex-1 items-center justify-center p-8">
                <p className="type-body-sm text-secondary">Choose a conversation.</p>
              </div>
            )}
          </div>
        </div>
      </LiveSection>
    </>
  );
}
