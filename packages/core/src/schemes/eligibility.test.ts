import { describe, expect, it } from "vitest";
import { matchSchemes, parseAnswers, stateName, type Answers, type EligibilityRules } from "./eligibility";

// Step 5.4 DONE WHEN: the eligibility checker returns results only from stored rules; with no rules it says so. These
// rules are test fixtures, not real scheme criteria (M25).

const answers: Answers = {
  organisation: "manufacturer",
  state: "uttar-pradesh",
  otherStates: false,
  activity: "electrolysers",
  size: "small",
  startup: "yes",
  stage: "pilot",
};

const scheme = (id: string, status: string, rules: EligibilityRules | null) => ({ id, status, rules });

describe("eligibility checker", () => {
  it("matches nothing, and says so, when no scheme has checked rules", () => {
    const result = matchSchemes(answers, [
      scheme("a", "Open", null),
      scheme("b", "Open", { checked: false, organisations: ["manufacturer"] }),
    ]);
    expect(result).toEqual({ ruled: 0, matches: [] });
  });

  it("gives a strong match only when every stored rule is met and the scheme is open", () => {
    const result = matchSchemes(answers, [
      scheme("up", "Open", {
        checked: true,
        organisations: ["manufacturer", "producer"],
        states: ["uttar-pradesh"],
        stages: ["pilot", "first-plant"],
        checkNext: ["The minimum investment in the policy notice"],
      }),
    ]);
    expect(result.ruled).toBe(1);
    expect(result.matches[0]).toMatchObject({
      strength: "strong",
      why: ["Open to equipment manufacturers", "Your plant is in Uttar Pradesh", "Pilot or prototype projects fit"],
      checkNext: ["The minimum investment in the policy notice"],
    });
  });

  it("never shows a scheme whose rules the answers fail", () => {
    const result = matchSchemes(answers, [
      scheme("gj", "Open", { checked: true, states: ["gujarat"] }),
      scheme("steel", "Open", { checked: true, activities: ["industry"] }),
      scheme("big", "Open", { checked: true, sizes: ["large"] }),
      scheme("closed", "Closed", { checked: true }),
    ]);
    expect(result.matches).toEqual([]);
    expect(result.ruled).toBe(4);
  });

  it("makes uncertain answers and rounds not open yet possible matches, listed after strong ones", () => {
    const result = matchSchemes({ ...answers, size: "not-sure", startup: "applied" }, [
      scheme("msme", "Open", { checked: true, sizes: ["micro", "small"] }),
      scheme("dpiit", "Closing soon", { checked: true, dpiitOnly: true }),
      scheme("next", "Next round expected", { checked: true, activities: ["electrolysers"] }),
      scheme("any", "Open", { checked: true }),
    ]);
    expect(result.matches.map((m) => [m.scheme.id, m.strength])).toEqual([
      ["any", "strong"],
      ["msme", "possible"],
      ["dpiit", "possible"],
      ["next", "possible"],
    ]);
    expect(result.matches.find((m) => m.scheme.id === "msme")?.checkNext).toEqual([
      "Whether your company's size qualifies",
    ]);
  });

  it("treats another state as possible only when the person also invests elsewhere", () => {
    const rules = { checked: true, states: ["odisha"] };
    expect(matchSchemes(answers, [scheme("od", "Open", rules)]).matches).toEqual([]);
    const elsewhere = matchSchemes({ ...answers, otherStates: true }, [scheme("od", "Open", rules)]);
    expect(elsewhere.matches[0]).toMatchObject({ strength: "possible", checkNext: ["Whether you invest in Odisha"] });
  });

  it("treats all-India schemes as open to every state", () => {
    const result = matchSchemes(answers, [scheme("india", "Open", { checked: true, states: ["all-india"] })]);
    expect(result.matches[0]?.strength).toBe("strong");
  });

  it("reads answers only from the drawn options", () => {
    const q = {
      organisation: "manufacturer",
      state: "uttar-pradesh",
      activity: "electrolysers",
      size: "small",
      startup: "yes",
      stage: "pilot",
    };
    expect(parseAnswers(q)).toEqual({ ...answers });
    expect(parseAnswers({ ...q, otherStates: "yes" })?.otherStates).toBe(true);
    expect(parseAnswers({ ...q, size: "huge" })).toBeNull();
    expect(parseAnswers({ ...q, state: "<script>" })).toBeNull();
    expect(stateName("dadra-and-nagar-haveli-and-daman-and-diu")).toBe("Dadra and Nagar Haveli and Daman and Diu");
  });
});
