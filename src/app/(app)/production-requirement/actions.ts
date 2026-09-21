"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireManage } from "@/lib/guard";
import { getFgStock } from "@/lib/stock";
import { needProduction } from "@/lib/calc";
import { writeAudit } from "@/lib/audit";

/** Recomputes Available FG / Need Production against the latest FG stock. */
export async function refreshRequirement(id: string) {
  const actor = await requireManage("production_requirement");

  const req = await prisma.productionRequirement.findUnique({ where: { id } });
  if (!req) throw new Error("Requirement not found.");

  const availableFgCtn = await getFgStock(req.productId);
  const needProductionCtn = needProduction(req.poRequirementCtn, availableFgCtn);

  await prisma.productionRequirement.update({
    where: { id },
    data: { availableFgCtn, needProductionCtn },
  });

  await writeAudit({
    userId: actor.id,
    action: "REFRESH_PRODUCTION_REQUIREMENT",
    module: "production_requirement",
    recordId: id,
    newValues: { availableFgCtn, needProductionCtn },
  });

  revalidatePath("/production-requirement");
  revalidatePath(`/production-requirement/${id}`);
}
