// Authorisation (step 3.4): permissions as data, can(), and the query scope.
export * from "./catalogue";
export { hasOperatorRole, loadActor, setOperatorGate, VISITOR } from "./actor";
export type { Actor, CompanySeat, PlatformRole } from "./actor";
export { assertCan, can, ForbiddenError, withinLimit } from "./can";
export type { Resource } from "./can";
export { inScope, scopeFor } from "./scope";
export type { Scope } from "./scope";
export { bootstrapSuperAdmin, grantOperatorRole, OperatorRoleError, revokeOperatorRole, SUPER_ADMIN } from "./grants";
export { identityOf } from "./identity";
export type { WorkspaceKind } from "./identity";
