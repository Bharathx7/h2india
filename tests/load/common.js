// Shared settings for the k6 load tests (step 12.5). Run against staging, never production:
//   k6 run -e BASE_URL=https://staging.example -e VUS=50 tests/load/search.js
// VUS defaults to 50 concurrent visitors (ten times a pilot of about five: M13 is open). Thresholds are the playbook's
// defaults: p95 under one second, errors under 0.1%.

export const BASE = __ENV.BASE_URL || "http://localhost:3000";
const VUS = Number(__ENV.VUS || 50);

export const options = {
  scenarios: {
    ramp: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "1m", target: VUS },
        { duration: "3m", target: VUS },
        { duration: "30s", target: 0 },
      ],
      gracefulRampDown: "10s",
    },
  },
  thresholds: {
    http_req_duration: ["p(95)<1000"],
    http_req_failed: ["rate<0.001"],
    checks: ["rate>0.999"],
  },
};

/** One visitor reads for a few seconds between pages. */
export function think() {
  return 1 + Math.random() * 3;
}

export const WORDS = [
  "electrolyser",
  "fuel cell",
  "compressor",
  "valve",
  "storage",
  "PEM",
  "alkaline",
  "tender",
  "SIGHT",
];
export const pick = (list) => list[Math.floor(Math.random() * list.length)];
