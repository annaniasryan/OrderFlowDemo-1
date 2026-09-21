import { redirect } from "next/navigation";
import { requireView } from "@/lib/guard";
import { canManage } from "@/lib/rbac";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui";
import POItemsField from "@/components/po-items-field";
import { createPO } from "../actions";

export default async function NewPOPage() {
  const user = await requireView("po");
  if (!canManage(user.role, "po")) redirect("/po");

  const products = await prisma.product.findMany({ where: { status: "ACTIVE" }, orderBy: { productName: "asc" } });
  const distributors =
    user.role === "DISTRIBUTOR"
      ? []
      : await prisma.distributor.findMany({ where: { status: "ACTIVE" }, orderBy: { companyName: "asc" } });

  const productOptions = products.map((p) => ({ id: p.id, label: `${p.sku} — ${p.brand} ${p.productName}${p.size ? " " + p.size : ""}` }));

  return (
    <div className="max-w-2xl">
      <PageHeader title="Create Purchase Order" description="Product(s), quantity in CTN and requested shipping date." />
      <form action={createPO} className="card space-y-4 p-6">
        {user.role !== "DISTRIBUTOR" && (
          <div>
            <label className="label">Distributor</label>
            <select name="distributorId" required className="input">
              <option value="">Select distributor</option>
              {distributors.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.companyName}
                </option>
              ))}
            </select>
          </div>
        )}
        <div>
          <label className="label">Requested Shipping Date</label>
          <input name="requestedShippingDate" type="date" required className="input" />
        </div>

        <POItemsField products={productOptions} />

        <div>
          <label className="label">Notes / Attachment reference (optional)</label>
          <textarea name="notes" rows={2} className="input" />
        </div>

        <div className="flex gap-2">
          <button type="submit" name="intent" value="draft" className="btn-secondary">
            Save as draft
          </button>
          <button type="submit" name="intent" value="submit" className="btn-primary">
            Submit PO
          </button>
        </div>
      </form>
    </div>
  );
}
