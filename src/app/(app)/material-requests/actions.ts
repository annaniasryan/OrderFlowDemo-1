"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireFreshUser } from "@/lib/auth";
import { canManage } from "@/lib/rbac";
import { writeAudit } from "@/lib/audit";
import { getRmStock } from "@/lib/stock";
import { nextNumber } from "@/lib/numbering";

export async function createMaterialRequest(formData: FormData) {
  const actor = await requireFreshUser();
  if (actor.role !== "RAW_MATERIAL_WAREHOUSE" && actor.role !== "SUPER_ADMIN") {
    throw new Error("Forbidden: only Raw Material Warehouse can create a material request.");
  }

  const rawMaterialId = String(formData.get("rawMaterialId") || "");
  const requestedQty = Number(formData.get("requestedQty") || 0);
  const requiredDateRaw = String(formData.get("requiredDate") || "");
  const reason = String(formData.get("reason") || "").trim() || null;

  if (!rawMaterialId || requestedQty <= 0 || !requiredDateRaw) {
    throw new Error("Material, requested quantity and required date are required.");
  }

  const currentStockAtRequest = await getRmStock(rawMaterialId);
  const requestNumber = await nextNumber("MATERIAL_REQUEST", "MR");

  const request = await prisma.materialRequest.create({
    data: {
      requestNumber,
      rawMaterialId,
      currentStockAtRequest,
      requestedQty,
      requiredDate: new Date(requiredDateRaw),
      reason,
      createdById: actor.id,
    },
  });

  await writeAudit({
    userId: actor.id,
    action: "CREATE_MATERIAL_REQUEST",
    module: "material_request",
    recordId: request.id,
    newValues: { rawMaterialId, requestedQty },
  });

  revalidatePath("/material-requests");
  redirect(`/material-requests/${request.id}`);
}

export async function processRequest(id: string) {
  const actor = await requireFreshUser();
  if (actor.role !== "PURCHASING" && actor.role !== "SUPER_ADMIN") throw new Error("Forbidden.");

  const req = await prisma.materialRequest.findUnique({ where: { id } });
  if (!req) throw new Error("Request not found.");
  if (req.status !== "REQUESTED") throw new Error("Only a newly requested item can move to processing.");

  await prisma.materialRequest.update({ where: { id }, data: { status: "PROCESSING" } });
  await writeAudit({ userId: actor.id, action: "PROCESS_MATERIAL_REQUEST", module: "material_request", recordId: id });
  revalidatePath("/material-requests");
  revalidatePath(`/material-requests/${id}`);
}

export async function markIncoming(id: string, formData: FormData) {
  const actor = await requireFreshUser();
  if (actor.role !== "PURCHASING" && actor.role !== "SUPER_ADMIN") throw new Error("Forbidden.");

  const req = await prisma.materialRequest.findUnique({ where: { id } });
  if (!req) throw new Error("Request not found.");
  if (!["PROCESSING", "INCOMING"].includes(req.status)) throw new Error("Request is not in a processable state.");

  const incomingQty = Number(formData.get("incomingQty") || 0);
  const expectedRaw = String(formData.get("expectedAvailabilityDate") || "");
  if (incomingQty <= 0) throw new Error("Incoming quantity must be greater than zero.");

  await prisma.materialRequest.update({
    where: { id },
    data: {
      status: "INCOMING",
      incomingQty,
      expectedAvailabilityDate: expectedRaw ? new Date(expectedRaw) : null,
    },
  });

  await writeAudit({
    userId: actor.id,
    action: "MARK_MATERIAL_INCOMING",
    module: "material_request",
    recordId: id,
    newValues: { incomingQty },
  });

  revalidatePath("/material-requests");
  revalidatePath(`/material-requests/${id}`);
  revalidatePath("/material-availability");
}

export async function markAvailable(id: string) {
  const actor = await requireFreshUser();
  if (actor.role !== "PURCHASING" && actor.role !== "SUPER_ADMIN") throw new Error("Forbidden.");

  const req = await prisma.materialRequest.findUnique({ where: { id } });
  if (!req) throw new Error("Request not found.");
  if (req.status !== "INCOMING") throw new Error("Only an incoming request can be marked available.");

  await prisma.materialRequest.update({ where: { id }, data: { status: "AVAILABLE" } });
  await writeAudit({ userId: actor.id, action: "MARK_MATERIAL_AVAILABLE", module: "material_request", recordId: id });
  revalidatePath("/material-requests");
  revalidatePath(`/material-requests/${id}`);
}

/** Raw Material Warehouse records the physical Material In and closes the request. */
export async function receiveAndClose(id: string, formData: FormData) {
  const actor = await requireFreshUser();
  if (actor.role !== "RAW_MATERIAL_WAREHOUSE" && actor.role !== "SUPER_ADMIN") {
    throw new Error("Forbidden: only Raw Material Warehouse can receive and close a request.");
  }
  if (!canManage(actor.role, "rm_inventory") && actor.role !== "SUPER_ADMIN") {
    throw new Error("Forbidden.");
  }

  const req = await prisma.materialRequest.findUnique({ where: { id } });
  if (!req) throw new Error("Request not found.");
  if (!["AVAILABLE", "INCOMING"].includes(req.status)) {
    throw new Error("Only an available/incoming request can be received.");
  }

  const receivedQty = Number(formData.get("receivedQty") || req.incomingQty || req.requestedQty);
  if (receivedQty <= 0) throw new Error("Received quantity must be greater than zero.");

  await prisma.$transaction(async (tx) => {
    await tx.rMMovement.create({
      data: {
        type: "IN",
        rawMaterialId: req.rawMaterialId,
        qty: receivedQty,
        reference: `Material Request ${req.requestNumber}`,
        userId: actor.id,
      },
    });
    await tx.materialRequest.update({ where: { id }, data: { status: "CLOSED" } });
  });

  await writeAudit({
    userId: actor.id,
    action: "RECEIVE_MATERIAL_REQUEST",
    module: "material_request",
    recordId: id,
    newValues: { receivedQty },
  });

  revalidatePath("/material-requests");
  revalidatePath(`/material-requests/${id}`);
  revalidatePath("/rm-inventory");
  revalidatePath("/materials");
}
