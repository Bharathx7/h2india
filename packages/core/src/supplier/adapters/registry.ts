// The company-records adapter (step 8.2): checks a PAN or CIN against the Ministry of Corporate Affairs records and the
// company's legal name. The provider is decision M4; until then the fake answers from the number's format, as the
// GSTIN fake does (step 3.3). Never call a provider from anywhere else.

export interface RegistryResult {
  result: "pass" | "fail" | "unavailable";
  detail: string;
}

export interface RegistryAdapter {
  check(input: { kind: "pan" | "cin"; number: string; legalName: string }): Promise<RegistryResult>;
}

const PAN = /^[A-Z]{5}\d{4}[A-Z]$/;
const CIN = /^[LU]\d{5}[A-Z]{2}\d{4}[A-Z]{3}\d{6}$/;

export const fakeRegistry: RegistryAdapter = {
  check: ({ kind, number }) => {
    const n = number.replace(/\s+/g, "").toUpperCase();
    const ok = (kind === "pan" ? PAN : CIN).test(n);
    return Promise.resolve(
      ok
        ? { result: "pass", detail: `${kind.toUpperCase()} found and the name matches (test records)` }
        : { result: "fail", detail: `${kind.toUpperCase()} is not in the expected format` },
    );
  },
};

let current: RegistryAdapter = fakeRegistry;
export const registry = () => current;
/** Tests and the M4 provider swap the adapter here. */
export function useRegistry(adapter: RegistryAdapter) {
  current = adapter;
}
