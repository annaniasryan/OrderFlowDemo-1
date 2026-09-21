import { prisma } from "@/lib/db";

/**
 * Generates the next sequential document number for a given key (PO, DO,
 * MATERIAL_REQUEST, ...), using the configurable prefix stored in
 * NumberingSetting (spec 20: Numbering Settings). The assigned sequence
 * is the value BEFORE incrementing, so the first call for a fresh key
 * returns sequence 1.
 */
export async function nextNumber(key: string, fallbackPrefix: string): Promise<string> {
  const year = new Date().getFullYear();

  const existing = await prisma.numberingSetting.findUnique({ where: { key } });

  if (!existing) {
    await prisma.numberingSetting.create({
      data: { key, prefix: fallbackPrefix, nextSeq: 2 },
    });
    return `${fallbackPrefix}-${year}-${String(1).padStart(5, "0")}`;
  }

  const assignedSeq = existing.nextSeq;
  await prisma.numberingSetting.update({
    where: { key },
    data: { nextSeq: { increment: 1 } },
  });
  return `${existing.prefix}-${year}-${String(assignedSeq).padStart(5, "0")}`;
}
