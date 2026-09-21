"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireManage } from "@/lib/guard";
import { writeAudit } from "@/lib/audit";

export async function updateNumberingPrefix(formData: FormData) {
  const actor = await requireManage("audit_settings");
  const key = String(formData.get("key") || "").trim();
  const prefix = String(formData.get("prefix") || "").trim().toUpperCase();
  if (!key) throw new Error("Numbering key is required.");
  if (!prefix) throw new Error("Prefix is required.");

  await prisma.numberingSetting.upsert({
    where: { key },
    update: { prefix },
    create: { key, prefix, nextSeq: 1 },
  });

  await writeAudit({ userId: actor.id, action: "UPDATE_NUMBERING", module: "audit_settings", recordId: key, newValues: { prefix } });
  revalidatePath("/audit-settings");
}

export async function addResource(formData: FormData) {
  const actor = await requireManage("audit_settings");
  const type = String(formData.get("type") || "");
  const name = String(formData.get("name") || "").trim();
  if (!type || !name) throw new Error("Type and name are required.");

  await prisma.productionResource.upsert({
    where: { type_name: { type, name } },
    update: { status: "ACTIVE" },
    create: { type, name },
  });

  await writeAudit({ userId: actor.id, action: "ADD_RESOURCE", module: "audit_settings", newValues: { type, name } });
  revalidatePath("/audit-settings");
}

export async function toggleResource(formData: FormData) {
  const actor = await requireManage("audit_settings");
  const id = String(formData.get("id") || "");
  const resource = await prisma.productionResource.findUnique({ where: { id } });
  if (!resource) throw new Error("Resource not found.");

  const status = resource.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
  await prisma.productionResource.update({ where: { id }, data: { status } });

  await writeAudit({ userId: actor.id, action: "TOGGLE_RESOURCE", module: "audit_settings", recordId: id, newValues: { status } });
  revalidatePath("/audit-settings");
}

export async function setSalesTarget(formData: FormData) {
  const actor = await requireManage("audit_settings");

  const periodYear = Number(formData.get("periodYear") || 0);
  const periodMonth = Number(formData.get("periodMonth") || 0);
  const distributorId = String(formData.get("distributorId") || "") || null;
  const productId = String(formData.get("productId") || "") || null;
  const targetCtn = Number(formData.get("targetCtn") || 0);

  if (!periodYear || !periodMonth || targetCtn <= 0) {
    throw new Error("Period and a positive target quantity are required.");
  }

  // Manual find-then-write instead of upsert: Postgres treats NULL as
  // distinct in a unique index, so an ON CONFLICT upsert is unreliable
  // when distributorId/productId are null (the common "overall target" case).
  const existing = await prisma.salesTarget.findFirst({
    where: { periodYear, periodMonth, distributorId, productId },
  });

  if (existing) {
    await prisma.salesTarget.update({ where: { id: existing.id }, data: { targetCtn } });
  } else {
    await prisma.salesTarget.create({ data: { periodYear, periodMonth, distributorId, productId, targetCtn } });
  }

  await writeAudit({
    userId: actor.id,
    action: "SET_SALES_TARGET",
    module: "audit_settings",
    newValues: { periodYear, periodMonth, distributorId, productId, targetCtn },
  });

  revalidatePath("/audit-settings");
  revalidatePath("/sales-monitoring");
  revalidatePath("/reports");
}
