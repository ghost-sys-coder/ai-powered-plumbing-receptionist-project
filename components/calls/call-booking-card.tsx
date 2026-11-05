import { CalendarCheck2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { DetailList, DetailRow, SectionHeader } from "@/components/layout/section-header";
import type { Booking } from "@/db/schema/bookings";
import { formatDateTimeFull } from "@/lib/format-time";

export function CallBookingCard({
  booking,
  timezone,
}: {
  booking: Booking;
  timezone: string;
}) {
  return (
    <Card className="relative">
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-5 top-0 h-px bg-linear-to-r from-transparent via-emerald-500/50 to-transparent"
      />
      <SectionHeader icon={CalendarCheck2} title="Appointment booked" description="Added by the receptionist" />
      <div className="px-5">
        <p className="text-lg font-semibold tracking-tight">
          {booking.scheduledAt ? formatDateTimeFull(booking.scheduledAt, timezone) : "Time to be confirmed"}
        </p>
        {(booking.notes || booking.calendarEventId) && (
          <DetailList className="mt-4">
            {booking.notes && (
              <DetailRow label="Notes" stacked>
                {booking.notes}
              </DetailRow>
            )}
            {booking.calendarEventId && (
              <DetailRow label="Calendar event" stacked mono>
                {booking.calendarEventId}
              </DetailRow>
            )}
          </DetailList>
        )}
      </div>
    </Card>
  );
}
