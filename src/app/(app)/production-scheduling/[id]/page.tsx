import { notFound } from "next/navigation";
import Link from "next/link";
import { requireView } from "@/lib/guard";
import { canManage } from "@/lib/rbac";
import { prisma } from "@/lib/db";
import { PageHeader, StatusBadge, fmtDate, fmtNum } from "@/components/ui";
import { releaseSchedule, cancelSchedule, updateSchedule } from "../actions";

export default async function ScheduleDetailPage({ params }: { params: { id: string } }) {
  const user = await requireView("production_scheduling");
  const manage = canManage(user.role, "production_scheduling");

  const s = await prisma.productionSchedule.findUnique({
    where: { id: params.id },
    include: { product: true, actuals: true, productionRequirement: { include: { shipment: { include: { po: true } } } } },
  });
  if (!s) notFound();

  const editable = manage && !["COMPLETED", "CANCELLED"].includes(s.status);

  async function updateAction(formData: FormData) {
    "use server";
    await updateSchedule(params.id, formData);
  }
  async function releaseAction() {
    "use server";
    await releaseSchedule(params.id);
  }
  async function cancelAction() {
    "use server";
    await cancelSchedule(params.id);
  }

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader
        title={s.product.productName}
        description={s.productionRequirement ? `Linked to ${s.productionRequirement.shipment.po.poNumber}` : "Standalone schedule"}
        actions={<StatusBadge status={s.status} />}
      />

      <form action={updateAction} className="card space-y-4 p-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Production Date</label>
            <input
              name="productionDate"
              type="date"
              defaultValue={s.productionDate.toISOString().slice(0, 10)}
              disabled={!editable}
              className="input"
            />
          </div>
          <div>
            <label className="label">Planned CTN</label>
            <input name="plannedCtn" type="number" defaultValue={s.plannedCtn} disabled={!editable} className="input" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Line / Machine</label>
            <input name="line" defaultValue={s.line} disabled={!editable} className="input" />
          </div>
          <div>
            <label className="label">Shift</label>
            <input name="shift" defaultValue={s.shift} disabled={!editable} className="input" />
          </div>
        </div>
        <div>
          <label className="label">Notes</label>
          <textarea name="notes" defaultValue={s.notes ?? ""} disabled={!editable} rows={2} className="input" />
        </div>
        {editable && (
          <button type="submit" className="btn-primary">
            Save changes
          </button>
        )}
      </form>

      {manage && (
        <div className="card flex flex-wrap gap-2 p-6">
          {s.status === "PLANNED" && (
            <form action={releaseAction}>
              <button type="submit" className="btn-primary">
                Release to Head Production
              </button>
            </form>
          )}
          {!["COMPLETED", "CANCELLED"].includes(s.status) && (
            <form action={cancelAction}>
              <button type="submit" className="btn-danger">
                Cancel schedule
              </button>
            </form>
          )}
          {["SCHEDULED", "IN_PRODUCTION"].includes(s.status) && (
            <Link href={`/production-actual/new?scheduleId=${s.id}`} className="btn-secondary">
              Record production actual
            </Link>
          )}
        </div>
      )}

      {s.actuals.length > 0 && (
        <div className="card p-6">
          <h2 className="mb-3 text-sm font-semibold text-slate-700">Actuals recorded</h2>
          <table className="table-base">
            <thead>
              <tr>
                <th>Date</th>
                <th>Actual</th>
                <th>Reject</th>
                <th>Good Output</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {s.actuals.map((a) => (
                <tr key={a.id}>
                  <td>{fmtDate(a.productionDate)}</td>
                  <td>{fmtNum(a.actualCtn)}</td>
                  <td>{fmtNum(a.rejectCtn)}</td>
                  <td>{fmtNum(a.goodOutputCtn)}</td>
                  <td>
                    <StatusBadge status={a.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
