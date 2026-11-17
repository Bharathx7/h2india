import { describe, expect, it } from "vitest";
import { isMemberFacts, mayUseMemberFeatures, memberJoinHref } from "./membership-rules";

// Founder QC, 17 Nov 2026: member features are for members; buyers and suppliers join as members; staff see all.
describe("membership", () => {
  const at = new Date("2026-11-17T00:00:00Z");

  it("counts members, and buyers or suppliers who joined as members", () => {
    expect(isMemberFacts({ profileType: "member", memberSince: null })).toBe(true);
    expect(isMemberFacts({ profileType: "buyer", memberSince: null })).toBe(false);
    expect(isMemberFacts({ profileType: "supplier", memberSince: at })).toBe(true);
    expect(isMemberFacts({ profileType: null, memberSince: null })).toBe(false);
  });

  it("lets staff open member features without joining", () => {
    expect(mayUseMemberFeatures({ profileType: null, memberSince: null, operator: true })).toBe(true);
    expect(mayUseMemberFeatures({ profileType: "buyer", memberSince: null, operator: false })).toBe(false);
  });

  it("sends people to Join as member and back", () => {
    expect(memberJoinHref("/directory/companies?state=gujarat")).toBe(
      "/member/join?next=%2Fdirectory%2Fcompanies%3Fstate%3Dgujarat",
    );
  });
});
