import { PhoneForwarded, Cpu, CalendarCheck, Sparkles, CheckCircle2 } from "lucide-react";

export function HowItWorksV2() {
  const steps = [
    {
      number: "01",
      icon: PhoneForwarded,
      title: "20-Minute Onboarding Discovery",
      description:
        "Tell us about your plumbing business: your service radius, pricing guidelines, emergency protocols, and scheduling availability.",
      highlights: ["No complex dashboards", "Custom emergency rules", "Your pricing & services"],
    },
    {
      number: "02",
      icon: Cpu,
      title: "We Build & Train Your AI in 48 Hours",
      description:
        "Our engineers configure your dedicated US phone number, connect your Google Calendar, train the AI on plumbing terms, and thoroughly test calls.",
      highlights: ["Dedicated local/toll-free number", "Calendar integration", "White-glove 48hr setup"],
    },
    {
      number: "03",
      icon: CalendarCheck,
      title: "Calls Answered & Jobs Booked 24/7",
      description:
        "Your AI receptionist answers every inbound call in 2 rings, triages emergencies, captures homeowner details, and automatically schedules jobs.",
      highlights: ["Instant SMS & WhatsApp alerts", "Audio recording + transcript", "Calendar synced live"],
    },
  ];

  return (
    <section id="how-it-works" className="relative py-32 md:py-40" style={{ backgroundColor: "var(--v2-bg)" }}>
      <div className="mx-auto max-w-7xl px-6 sm:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-20">
          <div
            className="inline-flex items-center gap-2 rounded-full px-3.5 py-1 text-xs font-semibold mb-4"
            style={{
              border: `1px solid var(--v2-badge-blue-border)`,
              backgroundColor: "var(--v2-badge-blue-bg)",
              color: "var(--v2-badge-blue-text)",
            }}
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>Turnkey Implementation</span>
          </div>

          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl" style={{ color: "var(--v2-text)" }}>
            How it works
          </h2>

          <p className="mt-4 text-base sm:text-lg leading-relaxed" style={{ color: "var(--v2-text-muted)" }}>
            Three simple steps. Done-for-you in 48 hours. Then your phone books jobs around the clock.
          </p>
        </div>

        {/* 3 Step Cards with Connectors */}
        <div className="relative grid gap-8 md:gap-10 lg:grid-cols-3">
          {steps.map((step) => {
            const Icon = step.icon;
            return (
              <div
                key={step.number}
                className="relative flex flex-col justify-between rounded-2xl p-8 transition-all duration-300"
                style={{
                  border: `1px solid var(--v2-border)`,
                  backgroundColor: "var(--v2-bg-card)",
                  boxShadow: "var(--v2-shadow-elevated)",
                }}
              >
                {/* Step number badge */}
                <div className="flex items-center justify-between mb-6">
                  <div
                    className="flex h-12 w-12 items-center justify-center rounded-xl"
                    style={{
                      backgroundColor: "var(--v2-badge-blue-bg)",
                      border: `1px solid var(--v2-badge-blue-border)`,
                      color: "var(--v2-primary)",
                    }}
                  >
                    <Icon className="h-6 w-6" />
                  </div>
                  <span className="font-mono text-4xl font-extrabold" style={{ color: "var(--v2-border-hover)" }}>
                    {step.number}
                  </span>
                </div>

                <div>
                  <h3 className="text-xl font-bold mb-3" style={{ color: "var(--v2-text)" }}>{step.title}</h3>
                  <p className="text-sm leading-relaxed mb-6" style={{ color: "var(--v2-text-muted)" }}>{step.description}</p>
                </div>

                {/* Highlights */}
                <div className="pt-4 flex flex-col gap-2" style={{ borderTop: `1px solid var(--v2-border)` }}>
                  {step.highlights.map((h) => (
                    <div key={h} className="flex items-center gap-2 text-xs font-medium" style={{ color: "var(--v2-text-secondary)" }}>
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0" style={{ color: "var(--v2-primary)" }} />
                      <span>{h}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
