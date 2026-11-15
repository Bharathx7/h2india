import { check, sleep } from "k6";
import http from "k6/http";
import { BASE, options, pick, think, WORDS } from "./common.js";

// Search (step 5.2): the overlay's suggestions as someone types, then the results page.
export { options };

export default function () {
  const word = pick(WORDS);
  for (let i = 3; i <= word.length; i += 2) {
    const r = http.get(`${BASE}/api/v1/search/suggest?q=${encodeURIComponent(word.slice(0, i))}`, {
      tags: { name: "suggest" },
    });
    check(r, { "suggest 200": (x) => x.status === 200 });
  }
  const page = http.get(`${BASE}/search?q=${encodeURIComponent(word)}`, { tags: { name: "search page" } });
  check(page, { "search page 200": (x) => x.status === 200 });
  sleep(think());
}
