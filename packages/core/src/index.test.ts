import { describe, expect, it } from "vitest";
import { PRODUCT_NAME } from "./index";

describe("core", () => {
  it("knows the product name", () => {
    expect(PRODUCT_NAME).toBe("H2 India");
  });
});
