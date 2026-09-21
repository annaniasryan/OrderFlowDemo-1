import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { requireView } from "@/lib/guard";
import { canManage } from "@/lib/rbac";
import { prisma } from "@/lib/db";
import { PageHeader, StatusBadge, fmtDate, EmptyState } from "@/components/ui";
import { updateDistributor, setDistributorStatus } from "../actions";

export default async function DistributorDetailPage({ params }: { params: { id: string } }) {
  const user = await requireView("distributors");
  const manage = canManage(user.role, "distributors");

  const d = await prisma.distributor.findUnique({
    where: { id: params.id },
    include: {
      assignedAe: true,
      purchaseOrders: { orderBy: { createdAt: "desc" }, take: 20 },
      shipments: { orderBy: { createdAt: "desc" }, take: 20 },
    },
  });
  if (!d) notFound();

  const aes = await prisma.user.findMany({ where: { role: "ACCOUNT_EXECUTIVE", status: "ACTIVE" } });

  async function updateAction(formData: FormData) {
    "use server";
    await updateDistributor(params.id, formData);
  }

  async function toggleStatus() {
    "use server";
    await setDistributorStatus(params.id, d!.status === "ACTIVE" ? "INACTIVE" : "ACTIVE");
    redirect(`/distributors/${params.id}`);
  }

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader title={d.companyName} description={`Code: ${d.code}`} actions={<StatusBadge status={d.status} />} />

      <form action={updateAction} className="card space-y-4 p-6">
        <div>
          <label className="label">Company Name</label>
          <input name="companyName" defaultValue={d.companyName} disabled={!manage} className="input" />
        </div>
        <div>
          <label className="label">Contact</label>
          <input name="contact" defaultValue={d.contact ?? ""} disabled={!manage} className="input" />
        </div>
        <div>
          <label className="label">Shipping Address</label>
          <textarea name="shippingAddress" defaultValue={d.shippingAddress} disabled={!manage} rows={2} className="input" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Region</label>
            <input name="region" defaultValue={d.region ?? ""} disabled={!manage} className="input" />
          </div>
          <div>
            <label className="label">City</label>
            <input name="city" defaultValue={d.city ?? ""} disabled={!manage} className="input" />
          </div>
        </div>
        <div>
          <label className="label">Assigned AE</label>
          <select name="assignedAeId" defaultValue={d.assignedAeId ?? ""} disabled={!manage} className="input">
            <option value="">— Unassigned —</option>
            {aes.map((a) => (
              <option key={a.id} value={a.id}>
                {a.fullName}
              </option>
            ))}
          </select>
        </div>
        {manage && (
          <button type="submit" className="btn-primary">
            Save changes
          </button>
        )}
      </form>

      {manage && (
        <form action={toggleStatus} className="card p-6">
          <button type="submit" className={d.status === "ACTIVE" ? "btn-danger" : "btn-primary"}>
            {d.status === "ACTIVE" ? "Deactivate distributor" : "Activate distributor"}
          </button>
          <p className="mt-2 text-xs text-slate-400">Inactive distributors cannot create new POs.</p>
        </form>
      )}

      <div className="card p-6">
        <h2 className="mb-3 text-sm font-semibold text-slate-700">PO History</h2>
        {d.purchaseOrders.length === 0 ? (
          <EmptyState message="No purchase orders yet." />
        ) : (
          <ul className="divide-y divide-slate-100 text-sm">
            {d.purchaseOrders.map((po) => (
              <li key={po.id} className="flex items-center justify-between py-2">
                <Link href={`/po/${po.id}`} className="font-medium text-brand-600 hover:underline">
                  {po.poNumber}
                </Link>
                <span className="text-xs text-slate-400">{fmtDate(po.requestedShippingDate)}</span>
                <StatusBadge status={po.status} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
