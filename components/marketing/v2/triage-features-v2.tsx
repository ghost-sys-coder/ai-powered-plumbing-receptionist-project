import {
  ShieldAlert,
  Calendar,
  MessageSquareText,
  Volume2,
  ToggleLeft,
  BadgeDollarSign,
  Check,
  Zap,
} from "lucide-react";

export function TriageFeaturesV2() {
  const triageRules = [
    {
      category: "Emergency Triage (Priority 1)",
      badge: "Instant Dispatch",
      variant: "rose" as const,
      description:
        "Burst pipes, flooded basements, water heater blowouts, or main sewer back-ups. The AI guides the caller through safety steps (e.g. main shutoff valve) and alerts you immediately.",
      examples: [
        "Burst pipe leaking into walls",
        "Water heater tank rupture",
        "Sewer backing up into showers",
      ],
    },
    {
      category: "Routine & Standard Services (Priority 2)",
      badge: "Calendar Scheduled",
      variant: "blue" as const,
      description:
        "Garbage disposal replacements, leaking faucets, toilet rebuilds, fixture installs, or diagnostic inspections. Handled smoothly and booked into your next open calendar window.",
      examples: [
        "Kitchen faucet drip / replacement",
        "Garbage disposal humming",
        "Bathroom renovation estimate",
      ],
    },
  ];

  const variantStyles = {
    rose: {
      bg: "var(--v2-badge-rose-bg)",
      text: "var(--v2-badge-rose-text)",
      border: "var(--v2-badge-rose-border)",
    },
    blue: {
      bg: "var(--v2-badge-blue-bg)",
      text: "var(--v2-badge-blue-text)",
      border: "var(--v2-badge-blue-border)",
    },
  };

  const coreFeatures = [
    {
      icon: ShieldAlert,
      title: "Custom Emergency Protocols",
      description:
        "Give callers immediate instructions to minimize water damage while notifying your on-call technician.",
    },
    {
      icon: Calendar,
      title: "Google Calendar Sync",
      description:
        "Direct booking into your calendar slots based on your working hours and driving buffer times.",
    },
    {
      icon: MessageSquareText,
      title: "Instant SMS & Audio Logs",
      description:
        "Get a text summary within 30 seconds of hanging up with caller name, address, job type, and transcript link.",
    },
    {
      icon: Volume2,
      title: "Jobsite Noise Resilience",
      description:
        "Advanced noise reduction and language modeling that easily handles background noise and accents.",
    },
    {
      icon: ToggleLeft,
      title: "1-Click Pause Fallback",
      description:
        "Pause the AI anytime from your dashboard. Calls seamlessly revert to regular voicemail or forwarding.",
    },
    {
      icon: BadgeDollarSign,
      title: "Custom Pricing Guardrails",
      description:
        "Quotes your exact diagnostic fee or tells callers quotes require an in-person assessment.",
    },
  ];

  return (
    <section
      id="features"
      className="py-32 md:py-40"
      style={{
        backgroundColor: "var(--v2-bg-alt)",
        borderTop: `1px solid var(--v2-border)`,
      }}
    >
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
            <Zap className="h-3.5 w-3.5" />
            <span>Built Specifically for Plumbing</span>
          </div>

          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl" style={{ color: "var(--v2-text)" }}>
            Handles routine calls. Escalates true emergencies.
          </h2>

          <p className="mt-4 text-base sm:text-lg leading-relaxed" style={{ color: "var(--v2-text-muted)" }}>
            PlumberAnswered understands the urgency difference between a slow bathroom sink drip and a ruptured copper pipe flooding a basement.
          </p>
        </div>

        {/* Triage Side-by-Side Cards */}
        <div className="grid gap-8 md:gap-10 lg:grid-cols-2 mb-20">
          {triageRules.map((triage) => {
            const vs = variantStyles[triage.variant];
            return (
              <div
                key={triage.category}
                className="rounded-2xl p-8 flex flex-col justify-between"
                style={{
                  border: `1px solid var(--v2-border)`,
                  backgroundColor: "var(--v2-bg-card)",
                  boxShadow: "var(--v2-shadow-card)",
                }}
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span
                      className="rounded-full px-3 py-1 text-xs font-bold"
                      style={{
                        border: `1px solid ${vs.border}`,
                        backgroundColor: vs.bg,
                        color: vs.text,
                      }}
                    >
                      {triage.badge}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold mb-3" style={{ color: "var(--v2-text)" }}>{triage.category}</h3>
                  <p className="text-sm leading-relaxed mb-6" style={{ color: "var(--v2-text-muted)" }}>{triage.description}</p>
                </div>

                <div
                  className="rounded-xl p-4"
                  style={{
                    backgroundColor: "var(--v2-bg-elevated)",
                    border: `1px solid var(--v2-border)`,
                  }}
                >
                  <p className="text-xs font-semibold uppercase tracking-wider mb-2.5" style={{ color: "var(--v2-text-muted)" }}>
                    Typical Examples:
                  </p>
                  <div className="space-y-2">
                    {triage.examples.map((ex) => (
                      <div key={ex} className="flex items-center gap-2 text-xs font-medium" style={{ color: "var(--v2-text-secondary)" }}>
                        <Check className="h-3.5 w-3.5" style={{ color: "var(--v2-primary)" }} />
                        <span>{ex}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Core Capabilities Grid */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {coreFeatures.map((feat) => {
            const Icon = feat.icon;
            return (
              <div
                key={feat.title}
                className="group rounded-2xl p-6 transition-all duration-200"
                style={{
                  border: `1px solid var(--v2-border)`,
                  backgroundColor: "var(--v2-bg-card)",
                  boxShadow: "var(--v2-shadow-card)",
                }}
              >
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-xl mb-4 transition-colors"
                  style={{
                    backgroundColor: "var(--v2-badge-blue-bg)",
                    border: `1px solid var(--v2-badge-blue-border)`,
                    color: "var(--v2-icon-blue)",
                  }}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <h4 className="text-base font-bold mb-2" style={{ color: "var(--v2-text)" }}>{feat.title}</h4>
                <p className="text-xs sm:text-sm leading-relaxed" style={{ color: "var(--v2-text-muted)" }}>
                  {feat.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
