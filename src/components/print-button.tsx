"use client";

import { useTransition } from "react";

export default function PrintButton({ onPrint }: { onPrint: () => Promise<void> }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      className="btn-secondary"
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          await onPrint();
          window.print();
        });
      }}
    >
      {pending ? "Preparing…" : "Print / Preview"}
    </button>
  );
}
