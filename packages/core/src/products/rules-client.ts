// Words and limits the product page's dialogs share with the server (step 6.4). Safe to import in the browser.

export const QUESTION_MAX = 1000;

/** What's the problem? on Report this listing (755:15048). */
export const REPORT_PROBLEMS = [
  { value: "incorrect-specs", label: "Incorrect specs" },
  { value: "counterfeit", label: "Counterfeit or unauthorised" },
  { value: "misleading-certificate", label: "Misleading certificate" },
  { value: "prohibited", label: "Prohibited item" },
  { value: "duplicate", label: "Duplicate listing" },
  { value: "other", label: "Something else" },
] as const;
