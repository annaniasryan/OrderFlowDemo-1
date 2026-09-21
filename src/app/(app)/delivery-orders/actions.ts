"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireManage } from "@/lib/guard";
import { writeAudit } from "@/lib/audit";
import { shipmentCbm, shipmentGrossWeight } from "@/lib/calc";
import { nextNumber } from "@/lib/numbering";

export async function generateDeliveryOrder(formData: FormData) {
  const actor = await requireManage("delivery_order");

  const shipmentId = String(formData.get("shipmentId") || "");
  const preparedBy = String(formData.get("preparedBy") || "").trim() || null;

  const shipment = await prisma.shipment.findUnique({
    where: { id: shipmentId },
    include: { items: { include: { product: true } }, distributor: true },
  });
  if (!shipment) throw new Error("Shipment not found.");
  if (shipment.status !== "READY") throw new Error("Only a ready shipment can generate a Delivery Order.");

  const existing = await prisma.deliveryOrder.findUnique({ where: { shipmentId } });
  if (existing) throw new Error("A Delivery Order already exists for this shipment.");

  const totalCtn = shipment.items.reduce((s, i) => s + i.qtyCtn, 0);
  const totalCbm = shipmentCbm(shipment.items.map((i) => ({ qtyCtn: i.qtyCtn, cbmPerCtn: i.product.cbmPerCtn })));
  const totalGrossWeight = shipmentGrossWeight(
    shipment.items.map((i) => ({ qtyCtn: i.qtyCtn, grossWeightKg: i.product.grossWeightKg }))
  );

  const doNumber = await nextNumber("DO", "DO");

  const deliveryOrder = await prisma.$transaction(async (tx) => {
    const created = await tx.deliveryOrder.create({
      data: {
        doNumber,
        shipmentId,
        deliveryAddress: shipment.distributor.shippingAddress,
        shipmentDate: shipment.confirmedShippingDate ?? shipment.requestedShippingDate,
        totalCtn,
        totalCbm,
        totalGrossWeight,
        preparedBy,
        createdById: actor.id,
        items: {
          create: shipment.items.map((i) => ({ productId: i.productId, qtyCtn: i.qtyCtn })),
        },
      },
    });
    await tx.shipment.update({ where: { id: shipmentId }, data: { status: "SHIPPED" } });
    return created;
  });

  await writeAudit({
    userId: actor.id,
    action: "GENERATE_DO",
    module: "delivery_order",
    recordId: deliveryOrder.id,
    newValues: { doNumber, totalCtn, totalCbm, totalGrossWeight },
  });

  revalidatePath("/delivery-orders");
  revalidatePath("/shipment-cubication");
  revalidatePath("/shipment-schedule");
  redirect(`/delivery-orders/${deliveryOrder.id}`);
}

export async function recordPrint(id: string) {
  const actor = await requireManage("delivery_order");

  const doc = await prisma.deliveryOrder.findUnique({ where: { id } });
  if (!doc) throw new Error("Delivery Order not found.");

  await prisma.deliveryOrder.update({ where: { id }, data: { printCount: { increment: 1 } } });
  await writeAudit({
    userId: actor.id,
    action: doc.printCount === 0 ? "PRINT_DO" : "REPRINT_DO",
    module: "delivery_order",
    recordId: id,
  });

  revalidatePath(`/delivery-orders/${id}`);
}

/** Confirms the shipment has physically left / been delivered, completing it and posting the FG Product Out. */
export async function completeShipmentOut(id: string) {
  const actor = await requireManage("delivery_order");

  const doc = await prisma.deliveryOrder.findUnique({
    where: { id },
    include: { items: true, shipment: true },
  });
  if (!doc) throw new Error("Delivery Order not found.");
  if (doc.shipment.status !== "SHIPPED") throw new Error("Shipment must be in Shipped status first.");

  await prisma.$transaction(async (tx) => {
    for (const item of doc.items) {
      await tx.fGMovement.create({
        data: {
          type: "OUT",
          productId: item.productId,
          qtyCtn: item.qtyCtn,
          reference: `DO ${doc.doNumber}`,
          deliveryOrderId: doc.id,
          userId: actor.id,
        },
      });
    }
    await tx.shipment.update({ where: { id: doc.shipmentId }, data: { status: "COMPLETED" } });
  });

  await writeAudit({ userId: actor.id, action: "COMPLETE_SHIPMENT_OUT", module: "delivery_order", recordId: id });

  revalidatePath("/delivery-orders");
  revalidatePath(`/delivery-orders/${id}`);
  revalidatePath("/fg-inventory");
  revalidatePath("/shipment-schedule");
}
