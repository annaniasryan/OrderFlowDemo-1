"use client";

import { useState, useTransition } from "react";
import { resetUserPassword } from "../actions";

export default function ResetPasswordButton({ userId }: { userId: string }) {
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div>
      <button
        type="button"
        className="btn-secondary text-xs"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const pw = await resetUserPassword(userId);
            setTempPassword(pw);
          })
        }
      >
        {pending ? "Resetting…" : "Reset access / password"}
      </button>
      {tempPassword && (
        <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
          Temporary password: <span className="font-mono font-semibold">{tempPassword}</span>
        </p>
      )}
    </div>
  );
}
