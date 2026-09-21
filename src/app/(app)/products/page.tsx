import Link from "next/link";
import { requireView } from "@/lib/guard";
import { prisma } from "@/lib/db";
import { PageHeader, StatusBadge, EmptyState, fmtNum } from "@/components/ui";
import { canManage } from "@/lib/rbac";

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: { show?: string };
}) {
  const user = await requireView("products");
  const manage = canManage(user.role, "products");
  const showInactive = searchParams.show === "inactive";

  const products = await prisma.product.findMany({
    where: { status: showInactive ? "INACTIVE" : "ACTIVE" },
    orderBy: [{ brand: "asc" }, { productName: "asc" }],
  });

  return (
    <div>
      <PageHeader
        title="Product Master"
        description="Finished-product catalog and carton logistics data used throughout OrderFlow."
        actions={
          manage ? (
            <Link href="/products/new" className="btn-primary">
              + Add product
            </Link>
          ) : undefined
        }
      />

      <div className="mb-3 flex gap-2 text-xs">
        <Link href="/products" className={!showInactive ? "font-semibold text-brand-700" : "text-slate-400"}>
          Active
        </Link>
        <span className="text-slate-300">|</span>
        <Link href="/products?show=inactive" className={showInactive ? "font-semibold text-brand-700" : "text-slate-400"}>
          Inactive
        </Link>
      </div>

      <div className="card overflow-x-auto">
        {products.length === 0 ? (
          <EmptyState message="No products found." />
        ) : (
          <table className="table-base">
            <thead>
              <tr>
                <th>SKU</th>
                <th>Brand</th>
                <th>Product / Variant</th>
                <th>Flavor</th>
                <th>Size</th>
                <th>CBM/CTN</th>
                <th>Gross Wt/CTN</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id}>
                  <td className="font-mono text-xs">{p.sku}</td>
                  <td>{p.brand}</td>
                  <td className="font-medium text-slate-900">{p.productName}</td>
                  <td>{p.flavor ?? "—"}</td>
                  <td>{p.size ?? "—"}</td>
                  <td>{fmtNum(p.cbmPerCtn, 4)} m³</td>
                  <td>{fmtNum(p.grossWeightKg, 2)} kg</td>
                  <td>
                    <StatusBadge status={p.status} />
                  </td>
                  <td>
                    <Link href={`/products/${p.id}`} className="text-xs font-medium text-brand-600 hover:underline">
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
