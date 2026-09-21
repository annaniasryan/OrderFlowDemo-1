import type { Role } from "@prisma/client";
import type { ModuleKey } from "@/lib/rbac";
import { canView } from "@/lib/rbac";

export type NavItem = {
  label: string;
  href: string;
  module: ModuleKey;
  group: string;
};

export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", module: "dashboard", group: "Overview" },

  { label: "Users & Access", href: "/users", module: "users", group: "Administration" },
  { label: "Audit & Settings", href: "/audit-settings", module: "audit_settings", group: "Administration" },

  { label: "Distributors", href: "/distributors", module: "distributors", group: "Sales" },
  { label: "Purchase Orders", href: "/po", module: "po", group: "Sales" },
  { label: "PO Revisions", href: "/po-revisions", module: "po_revision", group: "Sales" },
  { label: "Shipment Schedule", href: "/shipment-schedule", module: "shipment_schedule", group: "Sales" },
  { label: "Sales Monitoring", href: "/sales-monitoring", module: "sales_monitoring", group: "Sales" },

  { label: "Product Master", href: "/products", module: "products", group: "Masters" },
  { label: "Raw Material Master", href: "/materials", module: "materials", group: "Masters" },

  { label: "Production Requirement", href: "/production-requirement", module: "production_requirement", group: "PPIC & Production" },
  { label: "Material Availability", href: "/material-availability", module: "material_availability", group: "PPIC & Production" },
  { label: "Production Scheduling", href: "/production-scheduling", module: "production_scheduling", group: "PPIC & Production" },
  { label: "Production Actual", href: "/production-actual", module: "production_actual", group: "PPIC & Production" },

  { label: "Finished Goods Inventory", href: "/fg-inventory", module: "fg_inventory", group: "Warehouse" },
  { label: "Raw Material Inventory", href: "/rm-inventory", module: "rm_inventory", group: "Warehouse" },
  { label: "Material Request & Purchasing", href: "/material-requests", module: "material_request", group: "Warehouse" },

  { label: "Shipment & Cubication", href: "/shipment-cubication", module: "shipment_cubication", group: "Shipment" },
  { label: "Delivery Orders", href: "/delivery-orders", module: "delivery_order", group: "Shipment" },

  { label: "Reports & Analytics", href: "/reports", module: "reports", group: "Reports" },
];

export function navForRole(role: Role): { group: string; items: NavItem[] }[] {
  const visible = NAV_ITEMS.filter((item) => canView(role, item.module));
  const groups: Record<string, NavItem[]> = {};
  for (const item of visible) {
    groups[item.group] = groups[item.group] || [];
    groups[item.group].push(item);
  }
  return Object.entries(groups).map(([group, items]) => ({ group, items }));
}
