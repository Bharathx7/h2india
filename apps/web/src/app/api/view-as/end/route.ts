import { getDb } from "@h2india/core";
import { endViewAs } from "@h2india/core/admin/users";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { operatorSession, VIEW_AS_COOKIE } from "@/server/auth";
import { siteUrl } from "@/server/origin";
import { requestContext } from "@/server/request-context";

// POST /api/view-as/end: ends View as user (657:486) and returns the operator to the person's page in Users.
export async function POST(request: Request) {
  const jar = await cookies();
  const token = jar.get(VIEW_AS_COOKIE)?.value;
  const session = await operatorSession();
  let back = "/admin/users";
  if (token && session) {
    await endViewAs(getDb(), token, session.user.id, await requestContext());
    const userId = new URL(request.url).searchParams.get("user");
    if (userId && /^[0-9a-f-]{36}$/i.test(userId)) back = `/admin/users/${userId}`;
  }
  jar.delete(VIEW_AS_COOKIE);
  jar.delete("h2_view_as_display");
  return NextResponse.redirect(siteUrl(back), { status: 303 });
}
