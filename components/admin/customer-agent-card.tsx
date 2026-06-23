import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { VapiAgent } from "@/db/schema/vapi-agents";

export function CustomerAgentCard({ agent }: { agent: VapiAgent | null }) {
  if (!agent) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">AI agent</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No agent provisioned yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">AI agent</CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between gap-2">
            <dt className="text-muted-foreground">Status</dt>
            <dd className="font-medium capitalize">{agent.status}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-muted-foreground">Phone</dt>
            <dd className="font-mono font-medium">{agent.phoneNumber ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Vapi Assistant ID</dt>
            <dd className="mt-0.5 break-all font-mono text-xs">
              {agent.vapiAssistantId}
            </dd>
          </div>
          {agent.vapiPhoneNumberId && (
            <div>
              <dt className="text-muted-foreground">Phone Number ID</dt>
              <dd className="mt-0.5 break-all font-mono text-xs">
                {agent.vapiPhoneNumberId}
              </dd>
            </div>
          )}
        </dl>
      </CardContent>
    </Card>
  );
}
