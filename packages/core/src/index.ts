// Domain logic for H2 Economy. Pages and API routes call this package; only this package touches the database.

export const PRODUCT_NAME = "H2 Economy";

export { Money } from "./money";
export type { Paise } from "./money";
export { formatReference, istYear, nextReference, REFERENCE_TYPES } from "./reference";
export type { ReferenceType } from "./reference";
export { audit, AUDIT_RETENTION_YEARS, exportAuditCsv, mask, pruneAuditLog, readAuditLog } from "./audit";
export type { AuditEntry, AuditFilter, RequestContext } from "./audit";
export { declaredSettings, defineSetting, getSetting, setSetting } from "./settings";
export type { SettingDef } from "./settings";
export { changeStatus, StatusConflictError, TransitionNotAllowedError } from "./status";
export type { ChangeStatus, Transitions } from "./status";
export { getDb } from "./db";
export { callWeb, internalKey, isHealthToken, isInternalKey } from "./internal";
export { underLimit } from "./limits";
export {
  checkForm,
  FORM_LIMITS,
  looksAutomated,
  SEARCH_SUGGEST_PER_MINUTE,
  suggestAllowed,
  type FormCheck,
  type FormGuard,
} from "./protect";
