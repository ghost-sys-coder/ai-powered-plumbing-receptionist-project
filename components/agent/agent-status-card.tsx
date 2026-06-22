import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { VapiAgent } from "@/db/schema/vapi-agents";

const statusDot: Record<string, string> = {
  active: "bg-green-500",
  paused: "bg-yellow-400",
  error: "bg-red-500",
};

export function AgentStatusCard({ agent }: { agent: VapiAgent }) {
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
        {agent.twilioNumber && (
          <div className="flex justify-between gap-2">
            <span className="text-muted-foreground">Phone number</span>
            <span className="font-mono font-medium">{agent.twilioNumber}</span>
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
