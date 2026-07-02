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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Props {
  params: Promise<{ id: string }>;
}

const CallDetailPage = async ({ params }: Props) => {
  const { id } = await params;
  const ctx = await getCustomerContext();
  if (!ctx) redirect("/dashboard");
  const { customerId, timezone } = ctx;

  const result = await getCallWithBooking(customerId, id);

  if (!result) notFound();

  const { call, booking } = result;
  const caller = call.callerName ?? call.callerPhone ?? "Unknown caller";

  return (
    <div className="animate-fade-in space-y-6">
      <Link
        href="/dashboard/calls"
        className="text-sm text-blue-600 hover:underline dark:text-blue-400"
      >
        ← All calls
      </Link>

      <PageHeader
        title={caller}
        description={formatDateTimeFull(call.startedAt, timezone)}
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Transcript</CardTitle>
            </CardHeader>
            <CardContent className="max-h-140 overflow-y-auto">
              <CallTranscript transcript={call.transcript} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recording</CardTitle>
            </CardHeader>
            <CardContent>
              <CallAudioPlayer audioUrl={call.audioUrl} />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <CallSummaryCard call={call} timezone={timezone} />
          {booking && call.outcome === "booked" && (
            <CallBookingCard booking={booking} timezone={timezone} />
          )}
        </div>
      </div>
    </div>
  );
};

export default CallDetailPage;
