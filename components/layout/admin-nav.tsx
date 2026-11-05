"use client";

import { Users, Building2, CreditCard } from "lucide-react";
import { AppSidebar, type SidebarLink } from "@/components/layout/app-sidebar";

const CUSTOMERS: SidebarLink = { href: "/admin", label: "Customers", icon: Users };
const AGENCIES: SidebarLink = { href: "/admin/agencies", label: "Agencies", icon: Building2 };
const BILLING: SidebarLink = { href: "/admin/billing", label: "Billing", icon: CreditCard };

// isPlatform: platform admins also manage agencies. subtitle: the agency's
// name for agency staff, "Platform admin" for us.
export function AdminNav({ isPlatform, subtitle }: { isPlatform: boolean; subtitle: string }) {
  return (
    <AppSidebar
      links={isPlatform ? [CUSTOMERS, AGENCIES, BILLING] : [CUSTOMERS, BILLING]}
      root="/admin"
      workspace={subtitle}
      workspaceLabel={isPlatform ? "Platform" : "Agency"}
    />
  );
}
