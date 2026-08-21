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
    <section id="how-it-works" className="relative py-24 bg-[#0b1326]">
      <div className="mx-auto max-w-7xl px-6 sm:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-3.5 py-1 text-xs font-semibold text-blue-300 mb-4">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Turnkey Implementation</span>
          </div>

          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            How it works
          </h2>

          <p className="mt-4 text-base sm:text-lg text-slate-400 leading-relaxed">
            Three simple steps. Done-for-you in 48 hours. Then your phone books jobs around the clock.
          </p>
        </div>

        {/* 3 Step Cards with Connectors */}
        <div className="relative grid gap-8 lg:grid-cols-3">
          {steps.map((step, idx) => {
            const Icon = step.icon;
            return (
              <div
                key={step.number}
                className="relative flex flex-col justify-between rounded-2xl border border-slate-800 bg-[#0f172a]/90 p-8 shadow-xl transition-all duration-300 hover:border-blue-500/50 hover:shadow-blue-500/5"
              >
                {/* Step number badge */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#0070f3]/15 border border-[#0070f3]/30 text-[#0070f3]">
                    <Icon className="h-6 w-6" />
                  </div>
                  <span className="font-mono text-4xl font-extrabold text-slate-700">
                    {step.number}
                  </span>
                </div>

                <div>
                  <h3 className="text-xl font-bold text-white mb-3">{step.title}</h3>
                  <p className="text-sm leading-relaxed text-slate-400 mb-6">{step.description}</p>
                </div>

                {/* Highlights */}
                <div className="pt-4 border-t border-slate-800/80 flex flex-col gap-2">
                  {step.highlights.map((h) => (
                    <div key={h} className="flex items-center gap-2 text-xs text-slate-300 font-medium">
                      <CheckCircle2 className="h-3.5 w-3.5 text-blue-400 shrink-0" />
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
