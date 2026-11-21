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
export {
  ADMIN_ONLY,
  applyChanges,
  GRANTABLE,
  LOCKED_ROLE,
  roleGrid,
  RolePermissionError,
  setRolePermission,
} from "./company-roles";
export type { RoleGridRow } from "./company-roles";
export { CUSTOM_ROLE, grantablePermissions, MemberAccessError, setMemberAccess, storedAccess } from "./member-access";
export type { AccessChoice } from "./member-access";
export type { WorkspaceKind } from "./identity";
export {
  cleanSections,
  completePermissions,
  CONTENT_SECTION_IDS,
  isSuperAdmin,
  looksLikeEmail,
  StaffError,
  SUPER_ADMIN_ONLY,
} from "./staff-rules";
export type { ContentSectionId } from "./staff-rules";
