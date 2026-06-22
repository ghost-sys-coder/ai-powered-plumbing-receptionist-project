import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Booking } from "@/db/schema/bookings";

function formatDateTime(date: Date): string {
  return date.toLocaleString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export function CallBookingCard({ booking }: { booking: Booking }) {
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
          <p className="mt-0.5 font-medium">{formatDateTime(booking.scheduledAt)}</p>
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
