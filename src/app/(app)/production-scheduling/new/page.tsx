import { redirect } from "next/navigation";
import { requireView } from "@/lib/guard";
import { canManage } from "@/lib/rbac";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui";
import { createSchedule } from "../actions";

export default async function NewSchedulePage({
  searchParams,
}: {
  searchParams: { requirementId?: string };
}) {
  const user = await requireView("production_scheduling");
  if (!canManage(user.role, "production_scheduling")) redirect("/production-scheduling");

  const products = await prisma.product.findMany({ where: { status: "ACTIVE" }, orderBy: { productName: "asc" } });
  const lines = await prisma.productionResource.findMany({ where: { type: "LINE", status: "ACTIVE" } });
  const shifts = await prisma.productionResource.findMany({ where: { type: "SHIFT", status: "ACTIVE" } });

  let requirement = null;
  if (searchParams.requirementId) {
    requirement = await prisma.productionRequirement.findUnique({
      where: { id: searchParams.requirementId },
      include: { product: true },
    });
  }

  return (
    <div className="max-w-xl">
      <PageHeader title="Create Production Schedule" />
      <form action={createSchedule} className="card space-y-4 p-6">
        <input type="hidden" name="productionRequirementId" value={requirement?.id ?? ""} />
        <div>
          <label className="label">Product / SKU</label>
          <select name="productId" required defaultValue={requirement?.productId ?? ""} className="input">
            <option value="" disabled>
              Select product
            </option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.sku} — {p.productName}
              </option>
            ))}
          </select>
        </div>
        {requirement && (
          <p className="text-xs text-slate-400">
            Linked to requirement for {requirement.product.productName} — need {requirement.needProductionCtn} CTN.
          </p>
        )}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Production Date</label>
            <input name="productionDate" type="date" required className="input" />
          </div>
          <div>
            <label className="label">Planned Quantity (CTN)</label>
            <input
              name="plannedCtn"
              type="number"
              step="1"
              min="1"
              required
              defaultValue={requirement?.needProductionCtn || ""}
              className="input"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Production Line / Machine</label>
            <input name="line" list="line-options" required className="input" />
            <datalist id="line-options">
              {lines.map((l) => (
                <option key={l.id} value={l.name} />
              ))}
            </datalist>
          </div>
          <div>
            <label className="label">Shift</label>
            <input name="shift" list="shift-options" required className="input" />
            <datalist id="shift-options">
              {shifts.map((s) => (
                <option key={s.id} value={s.name} />
              ))}
            </datalist>
          </div>
        </div>
        <div>
          <label className="label">Notes</label>
          <textarea name="notes" rows={2} className="input" />
        </div>
        <button type="submit" className="btn-primary">
          Save schedule
        </button>
      </form>
    </div>
  );
}
