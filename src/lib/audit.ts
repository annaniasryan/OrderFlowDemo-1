import { prisma } from "@/lib/db";

/**
 * Records an audit trail entry. Per spec 20: operational changes to PO,
 * shipment date, product/raw-material master, production schedule/actual,
 * inventory adjustment and DO must be auditable.
 */
export async function writeAudit(params: {
  userId?: string | null;
  action: string;
  module: string;
  recordId?: string | null;
  oldValues?: unknown;
  newValues?: unknown;
}) {
  await prisma.auditLog.create({
    data: {
      userId: params.userId ?? null,
      action: params.action,
      module: params.module,
      recordId: params.recordId ?? null,
      oldValues: params.oldValues !== undefined ? JSON.stringify(params.oldValues) : null,
      newValues: params.newValues !== undefined ? JSON.stringify(params.newValues) : null,
    },
  });
}
