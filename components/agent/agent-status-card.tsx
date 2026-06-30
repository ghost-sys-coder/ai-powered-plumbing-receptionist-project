import { Phone } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { VapiAgent } from "@/db/schema/vapi-agents";

const statusDot: Record<string, string> = {
  active: "bg-green-500",
  paused: "bg-yellow-400",
  error: "bg-red-500",
};

export function AgentStatusCard({
  agent,
  livePhoneNumber,
}: {
  agent: VapiAgent;
  livePhoneNumber?: string | null;
}) {
  // Prefer the number live from Vapi; fall back to the stored value.
  const phoneNumber = livePhoneNumber ?? agent.phoneNumber;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Agent status</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="flex items-center gap-2">
          <span
            className={`h-2.5 w-2.5 rounded-full ${statusDot[agent.status] ?? "bg-slate-400"}`}
          />
          <span className="font-medium capitalize">{agent.status}</span>
        </div>
        {phoneNumber && (
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <Phone className="h-3.5 w-3.5" />
              Phone number
            </span>
            <span className="font-mono font-medium">{phoneNumber}</span>
          </div>
        )}
        <div>
          <span className="text-muted-foreground">Assistant ID</span>
          <p className="mt-0.5 truncate font-mono text-xs">{agent.vapiAssistantId}</p>
        </div>
      </CardContent>
    </Card>
  );
}
