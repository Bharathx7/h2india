// Domain logic for H2 India. Pages and API routes call this package; only this package touches the database.

export const PRODUCT_NAME = "H2 India";

export { Money } from "./money";
export type { Paise } from "./money";
export { formatReference, istYear, nextReference, REFERENCE_TYPES } from "./reference";
export type { ReferenceType } from "./reference";
export { audit, mask } from "./audit";
export type { AuditEntry, RequestContext } from "./audit";
export { changeStatus, StatusConflictError, TransitionNotAllowedError } from "./status";
export type { ChangeStatus, Transitions } from "./status";
export { getDb } from "./db";
