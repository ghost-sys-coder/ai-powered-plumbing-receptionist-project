const leftItems = [
  "Routine bookings (leaks, drains, faucets, quotes)",
  "Emergency triage (flooding, burst pipes, sewage backup)",
  "After-hours calls with clear messaging",
];

const rightItems = [
  "Caller name, address, and issue captured automatically",
  "Jobs booked directly onto your Google Calendar",
  "Full call transcript in your dashboard within minutes",
];

export function HandlesSection() {
  return (
    <section className="px-6 py-24" style={{ backgroundColor: "#0D0D0D" }}>
      <div className="mx-auto max-w-5xl">
        <h2 className="mb-12 text-3xl font-bold tracking-tight text-white sm:text-4xl">
          What Sarah handles on every call
        </h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <ul className="space-y-4">
            {leftItems.map((item) => (
              <li key={item} className="flex items-start gap-3 text-sm" style={{ color: "#A1A1AA" }}>
                <span className="mt-0.5 font-bold" style={{ color: "#2563EB" }}>✓</span>
                {item}
              </li>
            ))}
          </ul>
          <ul className="space-y-4">
            {rightItems.map((item) => (
              <li key={item} className="flex items-start gap-3 text-sm" style={{ color: "#A1A1AA" }}>
                <span className="mt-0.5 font-bold" style={{ color: "#2563EB" }}>✓</span>
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div
          className="mt-12 rounded-lg p-6"
          style={{ border: "1px solid #222222", backgroundColor: "#111111" }}
        >
          <p className="mb-3 font-semibold text-white">
            &ldquo;What if the AI says something wrong?&rdquo;
          </p>
          <p className="text-sm leading-relaxed" style={{ color: "#A1A1AA" }}>
            We monitor every call. If something goes wrong, we fix the prompt within 24 hours.
            You can pause the AI from your dashboard in one click — calls fall back to your
            voicemail instantly.
          </p>
        </div>
      </div>
    </section>
  );
}
