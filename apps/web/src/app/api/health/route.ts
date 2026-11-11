// Liveness check. Step 1.7 adds database, queue and storage status.
export function GET() {
  return Response.json({ status: "ok" });
}
