"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireManage } from "@/lib/guard";
import { writeAudit } from "@/lib/audit";
import type { MovementType } from "@prisma/client";

export async function recordRmMovement(formData: FormData) {
  const actor = await requireManage("rm_inventory");

  const type = String(formData.get("type") || "") as MovementType;
  const rawMaterialId = String(formData.get("rawMaterialId") || "");
  const qty = Number(formData.get("qty") || 0);
  const reference = String(formData.get("reference") || "").trim() || null;
  const notesReason = String(formData.get("notesReason") || "").trim() || null;

  if (!rawMaterialId || qty === 0) throw new Error("Select a material and a non-zero quantity.");
  if (type === "ADJUSTMENT" && !notesReason) throw new Error("Adjustments require a reason.");

  const storedQty = type === "ADJUSTMENT" ? qty : Math.abs(qty);

  await prisma.rMMovement.create({
    data: { type, rawMaterialId, qty: storedQty, reference, notesReason, userId: actor.id },
  });

  await writeAudit({
    userId: actor.id,
    action: `RM_${type}`,
    module: "rm_inventory",
    newValues: { rawMaterialId, qty, type },
  });

  revalidatePath("/rm-inventory");
  revalidatePath("/materials");
}
