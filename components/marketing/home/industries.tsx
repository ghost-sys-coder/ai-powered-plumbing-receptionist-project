import { Briefcase, HeartPulse, Home, Wrench, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Container, SectionHeading } from "./shared";

// Mirrors the industry profiles in lib/verticals: each has its own intake
// questions, emergency rules and wording. The "captured" rows use real intake
// field names from those profiles, with example values.
type Group = {
  icon: LucideIcon;
  title: string;
  blurb: string;
  items: string[];
  captured: Array<[label: string, value: string]>;
  wide: boolean;
};

const GROUPS: Group[] = [
  {
    icon: Wrench,
    title: "Trades & home services",
    blurb: "Gets the service address, asks the right question for the job, and texts you the moment a call is an emergency.",
    items: ["Plumbing", "HVAC", "Electrical", "Roofing", "Locksmiths", "Garage doors", "Appliance repair", "Pest control", "Cleaning", "Landscaping"],
    captured: [
      ["Service address", "14 Elm St, Austin"],
      ["System type", "Gas furnace"],
      ["Urgency", "Emergency"],
    ],
    wide: true,
  },
  {
    icon: HeartPulse,
    title: "Health",
    blurb: "Books patients with the right practitioner and keeps health details discreet.",
    items: ["Medical clinics", "Dental practices", "Physio & chiro", "Veterinary clinics"],
    captured: [
      ["Preferred dentist", "Dr. Raman"],
      ["Pet", "Bella, 6-year-old lab"],
    ],
    wide: false,
  },
  {
    icon: Briefcase,
    title: "Professional services",
    blurb: "Takes careful, confidential intake so you can call back prepared.",
    items: ["Law firms", "Accounting & tax", "Insurance agencies", "Real estate"],
    captured: [
      ["Matter type", "Tenancy dispute"],
      ["Key deadline", "Hearing on 14 Nov"],
    ],
    wide: false,
  },
  {
    icon: Home,
    title: "Property, auto & more",
    blurb: "Logs tenant repairs by unit, books vehicles in for service, and handles general enquiries for any local business.",
    items: ["Property management", "Auto repair", "Salons & spas", "Any local business"],
    captured: [
      ["Unit", "4B, Harbour Court"],
      ["Vehicle", "2019 Toyota Corolla"],
      ["Drivable", "No"],
    ],
    wide: true,
  },
];

const MARQUEE = GROUPS.flatMap((g) => g.items);

function IndustryCard({ group, index }: { group: Group; index: number }) {
  const Icon = group.icon;
  return (
    <article
      className={cn(
        "reveal-on-scroll group relative flex flex-col overflow-hidden rounded-2xl bg-card p-6 shadow-card ring-1 ring-foreground/[0.07] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-elevated hover:ring-primary/25 sm:p-7",
        group.wide ? "lg:col-span-2" : "lg:col-span-1"
      )}
      style={{ animationDelay: `${index * 80}ms` }}
    >
      {/* Warm wash in the corner, brighter on hover */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 -right-24 size-64 rounded-full bg-[radial-gradient(closest-side,var(--brand-glow),transparent)] opacity-60 transition-opacity duration-500 group-hover:opacity-100"
      />

      <div className="relative flex items-start gap-4">
        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/15 transition-transform duration-300 group-hover:scale-105">
          <Icon strokeWidth={1.75} className="size-5" />
        </span>
        <div className="min-w-0">
          <h3 className="text-lg font-semibold tracking-tight">{group.title}</h3>
          <p className="mt-1 max-w-md text-sm leading-relaxed text-pretty text-muted-foreground">{group.blurb}</p>
        </div>
      </div>

      <ul className="relative mt-5 flex flex-wrap gap-1.5">
        {group.items.map((item) => (
          <li
            key={item}
            className="rounded-full bg-background/70 px-3 py-1 text-[0.8125rem] font-medium text-foreground/80 ring-1 ring-inset ring-foreground/8"
          >
            {item}
          </li>
        ))}
      </ul>

      {/* What the receptionist writes down, pinned to the bottom */}
      <div className="relative mt-auto pt-6">
        <div className="rounded-xl bg-muted/50 p-3.5 ring-1 ring-inset ring-foreground/5">
          <p className="mb-2 flex items-center gap-1.5 text-[0.6875rem] font-medium tracking-wide text-muted-foreground uppercase">
            <span className="size-1.5 rounded-full bg-emerald-500" />
            Captured on the call
          </p>
          <dl className={cn("grid gap-x-6 gap-y-1.5 text-sm", group.wide && "sm:grid-cols-3")}>
            {group.captured.map(([label, value]) => (
              <div key={label} className="min-w-0">
                <dt className="text-xs text-muted-foreground">{label}</dt>
                <dd className="truncate font-medium">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </article>
  );
}

export function Industries() {
  return (
    <section id="industries" className="scroll-mt-20 pb-24 sm:pb-32">
      {/* Running strip of industries */}
      <div
        className="relative mb-20 overflow-hidden border-y border-border/70 bg-card/50 py-4 mask-[linear-gradient(90deg,transparent,black_12%,black_88%,transparent)] sm:mb-24"
        aria-hidden
      >
        <div className="animate-marquee flex w-max gap-10">
          {[...MARQUEE, ...MARQUEE].map((item, i) => (
            <span key={i} className="flex items-center gap-10 text-sm font-medium whitespace-nowrap text-muted-foreground">
              {item}
              <span className="size-1 rounded-full bg-primary/50" />
            </span>
          ))}
        </div>
      </div>

      <Container>
        <SectionHeading
          eyebrow="Built for your line of work"
          title="It knows how your business takes a call."
          description="Each industry gets its own questions, urgency rules and wording, so every call ends with the details you'd have asked for yourself."
        />

        <div className="mt-14 grid gap-4 lg:grid-cols-3">
          {GROUPS.map((g, i) => (
            <IndustryCard key={g.title} group={g} index={i} />
          ))}
        </div>
      </Container>
    </section>
  );
}
