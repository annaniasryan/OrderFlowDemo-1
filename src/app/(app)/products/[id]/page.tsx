import { notFound, redirect } from "next/navigation";
import { requireView } from "@/lib/guard";
import { canManage } from "@/lib/rbac";
import { prisma } from "@/lib/db";
import { PageHeader, StatusBadge, fmtNum } from "@/components/ui";
import { updateProduct, setProductStatus, setBom } from "../actions";

export default async function ProductDetailPage({ params }: { params: { id: string } }) {
  const user = await requireView("products");
  const manage = canManage(user.role, "products");

  const p = await prisma.product.findUnique({
    where: { id: params.id },
    include: { materialRequirements: { include: { rawMaterial: true } } },
  });
  if (!p) notFound();

  const materials = await prisma.rawMaterial.findMany({ where: { status: "ACTIVE" }, orderBy: { name: "asc" } });

  async function updateAction(formData: FormData) {
    "use server";
    await updateProduct(params.id, formData);
  }

  async function toggleStatus() {
    "use server";
    await setProductStatus(params.id, p!.status === "ACTIVE" ? "INACTIVE" : "ACTIVE");
    redirect(`/products/${params.id}`);
  }

  async function bomAction(formData: FormData) {
    "use server";
    await setBom(params.id, formData);
  }

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader title={p.productName} description={`${p.brand} · SKU ${p.sku}`} actions={<StatusBadge status={p.status} />} />

      <form action={updateAction} className="card space-y-4 p-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Brand</label>
            <input name="brand" defaultValue={p.brand} disabled={!manage} className="input" />
          </div>
          <div>
            <label className="label">SKU</label>
            <input name="sku" defaultValue={p.sku} disabled={!manage} className="input" />
          </div>
        </div>
        <div>
          <label className="label">Product / Variant</label>
          <input name="productName" defaultValue={p.productName} disabled={!manage} className="input" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Flavor</label>
            <input name="flavor" defaultValue={p.flavor ?? ""} disabled={!manage} className="input" />
          </div>
          <div>
            <label className="label">Size</label>
            <input name="size" defaultValue={p.size ?? ""} disabled={!manage} className="input" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="label">Length (cm)</label>
            <input name="cartonLengthCm" type="number" step="0.01" defaultValue={p.cartonLengthCm} disabled={!manage} className="input" />
          </div>
          <div>
            <label className="label">Width (cm)</label>
            <input name="cartonWidthCm" type="number" step="0.01" defaultValue={p.cartonWidthCm} disabled={!manage} className="input" />
          </div>
          <div>
            <label className="label">Height (cm)</label>
            <input name="cartonHeightCm" type="number" step="0.01" defaultValue={p.cartonHeightCm} disabled={!manage} className="input" />
          </div>
        </div>
        <div>
          <label className="label">Gross Weight / CTN (kg)</label>
          <input name="grossWeightKg" type="number" step="0.01" defaultValue={p.grossWeightKg} disabled={!manage} className="input" />
        </div>
        <p className="text-xs text-slate-400">CBM / CTN (calculated): {fmtNum(p.cbmPerCtn, 4)} m³</p>
        {manage && (
          <button type="submit" className="btn-primary">
            Save changes
          </button>
        )}
      </form>

      {manage && (
        <form action={toggleStatus} className="card p-6">
          <button type="submit" className={p.status === "ACTIVE" ? "btn-danger" : "btn-primary"}>
            {p.status === "ACTIVE" ? "Deactivate product" : "Reactivate product"}
          </button>
          <p className="mt-2 text-xs text-slate-400">
            Products already used in transactions should be deactivated rather than hard-deleted.
          </p>
        </form>
      )}

      <div className="card p-6">
        <h2 className="mb-3 text-sm font-semibold text-slate-700">
          Raw Material Requirement (BOM per CTN)
        </h2>
        {p.materialRequirements.length === 0 ? (
          <p className="mb-3 text-sm text-slate-400">
            No BOM/recipe configured yet. This can be added at any time without changing module structure.
          </p>
        ) : (
          <table className="table-base mb-4">
            <thead>
              <tr>
                <th>Raw Material</th>
                <th>Qty per CTN</th>
              </tr>
            </thead>
            <tbody>
              {p.materialRequirements.map((r) => (
                <tr key={r.id}>
                  <td>{r.rawMaterial.name}</td>
                  <td>
                    {fmtNum(r.qtyPerCtn, 3)} {r.rawMaterial.unit}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {manage && (
          <form action={bomAction} className="flex flex-wrap items-end gap-3">
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
              <label className="label">Qty per CTN</label>
              <input name="qtyPerCtn" type="number" step="0.001" required className="input w-32" />
            </div>
            <button type="submit" className="btn-secondary">
              Add / update
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
