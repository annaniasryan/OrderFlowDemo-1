"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireManage } from "@/lib/guard";
import { writeAudit } from "@/lib/audit";

export async function createMaterial(formData: FormData) {
  const actor = await requireManage("materials");

  const code = String(formData.get("code") || "").trim().toUpperCase();
  const name = String(formData.get("name") || "").trim();
  const category = String(formData.get("category") || "").trim() || null;
  const unit = String(formData.get("unit") || "").trim();
  const minimumStock = Number(formData.get("minimumStock") || 0);

  if (!code || !name || !unit) {
    throw new Error("Code, name and unit are required.");
  }

  const material = await prisma.rawMaterial.create({
    data: { code, name, category, unit, minimumStock },
  });

  await writeAudit({
    userId: actor.id,
    action: "CREATE_MATERIAL",
    module: "materials",
    recordId: material.id,
    newValues: { code, name },
  });

  revalidatePath("/materials");
  redirect(`/materials/${material.id}`);
}

export async function updateMaterial(id: string, formData: FormData) {
  const actor = await requireManage("materials");
  const before = await prisma.rawMaterial.findUnique({ where: { id } });
  if (!before) throw new Error("Material not found.");

  const after = await prisma.rawMaterial.update({
    where: { id },
    data: {
      name: String(formData.get("name") || before.name),
      category: String(formData.get("category") || "") || null,
      unit: String(formData.get("unit") || before.unit),
      minimumStock: Number(formData.get("minimumStock") || 0),
    },
  });

  await writeAudit({
    userId: actor.id,
    action: "UPDATE_MATERIAL",
    module: "materials",
    recordId: id,
    oldValues: before,
    newValues: after,
  });

  revalidatePath("/materials");
  revalidatePath(`/materials/${id}`);
}

export async function setMaterialStatus(id: string, status: "ACTIVE" | "INACTIVE") {
  const actor = await requireManage("materials");
  const before = await prisma.rawMaterial.findUnique({ where: { id } });
  if (!before) throw new Error("Material not found.");

  await prisma.rawMaterial.update({ where: { id }, data: { status } });

  await writeAudit({
    userId: actor.id,
    action: status === "ACTIVE" ? "ACTIVATE_MATERIAL" : "DEACTIVATE_MATERIAL",
    module: "materials",
    recordId: id,
    oldValues: { status: before.status },
    newValues: { status },
  });

  revalidatePath("/materials");
  revalidatePath(`/materials/${id}`);
}
