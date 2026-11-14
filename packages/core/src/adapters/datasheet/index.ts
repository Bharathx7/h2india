import { fakeDatasheetReader } from "./fake";
import type { DatasheetReader } from "./types";

// Only the worker calls the reader (playbook 8.4: never from the browser). Swap in the M8 engine here.
let current: DatasheetReader = fakeDatasheetReader;
export const datasheetReader = () => current;
export function useDatasheetReader(reader: DatasheetReader) {
  current = reader;
}
export type { DatasheetReader, ExtractedField } from "./types";
