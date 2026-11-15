import fs from "node:fs";
import path from "node:path";
import { format, resolveConfig } from "prettier";
import ts from "typescript";

/**
 * Route and server-action inventory (playbook step 12.1).
 *
 * Statically reads every `route.ts` under `app/` and every `"use server"` file, and for each exported
 * HTTP handler or server action lists the guard calls its body makes (following calls to helpers
 * declared in the same file). `scripts/route-inventory.ts` writes the table to `docs/security/routes.md`;
 * `route-inventory.test.ts` fails when an entry has no guard and isn't in PUBLIC below.
 */

export type GuardKind =
  | "operator"
  | "supplier"
  | "buyer"
  | "team"
  | "member"
  | "signed-in"
  | "permission"
  | "signed-link"
  | "internal"
  | "webhook"
  | "delegated"
  | "form";

type Guard = { kind: GuardKind; who: string; scope: string };

const OPERATOR: Guard = {
  kind: "operator",
  who: "Operator; permission checked in the action or core",
  scope: "None (back office)",
};
const SUPPLIER: Guard = { kind: "supplier", who: "Supplier team member", scope: "Supplier company from the session" };
const BUYER: Guard = { kind: "buyer", who: "Buyer team member", scope: "Buyer company from the session" };
const SIGNED_IN: Guard = { kind: "signed-in", who: "Signed-in person", scope: "Own account (session user)" };
const LINK: Guard = {
  kind: "signed-link",
  who: "Holder of a signed link or token",
  scope: "The record the token names",
};

/** Calls that count as a guard, by the called function's name. */
export const GUARDS: Record<string, Guard> = {
  requireOperator: { ...OPERATOR, who: "Operator with the page's permission" },
  operatorSession: OPERATOR,
  cmsSession: { ...OPERATOR, who: "Operator with content permissions" },
  editorActor: { ...OPERATOR, who: "Operator with content permissions" },
  requireSupplier: SUPPLIER,
  supplierActor: SUPPLIER,
  supplierOf: SUPPLIER,
  requireBuyer: BUYER,
  buyerOf: BUYER,
  cartBuyer: BUYER,
  teamActor: { kind: "team", who: "Company admin (team.manage)", scope: "Company from the session" },
  requireMember: { kind: "member", who: "Signed-in member", scope: "Own account (session user)" },
  getSession: SIGNED_IN,
  loadActor: SIGNED_IN,
  currentActor: { ...SIGNED_IN, scope: "File rules (fileLink/startUpload check the actor)" },
  currentPoster: { ...SIGNED_IN, scope: "Company the person belongs to (currentPoster)" },
  can: { kind: "permission", who: "Holder of the named permission", scope: "Company passed to can()" },
  assertCan: { kind: "permission", who: "Holder of the named permission", scope: "Company passed to assertCan()" },
  isInternalKey: { kind: "internal", who: "Worker (internal key)", scope: "None (system job)" },
  receiveWebhook: {
    kind: "webhook",
    who: "Payment provider (signed webhook)",
    scope: "Payment named in the signed body",
  },
  readRegistrationToken: LINK,
  checkReportLink: LINK,
  turnOffAlert: LINK,
  unsubscribe: LINK,
  confirmNewEmail: LINK,
  toNextJsHandler: { kind: "delegated", who: "Anyone; Better Auth checks each call", scope: "Own account" },
  REST_GET: { kind: "delegated", who: "Payload access rules (cms/auth-strategy)", scope: "None (content)" },
  REST_POST: { kind: "delegated", who: "Payload access rules (cms/auth-strategy)", scope: "None (content)" },
  REST_PATCH: { kind: "delegated", who: "Payload access rules (cms/auth-strategy)", scope: "None (content)" },
  REST_PUT: { kind: "delegated", who: "Payload access rules (cms/auth-strategy)", scope: "None (content)" },
  REST_DELETE: { kind: "delegated", who: "Payload access rules (cms/auth-strategy)", scope: "None (content)" },
  REST_OPTIONS: { kind: "delegated", who: "Payload access rules (cms/auth-strategy)", scope: "None (content)" },
  checkForm: { kind: "form", who: "Anyone (public form: checkForm)", scope: "None (public)" },
};

/** Method calls that count as a permission check (`actor.operator.has(p)`, `seat.permissions.has(p)`). */
const PERMISSION_CALL = /\.(operator\.has|permissions\.has|can)$/;

const PERMISSION_NAMES = new Set(["requireOperator", "can", "assertCan", "operator.has", "permissions.has"]);

/** Order used to pick the line's "who" and "scope": the strongest guard wins. */
const RANK: GuardKind[] = [
  "operator",
  "supplier",
  "buyer",
  "team",
  "internal",
  "webhook",
  "member",
  "signed-in",
  "permission",
  "signed-link",
  "delegated",
  "form",
];

/**
 * Entries with no guard that are public on purpose, keyed `file#export` (file relative to apps/web/src;
 * `#*` covers every export of the file). Each has a one-line reason. Keep this list short.
 */
