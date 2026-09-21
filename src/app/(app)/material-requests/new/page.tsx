import { redirect } from "next/navigation";
import { requireView } from "@/lib/guard";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui";
import { createMaterialRequest } from "../actions";

export default async function NewMaterialRequestPage() {
  const user = await requireView("material_request");
  if (user.role !== "RAW_MATERIAL_WAREHOUSE" && user.role !== "SUPER_ADMIN") redirect("/material-requests");

  const materials = await prisma.rawMaterial.findMany({ where: { status: "ACTIVE" }, orderBy: { name: "asc" } });

  return (
    <div className="max-w-xl">
      <PageHeader title="Create Material Request" />
      <form action={createMaterialRequest} className="card space-y-4 p-6">
        <div>
          <label className="label">Raw Material</label>
          <select name="rawMaterialId" required className="input">
            {materials.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} ({m.unit})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Requested Quantity</label>
          <input name="requestedQty" type="number" step="0.01" required className="input" />
        </div>
        <div>
          <label className="label">Required Date</label>
          <input name="requiredDate" type="date" required className="input" />
        </div>
        <div>
          <label className="label">Reason / Production Reference</label>
          <textarea name="reason" rows={2} className="input" />
        </div>
        <button type="submit" className="btn-primary">
          Submit request
        </button>
      </form>
    </div>
  );
}
