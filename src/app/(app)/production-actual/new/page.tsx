import { redirect } from "next/navigation";
import { requireView } from "@/lib/guard";
import { canManage } from "@/lib/rbac";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui";
import { createActual } from "../actions";

export default async function NewActualPage({
  searchParams,
}: {
  searchParams: { scheduleId?: string };
}) {
  const user = await requireView("production_actual");
  if (!canManage(user.role, "production_actual")) redirect("/production-actual");

  const schedules = await prisma.productionSchedule.findMany({
    where: { status: { in: ["SCHEDULED", "IN_PRODUCTION"] } },
    include: { product: true },
    orderBy: { productionDate: "asc" },
  });

  return (
    <div className="max-w-xl">
      <PageHeader title="Start Production" description="Confirm production against PPIC's released schedule." />
      <form action={createActual} className="card space-y-4 p-6">
        <div>
          <label className="label">Production Schedule</label>
          <select name="scheduleId" required defaultValue={searchParams.scheduleId ?? ""} className="input">
            <option value="" disabled>
              Select schedule
            </option>
            {schedules.map((s) => (
              <option key={s.id} value={s.id}>
                {s.product.productName} — {s.plannedCtn} CTN — {s.line}/{s.shift}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Production Date</label>
          <input name="productionDate" type="date" required className="input" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Batch / Lot</label>
            <input name="batch" className="input" />
          </div>
          <div>
            <label className="label">Expiry Date</label>
            <input name="expiryDate" type="date" className="input" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Line / Machine (override)</label>
            <input name="line" className="input" />
          </div>
          <div>
            <label className="label">Shift (override)</label>
            <input name="shift" className="input" />
          </div>
        </div>
        <div>
          <label className="label">Notes</label>
          <textarea name="notes" rows={2} className="input" />
        </div>
        <button type="submit" className="btn-primary">
          Start production
        </button>
      </form>
    </div>
  );
}
