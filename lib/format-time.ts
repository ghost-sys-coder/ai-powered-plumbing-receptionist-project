// Formats timestamps in a fixed timezone (the customer's business timezone) with
// the zone abbreviation, using the US 12-hour clock. Rendering in an explicit
// timezone makes the output identical for every viewer/browser — a booking or
// call time is only meaningful in the client's local time, not the viewer's.

const SHORT: Intl.DateTimeFormatOptions = {
  weekday: "short",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
  timeZoneName: "short",
};

const FULL: Intl.DateTimeFormatOptions = {
  weekday: "long",
  year: "numeric",
  month: "long",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
  timeZoneName: "short",
};

function fmt(date: Date, timeZone: string, opts: Intl.DateTimeFormatOptions): string {
  try {
    return date.toLocaleString("en-US", { ...opts, timeZone });
  } catch {
    // Fall back to the environment zone if the stored timezone is invalid.
    return date.toLocaleString("en-US", opts);
  }
}

// e.g. "Fri, Jul 3, 9:00 AM EDT" — for lists and compact cards.
export function formatDateTimeShort(date: Date, timeZone: string): string {
  return fmt(date, timeZone, SHORT);
}

// e.g. "Friday, July 3, 2026, 9:00 AM EDT" — for headers and detail views.
export function formatDateTimeFull(date: Date, timeZone: string): string {
  return fmt(date, timeZone, FULL);
}
