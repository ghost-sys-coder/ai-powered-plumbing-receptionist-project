import { BellRing, CalendarCheck2, FileText, Globe2, PhoneForwarded, Store } from "lucide-react";
import type { ComponentType, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Container, SectionHeading } from "./shared";

function Tile({
  icon: Icon,
  title,
  body,
  children,
  className,
  delay = 0,
  wide = false,
}: {
  icon: ComponentType<{ className?: string; strokeWidth?: number }>;
  title: string;
  body: string;
  children?: ReactNode;
  className?: string;
  delay?: number;
  // Text on the left, illustration on the right (large screens).
  wide?: boolean;
}) {
  return (
    <div
      className={cn(
        "reveal-on-scroll group relative flex flex-col overflow-hidden rounded-2xl bg-card p-6 shadow-card ring-1 ring-foreground/[0.07] sm:p-7",
        className
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className={cn(wide && "lg:grid lg:grid-cols-2 lg:items-center lg:gap-12")}>
        <div>
          <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/15">
            <Icon strokeWidth={1.75} className="size-5" />
          </span>
          <h3 className="mt-5 text-lg font-semibold tracking-tight">{title}</h3>
          <p className="mt-2 max-w-md leading-relaxed text-pretty text-muted-foreground">{body}</p>
        </div>
        {wide && children && <div className="mt-6 lg:mt-0">{children}</div>}
      </div>
      {!wide && children && <div className="mt-6 flex flex-1 flex-col justify-end">{children}</div>}
    </div>
  );
}

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];

function CalendarMock() {
  // A small week with busy blocks; Thursday 10:30 is the new booking.
  const busy: Record<string, Array<[number, number]>> = {
    Mon: [[0, 2], [4, 5]],
    Tue: [[1, 3]],
    Wed: [[0, 1], [3, 5]],
    Thu: [[3, 5]],
    Fri: [[0, 1], [2, 4]],
  };
  return (
    <div className="rounded-xl bg-muted/40 p-3 ring-1 ring-inset ring-foreground/[0.05]">
      <div className="grid grid-cols-5 gap-2">
        {DAYS.map((d) => (
          <div key={d} className="space-y-1.5">
            <p className="text-center text-[0.6875rem] font-medium text-muted-foreground">{d}</p>
            <div className="relative h-36 rounded-lg bg-card ring-1 ring-foreground/[0.05]">
              {busy[d].map(([a, b], i) => (
                <span
                  key={i}
                  className="absolute inset-x-1 rounded-md bg-foreground/[0.06]"
                  style={{ top: `${(a / 6) * 100 + 2}%`, height: `${((b - a) / 6) * 100 - 4}%` }}
                />
              ))}
              {d === "Thu" && (
                <span
                  className="absolute inset-x-1 rounded-md bg-primary px-1.5 py-1 text-[0.625rem] leading-tight font-medium text-primary-foreground shadow-[0_4px_12px_-4px_oklch(0.5_0.13_48/0.6)]"
                  style={{ top: "18%", height: "30%" }}
                >
                  10:30 · New
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AlertMock() {
  return (
    <div className="rounded-2xl bg-foreground/[0.035] p-3.5 ring-1 ring-inset ring-foreground/[0.06] dark:bg-foreground/[0.05]">
      <div className="flex items-center justify-between text-[0.6875rem] text-muted-foreground">
        <span className="font-medium">Messages</span>
        <span>now</span>
      </div>
      <p className="mt-1.5 text-sm leading-snug">
        <span className="font-semibold">Emergency:</span> burst pipe at 14 Elm St. Caller: Sam, +1 512 555 0918. Please
        call back now.
      </p>
    </div>
  );
}

function CallsMock() {
  const rows = [
    { name: "Marcus Whitfield", note: "Chipped tooth, wants this week", tag: "Booked", tone: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" },
    { name: "+1 416 555 0144", note: "Quote for spring cleanup", tag: "Message", tone: "bg-primary/10 text-primary" },
    { name: "Aiyana Torres", note: "No heat, two kids at home", tag: "Emergency", tone: "bg-red-500/10 text-red-700 dark:text-red-300" },
  ];
  return (
    <ul className="divide-y divide-border/60 rounded-xl bg-muted/40 px-4 ring-1 ring-inset ring-foreground/[0.05]">
      {rows.map((r) => (
        <li key={r.name} className="flex items-center gap-3 py-3">
          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-card text-[0.6875rem] font-semibold text-muted-foreground ring-1 ring-foreground/[0.06]">
            {r.name.startsWith("+") ? "#" : r.name.split(" ").map((w) => w[0]).join("")}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{r.name}</p>
            <p className="truncate text-xs text-muted-foreground">{r.note}</p>
          </div>
          <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[0.6875rem] font-medium", r.tone)}>{r.tag}</span>
        </li>
      ))}
    </ul>
  );
}

function Chips({ items }: { items: string[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((c) => (
        <span key={c} className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground ring-1 ring-inset ring-foreground/[0.05]">
          {c}
        </span>
      ))}
    </div>
  );
}

export function Features() {
  return (
    <section id="features" className="scroll-mt-20 py-24 sm:py-32">
      <Container>
        <SectionHeading
          eyebrow="What it does"
          title="A front desk that never puts anyone on hold."
          description="It does what a good receptionist does on every call: listens, gets the details right, and makes sure the right thing happens next."
        />

        <div className="mt-14 grid gap-4 lg:grid-cols-6">
          <Tile
            className="lg:col-span-4"
            icon={CalendarCheck2}
            title="Books straight into your calendar"
            body="It checks your real Google Calendar before offering a time, respects appointment length and the gap you need between jobs, and only confirms once the booking is saved. No calendar? It takes the request as a message."
          >
            <CalendarMock />
          </Tile>

          <Tile
            className="lg:col-span-2"
            icon={BellRing}
            title="Emergencies reach you in seconds"
            body="You decide what counts as urgent. When a caller has an emergency, it gives sensible safety guidance and texts you the details mid-call."
            delay={80}
          >
            <AlertMock />
          </Tile>

          <Tile
            className="lg:col-span-2"
            icon={PhoneForwarded}
            title="Puts urgent callers through"
            body="Offer emergency callers a live transfer to your phone — during business hours, or any time you choose."
          />

          <Tile
            className="lg:col-span-2"
            icon={Store}
            title="Knows your business"
            body="Answers questions about your services, prices, hours and service area, the way you'd answer them."
            delay={80}
          >
            <Chips items={["Services", "Call-out fee", "Hours", "Service area"]} />
          </Tile>

          <Tile
            className="lg:col-span-2"
            icon={Globe2}
            title="Made for five countries"
            body="Local time zones, phone formats and currencies for the US, Canada, the UK, Australia and Uganda."
            delay={160}
          />

          <Tile
            className="lg:col-span-6"
            wide
            icon={FileText}
            title="Every call, written up for you"
            body="Each call shows up in your dashboard with a recording, a full transcript, a short summary, and who called and why — so you can call back knowing exactly what they need."
          >
            <CallsMock />
          </Tile>
        </div>
      </Container>
    </section>
  );
}
