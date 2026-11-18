"use client";

import type { Choices, NotifyChannel } from "@h2india/core/notify";
import {
  Alert,
  AsyncSection,
  Button,
  CategoryChip,
  Checkbox,
  EmptyState,
  Icon,
  NotificationList,
  NotificationRow,
  Tab,
  TabList,
  TabPanel,
  Tabs,
  type WorkspaceArea,
} from "@h2india/ui";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { ListPager } from "@/components/ListPager";
import { pageOf, type PageRequest } from "@/lib/paging";
import { inbox, markAllRead, markOneRead, saveChoices } from "./actions";
import type { Row } from "./rows";
import { TOPIC_LABELS, topicsFor } from "./topics";

// Notification centre (97:2564, 100:4631) with the "Email settings" tab. The tab is drawn but its content is not
// (decision A11): it is the preference grid from Company settings · Notifications (577:288).

type Filter = "all" | "unread" | "quotes" | "orders" | "team" | "alerts";
const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "unread", label: "Unread" },
  { value: "quotes", label: "Quotes" },
  { value: "orders", label: "Orders" },
  { value: "team", label: "Team" },
  { value: "alerts", label: "Alerts" },
];
const GROUPS: Row["group"][] = ["Today", "Earlier this week", "Older"];

export function NotificationsView(props: {
  area: WorkspaceArea;
  initial: { unread: number; items: Row[] };
  tab: "activity" | "email";
  demoState?: "loading" | "empty" | "error";
  choices: Choices;
  contact: { email: string; mobile: string | null };
  /** The page of the Activity list asked for in the address (?page=&perPage=), and the address's other parameters. */
  paging: PageRequest;
  query: Record<string, string>;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<string>(props.tab);
  const [filter, setFilter] = useState<Filter>("all");
  const [data, setData] = useState(props.initial);
  const [state, setState] = useState<"ready" | "loading" | "error">("ready");

  // Only the latest request may update the list, so a slow answer never overwrites a newer one.
  const latest = useRef(0);
  const load = (f: Filter) => {
    const ticket = ++latest.current;
    setFilter(f);
    // A new filter starts again from page 1 (the address keeps the rows per page).
    if (props.paging.page > 1) {
      const qs = new URLSearchParams({ ...props.query, perPage: String(props.paging.perPage) }).toString();
      router.replace(`/notifications?${qs}`, { scroll: false });
    }
    setState("loading");
    inbox(f)
      .then((d) => {
        if (ticket !== latest.current) return;
        if (d) setData(d);
        setState("ready");
      })
      .catch(() => {
        if (ticket === latest.current) setState("error");
      });
  };

  // The list holds the newest 100 notifications (and each filter's newest 100); this pages through them.
  const paged = pageOf(data.items, props.paging);
  const shownState = props.demoState ?? (state === "ready" && data.items.length === 0 ? "empty" : state);

  return (
    <div className="flex min-h-[calc(100dvh-4rem)] flex-col gap-6 bg-subtle p-4 md:min-h-[calc(100dvh-4.75rem)] md:p-8">
      <h1 className="type-h2">Notifications</h1>
      <Tabs
        value={tab}
        onValueChange={(t) => {
          setTab(t);
          router.replace(t === "email" ? "/notifications?tab=email" : "/notifications", { scroll: false });
        }}
      >
        <TabList aria-label="Notifications" className="gap-6">
          <Tab value="activity">Activity</Tab>
          <Tab value="email">Email settings</Tab>
        </TabList>

        <TabPanel value="activity" className="flex flex-col gap-6 pt-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2" role="group" aria-label="Show">
              {FILTERS.map((f) => (
                <CategoryChip
                  key={f.value}
                  selected={filter === f.value}
                  onClick={() => {
                    load(f.value);
                  }}
                >
                  {f.value === "unread" ? `Unread · ${String(data.unread)}` : f.label}
                </CategoryChip>
              ))}
            </div>
            {data.unread > 0 ? (
              <button
                type="button"
                className="rounded-control type-label text-link hover:text-link-hover"
                onClick={() => {
                  latest.current++;
                  setState("ready");
                  setData((d) => ({ unread: 0, items: d.items.map((i) => ({ ...i, unread: false })) }));
                  void markAllRead().then(() => {
                    router.refresh();
                  });
                }}
              >
                Mark all as read
              </button>
            ) : null}
          </div>

          <AsyncSection
            state={shownState}
            label="Your notifications"
            onRetry={() => {
              load(filter);
            }}
            errorTitle="We couldn't load notifications"
            errorText="Check your connection and try again. If it keeps happening, contact support."
            skeleton={<LoadingRows />}
            empty={
              <div className="rounded-card border border-default bg-page">
                <EmptyState
                  title={filter === "all" ? "You're all caught up" : "Nothing here"}
                  action={
                    filter === "all" ? (
                      <Button
                        onClick={() => {
                          setTab("email");
                        }}
                      >
                        Email settings
                      </Button>
                    ) : undefined
                  }
                >
                  {props.area === "member"
                    ? "Alert matches, event reminders and account updates appear here."
                    : "Quote, order and approval updates appear here."}
                </EmptyState>
              </div>
            }
          >
            <div className="flex flex-col gap-6">
              {GROUPS.map((g) => {
                const rows = paged.rows.filter((i) => i.group === g);
                if (rows.length === 0) return null;
                return (
                  <section key={g} className="flex flex-col gap-2.5" aria-labelledby={`group-${g}`}>
                    <h2 id={`group-${g}`} className="type-label-sm text-secondary">
                      {g}
                    </h2>
                    <NotificationList label={g}>
                      {rows.map((r) => (
                        <li key={r.id}>
                          <NotificationRow
                            item={r}
                            onOpen={(id) => {
                              void markOneRead(id);
                            }}
                          />
                        </li>
                      ))}
                    </NotificationList>
                  </section>
                );
              })}
              <ListPager paged={paged} query={props.query} />
            </div>
          </AsyncSection>
          <p className="flex items-start gap-2 type-body-sm text-secondary">
            <Icon name="info" size={16} className="mt-0.5 shrink-0 text-icon-secondary" />
            We keep notifications for 90 days. The same events are emailed to you based on your email settings.
          </p>
        </TabPanel>

        <TabPanel value="email" className="pt-6">
          <ChoicesForm area={props.area} choices={props.choices} contact={props.contact} />
        </TabPanel>
      </Tabs>
    </div>
  );
}

function LoadingRows() {
  return (
    <div className="divide-y divide-(color:--border-color-default) rounded-card border border-default bg-page">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="flex items-center gap-3.5 px-5 py-4.5">
          <span className="size-9 shrink-0 animate-pulse rounded-pill bg-subtle motion-reduce:animate-none" />
          <span className="flex flex-1 flex-col gap-2">
            <span className="h-3 w-full max-w-105 animate-pulse rounded-[4px] bg-subtle motion-reduce:animate-none" />
            <span className="h-2.5 w-full max-w-70 animate-pulse rounded-[4px] bg-subtle motion-reduce:animate-none" />
          </span>
        </div>
      ))}
    </div>
  );
}

