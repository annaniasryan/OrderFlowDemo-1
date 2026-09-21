import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const PASSWORD = "password123";

function cbm(l: number, w: number, h: number) {
  return (l * w * h) / 1_000_000;
}

async function hash(pw: string) {
  return bcrypt.hash(pw, 10);
}

async function nextNum(key: string, prefix: string) {
  const existing = await prisma.numberingSetting.findUnique({ where: { key } });
  if (!existing) {
    await prisma.numberingSetting.create({ data: { key, prefix, nextSeq: 2 } });
    return `${prefix}-2026-00001`;
  }
  const seq = existing.nextSeq;
  await prisma.numberingSetting.update({ where: { key }, data: { nextSeq: { increment: 1 } } });
  return `${existing.prefix}-2026-${String(seq).padStart(5, "0")}`;
}

async function main() {
  console.log("Seeding OrderFlow demo data...");

  // ---------------------------------------------------------------------
  // Numbering settings
  // ---------------------------------------------------------------------
  await prisma.numberingSetting.createMany({
    data: [
      { key: "PO", prefix: "PO", nextSeq: 1 },
      { key: "DO", prefix: "DO", nextSeq: 1 },
      { key: "MATERIAL_REQUEST", prefix: "MR", nextSeq: 1 },
    ],
    skipDuplicates: true,
  });

  // ---------------------------------------------------------------------
  // Production resources
  // ---------------------------------------------------------------------
  await prisma.productionResource.createMany({
    data: [
      { type: "LINE", name: "Line 1" },
      { type: "LINE", name: "Line 2" },
      { type: "LINE", name: "Line 3" },
      { type: "SHIFT", name: "Shift 1 (07:00-15:00)" },
      { type: "SHIFT", name: "Shift 2 (15:00-23:00)" },
    ],
    skipDuplicates: true,
  });

  // ---------------------------------------------------------------------
  // Raw materials
  // ---------------------------------------------------------------------
  const materialDefs = [
    { code: "RM-CSGL", name: "Cassava (Fresh)", category: "Raw Produce", unit: "KG", minimumStock: 500 },
    { code: "RM-OIL", name: "Cooking Oil", category: "Process", unit: "Liter", minimumStock: 200 },
    { code: "RM-SALT", name: "Salt", category: "Seasoning", unit: "KG", minimumStock: 50 },
    { code: "RM-BBQ", name: "BBQ Seasoning Powder", category: "Seasoning", unit: "KG", minimumStock: 30 },
    { code: "RM-SPICY", name: "Spicy Seasoning Powder", category: "Seasoning", unit: "KG", minimumStock: 30 },
    { code: "RM-PKG", name: "Packaging Film (roll)", category: "Packaging", unit: "Roll", minimumStock: 20 },
    { code: "RM-CTN", name: "Carton Box", category: "Packaging", unit: "Bag", minimumStock: 100 },
  ];
  const materials = [];
  for (const m of materialDefs) {
    materials.push(await prisma.rawMaterial.create({ data: m }));
  }
  const [cassava, oil, salt, bbqSeasoning, spicySeasoning, film, cartonBox] = materials;

  // ---------------------------------------------------------------------
  // Products
  // ---------------------------------------------------------------------
  const productDefs = [
    { brand: "Kusuka", productName: "Keripik Singkong", flavor: "BBQ", size: "180g", sku: "KSK-BBQ-180", l: 30, w: 20, h: 15, gw: 4.2 },
    { brand: "Kusuka", productName: "Keripik Singkong", flavor: "Original", size: "180g", sku: "KSK-ORI-180", l: 30, w: 20, h: 15, gw: 4.2 },
    { brand: "Kusuka", productName: "Keripik Singkong", flavor: "Spicy", size: "180g", sku: "KSK-SPC-180", l: 30, w: 20, h: 15, gw: 4.2 },
    { brand: "Kusuka", productName: "Keripik Pisang", flavor: "Original", size: "150g", sku: "KPS-ORI-150", l: 28, w: 18, h: 14, gw: 3.6 },
  ];
  const products = [];
  for (const p of productDefs) {
    products.push(
      await prisma.product.create({
        data: {
          brand: p.brand,
          productName: p.productName,
          flavor: p.flavor,
          size: p.size,
          sku: p.sku,
          cartonLengthCm: p.l,
          cartonWidthCm: p.w,
          cartonHeightCm: p.h,
          grossWeightKg: p.gw,
          cbmPerCtn: cbm(p.l, p.w, p.h),
        },
      })
    );
  }
  const [bbqChips, oriChips, spicyChips, bananaChips] = products;

  // BOM per CTN (rough, illustrative quantities)
  const bomRows: [string, string, number][] = [
    [bbqChips.id, cassava.id, 12],
    [bbqChips.id, oil.id, 3],
    [bbqChips.id, salt.id, 0.2],
    [bbqChips.id, bbqSeasoning.id, 0.6],
    [bbqChips.id, film.id, 0.1],
    [bbqChips.id, cartonBox.id, 1],
    [oriChips.id, cassava.id, 12],
    [oriChips.id, oil.id, 3],
    [oriChips.id, salt.id, 0.3],
    [oriChips.id, film.id, 0.1],
    [oriChips.id, cartonBox.id, 1],
    [spicyChips.id, cassava.id, 12],
    [spicyChips.id, oil.id, 3],
    [spicyChips.id, spicySeasoning.id, 0.6],
    [spicyChips.id, film.id, 0.1],
    [spicyChips.id, cartonBox.id, 1],
    [bananaChips.id, oil.id, 2.5],
    [bananaChips.id, salt.id, 0.1],
    [bananaChips.id, film.id, 0.08],
    [bananaChips.id, cartonBox.id, 1],
  ];
  for (const [productId, rawMaterialId, qtyPerCtn] of bomRows) {
    await prisma.productMaterialRequirement.create({ data: { productId, rawMaterialId, qtyPerCtn } });
  }

  // Opening raw material stock
  for (const m of materials) {
    await prisma.rMMovement.create({
      data: { type: "IN", rawMaterialId: m.id, qty: m.minimumStock * 4, reference: "Opening balance" },
    });
  }

  // ---------------------------------------------------------------------
  // Users (one per role)
  // ---------------------------------------------------------------------
  const passwordHash = await hash(PASSWORD);

  const superAdmin = await prisma.user.create({
    data: { fullName: "Sari Wulandari", email: "superadmin@orderflow.demo", role: "SUPER_ADMIN", division: "IT / Admin", passwordHash },
  });
  const exec = await prisma.user.create({
    data: { fullName: "Budi Santoso", email: "exec@orderflow.demo", role: "EXECUTIVE_VIEWER", division: "Executive", passwordHash },
  });
  const salesAdmin = await prisma.user.create({
    data: { fullName: "Dewi Lestari", email: "salesadmin@orderflow.demo", role: "SALES_ADMIN", division: "Sales", passwordHash },
  });
  const ppic = await prisma.user.create({
    data: { fullName: "Agus Prasetyo", email: "ppic@orderflow.demo", role: "PPIC", division: "PPIC", passwordHash },
  });
  const headProduction = await prisma.user.create({
    data: { fullName: "Hendra Gunawan", email: "production@orderflow.demo", role: "HEAD_PRODUCTION", division: "Production", passwordHash },
  });
  const ae = await prisma.user.create({
    data: { fullName: "Rina Kusuma", email: "ae@orderflow.demo", role: "ACCOUNT_EXECUTIVE", division: "Sales", passwordHash },
  });
  const salesManager = await prisma.user.create({
    data: { fullName: "Joko Pramono", email: "salesmanager@orderflow.demo", role: "SALES_MANAGER", division: "Sales", passwordHash },
  });
  const productWarehouse = await prisma.user.create({
    data: { fullName: "Siti Aminah", email: "fgwarehouse@orderflow.demo", role: "PRODUCT_WAREHOUSE", division: "Warehouse", passwordHash },
  });
  const rmWarehouse = await prisma.user.create({
    data: { fullName: "Andi Firmansyah", email: "rmwarehouse@orderflow.demo", role: "RAW_MATERIAL_WAREHOUSE", division: "Warehouse", passwordHash },
  });
  const purchasing = await prisma.user.create({
    data: { fullName: "Maya Puspita", email: "purchasing@orderflow.demo", role: "PURCHASING", division: "Purchasing", passwordHash },
  });
  const shipment = await prisma.user.create({
    data: { fullName: "Fajar Nugroho", email: "shipment@orderflow.demo", role: "SHIPMENT_DIVISION", division: "Logistics", passwordHash },
  });

  // ---------------------------------------------------------------------
  // Distributors (+ distributor login users)
  // ---------------------------------------------------------------------
  const distA = await prisma.distributor.create({
    data: {
      code: "DIST-0001",
      companyName: "Toko Makmur Jaya",
      assignedAeId: ae.id,
      contact: "Pak Herman",
      shippingAddress: "Jl. Sudirman No. 45, Jakarta Selatan",
      region: "DKI Jakarta",
      city: "Jakarta",
    },
  });
  const distB = await prisma.distributor.create({
    data: {
      code: "DIST-0002",
      companyName: "CV Sumber Rejeki",
      assignedAeId: ae.id,
      contact: "Ibu Wati",
      shippingAddress: "Jl. Gatot Subroto No. 12, Bandung",
      region: "Jawa Barat",
      city: "Bandung",
    },
  });
  const distC = await prisma.distributor.create({
    data: {
      code: "DIST-0003",
      companyName: "UD Berkah Snack",
      contact: "Pak Rudi",
      shippingAddress: "Jl. Pahlawan No. 8, Surabaya",
      region: "Jawa Timur",
      city: "Surabaya",
    },
  });

  const distUserA = await prisma.user.create({
    data: {
      fullName: "Herman (Toko Makmur Jaya)",
      email: "distributor@orderflow.demo",
      role: "DISTRIBUTOR",
      division: "External",
      passwordHash,
      distributorId: distA.id,
    },
  });

  // ---------------------------------------------------------------------
  // Scenario 1: PO fully processed through to Delivery Order
  // ---------------------------------------------------------------------
  const po1Number = await nextNum("PO", "PO");
  const po1 = await prisma.purchaseOrder.create({
    data: {
      poNumber: po1Number,
      distributorId: distA.id,
      requestedShippingDate: new Date(),
      status: "ACCEPTED",
      createdById: distUserA.id,
      items: {
        create: [
          { productId: bbqChips.id, qtyCtn: 300 },
          { productId: oriChips.id, qtyCtn: 200 },
        ],
      },
    },
    include: { items: true },
  });

  const shipment1 = await prisma.shipment.create({
    data: {
      poId: po1.id,
      distributorId: distA.id,
      requestedShippingDate: po1.requestedShippingDate,
      confirmedShippingDate: new Date(),
      status: "READY",
      items: { create: po1.items.map((i) => ({ productId: i.productId, qtyCtn: i.qtyCtn })) },
    },
  });

  // Production requirement (assume no FG stock yet -> full need)
  const req1 = await prisma.productionRequirement.create({
    data: {
      shipmentId: shipment1.id,
      productId: bbqChips.id,
      poRequirementCtn: 300,
      availableFgCtn: 0,
      needProductionCtn: 300,
      requiredBy: shipment1.confirmedShippingDate!,
    },
  });
  await prisma.productionRequirement.create({
    data: {
      shipmentId: shipment1.id,
      productId: oriChips.id,
      poRequirementCtn: 200,
      availableFgCtn: 0,
      needProductionCtn: 200,
      requiredBy: shipment1.confirmedShippingDate!,
    },
  });

  const schedule1 = await prisma.productionSchedule.create({
    data: {
      productionRequirementId: req1.id,
      productId: bbqChips.id,
      productionDate: new Date(),
      plannedCtn: 300,
      line: "Line 1",
      shift: "Shift 1 (07:00-15:00)",
      status: "COMPLETED",
    },
  });

  const actual1 = await prisma.productionActual.create({
    data: {
      scheduleId: schedule1.id,
      productId: bbqChips.id,
      actualCtn: 300,
      rejectCtn: 5,
      goodOutputCtn: 295,
      batch: "B20260901",
      productionDate: new Date(),
      expiryDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 180),
      shift: "Shift 1 (07:00-15:00)",
      line: "Line 1",
      status: "COMPLETED",
      receivedToWarehouse: true,
    },
  });

  await prisma.fGMovement.create({
    data: {
      type: "IN",
      productId: bbqChips.id,
      qtyCtn: 295,
      reference: `Production Actual ${actual1.id}`,
      batch: actual1.batch,
      productionActualId: actual1.id,
    },
  });
  // Extra opening FG stock so shipment has enough on hand for both lines
  await prisma.fGMovement.create({ data: { type: "IN", productId: bbqChips.id, qtyCtn: 50, reference: "Opening balance" } });
  await prisma.fGMovement.create({ data: { type: "IN", productId: oriChips.id, qtyCtn: 220, reference: "Opening balance" } });

  const do1Number = await nextNum("DO", "DO");
  await prisma.deliveryOrder.create({
    data: {
      doNumber: do1Number,
      shipmentId: shipment1.id,
      deliveryAddress: distA.shippingAddress,
      shipmentDate: shipment1.confirmedShippingDate!,
      totalCtn: 500,
      totalCbm: 500 * bbqChips.cbmPerCtn,
      totalGrossWeight: 500 * bbqChips.grossWeightKg,
      preparedBy: shipment.fullName,
      items: {
        create: [
          { productId: bbqChips.id, qtyCtn: 300 },
          { productId: oriChips.id, qtyCtn: 200 },
        ],
      },
    },
  });
  await prisma.shipment.update({ where: { id: shipment1.id }, data: { status: "SHIPPED" } });

  // ---------------------------------------------------------------------
  // Scenario 2: PO accepted, shipment confirmed, still needs production
  // (demonstrates Production Requirement / Material Availability / Scheduling stages)
  // ---------------------------------------------------------------------
  const po2Number = await nextNum("PO", "PO");
  const po2 = await prisma.purchaseOrder.create({
    data: {
      poNumber: po2Number,
      distributorId: distB.id,
      requestedShippingDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
      status: "ACCEPTED",
      items: { create: [{ productId: spicyChips.id, qtyCtn: 400 }] },
    },
    include: { items: true },
  });
  const shipment2 = await prisma.shipment.create({
    data: {
      poId: po2.id,
      distributorId: distB.id,
      requestedShippingDate: po2.requestedShippingDate,
      confirmedShippingDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
      status: "CONFIRMED",
      items: { create: [{ productId: spicyChips.id, qtyCtn: 400 }] },
    },
  });
  const req2 = await prisma.productionRequirement.create({
    data: {
      shipmentId: shipment2.id,
      productId: spicyChips.id,
      poRequirementCtn: 400,
      availableFgCtn: 0,
      needProductionCtn: 400,
      requiredBy: shipment2.confirmedShippingDate!,
    },
  });
  await prisma.materialAvailability.create({
    data: {
      productionRequirementId: req2.id,
      rawMaterialId: spicySeasoning.id,
      requiredQty: 400 * 0.6,
      currentAvailable: 120,
      incomingQty: 0,
      status: "INSUFFICIENT",
    },
  });
  await prisma.productionSchedule.create({
    data: {
      productionRequirementId: req2.id,
      productId: spicyChips.id,
      productionDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 3),
      plannedCtn: 400,
      line: "Line 2",
      shift: "Shift 2 (15:00-23:00)",
      status: "SCHEDULED",
    },
  });

  await prisma.materialRequest.create({
    data: {
      requestNumber: await nextNum("MATERIAL_REQUEST", "MR"),
      rawMaterialId: spicySeasoning.id,
      currentStockAtRequest: 120,
      requestedQty: 200,
      requiredDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 5),
      reason: `Shortage for ${po2.poNumber}`,
      status: "PROCESSING",
      createdById: rmWarehouse.id,
    },
  });

  // ---------------------------------------------------------------------
  // Scenario 3: fresh PO awaiting Sales Admin review (draft/submitted pipeline demo)
  // ---------------------------------------------------------------------
  await prisma.purchaseOrder.create({
    data: {
      poNumber: await nextNum("PO", "PO"),
      distributorId: distC.id,
      requestedShippingDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 10),
      status: "SUBMITTED",
      items: { create: [{ productId: bananaChips.id, qtyCtn: 150 }] },
    },
  });

  await prisma.purchaseOrder.create({
    data: {
      poNumber: await nextNum("PO", "PO"),
      distributorId: distA.id,
      requestedShippingDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 14),
      status: "DRAFT",
      createdById: distUserA.id,
      items: { create: [{ productId: oriChips.id, qtyCtn: 100 }] },
    },
  });

  // ---------------------------------------------------------------------
  // Sales targets for current month
  // ---------------------------------------------------------------------
  const now = new Date();
  await prisma.salesTarget.create({
    data: { periodYear: now.getFullYear(), periodMonth: now.getMonth() + 1, targetCtn: 3000 },
  });
  await prisma.salesTarget.create({
    data: { periodYear: now.getFullYear(), periodMonth: now.getMonth() + 1, distributorId: distA.id, targetCtn: 800 },
  });

  console.log("Seed complete.");
  console.log("Demo accounts (all use password: password123):");
  for (const u of [
    superAdmin,
    exec,
    salesAdmin,
    ppic,
    headProduction,
    ae,
    salesManager,
    productWarehouse,
    rmWarehouse,
    purchasing,
    shipment,
    distUserA,
  ]) {
    console.log(` - ${u.role.padEnd(24)} ${u.email}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
