import { redirect } from "next/navigation";
import { requireView } from "@/lib/guard";
import { canManage } from "@/lib/rbac";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui";
import { createDistributor } from "../actions";

export default async function NewDistributorPage() {
  const user = await requireView("distributors");
  if (!canManage(user.role, "distributors")) redirect("/distributors");

  const aes = await prisma.user.findMany({
    where: { role: "ACCOUNT_EXECUTIVE", status: "ACTIVE" },
    orderBy: { fullName: "asc" },
  });

  return (
    <div className="max-w-xl">
      <PageHeader title="Add Distributor" />
      <form action={createDistributor} className="card space-y-4 p-6">
        <div>
          <label className="label">Company Name</label>
          <input name="companyName" required className="input" />
        </div>
        <div>
          <label className="label">Contact (PIC)</label>
          <input name="contact" className="input" />
        </div>
        <div>
          <label className="label">Shipping Address</label>
          <textarea name="shippingAddress" required rows={2} className="input" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Region</label>
            <input name="region" className="input" />
          </div>
          <div>
            <label className="label">City</label>
            <input name="city" className="input" />
          </div>
        </div>
        <div>
          <label className="label">Assigned Account Executive</label>
          <select name="assignedAeId" className="input" defaultValue="">
            <option value="">— Unassigned —</option>
            {aes.map((a) => (
              <option key={a.id} value={a.id}>
                {a.fullName}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className="btn-primary">
          Save distributor
        </button>
      </form>
    </div>
  );
}
