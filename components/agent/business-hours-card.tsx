import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type DayHours = { open?: string; close?: string; closed?: boolean };
type BusinessHours = Record<string, DayHours>;

const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

export function BusinessHoursCard({ hours }: { hours: unknown }) {
  const parsed = hours as BusinessHours | null;

  if (!parsed) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Business hours</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Not configured.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Business hours</CardTitle>
      </CardHeader>
      <CardContent>
        <table className="w-full text-sm">
          <tbody>
            {DAYS.map((day) => {
              const h = parsed[day] ?? parsed[day.toLowerCase()];
              return (
                <tr key={day} className="border-b last:border-0">
                  <td className="w-28 py-1.5 font-medium">{day}</td>
                  <td className="py-1.5 text-muted-foreground">
                    {!h || h.closed
                      ? "Closed"
                      : `${h.open ?? "?"} – ${h.close ?? "?"}`}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
