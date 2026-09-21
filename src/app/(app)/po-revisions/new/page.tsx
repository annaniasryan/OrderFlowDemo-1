import { redirect } from "next/navigation";
import { requireView } from "@/lib/guard";
import { canManage } from "@/lib/rbac";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui";
import { createRevision } from "../actions";

export default async function NewRevisionPage({
  searchParams,
}: {
  searchParams: { poId?: string };
}) {
  const user = await requireView("po_revision");
  if (!canManage(user.role, "po_revision")) redirect("/po-revisions");

  const pos = await prisma.purchaseOrder.findMany({
    where: {
      status: "ACCEPTED",
      ...(user.role === "DISTRIBUTOR" && user.distributorId ? { distributorId: user.distributorId } : {}),
    },
    include: { distributor: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="max-w-xl">
      <PageHeader title="Request PO Revision" />
      <form action={createRevision} className="card space-y-4 p-6">
        <div>
          <label className="label">Purchase Order</label>
          <select name="poId" required defaultValue={searchParams.poId ?? ""} className="input">
            <option value="" disabled>
              Select a PO
            </option>
            {pos.map((po) => (
              <option key={po.id} value={po.id}>
                {po.poNumber} — {po.distributor.companyName}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Requested Changes</label>
          <textarea name="requestedChanges" required rows={3} className="input" placeholder="e.g. Increase SKU A to 200 CTN" />
        </div>
        <div>
          <label className="label">New Requested Shipping Date (optional)</label>
          <input name="newRequestedShippingDate" type="date" className="input" />
        </div>
        <div>
          <label className="label">Reason / Note</label>
          <textarea name="reason" rows={2} className="input" />
        </div>
        <button type="submit" className="btn-primary">
          Submit revision request
        </button>
      </form>
    </div>
  );
}
