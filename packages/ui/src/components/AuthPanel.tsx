import type { ReactNode } from "react";
import { Icon, type IconName } from "../icons/Icon";
import { cx } from "../lib/cx";

/* Figma "Auth panel" (200:1205): the sign-in brand panel. Role colour, eyebrow, headline, sub, a product preview
   with an overlapping popover, and a logo or security strip. Buyer and Supplier use bg/accent; Admin uses
   bg/inverse. The previews are static illustrations of the product, hidden from screen readers. */

export type AuthRole = "buyer" | "supplier" | "admin";

export interface AuthPanelProps {
  role: AuthRole;
  eyebrow: string;
  headline: string;
  sub: string;
  /** Names for the logo strip (buyer, supplier). Only real names with permission (decision C15). */
  strip?: string[];
  className?: string;
}

const Card = ({ className, children }: { className?: string; children: ReactNode }) => (
  <div className={cx("rounded-card bg-page shadow-ink-float-sm", className)}>{children}</div>
);
const Initials = ({ children }: { children: string }) => (
  <span className="flex size-6 shrink-0 items-center justify-center rounded-pill bg-tint type-label-sm text-primary">
    {children}
  </span>
);
const Eyebrow = ({ children }: { children: string }) => <span className="type-eyebrow text-secondary">{children}</span>;

function BuyerPreview() {
  const rows: [string, string, string, string, string][] = [
    ["HS", "Hydrotek Systems", "12 weeks", "5 years", "Best"],
    ["PP", "PEM Power India", "14 weeks", "5 years", "Received"],
    ["PH", "Pranava H2", "16 weeks", "3 years", "Received"],
  ];
  return (
    <div className="relative h-75 w-full max-w-135">
      <Card className="absolute top-0 left-0 w-[86%] overflow-hidden">
        <div className="flex items-start justify-between p-3">
          <div>
            <p className="type-label text-primary">Compare quotes</p>
            <p className="type-caption text-secondary">RFQ-2026-0093 · PEM electrolyser 50 kW</p>
          </div>
          <span className="rounded-pill bg-accent px-2 py-0.5 type-label-sm text-primary">Accept quote</span>
        </div>
        <div className="grid grid-cols-[1.6fr_1fr_1fr_1fr] bg-subtle px-3 py-1.5">
          <Eyebrow>Supplier</Eyebrow>
          <Eyebrow>Lead time</Eyebrow>
          <Eyebrow>Warranty</Eyebrow>
          <Eyebrow>Status</Eyebrow>
        </div>
        {rows.map(([i, name, lead, warranty, status], n) => (
          <div
            key={name}
            className={cx(
              "grid grid-cols-[1.6fr_1fr_1fr_1fr] items-center border-t border-default px-3 py-2",
              n === 0 && "bg-mint",
            )}
          >
            <span className="flex items-center gap-1.5 type-label-sm text-primary">
              <Initials>{i}</Initials>
              {name}
            </span>
            <span className="type-caption text-primary">{lead}</span>
            <span className="type-caption text-body">{warranty}</span>
            <span className="type-caption text-success">{status}</span>
          </div>
        ))}
      </Card>
      <Card className="absolute right-0 bottom-0 w-[52%] p-2.5">
        <div className="flex items-center justify-between">
          <p className="type-label-sm text-primary">Send for approval</p>
          <Icon name="x" size={14} className="text-icon-secondary" />
        </div>
        <div className="mt-2 flex gap-1.5">
          <span className="flex-1 truncate rounded-[6px] border-2 border-fresh-500 px-1.5 py-0.5 type-caption text-primary">
            meera@greenfieldh2.in
          </span>
          <span className="rounded-[6px] bg-inverse px-2 py-0.5 type-caption text-inverse">Send</span>
        </div>
        <p className="mt-2">
          <Eyebrow>Team</Eyebrow>
        </p>
        {[
          ["RK", "Ravi Kulkarni", "Requester"],
          ["MP", "Meera Pillai", "Approver"],
          ["AS", "Arjun Shah", "Viewer"],
        ].map(([i, n, r]) => (
          <div key={n} className="mt-1.5 flex items-center gap-1.5">
            <Initials>{i ?? ""}</Initials>
            <span className="flex-1 type-caption text-primary">{n}</span>
            <span className="type-caption text-secondary">{r}</span>
          </div>
        ))}
      </Card>
    </div>
  );
}

