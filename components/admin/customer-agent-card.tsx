import { AlertTriangle, Phone } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { VapiAgent } from "@/db/schema/vapi-agents";

const digitsOnly = (s: string | null | undefined) => (s ?? "").replace(/\D/g, "");

export function CustomerAgentCard({
  agent,
  livePhoneNumber,
}: {
  agent: VapiAgent | null;
  livePhoneNumber?: string | null;
}) {
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

  const phoneDrift =
    !!livePhoneNumber &&
    !!agent.phoneNumber &&
    digitsOnly(livePhoneNumber) !== digitsOnly(agent.phoneNumber);

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
            <dt className="flex items-center gap-1.5 text-muted-foreground">
              <Phone className="h-3.5 w-3.5" />
              Phone {livePhoneNumber ? "(live)" : "(stored)"}
            </dt>
            <dd className="font-mono font-medium">
              {livePhoneNumber ?? agent.phoneNumber ?? "—"}
            </dd>
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

        {phoneDrift && (
          <div className="mt-3 flex items-start gap-1.5 rounded-md border border-yellow-300 bg-yellow-50 px-2 py-1.5 text-xs text-yellow-800 dark:border-yellow-800/40 dark:bg-yellow-950/30 dark:text-yellow-400">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>
              Stored number is out of sync with Vapi — saved as{" "}
              <span className="font-mono">{agent.phoneNumber}</span>.
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
