"use client";

/** "Print or save as PDF" (66:5004): the browser's print dialog, which also saves a PDF. */
export function PrintButton() {
  return (
    <button
      type="button"
      className="type-label-sm text-link hover:underline print:hidden"
      onClick={() => {
        window.print();
      }}
    >
      Print or save as PDF
    </button>
  );
}
