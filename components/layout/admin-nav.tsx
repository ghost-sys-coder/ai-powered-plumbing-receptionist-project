"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { Users, Building2, ChevronLeft, ChevronRight } from "lucide-react";
import { ThemeToggle } from "@/components/theme/theme-toggle";

const CUSTOMERS = { href: "/admin", label: "Customers", icon: Users };
const AGENCIES = { href: "/admin/agencies", label: "Agencies", icon: Building2 };

// isPlatform: platform admins also manage agencies. subtitle: the agency's
// name for agency staff, "Platform admin" for us.
export function AdminNav({ isPlatform, subtitle }: { isPlatform: boolean; subtitle: string }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const links = isPlatform ? [CUSTOMERS, AGENCIES] : [CUSTOMERS];

  return (
    <aside
      className={`relative flex h-screen flex-col border-r bg-sidebar transition-all duration-200 ${
        collapsed ? "w-16" : "w-60"
      }`}
    >
      {/* Header */}
      <div className="flex h-14 items-center border-b px-3">
        {!collapsed && (
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              PlumberAnswered
            </p>
            <p className="truncate text-sm font-medium">{subtitle}</p>
          </div>
        )}
        <button
          onClick={() => setCollapsed((c) => !c)}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground ${
            collapsed ? "mx-auto" : "ml-2"
          }`}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* Nav links */}
      <nav className="flex-1 px-2 py-4 space-y-1">
        {links.map(({ href, label, icon: Icon }) => {
          const active =
            pathname === href || (href !== "/admin" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              title={collapsed ? label : undefined}
              className={`flex items-center rounded-md px-2 py-2 text-sm font-medium transition-colors ${
                collapsed ? "justify-center" : "gap-3 px-3"
              } ${
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {!collapsed && label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div
        className={`flex items-center border-t p-3 ${
          collapsed ? "flex-col gap-3" : "justify-between"
        }`}
      >
        <UserButton />
        <ThemeToggle />
      </div>
    </aside>
  );
}
