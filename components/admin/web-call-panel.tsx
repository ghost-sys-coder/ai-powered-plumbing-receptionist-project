"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
      <CardHeader>
        <CardTitle className="text-base">Test Agent</CardTitle>
        <CardDescription>
          Speak to the AI as if you were a customer calling
          {ownerName ? ` ${ownerName}` : ""}
          {phoneNumber ? ` · ${phoneNumber}` : ""}
        </CardDescription>
      </CardHeader>

      <CardContent>
        {agentStatus !== "active" ? (
          <div className="mb-4 rounded-md border border-yellow-200 bg-yellow-50 px-3 py-2 text-sm text-yellow-800 dark:border-yellow-800/40 dark:bg-yellow-950/30 dark:text-yellow-400">
            Agent is currently {agentStatus} — activate it before testing
          </div>
        ) : null}

        <WebCallButton
          customerId={customerId}
          disabled={agentStatus !== "active"}
        />
      </CardContent>

      <CardFooter>
        <p className="text-xs text-muted-foreground">
          Web calls are billed at the same rate as phone calls
        </p>
      </CardFooter>
    </Card>
  );
}
