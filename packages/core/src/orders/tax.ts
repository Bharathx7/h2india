// How GST is shown (Cart 80:5973 "IGST 18%"): IGST between states, CGST and SGST (half each) within one state.
// Pure. The total GST is worked out per line elsewhere (orderFigures); this only labels and splits it.

export interface GstRow {
  label: string;
  paise: bigint;
}

export function gstRows(input: {
  gstPaise: bigint;
  /** One rate when every line shares it; null when mixed. */
  rateBps: number | null;
  supplierState: string | null;
  buyerState: string | null;
}): GstRow[] {
  const rate = input.rateBps === null ? "" : ` ${String(input.rateBps / 100)}%`;
  const half = input.rateBps === null ? "" : ` ${String(input.rateBps / 200)}%`;
  const same =
    input.supplierState !== null &&
    input.buyerState !== null &&
    input.supplierState.trim().toLowerCase() === input.buyerState.trim().toLowerCase();
  if (!same) return [{ label: `IGST${rate}`, paise: input.gstPaise }];
  const cgst = input.gstPaise / 2n;
  return [
    { label: `CGST${half}`, paise: cgst },
    { label: `SGST${half}`, paise: input.gstPaise - cgst },
  ];
}
