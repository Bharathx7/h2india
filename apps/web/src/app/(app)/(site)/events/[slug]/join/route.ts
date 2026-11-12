import { getDb } from "@h2india/core";
import { joinOpensAt, readRegistrationToken, registrationById } from "@h2india/core/events";
import { NextResponse } from "next/server";
import { appUrl, getEvent } from "@/events/data";
import { clock } from "@/events/views";

// GET /events/<slug>/join?t=…: the join link in the confirmation and reminders (676:83). Only a registered person's
// signed link opens the meeting, from 15 minutes before the start; before that it says when it opens.
export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const e = await getEvent((await params).slug);
  const id = readRegistrationToken(new URL(request.url).searchParams.get("t"), "join");
  const r = id ? await registrationById(getDb(), id) : null;
  if (!e || !r || r.eventId !== e.id || r.cancelledAt || !e.webinar?.joinUrl) {
    return NextResponse.redirect(`${appUrl()}/events/${e?.slug ?? ""}`);
  }
  const opens = joinOpensAt(new Date(e.startsAt));
  const esc = (text: string) => text.replace(/[&<>"']/g, (c) => `&#${String(c.charCodeAt(0))};`);
  if (new Date() < opens) {
    return new Response(
      `<!doctype html><meta charset="utf-8"><title>${esc(e.name)}</title><body style="font-family:system-ui;padding:2rem"><p>The join link opens at ${clock(opens.toISOString())} IST. Come back then, or use the link in your reminder.</p><p><a href="${esc(`${appUrl()}/events/${e.slug}`)}">Back to the webinar</a></p></body>`,
      { headers: { "content-type": "text/html; charset=utf-8" } },
    );
  }
  return NextResponse.redirect(e.webinar.joinUrl);
}
