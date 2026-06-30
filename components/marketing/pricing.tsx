import { Button } from "@/components/ui/button";

export function Pricing() {
  const bookingUrl = process.env.NEXT_PUBLIC_BOOKING_URL ?? "#";
  const demoNumber = process.env.NEXT_PUBLIC_DEMO_NUMBER ?? "+15717438660";

  return (
    <section id="pricing" className="px-6 py-24">
      <div className="mx-auto max-w-5xl">
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Simple pricing. No contracts.
          </h2>
        </div>

        <div className="flex justify-center items-center">
          {/* Standard card */}
          <div
            className="relative flex flex-col rounded-xl p-8 min-w-75 max-w-md shadow-lg"
            style={{ border: "2px solid #2563EB", backgroundColor: "#0f172a" }}
          >
            <span
              className="absolute -top-3 left-6 rounded-full px-3 py-0.5 text-xs font-semibold text-white"
              style={{ backgroundColor: "#2563EB" }}
            >
              Most popular
            </span>

            <p className="text-sm font-medium uppercase tracking-widest" style={{ color: "#A1A1AA" }}>
              Standard
            </p>
            <p className="mt-2 text-3xl font-bold text-white">
              $2,500 <span className="text-lg font-normal">setup</span> + $250
              <span className="text-lg font-normal">/mo</span>
            </p>

            <ul className="mt-6 space-y-2">
              {[
                "Custom AI agent setup",
                "Dedicated US phone number",
                "Google Calendar integration",
                "Full call dashboard",
                "Weekly prompt tuning",
                "Monitoring and support",
                "No contract — cancel anytime",
              ].map((item) => (
                <li key={item} className="flex items-center gap-2 text-sm" style={{ color: "#A1A1AA" }}>
                  <span style={{ color: "#2563EB" }}>✓</span>
                  {item}
                </li>
              ))}
            </ul>

            <div className="mt-8">
              <Button
                asChild
                className="w-full bg-[#2563EB] text-white hover:bg-[#1d4ed8]"
              >
                <a href={bookingUrl} target="_blank" rel="noopener noreferrer">
                  Book a setup call
                </a>
              </Button>
            </div>
          </div>
        </div>

        <p className="mt-10 text-center text-sm" style={{ color: "#A1A1AA" }}>
          Not sure yet? Call the demo number first.{" "}
          <a
            href={`tel:${demoNumber.replace(/\s/g, "")}`}
            className="font-medium text-white hover:underline"
          >
            {demoNumber}
          </a>
        </p>
      </div>
    </section>
  );
}
