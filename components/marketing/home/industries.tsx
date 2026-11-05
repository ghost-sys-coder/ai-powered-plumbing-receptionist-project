import { Briefcase, HeartPulse, Home, Wrench } from "lucide-react";
import { Container, SectionHeading } from "./shared";

// Mirrors the industry profiles in lib/verticals — each has its own intake
// questions, emergency rules and wording.
const GROUPS = [
  {
    icon: Wrench,
    title: "Trades & home services",
    items: ["Plumbing", "HVAC", "Electrical", "Roofing", "Locksmiths", "Garage doors", "Appliance repair", "Pest control", "Cleaning", "Landscaping"],
  },
  {
    icon: HeartPulse,
    title: "Health",
    items: ["Medical clinics", "Dental practices", "Physio & chiro", "Veterinary clinics"],
  },
  {
    icon: Briefcase,
    title: "Professional services",
    items: ["Law firms", "Accounting & tax", "Insurance agencies", "Real estate"],
  },
  {
    icon: Home,
    title: "Property, auto & more",
    items: ["Property management", "Auto repair", "Salons & spas", "Any local business"],
  },
];

const MARQUEE = GROUPS.flatMap((g) => g.items);

export function Industries() {
  return (
    <section id="industries" className="scroll-mt-20 pb-24 sm:pb-32">
      {/* Running strip of industries */}
      <div
        className="relative mb-20 overflow-hidden sm:mb-24 border-y border-border/70 bg-card/50 py-4 [mask-image:linear-gradient(90deg,transparent,black_12%,black_88%,transparent)]"
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
          description="Each industry gets its own questions, urgency rules and wording. A dental practice asks about the patient; a plumber asks for the service address; a law firm takes a confidential callback request."
        />

        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {GROUPS.map((g, i) => (
            <div
              key={g.title}
              className="reveal-on-scroll rounded-2xl bg-card p-6 shadow-card ring-1 ring-foreground/[0.07]"
              style={{ animationDelay: `${i * 70}ms` }}
            >
              <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/15">
                <g.icon strokeWidth={1.75} className="size-5" />
              </span>
              <h3 className="mt-5 font-semibold tracking-tight">{g.title}</h3>
              <ul className="mt-3 space-y-1.5 text-sm text-muted-foreground">
                {g.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
