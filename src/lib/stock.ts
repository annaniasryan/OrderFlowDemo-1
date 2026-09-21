import { prisma } from "@/lib/db";
import { movementDelta } from "@/lib/calc";

/**
 * Stock balances are always derived from movement ledgers, never stored
 * directly, per spec 13/14: "Stock balance is calculated from movements;
 * users should not directly overwrite current stock."
 */

export async function getFgStockMap(): Promise<Record<string, number>> {
  const movements = await prisma.fGMovement.findMany({
    select: { productId: true, type: true, qtyCtn: true },
  });
  const map: Record<string, number> = {};
  for (const m of movements) {
    map[m.productId] = (map[m.productId] ?? 0) + movementDelta(m.type, m.qtyCtn);
  }
  return map;
}

export async function getFgStock(productId: string): Promise<number> {
  const movements = await prisma.fGMovement.findMany({
    where: { productId },
    select: { type: true, qtyCtn: true },
  });
  return movements.reduce((sum, m) => sum + movementDelta(m.type, m.qtyCtn), 0);
}

export async function getRmStockMap(): Promise<Record<string, number>> {
  const movements = await prisma.rMMovement.findMany({
    select: { rawMaterialId: true, type: true, qty: true },
  });
  const map: Record<string, number> = {};
  for (const m of movements) {
    map[m.rawMaterialId] = (map[m.rawMaterialId] ?? 0) + movementDelta(m.type, m.qty);
  }
  return map;
}

export async function getRmStock(rawMaterialId: string): Promise<number> {
  const movements = await prisma.rMMovement.findMany({
    where: { rawMaterialId },
    select: { type: true, qty: true },
  });
  return movements.reduce((sum, m) => sum + movementDelta(m.type, m.qty), 0);
}
