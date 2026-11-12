import { appUrl, getEvent } from "@/events/data";
import { icsFile } from "@/events/views";

// GET /events/<slug>/ics: "Apple (.ics)" and Add to calendar (729:11207, 732:939, email 676:83).
export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const e = await getEvent((await params).slug);
  if (!e) return new Response("Not found", { status: 404 });
  return new Response(icsFile(e, `${appUrl()}/events/${e.slug}`), {
    headers: {
      "content-type": "text/calendar; charset=utf-8",
      "content-disposition": `attachment; filename="${e.slug}.ics"`,
    },
  });
}
