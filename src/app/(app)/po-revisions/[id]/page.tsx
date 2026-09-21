import { notFound } from "next/navigation";
import Link from "next/link";
import { requireView } from "@/lib/guard";
import { prisma } from "@/lib/db";
import { PageHeader, StatusBadge, fmtDate } from "@/components/ui";
import { decideRevision } from "../actions";

export default async function RevisionDetailPage({ params }: { params: { id: string } }) {
  const user = await requireView("po_revision");

  const revision = await prisma.pORevision.findUnique({
    where: { id: params.id },
    include: { po: { include: { distributor: true } } },
  });
  if (!revision) notFound();

  const canDecide =
    (user.role === "ACCOUNT_EXECUTIVE" || user.role === "SUPER_ADMIN") &&
    ["SUBMITTED", "UNDER_AE_REVIEW"].includes(revision.status);

  async function acceptAction() {
    "use server";
    await decideRevision(params.id, "ACCEPTED");
  }
  async function rejectAction() {
    "use server";
    await decideRevision(params.id, "REJECTED");
  }

  return (
    <div className="max-w-xl space-y-6">
      <PageHeader
        title={`Revision V${revision.version} — ${revision.po.poNumber}`}
        description={revision.po.distributor.companyName}
        actions={<StatusBadge status={revision.status} />}
      />

      <div className="card space-y-3 p-6 text-sm">
        <div>
          <p className="text-xs uppercase text-slate-400">Requested Changes</p>
          <p className="whitespace-pre-line">{revision.requestedChanges}</p>
        </div>
        {revision.newRequestedShippingDate && (
          <div>
            <p className="text-xs uppercase text-slate-400">New Requested Shipping Date</p>
            <p>{fmtDate(revision.newRequestedShippingDate)}</p>
          </div>
        )}
        {revision.reason && (
          <div>
            <p className="text-xs uppercase text-slate-400">Distributor Note</p>
            <p className="whitespace-pre-line">{revision.reason}</p>
          </div>
        )}
        <div>
          <p className="text-xs uppercase text-slate-400">Submitted</p>
          <p>{fmtDate(revision.createdAt)}</p>
        </div>
      </div>

      {canDecide && (
        <div className="card flex gap-2 p-6">
          <form action={acceptAction}>
            <button type="submit" className="btn-primary">
              Accept revision
            </button>
          </form>
          <form action={rejectAction}>
            <button type="submit" className="btn-danger">
              Reject revision
            </button>
          </form>
        </div>
      )}

      <Link href={`/po/${revision.poId}`} className="text-sm font-medium text-brand-600 hover:underline">
        ← Back to PO {revision.po.poNumber}
      </Link>
    </div>
  );
}
