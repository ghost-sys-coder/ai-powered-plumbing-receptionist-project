import { Container, SectionHeading } from "./shared";

const STEPS = [
  {
    title: "Tell us about your business",
    body: "Share your website and we fill in most of it for you: services, hours, prices and service area. You decide what counts as an emergency and how bookings work.",
  },
  {
    title: "Get your receptionist number",
    body: "We give your receptionist its own phone number. Keep your existing number and forward calls to it — all the time, after hours, or only when you can't pick up.",
  },
  {
    title: "Every call gets handled",
    body: "Callers are greeted in your business's name. Appointments go into your calendar, urgent calls text you instantly, and every call lands in your dashboard with a summary.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="scroll-mt-20 border-y border-border/70 bg-card/40 py-24 sm:py-32">
      <Container>
        <SectionHeading
          eyebrow="How it works"
          title="Set up with you, not by you."
          description="There's no software to learn. We set the receptionist up with you on a short call and test it together before it takes a real customer."
        />

        <ol className="mt-16 grid gap-10 md:grid-cols-3 md:gap-8">
          {STEPS.map((s, i) => (
            <li key={s.title} className="reveal-on-scroll relative" style={{ animationDelay: `${i * 90}ms` }}>
              <div className="flex items-center gap-4">
                <span className="tabular grid size-11 shrink-0 place-items-center rounded-full bg-card font-mono text-sm font-semibold text-primary shadow-card ring-1 ring-primary/20">
                  {String(i + 1).padStart(2, "0")}
                </span>
                {i < STEPS.length - 1 && (
                  <span aria-hidden className="hidden h-px flex-1 bg-linear-to-r from-primary/30 to-transparent md:block" />
                )}
              </div>
              <h3 className="mt-6 text-lg font-semibold tracking-tight">{s.title}</h3>
              <p className="mt-2 leading-relaxed text-pretty text-muted-foreground">{s.body}</p>
            </li>
          ))}
        </ol>
      </Container>
    </section>
  );
}
