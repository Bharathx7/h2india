import { expect, type APIRequestContext, type Page } from "@playwright/test";
import { signInNew } from "./join";
import { newEmail, withDb } from "./sign-in";

// Step 4: an operator with a CMS role, and small helpers for the CMS REST API at /api/cms.

export async function signInOperator(
  page: Page,
  role: "Content editor" | "Editor-in-chief" | "Super admin" | "Catalogue moderator",
) {
  const email = newEmail(role.toLowerCase().replace(/\W+/g, "-"));
  await signInNew(page, email);
  await withDb((db) =>
    db.query(
      `INSERT INTO core.operator_roles (user_id, role_id)
       SELECT u.id, r.id FROM core.users u, core.roles r WHERE u.email = $1 AND r.scope = 'operator' AND r.name = $2`,
      [email, role],
    ),
  );
  return email;
}

export function paragraph(text: string) {
  return {
    root: {
      type: "root",
      format: "",
      indent: 0,
      version: 1,
      direction: "ltr",
      children: [
        {
          type: "paragraph",
          format: "",
          indent: 0,
          version: 1,
          direction: "ltr",
          textFormat: 0,
          children: [{ type: "text", text, format: 0, style: "", mode: "normal", detail: 0, version: 1 }],
        },
      ],
    },
  };
}

export async function cms(request: APIRequestContext, method: "POST" | "PATCH" | "GET", path: string, data?: unknown) {
  const res = await request.fetch(`/api/cms/${path}`, {
    method,
    data: data === undefined ? undefined : JSON.stringify(data),
    headers: { "content-type": "application/json" },
  });
  const body = (await res.json().catch(() => ({}))) as {
    doc?: { id: number; _status?: string };
    errors?: { message: string }[];
  };
  return { status: res.status(), body };
}

export async function newAuthor(request: APIRequestContext, name = "Kavita Rao") {
  const res = await cms(request, "POST", "authors", { name, slug: `${name}-${String(Date.now())}`, kind: "staff" });
  expect(res.status).toBe(201);
  return res.body.doc?.id ?? 0;
}
