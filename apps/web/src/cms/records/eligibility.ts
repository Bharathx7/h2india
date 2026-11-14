import { ACTIVITIES, ORGANISATIONS, SIZES, STAGES } from "@h2india/core/schemes";
import type { Field } from "payload";
import { STATE_OPTIONS } from "./common";

// The scheme fields behind the eligibility checker (step 5.4, M25) and the hub's benefit-type filter (411:9). Editors
// enter the rules from the official notice and tick "Rules checked"; until then the checker leaves the scheme out.

export const BENEFIT_TYPES = [
  "Capital subsidy",
  "Production incentive",
  "Viability gap funding",
  "Grant",
  "Tax or duty exemption",
];

const options = (list: readonly { value: string; label: string }[]) =>
  list.map((o) => ({ value: o.value, label: o.label }));

export const eligibilityRulesField: Field = {
  name: "eligibilityRules",
  label: "Eligibility rules (checker)",
  type: "group",
  admin: {
    description:
      "Who the official notice says can apply, in the checker's terms. Leave a list empty when the notice doesn't limit it. Never guess (M25).",
  },
  fields: [
    {
      name: "checked",
      label: "Rules checked against the official notice",
      type: "checkbox",
      admin: { description: "Only schemes with this ticked appear in the eligibility checker." },
    },
    {
      name: "organisations",
      label: "Kinds of organisation",
      type: "select",
      hasMany: true,
      options: options(ORGANISATIONS),
    },
    {
      name: "states",
      label: "States (empty or All India: any)",
      type: "select",
      hasMany: true,
      options: STATE_OPTIONS,
    },
    {
      name: "activities",
      label: "Value-chain activities",
      type: "select",
      hasMany: true,
      options: options(ACTIVITIES),
    },
    {
      name: "sizes",
      label: "Company sizes",
      type: "select",
      hasMany: true,
      options: options(SIZES.filter((s) => s.value !== "not-sure")),
    },
    { name: "dpiitOnly", label: "Only DPIIT-recognised start-ups", type: "checkbox" },
    { name: "stages", label: "Project stages", type: "select", hasMany: true, options: options(STAGES) },
    {
      name: "checkNext",
      label: "What to check next",
      type: "text",
      hasMany: true,
      admin: {
        description: "Shown with each match (750:8), for example “The minimum investment in the policy notice”.",
      },
    },
  ],
};
