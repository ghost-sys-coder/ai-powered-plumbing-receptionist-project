import { AlertTriangle, Bot, CalendarDays, Phone, ShieldCheck } from "lucide-react";
import { Card } from "@/components/ui/card";
import { DetailList, DetailRow, EmptyNote, SectionHeader } from "@/components/layout/section-header";
import type { VapiAgent } from "@/db/schema/vapi-agents";
import { EditAgentConfig } from "@/components/admin/edit-agent-config";
import { AddPhoneNumberButton } from "@/components/admin/add-phone-number-button";
import { cn } from "@/lib/utils";

const digitsOnly = (s: string | null | undefined) => (s ?? "").replace(/\D/g, "");

// Repairs stay on the card for two weeks, so staff see why calls in that
// window may be missing details.
const REPAIR_NOTICE_MS = 14 * 24 * 60 * 60 * 1000;

// Server component, rendered once per request, so reading the clock is fine.
const isRecent = (d: Date | null) => !!d && Date.now() - d.getTime() < REPAIR_NOTICE_MS;

const formatWhen = (d: Date) =>
  d.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

const STATUS: Record<VapiAgent["status"], { label: string; pill: string; dot: string }> = {
  active: {
    label: "Live",
    pill: "bg-emerald-500/10 text-emerald-700 ring-emerald-600/20 dark:text-emerald-300",
    dot: "bg-emerald-500",
  },
  paused: { label: "Paused", pill: "bg-amber-500/10 text-amber-800 ring-amber-600/25 dark:text-amber-300", dot: "bg-amber-500" },
  error: { label: "Error", pill: "bg-red-500/10 text-red-700 ring-red-600/20 dark:text-red-300", dot: "bg-red-500" },
};

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
        <SectionHeader icon={Bot} title="Receptionist" />
        <div className="px-5">
          <EmptyNote>No receptionist set up yet.</EmptyNote>
        </div>
      </Card>
    );
  }

  const phoneDrift =
    !!livePhoneNumber &&
    !!agent.phoneNumber &&
    digitsOnly(livePhoneNumber) !== digitsOnly(agent.phoneNumber);

  const isGoogle = agent.calendarType === "google_calendar";
  const status = STATUS[agent.status] ?? STATUS.error;
  const number = livePhoneNumber ?? agent.phoneNumber;
  const platform = agent.provider === "elevenlabs" ? "ElevenLabs" : "Vapi";
  const recentRepair = !agent.configError && isRecent(agent.configRepairedAt);

  return (
    <Card>
      <SectionHeader
        icon={Bot}
        title="Receptionist"
        description={
          <span className={cn("mt-0.5 inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 font-medium ring-1 ring-inset", status.pill)}>
            <span className={cn("size-1.5 rounded-full", status.dot)} />
            {status.label}
          </span>
        }
        action={
          <EditAgentConfig
            customerId={agent.customerId}
            calendarType={agent.calendarType}
            calendarId={agent.calendarId}
            appointmentDurationMinutes={agent.appointmentDurationMinutes}
            appointmentBufferMinutes={agent.appointmentBufferMinutes}
            minLeadMinutes={agent.minLeadMinutes}
            emergencyLeadMinutes={agent.emergencyLeadMinutes}
            alertPhone={agent.alertPhone}
            callSummaryTexts={agent.callSummaryTexts}
            transferEnabled={agent.transferEnabled}
            transferPhone={agent.transferPhone}
            transferAfterHours={agent.transferAfterHours}
          />
        }
      />

      <div className="px-5">
        {/* The number callers dial — the most important fact on the card. */}
        <div className="flex items-center justify-between gap-3 rounded-xl bg-muted/50 px-4 py-3 ring-1 ring-inset ring-foreground/[0.05]">
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Phone className="size-3.5" />
              Phone number {livePhoneNumber ? "· live" : number ? "· stored" : ""}
            </p>
            <p className="tabular mt-0.5 text-lg font-semibold tracking-tight">
              {number ?? (agent.vapiPhoneNumberId ? "—" : <span className="text-sm font-normal text-muted-foreground">None yet</span>)}
            </p>
          </div>
          {!number && !agent.vapiPhoneNumberId && <AddPhoneNumberButton customerId={agent.customerId} />}
        </div>

        {phoneDrift && (
          <div className="mt-3 flex items-start gap-2 rounded-xl bg-amber-500/8 px-3 py-2.5 text-xs text-amber-900 ring-1 ring-inset ring-amber-600/20 dark:text-amber-200">
            <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
            <span>
              The stored number is out of sync with {platform} — saved as{" "}
              <span className="font-mono">{agent.phoneNumber}</span>.
            </span>
          </div>
        )}

        {agent.configError && (
          <div className="mt-3 flex items-start gap-2 rounded-xl bg-red-500/8 px-3 py-2.5 text-xs text-red-800 ring-1 ring-inset ring-red-600/20 dark:text-red-200">
            <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
            <span>
              This receptionist&apos;s settings on {platform} don&apos;t match the app and couldn&apos;t be restored
              automatically: {agent.configError}. Save its settings here to push them again.
            </span>
          </div>
        )}

        {recentRepair && (
          <div className="mt-3 flex items-start gap-2 rounded-xl bg-amber-500/8 px-3 py-2.5 text-xs text-amber-900 ring-1 ring-inset ring-amber-600/20 dark:text-amber-200">
            <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
            <span>
              Settings changed on {platform} were put back on {formatWhen(agent.configRepairedAt!)}
              {agent.configRepairedProblems?.length ? ` (${agent.configRepairedProblems.join("; ").toLowerCase()})` : ""}.
              Make changes here: edits in the {platform} dashboard are undone.
            </span>
          </div>
        )}

        <DetailList className="mt-4">
          <DetailRow
            label={
              <>
                <ShieldCheck className="size-3.5" />
                Settings check
              </>
            }
          >
            {agent.configError ? (
              <span className="text-red-700 dark:text-red-300">Needs attention</span>
            ) : agent.configCheckedAt ? (
              <span className="font-normal">
                Matches the app · <span className="text-muted-foreground">{formatWhen(agent.configCheckedAt)}</span>
              </span>
            ) : (
              <span className="font-normal text-muted-foreground">Not checked yet</span>
            )}
          </DetailRow>
          <DetailRow
            label={
              <>
                <CalendarDays className="size-3.5" />
                Calendar
              </>
            }
          >
            {isGoogle ? "Google Calendar" : "Manual (takes messages)"}
          </DetailRow>
          {isGoogle && (
            <DetailRow label="Calendar ID">
              <span className="block max-w-56 truncate font-mono text-xs font-normal">
                {agent.calendarId ?? "not set"}
              </span>
            </DetailRow>
          )}
          <DetailRow label="Appointments">
            {agent.appointmentDurationMinutes} min · {agent.appointmentBufferMinutes} min buffer
          </DetailRow>
          <DetailRow label="Booking notice">
            {agent.minLeadMinutes} min · emergencies {agent.emergencyLeadMinutes} min
          </DetailRow>
          <DetailRow label="Emergency alerts">
            {agent.alertPhone ? (
              <span className="tabular">{agent.alertPhone}</span>
            ) : (
              <span className="font-normal text-muted-foreground">Not set</span>
            )}
          </DetailRow>
          <DetailRow label="Call summaries by text">
            {agent.callSummaryTexts && agent.alertPhone ? (
              "On"
            ) : (
              <span className="font-normal text-muted-foreground">Off</span>
            )}
          </DetailRow>
          <DetailRow label="Live transfer">
            {agent.transferEnabled ? (
              <>
                <span className="tabular">{agent.transferPhone ?? agent.alertPhone ?? "—"}</span>
                <span className="font-normal text-muted-foreground">
                  {" "}
                  · {agent.transferAfterHours ? "any time" : "business hours"}
                </span>
              </>
            ) : (
              <span className="font-normal text-muted-foreground">Off</span>
            )}
          </DetailRow>
        </DetailList>

        {/* Internal IDs, tucked away — only needed when debugging with the voice platform. */}
        <details className="group mt-4 rounded-xl text-xs">
          <summary className="cursor-pointer list-none text-muted-foreground transition-colors select-none hover:text-foreground">
            <span className="inline-block transition-transform group-open:rotate-90">›</span> Technical details
          </summary>
          <DetailList className="mt-3 text-xs">
            <DetailRow label="Voice platform">{platform}</DetailRow>
            <DetailRow label="Agent ID" stacked mono>
              {agent.vapiAssistantId}
            </DetailRow>
            {agent.vapiPhoneNumberId && (
              <DetailRow label="Phone number ID" stacked mono>
                {agent.vapiPhoneNumberId}
              </DetailRow>
            )}
          </DetailList>
        </details>
      </div>
    </Card>
  );
}
