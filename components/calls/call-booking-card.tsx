import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    <Card className="border-blue-200 dark:border-blue-900">
      <CardHeader>
        <CardTitle className="text-base text-blue-700 dark:text-blue-400">
          Appointment booked
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <div>
          <span className="text-muted-foreground">Scheduled</span>
          <p className="mt-0.5 font-medium">
            {booking.scheduledAt
              ? formatDateTimeFull(booking.scheduledAt, timezone)
              : "Time TBD"}
          </p>
        </div>
        {booking.calendarEventId && (
          <div className="flex justify-between gap-2">
            <span className="text-muted-foreground">Calendar ID</span>
            <span className="font-mono text-xs">{booking.calendarEventId}</span>
          </div>
        )}
        {booking.notes && (
          <div>
            <span className="text-muted-foreground">Notes</span>
            <p className="mt-0.5 font-medium">{booking.notes}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
