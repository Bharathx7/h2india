# Test GSTINs (fake provider)

Step 3.3. Until the GSTIN provider is chosen (decision M4), `packages/core/src/companies/adapters/gstin/fake.ts`
answers instead of the GST portal. These GSTINs reach every designed state of the GSTIN step (Figma 526:8).
All names are invented.

| State on the board               | Type this GSTIN                                                             | What happens                                                 |
| -------------------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------ |
| 1 · Valid                        | `27AAKCG5521M1Z9`                                                           | Greenfield Mobility Solutions Private Limited, Pune          |
| 1 · Valid (any number of times)  | any valid GSTIN with PAN `AAKCT` + 4 digits + a letter                      | "Test Hydrogen … Private Limited"; used by the browser tests |
| 2 · Invalid format               | `27AAKCG5521M1Z3` (wrong check character), or 14 characters                 | "A GSTIN has 15 characters, like 27AAKCG5521M1Z3"            |
| 3 · Not found                    | `27AAKCN0000N1ZK`                                                           | Continue without a GSTIN                                     |
| 4 · Cancelled / inactive         | `29AABCK7731F1ZH` / `07AABCI1234Q1ZG`                                       | Suppliers stop; buyers may continue unverified               |
| 5 · Already registered           | any GSTIN (or another GSTIN with the same PAN) of a company already created | Request to join                                              |
| 6 · Verification pending         | `27AAKCP9999P1ZW`, or PAN `AAKCP` + 4 digits + a letter                     | The portal "fails" twice; the worker finishes the check      |
| 7 · Several GSTINs under one PAN | `27AAKCS4410N1Z1`                                                           | Three GSTINs (Maharashtra, Gujarat, Karnataka)               |
| 8 · No GSTIN yet                 | tick "I don't have a GSTIN yet"                                             | Company name only                                            |

Make a valid test GSTIN: two-digit state code + PAN + `1Z` + the check character. `gstinCheckChar()` in
`packages/core/src/companies/gstin.ts` gives the last character.

State 6 needs the worker running (`pnpm dev:worker`); the check completes within about 15 seconds.