export const PUBLIC: Record<string, string> = {
  "app/sitemap.xml/route.ts#GET": "Sitemap index: published public URLs only.",
  "app/sitemaps/[file]/route.ts#GET": "Sitemap files: published public URLs only.",
  "app/api/health/route.ts#GET": "Health check for the load balancer; returns no data.",
  "app/(app)/(site)/events/[slug]/ics/route.ts#GET": "Calendar file for a published event.",
  "app/(app)/(site)/states/compare/csv/route.ts#GET": "CSV of published state policy data, same as the page.",
  "app/(app)/(site)/tracker/[view]/csv/route.ts#GET": "CSV of published tracker records, same as the page.",
  "app/(app)/(site)/tracker/changes/csv/route.ts#GET": "CSV of published tracker changes, same as the page.",
  "app/api/v1/pageview/route.ts#POST": "Anonymous page-view counter; stores no person (bots dropped).",
  "app/api/v1/search/suggest/route.ts#GET": "Public search suggestions from published documents; rate limited.",
  "app/(app)/(auth)/sign-out/route.ts#GET": "Ends the caller's own session; nothing to protect.",
  "app/(app)/(auth)/join/actions.ts#*":
    "Join flow before an account exists: draft cookie, code checks and rate limits in core (step 3.3).",
  "app/(app)/(auth)/forgot-access/actions.ts#*":
    "Account recovery before sign-in: recovery cookie, factor checks and limits in core (step 3.2).",
  "app/api/newsletter/unsubscribe/route.ts#GET":
    "Redirects a person opening the link to the confirm page; changes nothing (the POST checks the token).",
  "rfq/actions.ts#suppliersAction":
    "RFQ wizard works signed out: lists verified suppliers, as the public directory does.",
  "rfq/actions.ts#specFieldsAction": "RFQ wizard works signed out: a category's public attribute schema.",
  "trust/actions.ts#checkComplaint":
    "Grievance status needs the ticket and the email together; rate limited (step 5.8).",
  "server/public-forms.ts#*": "Newsletter and consent forms: checkForm, rate limits and confirmation links.",
};

export type Entry = {
  file: string;
  name: string;
  kind: "route" | "action";
  guards: string[];
  who: string;
  scope: string;
  publicReason?: string;
};

const HTTP = new Set(["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"]);

function walk(dir: string, out: string[] = []): string[] {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name !== "node_modules") walk(p, out);
    } else if (/\.tsx?$/.test(e.name) && !/\.test\.tsx?$/.test(e.name)) out.push(p);
  }
  return out;
}

function hasExport(node: ts.Node): boolean {
  return (
    (ts.canHaveModifiers(node) && ts.getModifiers(node)?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)) ?? false
  );
}

function calleeName(call: ts.CallExpression): string | null {
  const e = call.expression;
  if (ts.isIdentifier(e)) return e.text;
  if (ts.isPropertyAccessExpression(e)) return e.getText().replace(/\s+/g, "");
  return null;
}

/** Every call name made inside `node`, following calls to functions declared at the top of the same file. */
function callsIn(node: ts.Node, locals: Map<string, ts.Node>, seen = new Set<string>()): Set<string> {
  const out = new Set<string>();
  const visit = (n: ts.Node) => {
    if (ts.isCallExpression(n)) {
      const name = calleeName(n);
      if (name) {
        out.add(name);
        const local = locals.get(name);
        if (local && !seen.has(name)) {
          seen.add(name);
          for (const c of callsIn(local, locals, seen)) out.add(c);
        }
      }
    }
    ts.forEachChild(n, visit);
  };
  visit(node);
  return out;
}

function guardsOf(calls: Set<string>): string[] {
  const found = new Set<string>();
  for (const c of calls) {
    if (c in GUARDS) found.add(c);
    else {
      const m = PERMISSION_CALL.exec(c);
      if (m?.[1]) found.add(m[1]);
    }
  }
  return [...found].sort();
}

function describe(guards: string[]): { who: string; scope: string } {
  const known = guards.map(
    (g): Guard =>
      GUARDS[g] ?? { kind: "permission", who: "Holder of the named permission", scope: "Company passed to the check" },
  );
  for (const kind of RANK) {
    const g = known.find((k) => k.kind === kind);
    if (g) {
      const permission = guards.some((x) => PERMISSION_NAMES.has(x));
      const who = g.kind === "operator" && permission ? "Operator with the named permission" : g.who;
      return { who, scope: g.scope };
    }
  }
  return { who: "Anyone", scope: "None (public)" };
}

