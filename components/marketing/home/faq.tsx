import { BRAND } from "@/lib/brand";
import { PLANS, TRIAL_DAYS, formatMoney } from "@/lib/billing/plans";
import { Container, SectionHeading } from "./shared";

const overage = formatMoney(PLANS.direct_basic.perMinute.usd, "usd");

// Every answer here describes how the product works today.
const FAQS = [
  {
    q: "What will my callers hear?",
    a: `A natural, friendly voice that answers in your business's name, asks one question at a time and lets callers finish speaking. ${BRAND.name} is an AI receptionist; it sticks to what you've told it and never makes promises it can't keep.`,
  },
  {
    q: "Do I have to change my phone number?",
    a: "No. Your receptionist gets its own number, and you forward your existing line to it with your phone carrier — for every call, after hours, or only when you don't pick up.",
  },
  {
    q: "How does it decide what's an emergency?",
    a: "You write the rule in plain words — for example \"burst pipe or no heat\" or \"severe tooth pain\". When a call matches, it texts you the caller's details immediately and can offer to put them straight through to you.",
  },
  {
    q: "Can it really book appointments?",
    a: "Yes, if you connect Google Calendar. It checks your actual free time before offering slots, and only tells a caller they're booked once the appointment is saved. Without a calendar, it takes booking requests as messages.",
  },
  {
    q: "What if a caller asks something it doesn't know?",
    a: "It doesn't guess. It takes the caller's details and question so you can call back, and the full recording and transcript are waiting in your dashboard.",
  },
  {
    q: "What happens if I go over my minutes?",
    a: `Nothing stops. Calls keep being answered and extra minutes are billed at ${overage} each on your next invoice. You can move to a bigger plan at any time.`,
  },
  {
    q: "How does the free trial work?",
    a: `Every plan starts with a ${TRIAL_DAYS}-day free trial. A card is needed to start, and you can cancel any time from your billing page.`,
  },
  {
    q: "Which countries do you support?",
    a: "The United States, Canada, the United Kingdom, Australia and Uganda, with local time zones and phone formats. You pay in US, Canadian or Australian dollars, or British pounds.",
  },
];

export function Faq() {
  return (
    <section id="faq" className="scroll-mt-20 py-24 sm:py-32">
      <Container className="grid gap-12 lg:grid-cols-[1fr_2fr] lg:gap-16">
        <SectionHeading
          eyebrow="Questions"
          title="Good to know."
          description={
            <>
              Something we haven&apos;t covered?{" "}
              <a
                href={`mailto:${BRAND.supportEmail}`}
                className="font-medium text-primary underline-offset-4 hover:underline"
              >
                Email us
              </a>
              .
            </>
          }
          className="lg:sticky lg:top-28 lg:self-start"
        />

        <dl className="grid gap-x-10 gap-y-10 sm:grid-cols-2">
          {FAQS.map((f, i) => (
            <div key={f.q} className="reveal-on-scroll" style={{ animationDelay: `${(i % 2) * 70}ms` }}>
              <dt className="font-semibold tracking-tight">{f.q}</dt>
              <dd className="mt-2 leading-relaxed text-pretty text-muted-foreground">{f.a}</dd>
            </div>
          ))}
        </dl>
      </Container>
    </section>
  );
}
