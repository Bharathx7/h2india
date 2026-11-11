// H2 India design system: tokens and components rebuilt from Figma pages 01 and 02 (Stage 2).
export { tokens } from "./tokens";
export type { ColorToken, TextStyle } from "./tokens";
export { cx } from "./lib/cx";

export { Icon, ICON_NAMES } from "./icons/Icon";
export type { IconName, IconProps } from "./icons/Icon";

// Buttons and links v2
export { Button, buttonClasses } from "./components/Button";
export type { ButtonProps, ButtonSize, ButtonVariant } from "./components/Button";
export { IconButton } from "./components/IconButton";
export type { IconButtonProps } from "./components/IconButton";
export { ArrowLink, LanguageSelector, TextLink } from "./components/Links";
export { BackToTop } from "./components/BackToTop";

// Form controls, selection and upload
export { FormField, useField } from "./components/Field";
export type { FormFieldProps } from "./components/Field";
export { Input } from "./components/Input";
export type { InputProps } from "./components/Input";
export { Select } from "./components/Select";
export { Textarea } from "./components/Textarea";
export { Checkbox, Radio, RadioGroup, Switch } from "./components/Choice";
export { OtpInput } from "./components/OtpInput";

// Feedback and status
export { CountChip, StatusBadge, STATUS_TONE, VerifiedBadge } from "./components/Badges";
export type { BadgeTone, VerifiedKind } from "./components/Badges";
export { CategoryChip, FilterChip } from "./components/Chips";
export { Alert, EmptyState, Skeleton } from "./components/Feedback";
export type { AlertTone, EmptyKind } from "./components/Feedback";
export { AsyncSection } from "./components/AsyncSection";
export type { AsyncState } from "./components/AsyncSection";
export { FileRow, FileUpload } from "./components/Upload";
export type { FileRowStatus } from "./components/Upload";
export { Tooltip } from "./components/Tooltip";
export { Toaster, useToast } from "./components/Toast";
export type { ToastOptions, ToastTone } from "./components/Toast";

// Navigation
export { Breadcrumbs } from "./components/Breadcrumbs";
export type { Crumb } from "./components/Breadcrumbs";
export {
  Menu,
  MenuChoice,
  MenuChoices,
  MenuContent,
  MenuDivider,
  MenuItem,
  MenuTrigger,
  NavLink,
  NavLinkStyle,
  Pagination,
  SegmentedControl,
  SideNavItem,
  Stepper,
  Tab,
  TabList,
  TabPanel,
  Tabs,
} from "./components/Navigation";
export type { PaginationProps, StepItem, StepStatus } from "./components/Navigation";
