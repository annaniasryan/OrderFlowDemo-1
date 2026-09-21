import type { Role } from "@prisma/client";

/**
 * Central role/permission matrix. Every server action MUST check
 * permissions server-side using this module — never rely on the UI
 * hiding a button as the only guard (spec 01: "Role permissions must be
 * checked server-side, not only hidden in the UI").
 */

export const ALL_ROLES: Role[] = [
  "SUPER_ADMIN",
  "EXECUTIVE_VIEWER",
  "SALES_ADMIN",
  "PPIC",
  "HEAD_PRODUCTION",
  "ACCOUNT_EXECUTIVE",
  "SALES_MANAGER",
  "PRODUCT_WAREHOUSE",
  "RAW_MATERIAL_WAREHOUSE",
  "PURCHASING",
  "SHIPMENT_DIVISION",
  "DISTRIBUTOR",
];

export const ROLE_LABELS: Record<Role, string> = {
  SUPER_ADMIN: "Super Admin",
  EXECUTIVE_VIEWER: "Executive Viewer",
  SALES_ADMIN: "Sales Admin",
  PPIC: "PPIC",
  HEAD_PRODUCTION: "Head Production",
  ACCOUNT_EXECUTIVE: "Account Executive",
  SALES_MANAGER: "Sales Manager",
  PRODUCT_WAREHOUSE: "Product Warehouse",
  RAW_MATERIAL_WAREHOUSE: "Raw Material Warehouse",
  PURCHASING: "Purchasing",
  SHIPMENT_DIVISION: "Shipment Division",
  DISTRIBUTOR: "Distributor",
};

/**
 * Modules mirror the spec's Module Map (01-20). A permission is granted
 * per module for VIEW and MANAGE (create/edit/delete/transition).
 * EXECUTIVE_VIEWER is granted VIEW everywhere and MANAGE nowhere - this
 * must remain true for every module added in the future.
 */
export type ModuleKey =
  | "users"
  | "dashboard"
  | "distributors"
  | "products"
  | "materials"
  | "po"
  | "po_revision"
  | "shipment_schedule"
  | "production_requirement"
  | "material_availability"
  | "production_scheduling"
  | "production_actual"
  | "fg_inventory"
  | "rm_inventory"
  | "material_request"
  | "shipment_cubication"
  | "delivery_order"
  | "sales_monitoring"
  | "reports"
  | "audit_settings";

type Perm = { view: Role[]; manage: Role[] };

const EVERYONE_INTERNAL: Role[] = ALL_ROLES.filter((r) => r !== "DISTRIBUTOR");

