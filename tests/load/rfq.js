import { check, sleep } from "k6";
import http from "k6/http";
import { BASE, options, think } from "./common.js";

// The RFQ wizard (step 9.4) as a signed-out buyer starts it: the wizard page and its supplier and category lookups.
// Sending an RFQ needs a signed-in buyer and an operator's approval, so sending is measured by the browser flow
// (flow A) rather than here; the wizard's own requests are what load the server.
export { options };

export default function () {
  const r = http.get(`${BASE}/rfq/new`, { tags: { name: "rfq wizard" } });
  check(r, { "wizard 200": (x) => x.status === 200 });
  const s = http.get(`${BASE}/api/v1/search/suggest?q=electro&scope=products`, { tags: { name: "rfq lookup" } });
  check(s, { "lookup 200": (x) => x.status === 200 });
  sleep(think());
}
