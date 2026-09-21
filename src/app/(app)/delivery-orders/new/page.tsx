import { redirect } from "next/navigation";
import { requireView } from "@/lib/guard";
import { canManage } from "@/lib/rbac";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui";
import { generateDeliveryOrder } from "../actions";

export default async function NewDeliveryOrderPage({
  searchParams,
}: {
  searchParams: { shipmentId?: string };
}) {
  const user = await requireView("delivery_order");
  if (!canManage(user.role, "delivery_order")) redirect("/delivery-orders");

  const shipments = await prisma.shipment.findMany({
    where: { status: "READY", deliveryOrder: null },
    include: { distributor: true, po: true },
    orderBy: { confirmedShippingDate: "asc" },
  });

  return (
    <div className="max-w-lg">
      <PageHeader title="Generate Delivery Order" />
      <form action={generateDeliveryOrder} className="card space-y-4 p-6">
        <div>
          <label className="label">Ready Shipment</label>
          <select name="shipmentId" required defaultValue={searchParams.shipmentId ?? ""} className="input">
            <option value="" disabled>
              Select shipment
            </option>
            {shipments.map((s) => (
              <option key={s.id} value={s.id}>
                {s.po.poNumber} — {s.distributor.companyName}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Prepared By</label>
          <input name="preparedBy" className="input" />
        </div>
        <button type="submit" className="btn-primary">
          Generate DO
        </button>
      </form>
    </div>
  );
}
