const steps = [
  {
    number: "01",
    title: "You tell us about your business",
    body: "We learn your services, pricing, hours, and what counts as an emergency. Takes 20 minutes on a call with us.",
  },
  {
    number: "02",
    title: "We build and configure your AI agent",
    body: "We set everything up. You don't touch a dashboard. Your dedicated number goes live within 48 hours.",
  },
  {
    number: "03",
    title: "Every call gets answered",
    body: "Your AI receptionist handles calls, triages urgency, and books jobs on your calendar. You get a full log of every call in your dashboard.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="px-6 py-24">
      <div className="mx-auto max-w-5xl">
        <div className="mb-16 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            How it works
          </h2>
          <p className="mt-3 text-base" style={{ color: "#A1A1AA" }}>
            Three steps. 48 hours. Then it runs itself.
          </p>
        </div>

        <div className="relative grid gap-8 sm:grid-cols-3 sm:gap-0">
          {steps.map((step, i) => (
            <div
              key={step.number}
              className="reveal-on-scroll relative px-6 text-center sm:text-left"
              style={{ animationDelay: `${i * 100}ms` }}
            >
              {/* connector line between steps on desktop */}
              {i < steps.length - 1 && (
                <div
                  className="absolute top-6 right-0 hidden h-px w-1/2 sm:block"
                  style={{ backgroundColor: "#222222" }}
                />
              )}
              {i > 0 && (
                <div
                  className="absolute top-6 left-0 hidden h-px w-1/2 sm:block"
                  style={{ backgroundColor: "#222222" }}
                />
              )}

              <span
                className="text-5xl font-bold tabular-nums"
                style={{ color: "#2563EB" }}
              >
                {step.number}
              </span>
              <h3 className="mt-4 text-lg font-semibold text-white">
                {step.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed" style={{ color: "#A1A1AA" }}>
                {step.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
