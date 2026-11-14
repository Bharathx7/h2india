// The catalogue's top level (A43, step 5.1): the five product classes, the categories the design names and the
// browse-by-application axis. Step 6.1 turns these into editable data with the full tree (M23); until then the home
// page, the mega menu and the Coming soon form read them from here. No counts: the catalogue has no listings yet.

export type CatalogueIcon = "zap" | "package" | "truck" | "clipboard-check" | "shield-check";

export interface CatalogueClass {
  id: "systems" | "components" | "equipment" | "services" | "materials";
  label: string;
  href: string;
}

export interface CatalogueLink {
  id: string;
  label: string;
  href: string;
  icon: CatalogueIcon;
}

export interface CatalogueApplication extends CatalogueLink {
  /** The examples under the name on the home tile (850:209). */
  examples: string;
}

/** The five classes, in the order of the home tiles (377:5157). */
export const PRODUCT_CLASSES: CatalogueClass[] = [
  { id: "systems", label: "Systems", href: "/marketplace/systems" },
  { id: "components", label: "Components", href: "/marketplace/components" },
  { id: "equipment", label: "Equipment", href: "/marketplace/equipment" },
  { id: "services", label: "Services", href: "/marketplace/services" },
  { id: "materials", label: "Materials", href: "/marketplace/materials" },
];

/** "Popular categories" on the home page (377:5217). The classes they sit in come with the full tree (M23). */
export const POPULAR_CATEGORIES: CatalogueLink[] = [
  { id: "electrolysers", label: "Electrolysers", href: "/marketplace/systems/electrolysers", icon: "zap" },
  {
    id: "fuel-cell-systems",
    label: "Fuel cell systems",
    href: "/marketplace/systems/fuel-cell-systems",
    icon: "zap",
  },
  {
    id: "compression-systems",
    label: "Compression systems",
    href: "/marketplace/systems/compression-systems",
    icon: "zap",
  },
  { id: "tanks-cylinders", label: "Tanks & cylinders", href: "/marketplace/components/tanks-cylinders", icon: "zap" },
  {
    id: "valves-regulators",
    label: "Valves & regulators",
    href: "/marketplace/components/valves-regulators",
    icon: "zap",
  },
  {
    id: "sensors-detectors",
    label: "Sensors & detectors",
    href: "/marketplace/components/sensors-detectors",
    icon: "zap",
  },
];

/** Browse by application (850:209). The playbook's seventh, ports and shipping, is not drawn yet (step 6.1). */
export const APPLICATIONS: CatalogueApplication[] = [
  {
    id: "production",
    label: "Production",
    href: "/marketplace/applications/production",
    icon: "zap",
    examples: "Electrolysers, BoP, water",
  },
  {
    id: "storage-transport",
    label: "Storage & transport",
    href: "/marketplace/applications/storage-transport",
    icon: "package",
    examples: "Tanks, cylinders, trailers",
  },
  {
    id: "refuelling-mobility",
    label: "Refuelling & mobility",
    href: "/marketplace/applications/refuelling-mobility",
    icon: "truck",
    examples: "Compressors, dispensers",
  },
  {
    id: "fuel-cells-power",
    label: "Fuel cells & power",
    href: "/marketplace/applications/fuel-cells-power",
    icon: "zap",
    examples: "Stacks, systems, backup",
  },
  {
    id: "industrial-use",
    label: "Industrial use",
    href: "/marketplace/applications/industrial-use",
    icon: "clipboard-check",
    examples: "Ammonia, steel, refining",
  },
  {
    id: "safety-testing",
    label: "Safety & testing",
    href: "/marketplace/applications/safety-testing",
    icon: "shield-check",
    examples: "Sensors, valves, labs",
  },
];
