import { requireView } from "@/lib/guard";
import { prisma } from "@/lib/db";
import { PageHeader, EmptyState, fmtDate, fmtNum } from "@/components/ui";
import { getFgStockMap, getRmStockMap } from "@/lib/stock";
import { summarizePeriod } from "@/lib/sales";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: { year?: string; month?: string };
}) {
  await requireView("reports");

  const now = new Date();
  const year = Number(searchParams.year) || now.getFullYear();
  const month = Number(searchParams.month) || now.getMonth() + 1;

  const [summary, products, materials, fgStockMap, rmStockMap, scheduleVsActual] = await Promise.all([
    summarizePeriod(year, month),
    prisma.product.findMany({ where: { status: "ACTIVE" }, orderBy: { productName: "asc" } }),
    prisma.rawMaterial.findMany({ where: { status: "ACTIVE" }, orderBy: { name: "asc" } }),
    getFgStockMap(),
    getRmStockMap(),
    prisma.productionSchedule.findMany({
      where: { status: { in: ["COMPLETED", "IN_PRODUCTION"] } },
      include: { product: true, actuals: true },
      orderBy: { productionDate: "desc" },
      take: 20,
    }),
  ]);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Reports & Analytics"
        description="Decision-ready operational and sales reporting with flexible period comparison."
      />

      <div>
        <h2 className="mb-3 text-sm font-semibold text-slate-700">
          Monthly Sales Summary — {month}/{year}
        </h2>
        <div className="card grid grid-cols-2 gap-4 p-6 text-sm md:grid-cols-4">
          <div>
            <p className="text-xs uppercase text-slate-400">PO Qty</p>
            <p className="font-semibold">{fmtNum(summary.poQty)} CTN</p>
          </div>
          <div>
            <p className="text-xs uppercase text-slate-400">Shipment Qty</p>
            <p className="font-semibold">{fmtNum(summary.shipmentQty)} CTN</p>
          </div>
          <div>
            <p className="text-xs uppercase text-slate-400">Target</p>
            <p className="font-semibold">{fmtNum(summary.target)} CTN</p>
          </div>
          <div>
            <p className="text-xs uppercase text-slate-400">Achievement</p>
            <p className="font-semibold">{summary.achievementPct === null ? "—" : `${fmtNum(summary.achievementPct, 1)}%`}</p>
          </div>
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold text-slate-700">Production Plan vs Actual</h2>
        <div className="card overflow-x-auto">
          {scheduleVsActual.length === 0 ? (
            <EmptyState message="No production history yet." />
          ) : (
            <table className="table-base">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Product</th>
                  <th>Planned CTN</th>
                  <th>Actual CTN</th>
                  <th>Good Output</th>
                  <th>Variance</th>
                </tr>
              </thead>
              <tbody>
                {scheduleVsActual.map((s) => {
                  const actualTotal = s.actuals.reduce((sum, a) => sum + a.actualCtn, 0);
                  const goodTotal = s.actuals.reduce((sum, a) => sum + a.goodOutputCtn, 0);
                  return (
                    <tr key={s.id}>
                      <td>{fmtDate(s.productionDate)}</td>
                      <td>{s.product.productName}</td>
                      <td>{fmtNum(s.plannedCtn)}</td>
                      <td>{fmtNum(actualTotal)}</td>
                      <td>{fmtNum(goodTotal)}</td>
                      <td className={actualTotal < s.plannedCtn ? "text-red-600" : "text-emerald-600"}>
                        {fmtNum(actualTotal - s.plannedCtn)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div>
          <h2 className="mb-3 text-sm font-semibold text-slate-700">Finished Goods Inventory</h2>
          <div className="card overflow-x-auto">
            <table className="table-base">
              <thead>
                <tr>
                  <th>SKU</th>
                  <th>Stock (CTN)</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id}>
                    <td>{p.sku}</td>
                    <td>{fmtNum(fgStockMap[p.id] ?? 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div>
          <h2 className="mb-3 text-sm font-semibold text-slate-700">Raw Material Availability / Inventory</h2>
          <div className="card overflow-x-auto">
            <table className="table-base">
              <thead>
                <tr>
                  <th>Material</th>
                  <th>Stock</th>
                  <th>Min.</th>
                </tr>
              </thead>
              <tbody>
                {materials.map((m) => (
                  <tr key={m.id}>
                    <td>{m.name}</td>
                    <td className={(rmStockMap[m.id] ?? 0) < m.minimumStock ? "font-semibold text-red-600" : ""}>
                      {fmtNum(rmStockMap[m.id] ?? 0, 2)}
                    </td>
                    <td>{fmtNum(m.minimumStock, 2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
