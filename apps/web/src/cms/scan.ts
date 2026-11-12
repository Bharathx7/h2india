import { scanBytes } from "@h2india/core/files";
import { APIError, type CollectionBeforeOperationHook } from "payload";

// Every file editors upload to the CMS (images, report PDFs) is virus-checked before it is stored, as member uploads
// are (step 3.7). Without an answer from the scanner nothing is saved.
export const scanUpload: CollectionBeforeOperationHook = async ({ args, req }) => {
  // A file arrives only when one is uploaded (create, or replacing it on update).
  if (req.file?.data) {
    const result = await scanBytes(req.file.data).catch(() => null);
    if (!result) throw new APIError("We couldn't check this file for viruses. Try again in a minute.", 503, null, true);
    if (!result.clean) throw new APIError("This file failed the virus check and wasn't saved.", 400, null, true);
  }
  return args;
};
