// The bank account check (step 8.6): a ₹1 test deposit or a name lookup returns the name on the account and the
// branch. The provider and method are decision M4; until then the fake answers predictably: an account number of all
// zeros fails, and otherwise the bank returns the holder name as typed.

export interface BankCheck {
  result: "match" | "mismatch" | "unavailable";
  /** The name the bank returned. */
  nameOnAccount: string | null;
  branch: string | null;
  method: string;
}

export interface BankAdapter {
  check(input: { accountNumber: string; ifsc: string; holderName: string; legalName: string }): Promise<BankCheck>;
}

const norm = (s: string) =>
  s
    .toUpperCase()
    .replace(/\b(PRIVATE|PVT|LIMITED|LTD|LLP)\b\.?/g, "")
    .replace(/[^A-Z0-9]/g, "");

export const fakeBank: BankAdapter = {
  check: ({ accountNumber, ifsc, holderName, legalName }) => {
    const name = /^0+$/.test(accountNumber)
      ? `${holderName.split(" ")[0] ?? "OTHER"} HYDROGEN SOLUTIONS`
      : holderName.toUpperCase();
    return Promise.resolve({
      result: norm(name) === norm(legalName) ? "match" : "mismatch",
      nameOnAccount: name,
      branch: `Branch ${ifsc.slice(-4)}`,
      method: `Test deposit of ₹1`,
    });
  },
};

let current: BankAdapter = fakeBank;
export const bankAdapter = () => current;
export function useBankAdapter(adapter: BankAdapter) {
  current = adapter;
}