function SupplierPreview() {
  return (
    <div className="relative h-75 w-full max-w-135">
      <Card className="absolute top-0 left-0 w-[85%] p-3">
        <p className="type-label text-primary">Dashboard</p>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {[
            ["Open quote requests", "3", "2 new this week"],
            ["Orders in progress", "5", "1 ready to ship"],
          ].map(([l, n, d]) => (
            <div key={l} className="rounded-control border border-default p-2.5">
              <p className="type-caption text-secondary">{l}</p>
              <p className="type-h3">{n}</p>
              <p className="type-caption text-success">{d}</p>
            </div>
          ))}
        </div>
        <div className="mt-2 overflow-hidden rounded-control border border-default">
          <div className="grid grid-cols-[1.2fr_1.4fr_0.8fr] bg-subtle px-2.5 py-1.5">
            <Eyebrow>Buyer</Eyebrow>
            <Eyebrow>Product</Eyebrow>
            <Eyebrow>Status</Eyebrow>
          </div>
          {[
            ["Greenfield Hydrogen", "PEM electrolyser 50 kW", "Quote due", "text-warning"],
            ["Deccan Ammonia", "Compressor skid 350 bar", "New", "text-link"],
            ["Konkan Steel", "Type III buffer tank", "Quoted", "text-success"],
          ].map(([b, p, s, c]) => (
            <div key={b} className="grid grid-cols-[1.2fr_1.4fr_0.8fr] border-t border-default px-2.5 py-1.5">
              <span className="type-label-sm text-primary">{b}</span>
              <span className="truncate type-caption text-body">{p}</span>
              <span className={cx("type-caption", c)}>{s}</span>
            </div>
          ))}
        </div>
      </Card>
      <Card className="absolute right-0 bottom-0 w-[45%] p-2.5">
        <p className="flex items-center gap-1.5 type-label-sm text-primary">
          <Icon name="mail" size={14} />
          New quote request
        </p>
        <p className="mt-1 type-caption text-body">
          Greenfield Hydrogen · PEM electrolyser 50 kW · checked by H2 Economy
        </p>
        <span className="mt-2 inline-block rounded-pill bg-accent px-2.5 py-1 type-caption text-primary">
          Open request
        </span>
      </Card>
    </div>
  );
}

function AdminPreview() {
  return (
    <div className="relative h-75 w-full max-w-135">
      <Card className="absolute top-0 left-0 w-[85%] p-3">
        <p className="type-label text-primary">Review queue</p>
        <div className="mt-2 flex gap-1.5">
          <span className="rounded-pill bg-inverse px-2 py-0.5 type-caption text-inverse">Suppliers · 4</span>
          <span className="rounded-pill bg-subtle px-2 py-0.5 type-caption text-body">Products · 7</span>
          <span className="rounded-pill bg-subtle px-2 py-0.5 type-caption text-body">Quote requests · 3</span>
        </div>
        <div className="mt-2 overflow-hidden rounded-control border border-default">
          {[
            ["VG", "Varun Gas Equipment", "GST checked, factory docs pending", "2 days"],
            ["NP", "Nirmal Process Engineering", "All documents in", "1 day"],
            ["SM", "Sahyadri Membranes", "ISO certificate expired", "4 h"],
          ].map(([i, n, d, t], k) => (
            <div key={n} className={cx("flex items-center gap-2 px-2.5 py-1.5", k > 0 && "border-t border-default")}>
              <Initials>{i ?? ""}</Initials>
              <span className="flex-1">
                <span className="block type-label-sm text-primary">{n}</span>
                <span className="block type-caption text-secondary">{d}</span>
              </span>
              <span className="type-caption text-secondary">{t}</span>
            </div>
          ))}
        </div>
      </Card>
      <Card className="absolute right-0 bottom-6 w-[37%] p-2.5">
        <p className="flex items-center gap-1.5 type-label-sm text-primary">
          <Icon name="lock" size={14} />
          Two-step verification
        </p>
        <div className="mt-2 flex gap-1">
          {["4", "8", "1", "9", "", ""].map((d, k) => (
            <span
              key={k}
              className={cx(
                "flex h-7 flex-1 items-center justify-center rounded-[6px] border type-label text-primary",
                k === 4 ? "border-2 border-fresh-500" : "border-default",
              )}
            >
              {d}
            </span>
          ))}
        </div>
        <p className="mt-1.5 type-caption text-secondary">Code sent to your authenticator app</p>
      </Card>
    </div>
  );
}

const SECURITY: [IconName, string][] = [
  ["lock", "Two-step required"],
  ["activity", "Every action logged"],
  ["users", "Role-based access"],
];

export function AuthPanel({ role, eyebrow, headline, sub, strip = [], className }: AuthPanelProps) {
  const dark = role === "admin";
  return (
    <aside
      data-surface={dark ? "inverse" : undefined}
      className={cx("flex flex-col rounded-[24px] px-14 pt-16 pb-12", dark ? "bg-inverse" : "bg-accent", className)}
    >
      <div className="flex flex-col items-start gap-3.5">
        <span className={cx("rounded-pill px-2 py-0.5 type-eyebrow text-primary", dark ? "bg-accent" : "bg-page")}>
          {eyebrow}
        </span>
        <h2 className={cx("type-h1", dark ? "text-inverse" : "text-primary")}>{headline}</h2>
        <p className={cx("type-body-lg", dark ? "text-inverse" : "text-primary")}>{sub}</p>
      </div>
      <div aria-hidden="true" className="mt-auto flex flex-1 items-center py-10">
        {role === "buyer" ? <BuyerPreview /> : role === "supplier" ? <SupplierPreview /> : <AdminPreview />}
      </div>
      {dark ? (
        <ul className="flex flex-wrap gap-7">
          {SECURITY.map(([icon, label]) => (
            <li key={label} className="flex items-center gap-2 type-label text-ink-200">
              <Icon name={icon} size={18} />
              {label}
            </li>
          ))}
        </ul>
      ) : strip.length > 0 ? (
        <ul aria-label="Companies on H2 Economy" className="flex flex-wrap gap-5.5">
          {strip.map((name) => (
            <li key={name} className="type-h4">
              {name}
            </li>
          ))}
        </ul>
      ) : null}
    </aside>
  );
}
