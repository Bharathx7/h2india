import { onDeadline } from "../clocks/clocks";
import { enqueue, QUEUES } from "../queue/queues";
import { REMINDER_TYPE } from "./registrations";

// Webinar reminders (676:83 variants, WhatsApp 676:459; step 5.7). The deadline engine fires "warn" one day before and
// "expire" one hour before the start. The handler runs inside the claim's transaction, so it only queues a job with a
// stable id (a retried claim can't queue it twice); the worker hands the job to the web app, which renders and sends
// it and marks the registration so it is sent at most once. Imported by the schedule so the worker registers it.

onDeadline(REMINDER_TYPE, async (_tx, deadline, event) => {
  const which = event === "warn" ? "day" : "hour";
  const queued = await enqueue(
    QUEUES.notify,
    "webinar-reminder",
    { registrationId: deadline.subjectId, which },
    { jobId: `webinar-reminder-${deadline.subjectId}-${which}` },
  );
  // Redis down: throwing leaves the deadline unclaimed, so the next tick tries again.
  if (!queued) throw new Error("could not queue the webinar reminder");
});
