// Authorisation rules safe for the browser (no database): the permission catalogue's areas and actions, and the team
// and roles rules (founder, 20 Nov 2026). Server code keeps using "@h2india/core/authz".
export { OPERATOR_ACTIONS, OPERATOR_AREAS, SENSITIVE_AREAS } from "./catalogue";
export type { OperatorAction, OperatorArea } from "./catalogue";
export { cleanSections, completePermissions, CONTENT_SECTION_IDS, StaffError, SUPER_ADMIN_ONLY } from "./staff-rules";
export type { ContentSectionId } from "./staff-rules";
