import { PhoneMissed, Users2, DollarSign, AlertTriangle, ArrowRight } from "lucide-react";

export function ProblemSectionV2() {
  const problems = [
    {
      icon: PhoneMissed,
      tag: "85% Hang Up",
      tagColor: "bg-rose-500/10 text-rose-400 border-rose-500/20",
      title: "Missed Calls = Instant Lost Revenue",
      description:
        "Homeowners in a panic don't leave voicemails. They immediately hang up and call the next plumber on Google. Missing just 2 emergency jobs a week costs you $40,000+ in annual profits.",
      stat: "$40,000+",
      statLabel: "Average annual loss per solo plumber",
    },
    {
      icon: Users2,
      tag: "Lack of Context",
      tagColor: "bg-amber-500/10 text-amber-400 border-amber-500/20",
      title: "Generic Answering Services Fail",
      description:
        "Human answering bureaus use generic operators who don't know the difference between a main water shutoff valve and a backflow preventer. They take incomplete notes and cannot triage emergencies.",
      stat: "65%",
      statLabel: "Of callers frustrated by generic answering services",
    },
    {
      icon: DollarSign,
      tag: "Costly & Limited Hours",
      tagColor: "bg-blue-500/10 text-blue-400 border-blue-500/20",
      title: "Full-Time Staff Eats Your Margin",
      description:
        "A full-time in-house receptionist costs $3,500–$4,500/month plus overhead—and leaves your business completely dark during evenings, weekends, and holidays when high-ticket emergency calls happen.",
      stat: "$45,000/yr",
      statLabel: "Saved compared to hiring in-house staff",
    },
  ];

  return (
    <section id="problem" className="relative py-32 md:py-40 bg-[#081020] border-t border-b border-slate-800/80">
      <div className="mx-auto max-w-7xl px-6 sm:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-20">
          <div className="inline-flex items-center gap-2 rounded-full border border-rose-500/30 bg-rose-500/10 px-3.5 py-1 text-xs font-semibold text-rose-300 mb-4">
            <AlertTriangle className="h-3.5 w-3.5" />
            <span>The Reality of Solo & Pro Plumbing</span>
          </div>

          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            The phone is ringing. But you’re under a sink.
          </h2>

          <p className="mt-4 text-base sm:text-lg text-slate-400 leading-relaxed">
            Plumbing is a high-urgency trade. When water is flooding a basement or a sewer is backing up, customers call the first number that answers with confidence.
          </p>
        </div>

        {/* 3 Problem Cards Grid */}
        <div className="grid gap-8 md:gap-10 md:grid-cols-3">
          {problems.map((prob) => {
            const Icon = prob.icon;
            return (
              <div
                key={prob.title}
                className="group relative flex flex-col justify-between rounded-2xl border border-slate-800 bg-[#0f172a]/70 p-7 shadow-lg backdrop-blur-sm transition-all duration-200 hover:border-slate-700 hover:bg-[#0f172a]"
              >
                <div>
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-800/80 border border-slate-700/80 text-rose-400 group-hover:scale-105 transition-transform">
                      <Icon className="h-5 w-5" />
                    </div>
                    <span
                      className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${prob.tagColor}`}
                    >
                      {prob.tag}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-white mb-3">{prob.title}</h3>
                  <p className="text-sm leading-relaxed text-slate-400">{prob.description}</p>
                </div>

                <div className="mt-6 pt-5 border-t border-slate-800/80">
                  <div className="text-2xl font-black text-white">{prob.stat}</div>
                  <div className="text-xs font-medium text-slate-400 mt-0.5">{prob.statLabel}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom Banner */}
        <div className="mt-16 rounded-2xl border border-blue-500/30 bg-gradient-to-r from-blue-950/60 via-[#0b1b38]/70 to-blue-950/60 p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl">
          <div>
            <h4 className="text-lg font-bold text-white">
              Stop bleeding revenue to unanswered calls
            </h4>
            <p className="mt-1 text-sm text-slate-300">
              PlumberAnswered answers every call in 2 rings with a natural, custom-trained voice.
            </p>
          </div>
          <a
            href="#how-it-works"
            className="flex items-center gap-2 text-sm font-semibold text-blue-400 hover:text-blue-300 transition-colors whitespace-nowrap"
          >
            <span>See how it works in 3 steps</span>
            <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </div>
    </section>
  );
}
