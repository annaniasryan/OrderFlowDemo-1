"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireManage } from "@/lib/guard";
import { writeAudit } from "@/lib/audit";
import { cbmPerCtn } from "@/lib/calc";

function parseProductForm(formData: FormData) {
  const brand = String(formData.get("brand") || "").trim();
  const productName = String(formData.get("productName") || "").trim();
  const flavor = String(formData.get("flavor") || "").trim() || null;
  const size = String(formData.get("size") || "").trim() || null;
  const sku = String(formData.get("sku") || "").trim().toUpperCase();
  const cartonLengthCm = Number(formData.get("cartonLengthCm") || 0);
  const cartonWidthCm = Number(formData.get("cartonWidthCm") || 0);
  const cartonHeightCm = Number(formData.get("cartonHeightCm") || 0);
  const grossWeightKg = Number(formData.get("grossWeightKg") || 0);

  if (!brand || !productName || !sku) {
    throw new Error("Brand, product name and SKU are required.");
  }
  if (cartonLengthCm <= 0 || cartonWidthCm <= 0 || cartonHeightCm <= 0) {
    throw new Error("Carton dimensions must be greater than zero.");
  }

  return {
    brand,
    productName,
    flavor,
    size,
    sku,
    cartonLengthCm,
    cartonWidthCm,
    cartonHeightCm,
    grossWeightKg,
    cbmPerCtn: cbmPerCtn(cartonLengthCm, cartonWidthCm, cartonHeightCm),
  };
}

export async function createProduct(formData: FormData) {
  const actor = await requireManage("products");
  const data = parseProductForm(formData);

  const product = await prisma.product.create({ data });

  await writeAudit({
    userId: actor.id,
    action: "CREATE_PRODUCT",
    module: "products",
    recordId: product.id,
    newValues: data,
  });

  revalidatePath("/products");
  redirect(`/products/${product.id}`);
}

export async function updateProduct(id: string, formData: FormData) {
  const actor = await requireManage("products");
  const before = await prisma.product.findUnique({ where: { id } });
  if (!before) throw new Error("Product not found.");

  const data = parseProductForm(formData);
  const after = await prisma.product.update({ where: { id }, data });

  await writeAudit({
    userId: actor.id,
    action: "UPDATE_PRODUCT",
    module: "products",
    recordId: id,
    oldValues: before,
    newValues: after,
  });

  revalidatePath("/products");
  revalidatePath(`/products/${id}`);
}

export async function setProductStatus(id: string, status: "ACTIVE" | "INACTIVE") {
  const actor = await requireManage("products");
  const before = await prisma.product.findUnique({ where: { id } });
  if (!before) throw new Error("Product not found.");

  // Products already used in transactions should be deactivated rather than hard-deleted.
  await prisma.product.update({ where: { id }, data: { status } });

  await writeAudit({
    userId: actor.id,
    action: status === "ACTIVE" ? "ACTIVATE_PRODUCT" : "DEACTIVATE_PRODUCT",
    module: "products",
    recordId: id,
    oldValues: { status: before.status },
    newValues: { status },
  });

  revalidatePath("/products");
  revalidatePath(`/products/${id}`);
}

export async function setBom(productId: string, formData: FormData) {
  const actor = await requireManage("products");

  const rawMaterialId = String(formData.get("rawMaterialId") || "");
  const qtyPerCtn = Number(formData.get("qtyPerCtn") || 0);
  if (!rawMaterialId || qtyPerCtn <= 0) {
    throw new Error("Select a raw material and a quantity greater than zero.");
  }

  await prisma.productMaterialRequirement.upsert({
    where: { productId_rawMaterialId: { productId, rawMaterialId } },
    update: { qtyPerCtn },
    create: { productId, rawMaterialId, qtyPerCtn },
  });

  await writeAudit({
    userId: actor.id,
    action: "SET_PRODUCT_BOM",
    module: "products",
    recordId: productId,
    newValues: { rawMaterialId, qtyPerCtn },
  });

  revalidatePath(`/products/${productId}`);
}
