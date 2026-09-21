import Link from "next/link";
import { requireView } from "@/lib/guard";
import { prisma } from "@/lib/db";
import { PageHeader, StatusBadge, EmptyState, fmtNum } from "@/components/ui";
import { canManage } from "@/lib/rbac";
import { getRmStockMap } from "@/lib/stock";

export default async function MaterialsPage() {
  const user = await requireView("materials");
  const manage = canManage(user.role, "materials");

  const materials = await prisma.rawMaterial.findMany({ orderBy: { name: "asc" } });
  const stockMap = await getRmStockMap();

  return (
    <div>
      <PageHeader
        title="Raw Material Master"
        description="Raw-material catalog required for production planning and warehouse inventory."
        actions={
          manage ? (
            <Link href="/materials/new" className="btn-primary">
              + Add material
            </Link>
          ) : undefined
        }
      />
      <div className="card overflow-x-auto">
        {materials.length === 0 ? (
          <EmptyState message="No raw materials yet." />
        ) : (
          <table className="table-base">
            <thead>
              <tr>
                <th>Code</th>
                <th>Name</th>
                <th>Category</th>
                <th>Unit</th>
                <th>Current Stock</th>
                <th>Min. Stock</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {materials.map((m) => {
                const stock = stockMap[m.id] ?? 0;
                const low = stock < m.minimumStock;
                return (
                  <tr key={m.id}>
                    <td className="font-mono text-xs">{m.code}</td>
                    <td className="font-medium text-slate-900">{m.name}</td>
                    <td>{m.category ?? "—"}</td>
                    <td>{m.unit}</td>
                    <td className={low ? "font-semibold text-red-600" : ""}>
                      {fmtNum(stock, 2)} {low && "⚠"}
                    </td>
                    <td>{fmtNum(m.minimumStock, 2)}</td>
                    <td>
                      <StatusBadge status={m.status} />
                    </td>
                    <td>
                      <Link href={`/materials/${m.id}`} className="text-xs font-medium text-brand-600 hover:underline">
                        View
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
