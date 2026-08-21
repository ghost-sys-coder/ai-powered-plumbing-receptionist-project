import { PhoneMissed, Users2, DollarSign, AlertTriangle, ArrowRight } from "lucide-react";

export function ProblemSectionV2() {
  const problems = [
    {
      icon: PhoneMissed,
      tag: "85% Hang Up",
      title: "Missed Calls = Instant Lost Revenue",
      description:
        "Homeowners in a panic don't leave voicemails. They immediately hang up and call the next plumber on Google. Missing just 2 emergency jobs a week costs you $40,000+ in annual profits.",
      stat: "$40,000+",
      statLabel: "Average annual loss per solo plumber",
      variant: "rose" as const,
    },
    {
      icon: Users2,
      tag: "Lack of Context",
      title: "Generic Answering Services Fail",
      description:
        "Human answering bureaus use generic operators who don't know the difference between a main water shutoff valve and a backflow preventer. They take incomplete notes and cannot triage emergencies.",
      stat: "65%",
      statLabel: "Of callers frustrated by generic answering services",
      variant: "amber" as const,
    },
    {
      icon: DollarSign,
      tag: "Costly & Limited Hours",
      title: "Full-Time Staff Eats Your Margin",
      description:
        "A full-time in-house receptionist costs $3,500–$4,500/month plus overhead—and leaves your business completely dark during evenings, weekends, and holidays when high-ticket emergency calls happen.",
      stat: "$45,000/yr",
      statLabel: "Saved compared to hiring in-house staff",
      variant: "blue" as const,
    },
  ];

  const variantStyles = {
    rose: {
      tagBg: "var(--v2-badge-rose-bg)",
      tagText: "var(--v2-badge-rose-text)",
      tagBorder: "var(--v2-badge-rose-border)",
      icon: "var(--v2-icon-rose)",
    },
    amber: {
      tagBg: "var(--v2-badge-amber-bg)",
      tagText: "var(--v2-badge-amber-text)",
      tagBorder: "var(--v2-badge-amber-border)",
      icon: "var(--v2-icon-amber)",
    },
    blue: {
      tagBg: "var(--v2-badge-blue-bg)",
      tagText: "var(--v2-badge-blue-text)",
      tagBorder: "var(--v2-badge-blue-border)",
      icon: "var(--v2-icon-blue)",
    },
  };

  return (
    <section
      id="problem"
      className="relative py-32 md:py-40"
      style={{
        backgroundColor: "var(--v2-bg-alt)",
        borderTop: `1px solid var(--v2-border)`,
        borderBottom: `1px solid var(--v2-border)`,
      }}
    >
      <div className="mx-auto max-w-7xl px-6 sm:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-20">
          <div
            className="inline-flex items-center gap-2 rounded-full px-3.5 py-1 text-xs font-semibold mb-4"
            style={{
              border: `1px solid var(--v2-badge-rose-border)`,
              backgroundColor: "var(--v2-badge-rose-bg)",
              color: "var(--v2-badge-rose-text)",
            }}
          >
            <AlertTriangle className="h-3.5 w-3.5" />
            <span>The Reality of Solo & Pro Plumbing</span>
          </div>

          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl" style={{ color: "var(--v2-text)" }}>
            The phone is ringing. But you&apos;re under a sink.
          </h2>

          <p className="mt-4 text-base sm:text-lg leading-relaxed" style={{ color: "var(--v2-text-muted)" }}>
            Plumbing is a high-urgency trade. When water is flooding a basement or a sewer is backing up, customers call the first number that answers with confidence.
          </p>
        </div>

        {/* 3 Problem Cards Grid */}
        <div className="grid gap-8 md:gap-10 md:grid-cols-3">
          {problems.map((prob) => {
            const Icon = prob.icon;
            const vs = variantStyles[prob.variant];
            return (
              <div
                key={prob.title}
                className="group relative flex flex-col justify-between rounded-2xl p-7 transition-all duration-200"
                style={{
                  border: `1px solid var(--v2-border)`,
                  backgroundColor: "var(--v2-bg-card)",
                  boxShadow: "var(--v2-shadow-card)",
                }}
              >
                <div>
                  <div className="flex items-center justify-between mb-5">
                    <div
                      className="flex h-11 w-11 items-center justify-center rounded-xl group-hover:scale-105 transition-transform"
                      style={{
                        backgroundColor: "var(--v2-bg-elevated)",
                        border: `1px solid var(--v2-border)`,
                        color: vs.icon,
                      }}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <span
                      className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
                      style={{
                        border: `1px solid ${vs.tagBorder}`,
                        backgroundColor: vs.tagBg,
                        color: vs.tagText,
                      }}
                    >
                      {prob.tag}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold mb-3" style={{ color: "var(--v2-text)" }}>{prob.title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: "var(--v2-text-muted)" }}>{prob.description}</p>
                </div>

                <div className="mt-6 pt-5" style={{ borderTop: `1px solid var(--v2-border)` }}>
                  <div className="text-2xl font-black" style={{ color: "var(--v2-text)" }}>{prob.stat}</div>
                  <div className="text-xs font-medium mt-0.5" style={{ color: "var(--v2-text-muted)" }}>{prob.statLabel}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom Banner */}
        <div
          className="mt-16 rounded-2xl p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6"
          style={{
            border: `1px solid var(--v2-badge-blue-border)`,
            backgroundColor: "var(--v2-primary-subtle)",
            boxShadow: "var(--v2-shadow-elevated)",
          }}
        >
          <div>
            <h4 className="text-lg font-bold" style={{ color: "var(--v2-text)" }}>
              Stop bleeding revenue to unanswered calls
            </h4>
            <p className="mt-1 text-sm" style={{ color: "var(--v2-text-muted)" }}>
              PlumberAnswered answers every call in 2 rings with a natural, custom-trained voice.
            </p>
          </div>
          <a
            href="#how-it-works"
            className="flex items-center gap-2 text-sm font-semibold transition-colors whitespace-nowrap"
            style={{ color: "var(--v2-primary)" }}
          >
            <span>See how it works in 3 steps</span>
            <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </div>
    </section>
  );
}
