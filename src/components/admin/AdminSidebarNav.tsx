"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";

export interface AdminNavItem {
  label: string;
  description?: string;
  href: string;
  iconName: string;
}

interface AdminSidebarNavProps {
  items: AdminNavItem[];
}

export function AdminSidebarNav({ items }: AdminSidebarNavProps) {
  const pathname = usePathname();

  return (
    <nav className="space-y-1.5">
      {items.map((item) => {
        const isActive =
          pathname === item.href ||
          (item.href !== "/admin" && pathname?.startsWith(item.href));

        return (
          <Link
            key={item.href}
            href={item.href}
            className={clsx(
              "group flex items-center gap-3 rounded-lg px-3 py-2 transition",
              "border border-transparent hover:border-white/10 hover:bg-white/5",
              isActive
                ? "bg-white/10 text-white shadow-[0_10px_30px_rgba(15,23,42,0.35)]"
                : "text-white/70"
            )}
          >
            <span
              className={clsx(
                "inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border text-xs font-semibold transition",
                isActive
                  ? "border-white/30 bg-white/10 text-white"
                  : "border-white/10 bg-white/5 text-white/60 group-hover:text-white"
              )}
            >
              {item.iconName}
            </span>
            <div className="flex min-w-0 flex-col">
              <span className="text-sm font-medium leading-tight">
                {item.label}
              </span>
              {item.description && (
                <span className="text-[11px] leading-tight text-white/50">{item.description}</span>
              )}
            </div>
          </Link>
        );
      })}
    </nav>
  );
}

