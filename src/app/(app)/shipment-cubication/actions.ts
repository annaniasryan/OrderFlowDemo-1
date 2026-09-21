"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireManage } from "@/lib/guard";
import { writeAudit } from "@/lib/audit";

export async function markShipmentReady(id: string) {
  const actor = await requireManage("shipment_cubication");

  const shipment = await prisma.shipment.findUnique({ where: { id } });
  if (!shipment) throw new Error("Shipment not found.");
  if (shipment.status !== "CONFIRMED") throw new Error("Only a confirmed shipment can be marked ready.");

  await prisma.shipment.update({ where: { id }, data: { status: "READY" } });
  await writeAudit({ userId: actor.id, action: "MARK_SHIPMENT_READY", module: "shipment_cubication", recordId: id });

  revalidatePath("/shipment-cubication");
  revalidatePath("/shipment-schedule");
  revalidatePath(`/shipment-schedule/${id}`);
}