const CHANNELS: { value: NotifyChannel; label: string }[] = [
  { value: "email", label: "Email" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "in_app", label: "In-app" },
];

function ChoicesForm(props: {
  area: WorkspaceArea;
  choices: Choices;
  contact: { email: string; mobile: string | null };
}) {
  const topics = useMemo(() => topicsFor(props.area), [props.area]);
  const [values, setValues] = useState(props.choices);
  const [saved, setSaved] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const groups = [...new Set(topics.map((t) => TOPIC_LABELS[t].group))];
  const changes = topics.flatMap((t) =>
    CHANNELS.filter((c) => values[t][c.value] !== props.choices[t][c.value]).map((c) => ({
      topic: t,
      channel: c.value,
      enabled: values[t][c.value],
    })),
  );
  const masked = props.contact.mobile ? `+91 ••••• ${props.contact.mobile.replace(/\D/g, "").slice(-5)}` : null;
  return (
    <form
      className="flex max-w-180 flex-col gap-6"
      onSubmit={(e) => {
        e.preventDefault();
        setSaved("saving");
        void saveChoices(changes).then((r) => {
          setSaved(r.ok ? "saved" : "error");
        });
      }}
    >
      <p className="type-body text-body">Pick where each kind of notification reaches you.</p>
      {saved === "saved" ? <Alert tone="success" title="Changes saved" live /> : null}
      {saved === "error" ? <Alert tone="error" title="We couldn't save your changes. Try again." live /> : null}
      <div className="overflow-x-auto rounded-card border border-default bg-page p-4 md:p-5">
        <table className="w-full border-collapse">
          <caption className="sr-only">Notifications by channel</caption>
          <thead>
            <tr className="border-b border-default">
              <th scope="col" className="pb-3 text-left type-label-sm text-secondary">
                What happened
              </th>
              {CHANNELS.map((c) => (
                <th key={c.value} scope="col" className="w-16 pb-3 text-center type-label-sm text-secondary md:w-24">
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          {groups.map((g) => (
            <tbody key={g} className="border-b border-default last:border-b-0">
              <tr>
                <th scope="colgroup" colSpan={4} className="pt-5 pb-1 text-left type-label-sm text-secondary">
                  {g}
                </th>
              </tr>
              {topics
                .filter((t) => TOPIC_LABELS[t].group === g)
                .map((t) => (
                  <tr key={t}>
                    <th scope="row" className="py-3 pr-4 text-left align-top font-normal">
                      <span className="block type-label text-primary">{TOPIC_LABELS[t].label}</span>
                      {TOPIC_LABELS[t].hint ? (
                        <span className="block type-caption text-secondary">{TOPIC_LABELS[t].hint}</span>
                      ) : null}
                    </th>
                    {CHANNELS.map((c) => {
                      const locked = TOPIC_LABELS[t].locked.includes(c.value);
                      return (
                        <td key={c.value} className="py-3 text-center align-top">
                          <Checkbox
                            label={<span className="sr-only">{`${TOPIC_LABELS[t].label}: ${c.label}`}</span>}
                            checked={values[t][c.value]}
                            disabled={locked}
                            onCheckedChange={(v) => {
                              setSaved("idle");
                              setValues((all) => ({ ...all, [t]: { ...all[t], [c.value]: v === true } }));
                            }}
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
            </tbody>
          ))}
        </table>
      </div>
      <div className="rounded-card border border-default bg-page p-5">
        <p className="type-label text-primary">
          Sent to {props.contact.email}
          {masked ? ` and WhatsApp ${masked}` : ""}
        </p>
        <p className="type-caption text-secondary">Change these in your account&apos;s Sign-in and security.</p>
      </div>
      <div className="flex justify-end gap-3">
        <Button
          type="button"
          variant="ghost"
          disabled={changes.length === 0}
          onClick={() => {
            setValues(props.choices);
            setSaved("idle");
          }}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={changes.length === 0 || saved === "saving"}>
          Save changes
        </Button>
      </div>
    </form>
  );
}
