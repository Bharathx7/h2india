import { legalPage } from "./data";

/** The Terms of use version a person accepts at Join (step 5.8): the published one, or "unpublished" until M2. */
export async function currentTermsVersion(): Promise<string> {
  return (await legalPage("terms"))?.version ?? "unpublished";
}
