import { describe, expect, it } from "vitest";
import { cleanSponsor, NewsletterSendError } from "./sends";

describe("the sponsor slot (648:312)", () => {
  it("is empty when nothing is filled in", () => {
    expect(cleanSponsor({ name: " ", headline: "", text: "", url: "" })).toBeNull();
    expect(cleanSponsor(null)).toBeNull();
  });
  it("needs a name, a headline and an https link", () => {
    expect(() => cleanSponsor({ name: "Pranava H2", headline: "", text: "", url: "https://example.org" })).toThrow(
      NewsletterSendError,
    );
    expect(() =>
      cleanSponsor({ name: "Pranava H2", headline: "PDC-500", text: "", url: "http://example.org" }),
    ).toThrow("https://");
    expect(
      cleanSponsor({
        name: " Pranava H2 ",
        headline: "PDC-500 compressor",
        text: "Oil-free",
        url: "https://example.org/x",
      }),
    ).toEqual({ name: "Pranava H2", headline: "PDC-500 compressor", text: "Oil-free", url: "https://example.org/x" });
  });
});
