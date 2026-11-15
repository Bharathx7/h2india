import { isAwsS3 } from "@h2india/config";
import { describe, expect, it } from "vitest";
import { sniffType, startsWithSvg } from "./sniff";

// The SVG check runs on the uploader's bytes, so it must be linear (CodeQL js/redos, step 12.1).
describe("SVG sniffing", () => {
  it("finds <svg> after a declaration, comments and a doctype", () => {
    expect(startsWithSvg('<svg xmlns="http://www.w3.org/2000/svg"/>')).toBe(true);
    expect(startsWithSvg('﻿  <?xml version="1.0"?>\n<!-- a --><!DOCTYPE svg><!-- b -->\n<svg>')).toBe(true);
    expect(startsWithSvg("<SVG\n>")).toBe(true);
    expect(sniffType(Buffer.from('<?xml version="1.0"?><svg width="1"></svg>'))).toBe("image/svg+xml");
  });

  it("refuses anything else", () => {
    expect(startsWithSvg("<html><svg>")).toBe(false);
    expect(startsWithSvg("<!-- never closed <svg>")).toBe(false);
    expect(startsWithSvg("<svgx>")).toBe(false);
    expect(startsWithSvg("")).toBe(false);
  });

  it("answers at once on the input that made the old pattern backtrack", () => {
    const evil = `<!--${"--><!--".repeat(5000)}`;
    const start = performance.now();
    expect(startsWithSvg(evil)).toBe(false);
    expect(performance.now() - start).toBeLessThan(200);
  });
});

describe("storage host", () => {
  it("treats only amazonaws.com hosts as AWS", () => {
    expect(isAwsS3("https://s3.ap-south-1.amazonaws.com")).toBe(true);
    expect(isAwsS3("http://localhost:9000")).toBe(false);
    expect(isAwsS3("https://amazonaws.com.evil.example")).toBe(false);
    expect(isAwsS3("https://minio.example/amazonaws.com")).toBe(false);
    expect(isAwsS3("not a url")).toBe(false);
  });
});
