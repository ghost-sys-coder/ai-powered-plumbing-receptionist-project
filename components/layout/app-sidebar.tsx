"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { PanelLeftClose, PanelLeftOpen, type LucideIcon } from "lucide-react";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { BRAND } from "@/lib/brand";
import { cn } from "@/lib/utils";

export type SidebarLink = { href: string; label: string; icon: LucideIcon };

const STORAGE_KEY = "sidebar-collapsed";

// The app's left rail, shared by the admin console and the business
// dashboard. `root` is the section's home link, which is only active on an
// exact match (every other link also matches its sub-pages).
export function AppSidebar({
  links,
  root,
  workspace,
  workspaceLabel,
}: {
  links: SidebarLink[];
  root: string;
  workspace: string;
  workspaceLabel: string;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      // Restoring a saved per-browser preference after mount.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (localStorage.getItem(STORAGE_KEY) === "1") setCollapsed(true);
    } catch {}
  }, []);

  function toggle() {
    setCollapsed((c) => {
      try {
        localStorage.setItem(STORAGE_KEY, c ? "0" : "1");
      } catch {}
      return !c;
    });
  }

  return (
    <aside
      className={cn(
        "relative flex h-dvh flex-col border-r border-sidebar-border bg-sidebar/80 backdrop-blur-xl transition-[width] duration-300 ease-out",
        collapsed ? "w-[72px]" : "w-64"
      )}
    >
      {/* Brand + workspace */}
      <div className={cn("flex h-16 items-center gap-3 px-4", collapsed && "justify-center px-0")}>
        <span
          aria-hidden
          className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-gradient-to-b from-[color-mix(in_oklch,var(--primary),white_14%)] to-primary text-primary-foreground shadow-[inset_0_1px_0_oklch(1_0_0/0.25),0_2px_6px_-1px_oklch(0.45_0.12_48/0.45)]"
        >
          <span className="font-mono text-[12px] font-semibold tracking-tight">{BRAND.initials}</span>
        </span>
        {!collapsed && (
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-[0.9375rem] font-semibold tracking-tight">{BRAND.name}</p>
            <p className="truncate text-xs text-muted-foreground" title={workspace}>
              {workspace}
            </p>
          </div>
        )}
      </div>

      <div className="mx-4 h-px bg-gradient-to-r from-transparent via-sidebar-border to-transparent" />

      <nav aria-label="Main" className="flex-1 space-y-0.5 px-3 py-4">
        {!collapsed && (
          <p className="px-3 pb-2 text-[11px] font-medium tracking-wide text-muted-foreground/80">
            {workspaceLabel}
          </p>
        )}
        {links.map(({ href, label, icon: Icon }) => {
          const active = href === root ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              title={collapsed ? label : undefined}
              aria-current={active ? "page" : undefined}
              className={cn(
                "group relative flex h-9 items-center rounded-lg text-sm font-medium transition-[background-color,color,box-shadow] duration-200",
                collapsed ? "justify-center" : "gap-3 px-3",
                active
                  ? "bg-card text-foreground shadow-xs-tinted ring-1 ring-foreground/[0.06]"
                  : "text-muted-foreground hover:bg-sidebar-accent/70 hover:text-foreground"
              )}
            >
              {active && !collapsed && (
                <span aria-hidden className="absolute inset-y-2 left-0 w-[3px] rounded-full bg-primary" />
              )}
              <Icon
                strokeWidth={1.75}
                className={cn(
                  "size-[18px] shrink-0 transition-colors",
                  active ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                )}
              />
              {!collapsed && label}
            </Link>
          );
        })}
      </nav>

      <div className={cn("p-3", collapsed && "px-2")}>
        <div
          className={cn(
            "flex items-center gap-2 rounded-xl bg-card/70 p-2 ring-1 ring-foreground/[0.06]",
            collapsed ? "flex-col" : "justify-between"
          )}
        >
          <div className="flex items-center gap-2 pl-0.5">
            <UserButton />
          </div>
          <div className={cn("flex items-center gap-1", collapsed && "flex-col")}>
            <ThemeToggle quiet />
            <button
              type="button"
              onClick={toggle}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              className="grid size-9 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              {collapsed ? (
                <PanelLeftOpen strokeWidth={1.75} className="size-4" />
              ) : (
                <PanelLeftClose strokeWidth={1.75} className="size-4" />
              )}
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
