"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireManage } from "@/lib/guard";
import { writeAudit } from "@/lib/audit";

export async function createSchedule(formData: FormData) {
  const actor = await requireManage("production_scheduling");

  const productionRequirementId = String(formData.get("productionRequirementId") || "") || null;
  const productId = String(formData.get("productId") || "");
  const productionDate = String(formData.get("productionDate") || "");
  const plannedCtn = Number(formData.get("plannedCtn") || 0);
  const line = String(formData.get("line") || "").trim();
  const shift = String(formData.get("shift") || "").trim();
  const notes = String(formData.get("notes") || "").trim() || null;

  if (!productId || !productionDate || plannedCtn <= 0 || !line || !shift) {
    throw new Error("Product, date, planned CTN, line and shift are required.");
  }

  const schedule = await prisma.productionSchedule.create({
    data: {
      productionRequirementId,
      productId,
      productionDate: new Date(productionDate),
      plannedCtn,
      line,
      shift,
      notes,
      status: "PLANNED",
    },
  });

  await writeAudit({
    userId: actor.id,
    action: "CREATE_PRODUCTION_SCHEDULE",
    module: "production_scheduling",
    recordId: schedule.id,
    newValues: { productId, plannedCtn, line, shift },
  });

  revalidatePath("/production-scheduling");
  redirect(`/production-scheduling/${schedule.id}`);
}

export async function releaseSchedule(id: string) {
  const actor = await requireManage("production_scheduling");
  const schedule = await prisma.productionSchedule.findUnique({ where: { id } });
  if (!schedule) throw new Error("Schedule not found.");
  if (schedule.status !== "PLANNED") throw new Error("Only a planned schedule can be released.");

  await prisma.productionSchedule.update({ where: { id }, data: { status: "SCHEDULED" } });

  await writeAudit({ userId: actor.id, action: "RELEASE_SCHEDULE", module: "production_scheduling", recordId: id });
  revalidatePath("/production-scheduling");
  revalidatePath(`/production-scheduling/${id}`);
  revalidatePath("/production-actual");
}

export async function cancelSchedule(id: string) {
  const actor = await requireManage("production_scheduling");
  const schedule = await prisma.productionSchedule.findUnique({ where: { id } });
  if (!schedule) throw new Error("Schedule not found.");
  if (["COMPLETED", "CANCELLED"].includes(schedule.status)) {
    throw new Error("This schedule can no longer be cancelled.");
  }

  await prisma.productionSchedule.update({ where: { id }, data: { status: "CANCELLED" } });
  await writeAudit({ userId: actor.id, action: "CANCEL_SCHEDULE", module: "production_scheduling", recordId: id });
  revalidatePath("/production-scheduling");
  revalidatePath(`/production-scheduling/${id}`);
}

export async function updateSchedule(id: string, formData: FormData) {
  const actor = await requireManage("production_scheduling");
  const before = await prisma.productionSchedule.findUnique({ where: { id } });
  if (!before) throw new Error("Schedule not found.");
  if (["COMPLETED", "CANCELLED"].includes(before.status)) {
    throw new Error("Completed or cancelled schedules cannot be edited.");
  }

  const after = await prisma.productionSchedule.update({
    where: { id },
    data: {
      productionDate: new Date(String(formData.get("productionDate") || before.productionDate)),
      plannedCtn: Number(formData.get("plannedCtn") || before.plannedCtn),
      line: String(formData.get("line") || before.line),
      shift: String(formData.get("shift") || before.shift),
      notes: String(formData.get("notes") || "") || null,
    },
  });

  await writeAudit({
    userId: actor.id,
    action: "UPDATE_PRODUCTION_SCHEDULE",
    module: "production_scheduling",
    recordId: id,
    oldValues: before,
    newValues: after,
  });

  revalidatePath("/production-scheduling");
  revalidatePath(`/production-scheduling/${id}`);
}
