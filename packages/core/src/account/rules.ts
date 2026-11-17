import { JOB_ROLES } from "../companies/rules";

// Account details (founder QC, 17 Nov 2026): every signed-in person (buyer, supplier, member, staff) can change the
// name others see and their job role from Account. Safe to import in the browser.

export const ACCOUNT_NAME_MAX = 120;

export interface AccountDetailsInput {
  name: string;
  jobRole: string | null;
}

/** Problems by field, in the words the form shows; empty when the details can be saved. */
export function accountDetailsProblems(input: AccountDetailsInput): Partial<Record<keyof AccountDetailsInput, string>> {
  const problems: Partial<Record<keyof AccountDetailsInput, string>> = {};
  const name = input.name.trim();
  if (name.length < 2) problems.name = "Enter your full name";
  else if (name.length > ACCOUNT_NAME_MAX) problems.name = `Use at most ${String(ACCOUNT_NAME_MAX)} characters`;
  if (input.jobRole !== null && !(JOB_ROLES as readonly string[]).includes(input.jobRole))
    problems.jobRole = "Choose a role from the list";
  return problems;
}

export { JOB_ROLES };
