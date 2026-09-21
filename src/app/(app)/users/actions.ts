"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireManage } from "@/lib/guard";
import { writeAudit } from "@/lib/audit";
import { hashPassword } from "@/lib/auth";
import type { Role } from "@prisma/client";

export async function createUser(formData: FormData) {
  const actor = await requireManage("users");

  const fullName = String(formData.get("fullName") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const division = String(formData.get("division") || "").trim() || null;
  const role = String(formData.get("role") || "") as Role;
  const distributorId = String(formData.get("distributorId") || "") || null;
  const password = String(formData.get("password") || "") || "password123";

  if (!fullName || !email || !role) {
    throw new Error("Full name, email and role are required.");
  }

  const user = await prisma.user.create({
    data: {
      fullName,
      email,
      division,
      role,
      distributorId: role === "DISTRIBUTOR" ? distributorId : null,
      passwordHash: await hashPassword(password),
    },
  });

  await writeAudit({
    userId: actor.id,
    action: "CREATE_USER",
    module: "users",
    recordId: user.id,
    newValues: { fullName, email, role },
  });

  revalidatePath("/users");
  redirect("/users");
}

export async function updateUser(userId: string, formData: FormData) {
  const actor = await requireManage("users");

  const before = await prisma.user.findUnique({ where: { id: userId } });
  if (!before) throw new Error("User not found.");

  const fullName = String(formData.get("fullName") || "").trim();
  const division = String(formData.get("division") || "").trim() || null;
  const role = String(formData.get("role") || "") as Role;
  const distributorId = String(formData.get("distributorId") || "") || null;

  const after = await prisma.user.update({
    where: { id: userId },
    data: {
      fullName,
      division,
      role,
      distributorId: role === "DISTRIBUTOR" ? distributorId : null,
    },
  });

  await writeAudit({
    userId: actor.id,
    action: "UPDATE_USER",
    module: "users",
    recordId: userId,
    oldValues: before,
    newValues: after,
  });

  revalidatePath("/users");
  revalidatePath(`/users/${userId}`);
}

export async function setUserStatus(userId: string, status: "ACTIVE" | "INACTIVE") {
  const actor = await requireManage("users");

  const before = await prisma.user.findUnique({ where: { id: userId } });
  if (!before) throw new Error("User not found.");

  await prisma.user.update({ where: { id: userId }, data: { status } });

  await writeAudit({
    userId: actor.id,
    action: status === "ACTIVE" ? "ACTIVATE_USER" : "DEACTIVATE_USER",
    module: "users",
    recordId: userId,
    oldValues: { status: before.status },
    newValues: { status },
  });

  revalidatePath("/users");
  revalidatePath(`/users/${userId}`);
}

export async function resetUserPassword(userId: string) {
  const actor = await requireManage("users");
  const tempPassword = "reset" + Math.floor(1000 + Math.random() * 9000);

  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: await hashPassword(tempPassword) },
  });

  await writeAudit({
    userId: actor.id,
    action: "RESET_PASSWORD",
    module: "users",
    recordId: userId,
  });

  revalidatePath(`/users/${userId}`);
  return tempPassword;
}
