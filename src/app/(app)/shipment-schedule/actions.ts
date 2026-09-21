"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireManage } from "@/lib/guard";
import { writeAudit } from "@/lib/audit";
import { getFgStock } from "@/lib/stock";
import { needProduction } from "@/lib/calc";

export async function confirmShipmentDate(id: string, formData: FormData) {
  const actor = await requireManage("shipment_schedule");

  const dateRaw = String(formData.get("confirmedShippingDate") || "");
  if (!dateRaw) throw new Error("Confirmed shipping date is required.");
  const confirmedShippingDate = new Date(dateRaw);

  const shipment = await prisma.shipment.findUnique({
    where: { id },
    include: { items: { include: { product: true } } },
  });
  if (!shipment) throw new Error("Shipment not found.");

  const before = { confirmedShippingDate: shipment.confirmedShippingDate, status: shipment.status };

  await prisma.$transaction(async (tx) => {
    await tx.shipment.update({
      where: { id },
      data: { confirmedShippingDate, status: "CONFIRMED" },
    });

    for (const item of shipment.items) {
      const availableFg = await getFgStock(item.productId);
      const need = needProduction(item.qtyCtn, availableFg);

      const existing = await tx.productionRequirement.findFirst({
        where: { shipmentId: id, productId: item.productId },
      });

      if (existing) {
        await tx.productionRequirement.update({
          where: { id: existing.id },
          data: {
            poRequirementCtn: item.qtyCtn,
            availableFgCtn: availableFg,
            needProductionCtn: need,
            requiredBy: confirmedShippingDate,
          },
        });
      } else {
        await tx.productionRequirement.create({
          data: {
            shipmentId: id,
            productId: item.productId,
            poRequirementCtn: item.qtyCtn,
            availableFgCtn: availableFg,
            needProductionCtn: need,
            requiredBy: confirmedShippingDate,
          },
        });
      }
    }
  });

  await writeAudit({
    userId: actor.id,
    action: "CONFIRM_SHIPMENT_DATE",
    module: "shipment_schedule",
    recordId: id,
    oldValues: before,
    newValues: { confirmedShippingDate, status: "CONFIRMED" },
  });

  revalidatePath("/shipment-schedule");
  revalidatePath(`/shipment-schedule/${id}`);
  revalidatePath("/production-requirement");
}
