"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireFreshUser } from "@/lib/auth";
import { canManage } from "@/lib/rbac";
import { writeAudit } from "@/lib/audit";

export async function createRevision(formData: FormData) {
  const actor = await requireFreshUser();
  if (!canManage(actor.role, "po_revision")) throw new Error("Forbidden.");

  const poId = String(formData.get("poId") || "");
  const requestedChanges = String(formData.get("requestedChanges") || "").trim();
  const reason = String(formData.get("reason") || "").trim() || null;
  const newDateRaw = String(formData.get("newRequestedShippingDate") || "");

  if (!poId || !requestedChanges) {
    throw new Error("PO and requested changes are required.");
  }

  const po = await prisma.purchaseOrder.findUnique({ where: { id: poId } });
  if (!po) throw new Error("PO not found.");

  if (actor.role === "DISTRIBUTOR" && po.distributorId !== actor.distributorId) {
    throw new Error("Forbidden: this is not your PO.");
  }

  const lastVersion = await prisma.pORevision.findFirst({
    where: { poId },
    orderBy: { version: "desc" },
  });

  const revision = await prisma.pORevision.create({
    data: {
      poId,
      version: (lastVersion?.version ?? 0) + 1,
      requestedChanges,
      reason,
      newRequestedShippingDate: newDateRaw ? new Date(newDateRaw) : null,
    },
  });

  await writeAudit({
    userId: actor.id,
    action: "CREATE_PO_REVISION",
    module: "po_revision",
    recordId: revision.id,
    newValues: { poId, requestedChanges },
  });

  revalidatePath("/po-revisions");
  revalidatePath(`/po/${poId}`);
  redirect(`/po-revisions/${revision.id}`);
}

export async function decideRevision(id: string, decision: "ACCEPTED" | "REJECTED") {
  const actor = await requireFreshUser();
  if (actor.role !== "ACCOUNT_EXECUTIVE" && actor.role !== "SUPER_ADMIN") {
    throw new Error("Forbidden: only the Account Executive decides PO revisions.");
  }

  const revision = await prisma.pORevision.findUnique({ where: { id }, include: { po: true } });
  if (!revision) throw new Error("Revision not found.");
  if (revision.status !== "SUBMITTED" && revision.status !== "UNDER_AE_REVIEW") {
    throw new Error("This revision has already been decided.");
  }

  await prisma.$transaction(async (tx) => {
    await tx.pORevision.update({
      where: { id },
      data: { status: decision, aeDecisionById: actor.id, decidedAt: new Date() },
    });

    if (decision === "ACCEPTED" && revision.newRequestedShippingDate) {
      // Accepted revision updates the business requirement while preserving prior versions.
      await tx.purchaseOrder.update({
        where: { id: revision.poId },
        data: { requestedShippingDate: revision.newRequestedShippingDate },
      });

      const shipment = await tx.shipment.findUnique({ where: { poId: revision.poId } });
      if (shipment && shipment.status === "PENDING_CONFIRMATION") {
        // Sales Admin / PPIC should be notified when an accepted revision changes operational demand.
        await tx.shipment.update({
          where: { id: shipment.id },
          data: { requestedShippingDate: revision.newRequestedShippingDate },
        });
      }
    }
  });

  await writeAudit({
    userId: actor.id,
    action: decision === "ACCEPTED" ? "ACCEPT_PO_REVISION" : "REJECT_PO_REVISION",
    module: "po_revision",
    recordId: id,
  });

  revalidatePath("/po-revisions");
  revalidatePath(`/po-revisions/${id}`);
  revalidatePath(`/po/${revision.poId}`);
}
