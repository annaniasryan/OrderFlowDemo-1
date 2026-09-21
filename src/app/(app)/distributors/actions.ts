"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireManage } from "@/lib/guard";
import { writeAudit } from "@/lib/audit";

function genCode(name: string) {
  const base = name.replace(/[^A-Za-z]/g, "").toUpperCase().slice(0, 4) || "DIST";
  return `${base}-${Math.floor(1000 + Math.random() * 9000)}`;
}

export async function createDistributor(formData: FormData) {
  const actor = await requireManage("distributors");

  const companyName = String(formData.get("companyName") || "").trim();
  const contact = String(formData.get("contact") || "").trim() || null;
  const shippingAddress = String(formData.get("shippingAddress") || "").trim();
  const region = String(formData.get("region") || "").trim() || null;
  const city = String(formData.get("city") || "").trim() || null;
  const assignedAeId = String(formData.get("assignedAeId") || "") || null;

  if (!companyName || !shippingAddress) {
    throw new Error("Company name and shipping address are required.");
  }

  const distributor = await prisma.distributor.create({
    data: {
      code: genCode(companyName),
      companyName,
      contact,
      shippingAddress,
      region,
      city,
      assignedAeId,
    },
  });

  await writeAudit({
    userId: actor.id,
    action: "CREATE_DISTRIBUTOR",
    module: "distributors",
    recordId: distributor.id,
    newValues: { companyName },
  });

  revalidatePath("/distributors");
  redirect(`/distributors/${distributor.id}`);
}

export async function updateDistributor(id: string, formData: FormData) {
  const actor = await requireManage("distributors");
  const before = await prisma.distributor.findUnique({ where: { id } });
  if (!before) throw new Error("Distributor not found.");

  const after = await prisma.distributor.update({
    where: { id },
    data: {
      companyName: String(formData.get("companyName") || before.companyName),
      contact: String(formData.get("contact") || "") || null,
      shippingAddress: String(formData.get("shippingAddress") || before.shippingAddress),
      region: String(formData.get("region") || "") || null,
      city: String(formData.get("city") || "") || null,
      assignedAeId: String(formData.get("assignedAeId") || "") || null,
    },
  });

  await writeAudit({
    userId: actor.id,
    action: "UPDATE_DISTRIBUTOR",
    module: "distributors",
    recordId: id,
    oldValues: before,
    newValues: after,
  });

  revalidatePath("/distributors");
  revalidatePath(`/distributors/${id}`);
}

export async function setDistributorStatus(id: string, status: "ACTIVE" | "INACTIVE") {
  const actor = await requireManage("distributors");
  const before = await prisma.distributor.findUnique({ where: { id } });
  if (!before) throw new Error("Distributor not found.");

  await prisma.distributor.update({ where: { id }, data: { status } });

  await writeAudit({
    userId: actor.id,
    action: status === "ACTIVE" ? "ACTIVATE_DISTRIBUTOR" : "DEACTIVATE_DISTRIBUTOR",
    module: "distributors",
    recordId: id,
    oldValues: { status: before.status },
    newValues: { status },
  });

  revalidatePath("/distributors");
  revalidatePath(`/distributors/${id}`);
}
