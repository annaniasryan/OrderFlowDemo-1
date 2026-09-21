"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireManage } from "@/lib/guard";
import { writeAudit } from "@/lib/audit";
import { goodOutput } from "@/lib/calc";

export async function createActual(formData: FormData) {
  const actor = await requireManage("production_actual");

  const scheduleId = String(formData.get("scheduleId") || "");
  const productionDate = String(formData.get("productionDate") || "");
  const batch = String(formData.get("batch") || "").trim() || null;
  const expiryDateRaw = String(formData.get("expiryDate") || "");
  const shift = String(formData.get("shift") || "").trim() || null;
  const line = String(formData.get("line") || "").trim() || null;
  const notes = String(formData.get("notes") || "").trim() || null;

  const schedule = await prisma.productionSchedule.findUnique({ where: { id: scheduleId } });
  if (!schedule) throw new Error("Schedule not found.");
  if (!["SCHEDULED", "IN_PRODUCTION"].includes(schedule.status)) {
    throw new Error("Actuals can only be recorded against a scheduled or in-production schedule.");
  }

  const actual = await prisma.$transaction(async (tx) => {
    const created = await tx.productionActual.create({
      data: {
        scheduleId,
        productId: schedule.productId,
        productionDate: new Date(productionDate || schedule.productionDate),
        batch,
        expiryDate: expiryDateRaw ? new Date(expiryDateRaw) : null,
        shift: shift ?? schedule.shift,
        line: line ?? schedule.line,
        notes,
        status: "PENDING",
      },
    });
    await tx.productionSchedule.update({ where: { id: scheduleId }, data: { status: "IN_PRODUCTION" } });
    return created;
  });

  await writeAudit({
    userId: actor.id,
    action: "START_PRODUCTION_ACTUAL",
    module: "production_actual",
    recordId: actual.id,
  });

  revalidatePath("/production-actual");
  revalidatePath("/production-scheduling");
  redirect(`/production-actual/${actual.id}`);
}

export async function completeActual(id: string, formData: FormData) {
  const actor = await requireManage("production_actual");

  const actualCtn = Number(formData.get("actualCtn") || 0);
  const rejectCtn = Number(formData.get("rejectCtn") || 0);
  const batch = String(formData.get("batch") || "").trim() || null;
  const expiryDateRaw = String(formData.get("expiryDate") || "");

  if (actualCtn < 0 || rejectCtn < 0 || rejectCtn > actualCtn) {
    throw new Error("Reject quantity cannot exceed actual production quantity.");
  }

  const actual = await prisma.productionActual.findUnique({ where: { id }, include: { schedule: true } });
  if (!actual) throw new Error("Production actual not found.");
  if (actual.status === "COMPLETED") throw new Error("This production actual is already completed.");

  const good = goodOutput(actualCtn, rejectCtn);

  await prisma.$transaction(async (tx) => {
    await tx.productionActual.update({
      where: { id },
      data: {
        actualCtn,
        rejectCtn,
        goodOutputCtn: good,
        batch,
        expiryDate: expiryDateRaw ? new Date(expiryDateRaw) : null,
        status: "COMPLETED",
      },
    });
    await tx.productionSchedule.update({ where: { id: actual.scheduleId }, data: { status: "COMPLETED" } });
  });

  await writeAudit({
    userId: actor.id,
    action: "COMPLETE_PRODUCTION_ACTUAL",
    module: "production_actual",
    recordId: id,
    newValues: { actualCtn, rejectCtn, goodOutputCtn: good },
  });

  revalidatePath("/production-actual");
  revalidatePath(`/production-actual/${id}`);
  revalidatePath("/production-scheduling");
  revalidatePath("/fg-inventory");
}
