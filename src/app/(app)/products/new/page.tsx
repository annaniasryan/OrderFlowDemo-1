import { redirect } from "next/navigation";
import { requireView } from "@/lib/guard";
import { canManage } from "@/lib/rbac";
import { PageHeader } from "@/components/ui";
import { createProduct } from "../actions";

export default async function NewProductPage() {
  const user = await requireView("products");
  if (!canManage(user.role, "products")) redirect("/products");

  return (
    <div className="max-w-xl">
      <PageHeader title="Add Product" description="CBM/CTN is calculated automatically from carton dimensions." />
      <form action={createProduct} className="card space-y-4 p-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Brand</label>
            <input name="brand" required className="input" placeholder="e.g. Kusuka" />
          </div>
          <div>
            <label className="label">SKU</label>
            <input name="sku" required className="input" />
          </div>
        </div>
        <div>
          <label className="label">Product / Variant</label>
          <input name="productName" required className="input" placeholder="e.g. Keripik Singkong" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Flavor</label>
            <input name="flavor" className="input" placeholder="e.g. BBQ" />
          </div>
          <div>
            <label className="label">Size</label>
            <input name="size" className="input" placeholder="e.g. 180g" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="label">Carton Length (cm)</label>
            <input name="cartonLengthCm" type="number" step="0.01" required className="input" />
          </div>
          <div>
            <label className="label">Carton Width (cm)</label>
            <input name="cartonWidthCm" type="number" step="0.01" required className="input" />
          </div>
          <div>
            <label className="label">Carton Height (cm)</label>
            <input name="cartonHeightCm" type="number" step="0.01" required className="input" />
          </div>
        </div>
        <div>
          <label className="label">Gross Weight / CTN (kg)</label>
          <input name="grossWeightKg" type="number" step="0.01" required className="input" />
        </div>
        <button type="submit" className="btn-primary">
          Save product
        </button>
      </form>
    </div>
  );
}
