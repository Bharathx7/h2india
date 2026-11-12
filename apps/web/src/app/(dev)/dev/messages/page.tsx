import { getDb } from "@h2india/core";

import { TEMPLATES, templateStatus, type TemplateId } from "@h2india/core/notify";
import { StatusBadge } from "@h2india/ui";
import Link from "next/link";
import { getSession } from "@/server/auth";
import { SendButton } from "./SendButton";

// Message registry (step 3.9): every template on Figma page 16 and the undrawn ones (M21), with its key, frame,
// the step that builds it and its provider approval. "Send to me" renders sample content and sends it to you.

const TONE = { Approved: "success", "In review": "warning", Rejected: "error", "Not submitted": "neutral" } as const;

export default async function MessagesPage() {
  const session = await getSession();
  const ids = Object.keys(TEMPLATES) as TemplateId[];
  const statuses = await Promise.all(ids.map((id) => templateStatus(getDb(), id)));
  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-6 p-6 md:p-10">
      <header className="flex flex-col gap-2">
        <p className="type-eyebrow text-secondary">Step 3.9 · Figma page 16 (365:21)</p>
        <h1 className="type-h1">Message templates</h1>
        <p className="type-body text-body">
          Built templates can be sent to you with sample content, through the real channels, approvals and delivery log.
          Locally, email, SMS and WhatsApp all arrive in Mailpit.
        </p>
        {session ? null : (
          <p className="type-body-sm text-secondary">
            <Link className="text-link underline" href="/sign-in?next=/dev/messages">
              Sign in
            </Link>{" "}
            to send tests to yourself.
          </p>
        )}
      </header>
      <div className="overflow-x-auto rounded-card border border-default">
        <table className="w-full border-collapse type-body-sm">
          <thead className="bg-subtle text-left">
            <tr>
              {["Template", "Channel", "Key", "Frame", "Step", "Approval", ""].map((h) => (
                <th key={h} scope="col" className="px-4 py-3 type-label text-secondary">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ids.map((id, i) => {
              const t = TEMPLATES[id];
              return (
                <tr key={id} className="border-t border-default">
                  <td className="px-4 py-3 text-primary">{t.name}</td>
                  <td className="px-4 py-3 capitalize">{t.channel === "sms" ? "SMS" : t.channel}</td>
                  <td className="px-4 py-3 type-spec">{t.key}</td>
                  <td className="px-4 py-3 type-spec">{t.frame ?? "not drawn"}</td>
                  <td className="px-4 py-3">{t.step}</td>
                  <td className="px-4 py-3">
                    {t.channel === "email" ? (
                      "—"
                    ) : (
                      <StatusBadge
                        status={statuses[i] ?? "Not submitted"}
                        tone={TONE[statuses[i] ?? "Not submitted"]}
                      />
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {t.built ? (
                      session ? (
                        <SendButton template={id} />
                      ) : null
                    ) : (
                      <span className="text-secondary">Step {t.step}</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </main>
  );
}
