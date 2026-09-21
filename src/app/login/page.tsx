import LoginForm from "./login-form";
import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: { next?: string };
}) {
  const user = await getSessionUser();
  if (user) redirect("/dashboard");

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-900 via-brand-700 to-brand-500 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center text-white">
          <h1 className="text-3xl font-bold tracking-tight">OrderFlow</h1>
          <p className="mt-1 text-sm text-brand-100">
            Distributor PO · Sales · PPIC · Production · Inventory · Shipment · Analytics
          </p>
        </div>
        <div className="card p-6">
          <LoginForm next={searchParams.next} />
        </div>
        <p className="mt-4 text-center text-xs text-brand-100">
          Version 4.0 — Confirmed Operational Workflow
        </p>
      </div>
    </div>
  );
}
