import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCustomerContext } from "@/lib/auth/get-customer-id";
import { getCallWithBooking } from "@/lib/services/dashboard";
import { formatDateTimeFull } from "@/lib/format-time";
import { PageHeader } from "@/components/layout/page-header";
import { CallTranscript } from "@/components/calls/call-transcript";
import { CallSummaryCard } from "@/components/calls/call-summary-card";
import { CallBookingCard } from "@/components/calls/call-booking-card";
import { CallAudioPlayer } from "@/components/calls/call-audio-player";
import { ArrowLeft, AudioLines, MessagesSquare } from "lucide-react";
import { Card } from "@/components/ui/card";
import { SectionHeader } from "@/components/layout/section-header";
import { OutcomeBadge } from "@/components/calls/outcome-badge";
import { UrgencyBadge } from "@/components/calls/urgency-badge";

interface Props {
  params: Promise<{ id: string }>;
}

const CallDetailPage = async ({ params }: Props) => {
  const { id } = await params;
  const ctx = await getCustomerContext();
  if (!ctx) redirect("/dashboard");
  const { customerId, timezone, industry } = ctx;

  const result = await getCallWithBooking(customerId, id);

  if (!result) notFound();

  const { call, booking } = result;
  const caller = call.callerName ?? call.callerPhone ?? "Unknown caller";

  return (
    <div className="animate-fade-in space-y-6">
      <Link
        href="/dashboard/calls"
        className="group inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-0.5" />
        All calls
      </Link>

      <PageHeader
        eyebrow="Call"
        title={caller}
        description={formatDateTimeFull(call.startedAt, timezone)}
        action={
          <div className="flex flex-wrap gap-1.5">
            <OutcomeBadge outcome={call.outcome} />
            <UrgencyBadge urgency={call.urgencyLevel} />
          </div>
        }
      />

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          <Card>
            <SectionHeader icon={AudioLines} title="Recording" description="Play back the full call" />
            <div className="px-5">
              <CallAudioPlayer callId={call.id} hasRecording={!!call.audioUrl} />
            </div>
          </Card>

          <Card>
            <SectionHeader icon={MessagesSquare} title="Transcript" description="What was said, turn by turn" />
            <div className="max-h-140 overflow-y-auto px-5">
              <CallTranscript transcript={call.transcript} />
            </div>
          </Card>
        </div>

        <div className="space-y-6 lg:sticky lg:top-6">
          <CallSummaryCard call={call} timezone={timezone} industry={industry} />
          {booking && call.outcome === "booked" && (
            <CallBookingCard booking={booking} timezone={timezone} />
          )}
        </div>
      </div>
    </div>
  );
};

export default CallDetailPage;
