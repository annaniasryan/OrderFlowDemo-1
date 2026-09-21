import { notFound } from "next/navigation";
import Link from "next/link";
import { requireView } from "@/lib/guard";
import { prisma } from "@/lib/db";
import { PageHeader, StatusBadge, fmtDate, fmtNum } from "@/components/ui";
import { submitPO, reviewPO, acceptPO, rejectPO } from "../actions";

export default async function PODetailPage({ params }: { params: { id: string } }) {
  const user = await requireView("po");

  const po = await prisma.purchaseOrder.findUnique({
    where: { id: params.id },
    include: {
      distributor: true,
      items: { include: { product: true } },
      shipment: true,
      revisions: { orderBy: { version: "desc" } },
    },
  });
  if (!po) notFound();

  if (user.role === "DISTRIBUTOR" && po.distributorId !== user.distributorId) {
    notFound();
  }

  const isOwnerDistributor = user.role === "DISTRIBUTOR" && po.distributorId === user.distributorId;
  const isSalesAdmin = user.role === "SALES_ADMIN" || user.role === "SUPER_ADMIN";

  async function submitAction() {
    "use server";
    await submitPO(params.id);
  }
  async function reviewAction() {
    "use server";
    await reviewPO(params.id);
  }
  async function acceptAction() {
    "use server";
    await acceptPO(params.id);
  }
  async function rejectAction(formData: FormData) {
    "use server";
    await rejectPO(params.id, formData);
  }

  const totalCtn = po.items.reduce((s, i) => s + i.qtyCtn, 0);

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader
        title={po.poNumber}
        description={po.distributor.companyName}
        actions={<StatusBadge status={po.status} />}
      />

      <div className="card p-6">
        <div className="mb-4 grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs uppercase text-slate-400">Requested Shipping Date</p>
            <p className="font-medium">{fmtDate(po.requestedShippingDate)}</p>
          </div>
          <div>
            <p className="text-xs uppercase text-slate-400">Total CTN</p>
            <p className="font-medium">{fmtNum(totalCtn)}</p>
          </div>
        </div>

        <table className="table-base mb-4">
          <thead>
            <tr>
              <th>SKU</th>
              <th>Product</th>
              <th>CTN</th>
            </tr>
          </thead>
          <tbody>
            {po.items.map((it) => (
              <tr key={it.id}>
                <td className="font-mono text-xs">{it.product.sku}</td>
                <td>
                  {it.product.brand} {it.product.productName} {it.product.size ?? ""}
                </td>
                <td>{fmtNum(it.qtyCtn)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {po.notes && <p className="whitespace-pre-line text-sm text-slate-500">Notes: {po.notes}</p>}
      </div>

      <div className="card flex flex-wrap gap-2 p-6">
        {isOwnerDistributor && po.status === "DRAFT" && (
          <form action={submitAction}>
            <button type="submit" className="btn-primary">
              Submit PO
            </button>
          </form>
        )}
        {isSalesAdmin && po.status === "SUBMITTED" && (
          <form action={reviewAction}>
            <button type="submit" className="btn-secondary">
              Move to Under Review
            </button>
          </form>
        )}
        {isSalesAdmin && ["SUBMITTED", "UNDER_REVIEW"].includes(po.status) && (
          <>
            <form action={acceptAction}>
              <button type="submit" className="btn-primary">
                Accept PO
              </button>
            </form>
            <form action={rejectAction} className="flex items-center gap-2">
              <input name="reason" placeholder="Rejection reason" className="input w-56" />
              <button type="submit" className="btn-danger">
                Reject PO
              </button>
            </form>
          </>
        )}
        {po.status === "ACCEPTED" && (
          <Link href={`/po-revisions/new?poId=${po.id}`} className="btn-secondary">
            Request revision
          </Link>
        )}
        {po.shipment && (
          <Link href={`/shipment-schedule/${po.shipment.id}`} className="btn-secondary">
            View linked shipment
          </Link>
        )}
      </div>

      {po.revisions.length > 0 && (
        <div className="card p-6">
          <h2 className="mb-3 text-sm font-semibold text-slate-700">Revision History</h2>
          <ul className="divide-y divide-slate-100 text-sm">
            {po.revisions.map((r) => (
              <li key={r.id} className="flex items-center justify-between py-2">
                <span>V{r.version}: {r.requestedChanges}</span>
                <StatusBadge status={r.status} />
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
