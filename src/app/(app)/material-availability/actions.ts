"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireManage } from "@/lib/guard";
import { getRmStock } from "@/lib/stock";
import { writeAudit } from "@/lib/audit";
import type { AvailabilityStatus } from "@prisma/client";

function statusFor(required: number, available: number, incoming: number): AvailabilityStatus {
  if (available >= required) return "AVAILABLE";
  if (available + incoming >= required) return "INCOMING";
  return "INSUFFICIENT";
}

/**
 * Generates/refreshes the Material Availability board for one Production
 * Requirement, using the product's configured BOM (ProductMaterialRequirement).
 * If no BOM is configured yet, this is a no-op — spec 10 allows BOM/recipe
 * ratios to be added later without changing module structure.
 */
export async function generateMaterialAvailability(productionRequirementId: string) {
  const actor = await requireManage("material_availability");

  const req = await prisma.productionRequirement.findUnique({
    where: { id: productionRequirementId },
    include: { product: { include: { materialRequirements: true } } },
  });
  if (!req) throw new Error("Requirement not found.");

  for (const bomLine of req.product.materialRequirements) {
    const requiredQty = bomLine.qtyPerCtn * req.needProductionCtn;
    const currentAvailable = await getRmStock(bomLine.rawMaterialId);

    const openRequest = await prisma.materialRequest.findFirst({
      where: { rawMaterialId: bomLine.rawMaterialId, status: { in: ["PROCESSING", "INCOMING"] } },
      orderBy: { createdAt: "desc" },
    });
    const incomingQty = openRequest?.incomingQty ?? 0;

    const existing = await prisma.materialAvailability.findFirst({
      where: { productionRequirementId, rawMaterialId: bomLine.rawMaterialId },
    });

    const data = {
      requiredQty,
      currentAvailable,
      incomingQty,
      expectedAvailabilityDate: openRequest?.expectedAvailabilityDate ?? null,
      status: statusFor(requiredQty, currentAvailable, incomingQty),
    };

    if (existing) {
      await prisma.materialAvailability.update({ where: { id: existing.id }, data });
    } else {
      await prisma.materialAvailability.create({
        data: { productionRequirementId, rawMaterialId: bomLine.rawMaterialId, ...data },
      });
    }
  }

  await writeAudit({
    userId: actor.id,
    action: "GENERATE_MATERIAL_AVAILABILITY",
    module: "material_availability",
    recordId: productionRequirementId,
  });

  revalidatePath("/material-availability");
  revalidatePath(`/production-requirement/${productionRequirementId}`);
}
