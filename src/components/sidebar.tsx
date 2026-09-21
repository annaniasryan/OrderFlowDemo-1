"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { NavItem } from "@/lib/nav";

export default function Sidebar({ groups }: { groups: { group: string; items: NavItem[] }[] }) {
  const pathname = usePathname();

  return (
    <nav className="space-y-6">
      {groups.map(({ group, items }) => (
        <div key={group}>
          <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-brand-200">
            {group}
          </p>
          <ul className="space-y-0.5">
            {items.map((item) => {
              const active = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`block rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                      active
                        ? "bg-white text-brand-800"
                        : "text-brand-50 hover:bg-brand-700/60"
                    }`}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
