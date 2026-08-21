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
      badgeColor: "bg-rose-500/20 text-rose-300 border-rose-500/30",
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
      badgeColor: "bg-blue-500/20 text-blue-300 border-blue-500/30",
      description:
        "Garbage disposal replacements, leaking faucets, toilet rebuilds, fixture installs, or diagnostic inspections. Handled smoothly and booked into your next open calendar window.",
      examples: [
        "Kitchen faucet drip / replacement",
        "Garbage disposal humming",
        "Bathroom renovation estimate",
      ],
    },
  ];

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
    <section id="features" className="py-32 md:py-40 bg-[#081020] border-t border-slate-800">
      <div className="mx-auto max-w-7xl px-6 sm:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-20">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-3.5 py-1 text-xs font-semibold text-blue-300 mb-4">
            <Zap className="h-3.5 w-3.5" />
            <span>Built Specifically for Plumbing</span>
          </div>

          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Handles routine calls. Escalates true emergencies.
          </h2>

          <p className="mt-4 text-base sm:text-lg text-slate-400 leading-relaxed">
            PlumberAnswered understands the urgency difference between a slow bathroom sink drip and a ruptured copper pipe flooding a basement.
          </p>
        </div>

        {/* Triage Side-by-Side Cards */}
        <div className="grid gap-8 md:gap-10 lg:grid-cols-2 mb-20">
          {triageRules.map((triage) => (
            <div
              key={triage.category}
              className="rounded-2xl border border-slate-800 bg-[#0f172a] p-8 shadow-lg flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span
                    className={`rounded-full border px-3 py-1 text-xs font-bold ${triage.badgeColor}`}
                  >
                    {triage.badge}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-white mb-3">{triage.category}</h3>
                <p className="text-sm leading-relaxed text-slate-400 mb-6">{triage.description}</p>
              </div>

              <div className="rounded-xl bg-[#0b1326] p-4 border border-slate-800/80">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2.5">
                  Typical Examples:
                </p>
                <div className="space-y-2">
                  {triage.examples.map((ex) => (
                    <div key={ex} className="flex items-center gap-2 text-xs text-slate-300 font-medium">
                      <Check className="h-3.5 w-3.5 text-blue-400" />
                      <span>{ex}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Core Capabilities Grid */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {coreFeatures.map((feat) => {
            const Icon = feat.icon;
            return (
              <div
                key={feat.title}
                className="group rounded-2xl border border-slate-800/80 bg-[#0f172a]/60 p-6 transition-all duration-200 hover:border-slate-700 hover:bg-[#0f172a]"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 mb-4 group-hover:bg-[#0070f3] group-hover:text-white transition-colors">
                  <Icon className="h-5 w-5" />
                </div>
                <h4 className="text-base font-bold text-white mb-2">{feat.title}</h4>
                <p className="text-xs sm:text-sm leading-relaxed text-slate-400">
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
