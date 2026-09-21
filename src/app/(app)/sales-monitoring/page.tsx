import { requireView } from "@/lib/guard";
import { prisma } from "@/lib/db";
import { PageHeader, KpiCard, fmtNum } from "@/components/ui";
import { summarizePeriod, previousMonth, growthBetween } from "@/lib/sales";

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export default async function SalesMonitoringPage({
  searchParams,
}: {
  searchParams: { year?: string; month?: string };
}) {
  const user = await requireView("sales_monitoring");

  const now = new Date();
  const year = Number(searchParams.year) || now.getFullYear();
  const month = Number(searchParams.month) || now.getMonth() + 1;
  const prev = previousMonth(year, month);

  const distributorFilter =
    user.role === "ACCOUNT_EXECUTIVE" ? { assignedAeId: user.id } : undefined;

  const distributors = await prisma.distributor.findMany({
    where: distributorFilter,
    orderBy: { companyName: "asc" },
  });
  const distributorIds = distributors.map((d) => d.id);

  const [current, comparisonMoM, comparisonYoY] = await Promise.all([
    summarizePeriod(year, month),
    summarizePeriod(prev.year, prev.month),
    summarizePeriod(year - 1, month),
  ]);

  const momGrowth = growthBetween(current, comparisonMoM);
  const yoyGrowth = growthBetween(current, comparisonYoY);

  const byDistributor = await Promise.all(
    distributors.slice(0, 25).map(async (d) => ({
      distributor: d,
      summary: await summarizePeriod(year, month, { distributorId: d.id }),
    }))
  );

  const products = await prisma.product.findMany({ where: { status: "ACTIVE" }, take: 25, orderBy: { productName: "asc" } });
  const byProduct = await Promise.all(
    products.map(async (p) => ({
      product: p,
      summary: await summarizePeriod(year, month, { productId: p.id }),
    }))
  );

  return (
    <div className="space-y-8">
      <PageHeader
        title="Sales Monitoring"
        description="Commercial and shipment performance by period, distributor and product."
      />

      <form className="flex items-end gap-3">
        <div>
          <label className="label">Year</label>
          <input name="year" type="number" defaultValue={year} className="input w-28" />
        </div>
        <div>
          <label className="label">Month</label>
          <select name="month" defaultValue={month} className="input w-32">
            {MONTH_NAMES.map((m, idx) => (
              <option key={m} value={idx + 1}>
                {m}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className="btn-secondary">
          Apply
        </button>
      </form>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <KpiCard label="PO Qty (CTN)" value={fmtNum(current.poQty)} />
        <KpiCard label="Shipment Qty / Actual (CTN)" value={fmtNum(current.shipmentQty)} />
        <KpiCard label="Target (CTN)" value={fmtNum(current.target)} />
        <KpiCard
          label="Achievement"
          value={current.achievementPct === null ? "—" : `${fmtNum(current.achievementPct, 1)}%`}
        />
        <KpiCard label="Growth (MoM)" value={momGrowth === null ? "—" : `${fmtNum(momGrowth, 1)}%`} hint={`vs ${MONTH_NAMES[prev.month - 1]} ${prev.year}`} />
        <KpiCard label="Growth (YoY)" value={yoyGrowth === null ? "—" : `${fmtNum(yoyGrowth, 1)}%`} hint={`vs ${MONTH_NAMES[month - 1]} ${year - 1}`} />
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold text-slate-700">Distributor Performance</h2>
        <div className="card overflow-x-auto">
          <table className="table-base">
            <thead>
              <tr>
                <th>Distributor</th>
                <th>PO Qty</th>
                <th>Shipment Qty</th>
                <th>Target</th>
                <th>Achievement</th>
              </tr>
            </thead>
            <tbody>
              {byDistributor.map(({ distributor, summary }) => (
                <tr key={distributor.id}>
                  <td className="font-medium text-slate-900">{distributor.companyName}</td>
                  <td>{fmtNum(summary.poQty)}</td>
                  <td>{fmtNum(summary.shipmentQty)}</td>
                  <td>{fmtNum(summary.target)}</td>
                  <td>{summary.achievementPct === null ? "—" : `${fmtNum(summary.achievementPct, 1)}%`}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold text-slate-700">Product Performance</h2>
        <div className="card overflow-x-auto">
          <table className="table-base">
            <thead>
              <tr>
                <th>Product</th>
                <th>PO Qty</th>
                <th>Shipment Qty</th>
              </tr>
            </thead>
            <tbody>
              {byProduct.map(({ product, summary }) => (
                <tr key={product.id}>
                  <td className="font-medium text-slate-900">{product.productName} ({product.size ?? "—"})</td>
                  <td>{fmtNum(summary.poQty)}</td>
                  <td>{fmtNum(summary.shipmentQty)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {distributorIds.length === 0 && user.role === "ACCOUNT_EXECUTIVE" && (
        <p className="text-sm text-slate-400">No distributors assigned to you yet.</p>
      )}
    </div>
  );
}
