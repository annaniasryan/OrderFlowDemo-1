/**
 * Key Calculations (spec section 6). Centralized so every module uses the
 * exact same formula.
 */

/** CBM per carton = L x W x H / 1,000,000 for cm dimensions. */
export function cbmPerCtn(lengthCm: number, widthCm: number, heightCm: number): number {
  return (lengthCm * widthCm * heightCm) / 1_000_000;
}

/** Need Production = max(PO Requirement - Available FG, 0). */
export function needProduction(poRequirementCtn: number, availableFgCtn: number): number {
  return Math.max(poRequirementCtn - availableFgCtn, 0);
}

/** Good Production Output = Actual Production - Reject. */
export function goodOutput(actualCtn: number, rejectCtn: number): number {
  return Math.max(actualCtn - rejectCtn, 0);
}

/** FG / RM Current Stock = Opening + IN - OUT +/- RETURN +/- ADJUSTMENT. */
export function movementDelta(type: "IN" | "OUT" | "RETURN" | "ADJUSTMENT", qty: number): number {
  switch (type) {
    case "IN":
      return qty;
    case "OUT":
      return -qty;
    case "RETURN":
      return qty; // returned goods increase stock
    case "ADJUSTMENT":
      return qty; // signed value: positive increases, negative decreases
    default:
      return 0;
  }
}

/** Shipment CBM = sum(CTN x product CBM/CTN). */
export function shipmentCbm(lines: { qtyCtn: number; cbmPerCtn: number }[]): number {
  return lines.reduce((sum, l) => sum + l.qtyCtn * l.cbmPerCtn, 0);
}

/** Shipment Gross Weight = sum(CTN x product gross weight/CTN). */
export function shipmentGrossWeight(lines: { qtyCtn: number; grossWeightKg: number }[]): number {
  return lines.reduce((sum, l) => sum + l.qtyCtn * l.grossWeightKg, 0);
}

/** Target Achievement = Actual Shipment CTN / Target CTN x 100%. */
export function targetAchievement(actualCtn: number, targetCtn: number): number | null {
  if (targetCtn === 0) return null; // safe display handling for zero baseline
  return (actualCtn / targetCtn) * 100;
}

/** Sales Growth = (Current - Comparison) / Comparison x 100%. Null when comparison is 0 (safe display). */
export function growthPercent(current: number, comparison: number): number | null {
  if (comparison === 0) return null;
  return ((current - comparison) / comparison) * 100;
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
