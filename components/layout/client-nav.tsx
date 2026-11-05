"use client";

import { Phone, LayoutDashboard, Bot, CreditCard } from "lucide-react";
import { AppSidebar, type SidebarLink } from "@/components/layout/app-sidebar";

const LINKS: SidebarLink[] = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/calls", label: "Calls", icon: Phone },
  { href: "/dashboard/agent", label: "Receptionist", icon: Bot },
  { href: "/dashboard/billing", label: "Billing", icon: CreditCard },
];

interface ClientNavProps {
  businessName?: string;
}

export function ClientNav({ businessName }: ClientNavProps) {
  return <AppSidebar links={LINKS} root="/dashboard" workspace={businessName ?? "Dashboard"} workspaceLabel="Your business" />;
}
