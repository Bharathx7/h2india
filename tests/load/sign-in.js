import { check, sleep } from "k6";
import http from "k6/http";
import { BASE, options, think } from "./common.js";

// Sign-in (step 3.2): the sign-in page and asking for an email code. The per-IP and per-email limits are part of what
// is measured: from one load machine, 429 answers are expected once the limit is reached, and count as correct.
// Run with STAGING mail (codes go to the staging catcher), never against real inboxes.
export { options };

export default function () {
  const page = http.get(`${BASE}/sign-in`, { tags: { name: "sign-in page" } });
  check(page, { "page 200": (x) => x.status === 200 });
  const email = `load-${__VU}-${__ITER}@example.com`;
  const r = http.post(`${BASE}/api/auth/email-otp/send-verification-otp`, JSON.stringify({ email, type: "sign-in" }), {
    headers: { "content-type": "application/json", origin: BASE },
    tags: { name: "send code" },
    responseCallback: http.expectedStatuses(200, 429),
  });
  check(r, { "code sent or limited": (x) => x.status === 200 || x.status === 429 });
  sleep(think());
}