/** Scan apps/web/src. `srcDir` is the absolute path to it. */
export function scanRoutes(srcDir: string): Entry[] {
  const entries: Entry[] = [];
  for (const abs of walk(srcDir).sort()) {
    const file = path.relative(srcDir, abs).split(path.sep).join("/");
    const text = fs.readFileSync(abs, "utf8");
    const isRoute = file.startsWith("app/") && path.basename(file) === "route.ts";
    const isAction = /^\s*(\/\/[^\n]*\n\s*)*["']use server["']/.test(text);
    if (!isRoute && !isAction) continue;
    const sf = ts.createSourceFile(abs, text, ts.ScriptTarget.Latest, true);

    const locals = new Map<string, ts.Node>();
    const exported: { name: string; node: ts.Node }[] = [];
    for (const st of sf.statements) {
      if (ts.isFunctionDeclaration(st) && st.name) {
        locals.set(st.name.text, st);
        if (hasExport(st)) exported.push({ name: st.name.text, node: st });
      } else if (ts.isVariableStatement(st)) {
        for (const d of st.declarationList.declarations) {
          const names = ts.isIdentifier(d.name)
            ? [d.name.text]
            : ts.isObjectBindingPattern(d.name)
              ? d.name.elements.map((el) => el.name.getText())
              : [];
          for (const n of names) {
            locals.set(n, d);
            if (hasExport(st)) exported.push({ name: n, node: d });
          }
        }
      }
    }

    for (const { name, node } of exported) {
      if (isRoute && !HTTP.has(name)) continue;
      if (!isRoute && ts.isVariableDeclaration(node)) {
        const init = node.initializer;
        if (!init || !(ts.isArrowFunction(init) || ts.isFunctionExpression(init))) continue;
      }
      const guards = guardsOf(callsIn(node, locals, new Set([name])));
      const publicReason = PUBLIC[`${file}#${name}`] ?? PUBLIC[`${file}#*`];
      entries.push({ file, name, kind: isRoute ? "route" : "action", guards, ...describe(guards), publicReason });
    }
  }
  return entries;
}

/** Entries with no guard that aren't allow-listed: these fail the test. */
export function unguarded(entries: Entry[]): Entry[] {
  return entries.filter((e) => e.guards.length === 0 && !e.publicReason);
}

/**
 * Allow-list keys that cover no unguarded entry (a renamed or deleted file, or one that now has a guard): these
 * fail the test too, so the list stays short and true.
 */
export function staleAllowList(entries: Entry[]): string[] {
  return Object.keys(PUBLIC).filter((key) => {
    const [file, name] = key.split("#");
    return !entries.some((e) => e.file === file && (name === "*" || e.name === name) && e.guards.length === 0);
  });
}

function routePath(file: string): string {
  const p = file
    .replace(/^app\//, "")
    .replace(/\/route\.ts$/, "")
    .split("/")
    .filter((s) => !/^\(.*\)$/.test(s))
    .join("/");
  return `/${p}`;
}

const cell = (s: string) => s.replace(/\\/g, "\\\\").replace(/\|/g, "\\|");

export function renderMarkdown(entries: Entry[]): string {
  const routes = entries.filter((e) => e.kind === "route");
  const actions = entries.filter((e) => e.kind === "action");
  const pub = entries.filter((e) => e.publicReason && e.guards.length === 0);
  const guarded = entries.filter((e) => e.guards.length > 0);
  const row = (e: Entry) => {
    const name = e.kind === "route" ? `${e.name} ${routePath(e.file)}` : `${e.name} (${e.file})`;
    const guard = e.guards.length ? e.guards.map((g) => `\`${g}\``).join(", ") : "none";
    const who = e.guards.length || !e.publicReason ? e.who : `Anyone: ${e.publicReason}`;
    return `| ${cell(name)} | ${cell(who)} | ${cell(e.scope)} | ${cell(guard)} |`;
  };
  const head =
    "| Route or action | Who may call it | Company scope comes from | Guard found |\n| --- | --- | --- | --- |";
  return [
    "# API routes and server actions",
    "",
    "Generated by `pnpm tsx scripts/route-inventory.ts` (playbook step 12.1). Do not edit by hand.",
    "",
    `${routes.length} route handlers and ${actions.length} server actions: ${guarded.length} call a guard, ` +
      `${pub.length} are public on purpose (allow-list in \`apps/web/src/security/route-inventory.ts\`).`,
    "",
    "A guard is a call the scanner recognises in the handler or a helper in the same file. " +
      "Where the guard only signs the person in (`operatorSession`, `getSession`, `loadActor`), the core function " +
      "it calls checks the permission and company with `can()` and `scopeFor()`. `route-inventory.test.ts` fails " +
      "when a new entry has neither a guard nor an allow-list reason.",
    "",
    "## Route handlers",
    "",
    head,
    ...routes.map(row),
    "",
    "## Server actions",
    "",
    head,
    ...actions.map(row),
    "",
  ].join("\n");
}

/** The table as written to docs/security/routes.md: rendered, then formatted with the repo's Prettier settings. */
export async function routesDoc(entries: Entry[], docPath: string): Promise<string> {
  const options = (await resolveConfig(docPath)) ?? {};
  return format(renderMarkdown(entries), { ...options, parser: "markdown" });
}
