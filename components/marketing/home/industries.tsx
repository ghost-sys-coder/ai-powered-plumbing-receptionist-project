import { Briefcase, HeartPulse, Home, Wrench, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Container, SectionHeading } from "./shared";

// Mirrors the industry profiles in lib/verticals: each has its own intake
// questions, emergency rules and wording. The "captured" rows use real intake
// field names from those profiles, with example values.
// Each group has its own colour so the industry pills are easy to scan.
// Full class strings so Tailwind picks them up.
const TONES = {
  orange: {
    pill: "bg-orange-100 text-orange-900 ring-orange-300 shadow-orange-600/20 dark:bg-orange-500/15 dark:text-orange-100 dark:ring-orange-400/30",
    icon: "bg-orange-500/12 text-orange-600 ring-orange-500/25 dark:text-orange-300",
  },
  rose: {
    pill: "bg-rose-100 text-rose-900 ring-rose-300 shadow-rose-600/20 dark:bg-rose-500/15 dark:text-rose-100 dark:ring-rose-400/30",
    icon: "bg-rose-500/12 text-rose-600 ring-rose-500/25 dark:text-rose-300",
  },
  indigo: {
    pill: "bg-indigo-100 text-indigo-900 ring-indigo-300 shadow-indigo-600/20 dark:bg-indigo-500/15 dark:text-indigo-100 dark:ring-indigo-400/30",
    icon: "bg-indigo-500/12 text-indigo-600 ring-indigo-500/25 dark:text-indigo-300",
  },
  teal: {
    pill: "bg-teal-100 text-teal-900 ring-teal-300 shadow-teal-600/20 dark:bg-teal-500/15 dark:text-teal-100 dark:ring-teal-400/30",
    icon: "bg-teal-500/12 text-teal-600 ring-teal-500/25 dark:text-teal-300",
  },
} as const;

type Group = {
  icon: LucideIcon;
  title: string;
  blurb: string;
  items: string[];
  captured: Array<[label: string, value: string]>;
  wide: boolean;
  tone: keyof typeof TONES;
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
    tone: "orange",
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
    tone: "rose",
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
    tone: "indigo",
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
    tone: "teal",
  },
];

const MARQUEE = GROUPS.flatMap((g) => g.items);

function IndustryCard({ group, index }: { group: Group; index: number }) {
  const Icon = group.icon;
  const tone = TONES[group.tone];
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
        <span className={cn("grid size-11 shrink-0 place-items-center rounded-xl ring-1 transition-transform duration-300 group-hover:scale-105", tone.icon)}>
          <Icon strokeWidth={1.75} className="size-5" />
        </span>
        <div className="min-w-0">
          <h3 className="text-lg font-semibold tracking-tight">{group.title}</h3>
          <p className="mt-1 max-w-md text-sm leading-relaxed text-pretty text-muted-foreground">{group.blurb}</p>
        </div>
      </div>

      <ul className="relative mt-6 flex flex-wrap gap-2.5">
        {group.items.map((item) => (
          <li
            key={item}
            className={cn("rounded-full px-4 py-2 text-sm font-semibold shadow-md ring-1 ring-inset", tone.pill)}
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
