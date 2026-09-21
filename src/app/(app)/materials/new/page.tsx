import { redirect } from "next/navigation";
import { requireView } from "@/lib/guard";
import { canManage } from "@/lib/rbac";
import { PageHeader } from "@/components/ui";
import { createMaterial } from "../actions";

export default async function NewMaterialPage() {
  const user = await requireView("materials");
  if (!canManage(user.role, "materials")) redirect("/materials");

  return (
    <div className="max-w-xl">
      <PageHeader title="Add Raw Material" />
      <form action={createMaterial} className="card space-y-4 p-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Material Code</label>
            <input name="code" required className="input" />
          </div>
          <div>
            <label className="label">Unit</label>
            <input name="unit" required className="input" placeholder="KG / Liter / Bag / Roll" />
          </div>
        </div>
        <div>
          <label className="label">Material Name</label>
          <input name="name" required className="input" />
        </div>
        <div>
          <label className="label">Category</label>
          <input name="category" className="input" />
        </div>
        <div>
          <label className="label">Minimum Stock (alert threshold)</label>
          <input name="minimumStock" type="number" step="0.01" defaultValue={0} className="input" />
        </div>
        <button type="submit" className="btn-primary">
          Save material
        </button>
      </form>
    </div>
  );
}
