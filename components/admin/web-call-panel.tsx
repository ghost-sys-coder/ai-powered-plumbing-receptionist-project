"use client";

import { AlertTriangle, Headphones } from "lucide-react";
import { Card } from "@/components/ui/card";
import { SectionHeader } from "@/components/layout/section-header";
import { WebCallButton } from "@/components/admin/web-call-button";

type WebCallPanelProps = {
  customerId: string;
  agentStatus: "active" | "paused" | "error";
  phoneNumber: string | null;
  ownerName: string | null;
};

export function WebCallPanel({
  customerId,
  agentStatus,
  phoneNumber,
  ownerName,
}: WebCallPanelProps) {
  return (
    <Card>
      <SectionHeader
        icon={Headphones}
        title="Test the receptionist"
        description={`Talk to it from your browser, as a caller to ${ownerName ?? "the business"}${
          phoneNumber ? ` · ${phoneNumber}` : ""
        }`}
      />

      <div className="space-y-3 px-5">
        {agentStatus !== "active" && (
          <div className="flex items-start gap-2 rounded-xl bg-amber-500/8 px-3 py-2.5 text-sm text-amber-900 ring-1 ring-inset ring-amber-600/20 dark:text-amber-200">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            The receptionist is {agentStatus} — switch it on before testing.
          </div>
        )}
        <WebCallButton customerId={customerId} disabled={agentStatus !== "active"} />
        <p className="text-xs text-muted-foreground">Test calls are billed like phone calls.</p>
      </div>
    </Card>
  );
}
