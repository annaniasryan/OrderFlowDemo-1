import { prisma } from "@/lib/db";
import { growthPercent, targetAchievement } from "@/lib/calc";

export function periodRange(year: number, month: number) {
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 1));
  return { start, end };
}

export function previousMonth(year: number, month: number) {
  return month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };
}

/** Total CTN actually shipped (Delivery Orders issued) in a given month, optionally scoped. */
export async function shipmentQtyForPeriod(
  year: number,
  month: number,
  filters: { distributorId?: string; productId?: string } = {}
) {
  const { start, end } = periodRange(year, month);
  const items = await prisma.dOItem.findMany({
    where: {
      productId: filters.productId,
      deliveryOrder: {
        shipmentDate: { gte: start, lt: end },
        shipment: filters.distributorId ? { distributorId: filters.distributorId } : undefined,
      },
    },
    select: { qtyCtn: true },
  });
  return items.reduce((s, i) => s + i.qtyCtn, 0);
}

/** Total CTN requested via accepted PO in a given month, optionally scoped. */
export async function poQtyForPeriod(
  year: number,
  month: number,
  filters: { distributorId?: string; productId?: string } = {}
) {
  const { start, end } = periodRange(year, month);
  const items = await prisma.pOItem.findMany({
    where: {
      productId: filters.productId,
      po: {
        requestedShippingDate: { gte: start, lt: end },
        distributorId: filters.distributorId,
      },
    },
    select: { qtyCtn: true },
  });
  return items.reduce((s, i) => s + i.qtyCtn, 0);
}

export async function targetForPeriod(
  year: number,
  month: number,
  filters: { distributorId?: string; productId?: string } = {}
) {
  const targets = await prisma.salesTarget.findMany({
    where: {
      periodYear: year,
      periodMonth: month,
      distributorId: filters.distributorId ?? null,
      productId: filters.productId ?? null,
    },
  });
  return targets.reduce((s, t) => s + t.targetCtn, 0);
}

export type PeriodSummary = {
  year: number;
  month: number;
  poQty: number;
  shipmentQty: number;
  target: number;
  achievementPct: number | null;
};

export async function summarizePeriod(
  year: number,
  month: number,
  filters: { distributorId?: string; productId?: string } = {}
): Promise<PeriodSummary> {
  const [poQty, shipmentQty, target] = await Promise.all([
    poQtyForPeriod(year, month, filters),
    shipmentQtyForPeriod(year, month, filters),
    targetForPeriod(year, month, filters),
  ]);
  return { year, month, poQty, shipmentQty, target, achievementPct: targetAchievement(shipmentQty, target) };
}

export function growthBetween(current: PeriodSummary, comparison: PeriodSummary) {
  return growthPercent(current.shipmentQty, comparison.shipmentQty);
}
