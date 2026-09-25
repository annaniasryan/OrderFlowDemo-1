"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/sidebar";
import type { NavItem } from "@/lib/nav";

/**
 * Mobile navigation. The desktop sidebar is hidden below the `lg` breakpoint,
 * so without this there is no way to reach any module on a phone.
 */
export default function NavDrawer({
  groups,
}: {
  groups: { group: string; items: NavItem[] }[];
}) {
  const [open, setOpen] = useState(false);

  // Close on Escape, and stop the page behind the drawer from scrolling.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open modules menu"
        aria-expanded={open}
        className="btn-secondary inline-flex items-center gap-2 lg:hidden"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M2 4h12M2 8h12M2 12h12" strokeLinecap="round" />
        </svg>
        Modules
      </button>

      {open && (
        <div className="lg:hidden">
          <div
            className="fixed inset-0 z-40 bg-slate-900/60"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div
            className="fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col bg-brand-800 px-4 py-5 shadow-xl"
            role="dialog"
            aria-modal="true"
            aria-label="Modules"
          >
            <div className="mb-6 flex items-start justify-between gap-3 px-2">
              <div>
                <p className="text-lg font-bold text-white">OrderFlow</p>
                <p className="text-xs text-brand-200">v4.0 Operational Workflow</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close menu"
                className="rounded-lg px-2 py-1 text-brand-100 hover:bg-brand-700"
              >
                <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M4 4l10 10M14 4L4 14" strokeLinecap="round" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <Sidebar groups={groups} onNavigate={() => setOpen(false)} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
