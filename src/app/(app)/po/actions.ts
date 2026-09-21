"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireFreshUser } from "@/lib/auth";
import { canManage } from "@/lib/rbac";
import { writeAudit } from "@/lib/audit";
import { nextNumber } from "@/lib/numbering";

function parseItems(formData: FormData) {
  const lineCount = Number(formData.get("lineCount") || 0);
  const items: { productId: string; qtyCtn: number }[] = [];
  for (let i = 0; i < lineCount; i++) {
    const productId = String(formData.get(`productId_${i}`) || "");
    const qtyCtn = Number(formData.get(`qtyCtn_${i}`) || 0);
    if (productId && qtyCtn > 0) {
      items.push({ productId, qtyCtn });
    }
  }
  if (items.length === 0) {
    throw new Error("A PO must contain at least one product line with a quantity greater than zero.");
  }
  return items;
}

export async function createPO(formData: FormData) {
  const actor = await requireFreshUser();
  if (!canManage(actor.role, "po")) {
    throw new Error("Forbidden: your role cannot create a PO.");
  }

  let distributorId: string;
  if (actor.role === "DISTRIBUTOR") {
    if (!actor.distributorId) throw new Error("Your account is not linked to a distributor.");
    distributorId = actor.distributorId;
  } else {
    distributorId = String(formData.get("distributorId") || "");
    if (!distributorId) throw new Error("Select a distributor.");
  }

  const distributor = await prisma.distributor.findUnique({ where: { id: distributorId } });
  if (!distributor || distributor.status !== "ACTIVE") {
    throw new Error("Inactive distributors cannot create new PO.");
  }

  const requestedShippingDateRaw = String(formData.get("requestedShippingDate") || "");
  if (!requestedShippingDateRaw) throw new Error("Requested shipping date is required.");

  const notes = String(formData.get("notes") || "").trim() || null;
  const items = parseItems(formData);
  const intent = String(formData.get("intent") || "submit"); // "draft" | "submit"

  const poNumber = await nextNumber("PO", "PO");

  const po = await prisma.purchaseOrder.create({
    data: {
      poNumber,
      distributorId,
      requestedShippingDate: new Date(requestedShippingDateRaw),
      notes,
      status: intent === "draft" ? "DRAFT" : "SUBMITTED",
      createdById: actor.id,
      items: { create: items },
    },
  });

  await writeAudit({
    userId: actor.id,
    action: "CREATE_PO",
    module: "po",
    recordId: po.id,
    newValues: { poNumber, distributorId, items, status: po.status },
  });

  revalidatePath("/po");
  redirect(`/po/${po.id}`);
}

export async function submitPO(id: string) {
  const actor = await requireFreshUser();
  const po = await prisma.purchaseOrder.findUnique({ where: { id } });
  if (!po) throw new Error("PO not found.");
  if (!["DRAFT"].includes(po.status)) throw new Error("Only a draft PO can be submitted.");
  if (!canManage(actor.role, "po")) throw new Error("Forbidden.");

  await prisma.purchaseOrder.update({ where: { id }, data: { status: "SUBMITTED" } });
  await writeAudit({ userId: actor.id, action: "SUBMIT_PO", module: "po", recordId: id });
  revalidatePath(`/po/${id}`);
  revalidatePath("/po");
}

export async function reviewPO(id: string) {
  const actor = await requireFreshUser();
  if (actor.role !== "SALES_ADMIN" && actor.role !== "SUPER_ADMIN") throw new Error("Forbidden.");
  const po = await prisma.purchaseOrder.findUnique({ where: { id } });
  if (!po) throw new Error("PO not found.");
  if (po.status !== "SUBMITTED") throw new Error("Only a submitted PO can move to review.");

  await prisma.purchaseOrder.update({ where: { id }, data: { status: "UNDER_REVIEW" } });
  await writeAudit({ userId: actor.id, action: "REVIEW_PO", module: "po", recordId: id });
  revalidatePath(`/po/${id}`);
  revalidatePath("/po");
}

export async function acceptPO(id: string) {
  const actor = await requireFreshUser();
  if (actor.role !== "SALES_ADMIN" && actor.role !== "SUPER_ADMIN") throw new Error("Forbidden.");

  const po = await prisma.purchaseOrder.findUnique({ where: { id }, include: { items: true, distributor: true } });
  if (!po) throw new Error("PO not found.");
  if (!["SUBMITTED", "UNDER_REVIEW"].includes(po.status)) {
    throw new Error("Only a submitted / under-review PO can be accepted.");
  }

  await prisma.$transaction(async (tx) => {
    await tx.purchaseOrder.update({ where: { id }, data: { status: "ACCEPTED" } });

    const existingShipment = await tx.shipment.findUnique({ where: { poId: id } });
    if (!existingShipment) {
      await tx.shipment.create({
        data: {
          poId: id,
          distributorId: po.distributorId,
          requestedShippingDate: po.requestedShippingDate,
          status: "PENDING_CONFIRMATION",
          items: {
            create: po.items.map((it) => ({ productId: it.productId, qtyCtn: it.qtyCtn })),
          },
        },
      });
    }
  });

  await writeAudit({ userId: actor.id, action: "ACCEPT_PO", module: "po", recordId: id });
  revalidatePath(`/po/${id}`);
  revalidatePath("/po");
  revalidatePath("/shipment-schedule");
}

export async function rejectPO(id: string, formData: FormData) {
  const actor = await requireFreshUser();
  if (actor.role !== "SALES_ADMIN" && actor.role !== "SUPER_ADMIN") throw new Error("Forbidden.");

  const po = await prisma.purchaseOrder.findUnique({ where: { id } });
  if (!po) throw new Error("PO not found.");
  if (!["SUBMITTED", "UNDER_REVIEW"].includes(po.status)) {
    throw new Error("Only a submitted / under-review PO can be rejected.");
  }

  const reason = String(formData.get("reason") || "").trim() || null;

  await prisma.purchaseOrder.update({
    where: { id },
    data: { status: "REJECTED", notes: reason ? `${po.notes ?? ""}\n[Rejected] ${reason}`.trim() : po.notes },
  });

  await writeAudit({ userId: actor.id, action: "REJECT_PO", module: "po", recordId: id, newValues: { reason } });
  revalidatePath(`/po/${id}`);
  revalidatePath("/po");
}
