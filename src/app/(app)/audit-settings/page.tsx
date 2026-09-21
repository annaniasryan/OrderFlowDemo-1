import { requireView } from "@/lib/guard";
import { canManage, ALL_ROLES, ROLE_LABELS, PERMISSIONS } from "@/lib/rbac";
import { prisma } from "@/lib/db";
import { PageHeader, EmptyState, fmtDate, fmtNum } from "@/components/ui";
import { updateNumberingPrefix, addResource, toggleResource, setSalesTarget } from "./actions";

export default async function AuditSettingsPage() {
  const user = await requireView("audit_settings");
  const manage = canManage(user.role, "audit_settings");

  const [auditLogs, numberingSettings, resources, targets, distributors, products] = await Promise.all([
    prisma.auditLog.findMany({ include: { user: true }, orderBy: { createdAt: "desc" }, take: 40 }),
    prisma.numberingSetting.findMany(),
    prisma.productionResource.findMany({ orderBy: [{ type: "asc" }, { name: "asc" }] }),
    prisma.salesTarget.findMany({ orderBy: [{ periodYear: "desc" }, { periodMonth: "desc" }], take: 20 }),
    prisma.distributor.findMany({ where: { status: "ACTIVE" }, orderBy: { companyName: "asc" } }),
    prisma.product.findMany({ where: { status: "ACTIVE" }, orderBy: { productName: "asc" } }),
  ]);

  async function resourceAction(formData: FormData) {
    "use server";
    await addResource(formData);
  }
  async function targetAction(formData: FormData) {
    "use server";
    await setSalesTarget(formData);
  }

  const numberingKeys = ["PO", "DO", "MATERIAL_REQUEST"];
  const settingByKey = Object.fromEntries(numberingSettings.map((s) => [s.key, s]));

  // SalesTarget stores distributorId/productId as plain columns (a target may
  // be overall, per distributor, per product, or both), so names are resolved
  // from the lists already loaded above rather than through a Prisma relation.
  const distributorNames = new Map(distributors.map((d) => [d.id, d.companyName]));
  const productSkus = new Map(products.map((p) => [p.id, p.sku]));

  return (
    <div className="space-y-8">
      <PageHeader title="Audit & System Settings" description="Traceability and configurable system references." />

      {manage && (
        <div>
          <h2 className="mb-3 text-sm font-semibold text-slate-700">Numbering Settings</h2>
          <div className="card grid grid-cols-1 gap-4 p-6 md:grid-cols-3">
            {numberingKeys.map((key) => {
              const setting = settingByKey[key];
              return (
                <form key={key} action={updateNumberingPrefix} className="space-y-2">
                  <input type="hidden" name="key" value={key} />
                  <label className="label" htmlFor={`prefix-${key}`}>
                    {key.replace(/_/g, " ")} Prefix
                  </label>
                  <div className="flex gap-2">
                    <input id={`prefix-${key}`} name="prefix" defaultValue={setting?.prefix ?? key} className="input" />
                    <button type="submit" className="btn-secondary text-xs">
                      Save
                    </button>
                  </div>
                  <p className="text-xs text-slate-400">Next sequence: {setting?.nextSeq ?? 1}</p>
                </form>
              );
            })}
          </div>
        </div>
      )}

      {manage && (
        <div>
          <h2 className="mb-3 text-sm font-semibold text-slate-700">Production Line / Machine & Shift Settings</h2>
          <div className="card space-y-4 p-6">
            <form action={resourceAction} className="flex flex-wrap items-end gap-3">
              <div>
                <label className="label">Type</label>
                <select name="type" className="input">
                  <option value="LINE">Line / Machine</option>
                  <option value="SHIFT">Shift</option>
                </select>
              </div>
              <div>
                <label className="label">Name</label>
                <input name="name" required className="input" />
              </div>
              <button type="submit" className="btn-primary">
                Add
              </button>
            </form>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {["LINE", "SHIFT"].map((type) => (
                <div key={type}>
                  <p className="mb-2 text-xs font-semibold uppercase text-slate-500">{type === "LINE" ? "Lines / Machines" : "Shifts"}</p>
                  <ul className="space-y-1 text-sm">
                    {resources
                      .filter((r) => r.type === type)
                      .map((r) => (
                        <li key={r.id} className="flex items-center justify-between">
                          <span className={r.status === "INACTIVE" ? "text-slate-400 line-through" : ""}>{r.name}</span>
                          <form action={toggleResource}>
                            <input type="hidden" name="id" value={r.id} />
                            <button type="submit" className="text-xs text-brand-600 hover:underline">
                              {r.status === "ACTIVE" ? "Deactivate" : "Activate"}
                            </button>
                          </form>
                        </li>
                      ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {manage && (
        <div>
          <h2 className="mb-3 text-sm font-semibold text-slate-700">Sales Targets</h2>
          <div className="card space-y-4 p-6">
            <form action={targetAction} className="flex flex-wrap items-end gap-3">
              <div>
                <label className="label">Year</label>
                <input name="periodYear" type="number" defaultValue={new Date().getFullYear()} className="input w-24" />
              </div>
              <div>
                <label className="label">Month</label>
                <input name="periodMonth" type="number" min="1" max="12" defaultValue={new Date().getMonth() + 1} className="input w-20" />
              </div>
              <div>
                <label className="label">Distributor (optional)</label>
                <select name="distributorId" className="input">
                  <option value="">Overall</option>
                  {distributors.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.companyName}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Product (optional)</label>
                <select name="productId" className="input">
                  <option value="">All products</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.sku}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Target (CTN)</label>
                <input name="targetCtn" type="number" required className="input w-28" />
              </div>
              <button type="submit" className="btn-primary">
                Save target
              </button>
            </form>
            <table className="table-base">
              <thead>
                <tr>
                  <th>Period</th>
                  <th>Distributor</th>
                  <th>Product</th>
                  <th>Target</th>
                </tr>
              </thead>
              <tbody>
                {targets.map((t) => (
                  <tr key={t.id}>
                    <td>{t.periodMonth}/{t.periodYear}</td>
                    <td>{t.distributorId ? distributorNames.get(t.distributorId) ?? "Unknown distributor" : "Overall"}</td>
                    <td>{t.productId ? productSkus.get(t.productId) ?? "Unknown product" : "All products"}</td>
                    <td>{fmtNum(t.targetCtn)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div>
        <h2 className="mb-3 text-sm font-semibold text-slate-700">Role / Permission Matrix</h2>
        <div className="card overflow-x-auto p-4">
          <p className="mb-2 text-xs text-slate-400">
            Enforced server-side on every action — this view is read-only reference.
          </p>
          <table className="table-base">
            <thead>
              <tr>
                <th>Role</th>
                <th>Modules with View access</th>
                <th>Modules with Manage access</th>
              </tr>
            </thead>
            <tbody>
              {ALL_ROLES.map((role) => {
                const viewMods = Object.entries(PERMISSIONS).filter(([, p]) => p.view.includes(role)).length;
                const manageMods = Object.entries(PERMISSIONS).filter(([, p]) => p.manage.includes(role)).length;
                return (
                  <tr key={role}>
                    <td className="font-medium text-slate-900">{ROLE_LABELS[role]}</td>
                    <td>{viewMods} / {Object.keys(PERMISSIONS).length}</td>
                    <td>{manageMods} / {Object.keys(PERMISSIONS).length}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold text-slate-700">Audit Log</h2>
        <div className="card overflow-x-auto">
          {auditLogs.length === 0 ? (
            <EmptyState message="No audit entries yet." />
          ) : (
            <table className="table-base">
              <thead>
                <tr>
                  <th>When</th>
                  <th>User</th>
                  <th>Action</th>
                  <th>Module</th>
                  <th>Record</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.map((log) => (
                  <tr key={log.id}>
                    <td>{fmtDate(log.createdAt)} {new Date(log.createdAt).toLocaleTimeString()}</td>
                    <td>{log.user?.fullName ?? "System"}</td>
                    <td className="font-mono text-xs">{log.action}</td>
                    <td>{log.module}</td>
                    <td className="font-mono text-xs">{log.recordId ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
