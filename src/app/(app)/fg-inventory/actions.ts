"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireManage } from "@/lib/guard";
import { writeAudit } from "@/lib/audit";
import type { MovementType } from "@prisma/client";

export async function receiveProductionActual(actualId: string) {
  const actor = await requireManage("fg_inventory");

  const actual = await prisma.productionActual.findUnique({ where: { id: actualId } });
  if (!actual) throw new Error("Production actual not found.");
  if (actual.status !== "COMPLETED") throw new Error("Only completed production can be received.");
  if (actual.receivedToWarehouse) throw new Error("This production has already been received.");

  await prisma.$transaction(async (tx) => {
    await tx.fGMovement.create({
      data: {
        type: "IN",
        productId: actual.productId,
        qtyCtn: actual.goodOutputCtn,
        reference: `Production Actual ${actual.id}`,
        batch: actual.batch,
        productionActualId: actual.id,
        userId: actor.id,
      },
    });
    await tx.productionActual.update({ where: { id: actualId }, data: { receivedToWarehouse: true } });
  });

  await writeAudit({
    userId: actor.id,
    action: "RECEIVE_PRODUCTION_TO_FG",
    module: "fg_inventory",
    recordId: actualId,
    newValues: { qtyCtn: actual.goodOutputCtn },
  });

  revalidatePath("/fg-inventory");
  revalidatePath("/production-actual");
}

export async function recordFgMovement(formData: FormData) {
  const actor = await requireManage("fg_inventory");

  const type = String(formData.get("type") || "") as MovementType;
  const productId = String(formData.get("productId") || "");
  const qtyCtn = Number(formData.get("qtyCtn") || 0);
  const reference = String(formData.get("reference") || "").trim() || null;
  const notesReason = String(formData.get("notesReason") || "").trim() || null;

  if (!productId || qtyCtn === 0) throw new Error("Select a product and a non-zero quantity.");
  if (type === "ADJUSTMENT" && !notesReason) throw new Error("Adjustments require a reason.");

  const storedQty = type === "ADJUSTMENT" ? qtyCtn : Math.abs(qtyCtn);

  await prisma.fGMovement.create({
    data: {
      type,
      productId,
      qtyCtn: storedQty,
      reference,
      notesReason,
      userId: actor.id,
    },
  });

  await writeAudit({
    userId: actor.id,
    action: `FG_${type}`,
    module: "fg_inventory",
    newValues: { productId, qtyCtn, type },
  });

  revalidatePath("/fg-inventory");
}