export const PERMISSIONS: Record<ModuleKey, Perm> = {
  users: { view: ["SUPER_ADMIN", "EXECUTIVE_VIEWER"], manage: ["SUPER_ADMIN"] },
  dashboard: { view: ALL_ROLES, manage: [] },
  distributors: {
    view: ["SUPER_ADMIN", "EXECUTIVE_VIEWER", "SALES_ADMIN", "ACCOUNT_EXECUTIVE", "SALES_MANAGER", "SHIPMENT_DIVISION"],
    manage: ["SUPER_ADMIN", "SALES_ADMIN"],
  },
  products: {
    view: EVERYONE_INTERNAL,
    manage: ["SUPER_ADMIN", "PPIC"],
  },
  materials: {
    view: ["SUPER_ADMIN", "EXECUTIVE_VIEWER", "PPIC", "RAW_MATERIAL_WAREHOUSE", "PURCHASING"],
    manage: ["SUPER_ADMIN", "PPIC"],
  },
  po: {
    view: ["SUPER_ADMIN", "EXECUTIVE_VIEWER", "SALES_ADMIN", "ACCOUNT_EXECUTIVE", "SALES_MANAGER", "PPIC", "DISTRIBUTOR"],
    manage: ["SUPER_ADMIN", "SALES_ADMIN", "DISTRIBUTOR"],
  },
  po_revision: {
    view: ["SUPER_ADMIN", "EXECUTIVE_VIEWER", "SALES_ADMIN", "ACCOUNT_EXECUTIVE", "PPIC", "DISTRIBUTOR"],
    manage: ["SUPER_ADMIN", "ACCOUNT_EXECUTIVE", "DISTRIBUTOR"],
  },
  shipment_schedule: {
    view: ["SUPER_ADMIN", "EXECUTIVE_VIEWER", "SALES_ADMIN", "PPIC", "SHIPMENT_DIVISION", "ACCOUNT_EXECUTIVE"],
    manage: ["SUPER_ADMIN", "SALES_ADMIN"],
  },
  production_requirement: {
    view: ["SUPER_ADMIN", "EXECUTIVE_VIEWER", "PPIC", "HEAD_PRODUCTION"],
    manage: ["SUPER_ADMIN", "PPIC"],
  },
  material_availability: {
    view: ["SUPER_ADMIN", "EXECUTIVE_VIEWER", "PPIC", "PURCHASING", "RAW_MATERIAL_WAREHOUSE"],
    manage: ["SUPER_ADMIN", "PPIC", "PURCHASING"],
  },
  production_scheduling: {
    view: ["SUPER_ADMIN", "EXECUTIVE_VIEWER", "PPIC", "HEAD_PRODUCTION"],
    manage: ["SUPER_ADMIN", "PPIC"],
  },
  production_actual: {
    view: ["SUPER_ADMIN", "EXECUTIVE_VIEWER", "PPIC", "HEAD_PRODUCTION"],
    manage: ["SUPER_ADMIN", "HEAD_PRODUCTION"],
  },
  fg_inventory: {
    view: ["SUPER_ADMIN", "EXECUTIVE_VIEWER", "PPIC", "PRODUCT_WAREHOUSE", "SHIPMENT_DIVISION"],
    manage: ["SUPER_ADMIN", "PRODUCT_WAREHOUSE"],
  },
  rm_inventory: {
    view: ["SUPER_ADMIN", "EXECUTIVE_VIEWER", "PPIC", "RAW_MATERIAL_WAREHOUSE", "PURCHASING"],
    manage: ["SUPER_ADMIN", "RAW_MATERIAL_WAREHOUSE"],
  },
  material_request: {
    view: ["SUPER_ADMIN", "EXECUTIVE_VIEWER", "PPIC", "RAW_MATERIAL_WAREHOUSE", "PURCHASING"],
    manage: ["SUPER_ADMIN", "RAW_MATERIAL_WAREHOUSE", "PURCHASING"],
  },
  shipment_cubication: {
    view: ["SUPER_ADMIN", "EXECUTIVE_VIEWER", "SHIPMENT_DIVISION", "SALES_ADMIN"],
    manage: ["SUPER_ADMIN", "SHIPMENT_DIVISION"],
  },
  delivery_order: {
    view: ["SUPER_ADMIN", "EXECUTIVE_VIEWER", "SHIPMENT_DIVISION", "SALES_ADMIN"],
    manage: ["SUPER_ADMIN", "SHIPMENT_DIVISION"],
  },
  sales_monitoring: {
    view: ["SUPER_ADMIN", "EXECUTIVE_VIEWER", "ACCOUNT_EXECUTIVE", "SALES_MANAGER"],
    manage: [],
  },
  reports: {
    view: ["SUPER_ADMIN", "EXECUTIVE_VIEWER", "SALES_MANAGER", "PPIC", "SHIPMENT_DIVISION", "ACCOUNT_EXECUTIVE"],
    manage: [],
  },
  audit_settings: {
    view: ["SUPER_ADMIN", "EXECUTIVE_VIEWER"],
    manage: ["SUPER_ADMIN"],
  },
};

export function canView(role: Role, mod: ModuleKey): boolean {
  return PERMISSIONS[mod].view.includes(role);
}

export function canManage(role: Role, mod: ModuleKey): boolean {
  return PERMISSIONS[mod].manage.includes(role);
}

/** Throws if the role may not manage (mutate) the given module. Call at the top of every server action. */
export function assertCanManage(role: Role, mod: ModuleKey) {
  if (!canManage(role, mod)) {
    throw new Error(`Forbidden: role ${role} cannot manage module ${mod}`);
  }
}

export function assertCanView(role: Role, mod: ModuleKey) {
  if (!canView(role, mod)) {
    throw new Error(`Forbidden: role ${role} cannot view module ${mod}`);
  }
}
