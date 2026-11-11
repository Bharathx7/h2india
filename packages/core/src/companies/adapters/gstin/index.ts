import { fakeGstinProvider } from "./fake";
import type { GstinProvider } from "./types";

export { FAKE_GSTINS } from "./fake";
export * from "./types";

/** The GSTIN provider in use. Only the fake exists until decision M4 picks a provider. */
export function gstinProvider(): GstinProvider {
  return fakeGstinProvider;
}
