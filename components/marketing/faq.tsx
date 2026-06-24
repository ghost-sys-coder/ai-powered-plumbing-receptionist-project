"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const items = [
  {
    q: "Will my customers know it's an AI?",
    a: "Most don't on the first call. By the second or third, they don't care — they just appreciate that someone answered. Customers care that their pipe gets fixed, not how the receptionist sounds.",
  },
  {
    q: "What if I already have a business number?",
    a: "We set up a new dedicated number for the AI. You can forward your existing number to it, or give the new number to new customers going forward. Either works.",
  },
  {
    q: "What plumbing services does it handle?",
    a: "We configure it specifically for your business — your services, your pricing, your emergency definition. It's not a generic bot. It knows what you do.",
  },
  {
    q: "What happens if the AI can't handle something?",
    a: "It takes a detailed message and tells the caller you'll call them back. Nothing gets dropped. You see every call in your dashboard.",
  },
  {
    q: "How do I get started?",
    a: "Book a 20-minute call. We'll ask about your business, answer your questions, and if it's a fit, you're live within 48 hours.",
  },
];

export function Faq() {
  return (
    <section className="px-6 py-24" style={{ backgroundColor: "#0D0D0D" }}>
      <div className="mx-auto max-w-3xl">
        <h2 className="mb-10 text-3xl font-bold tracking-tight text-white sm:text-4xl">
          Questions
        </h2>

        <Accordion type="single" collapsible className="space-y-2">
          {items.map((item, i) => (
            <AccordionItem
              key={i}
              value={`item-${i}`}
              className="rounded-lg px-4"
              style={{ border: "1px solid #222222", backgroundColor: "#111111" }}
            >
              <AccordionTrigger className="text-left text-sm font-medium text-white hover:no-underline">
                {item.q}
              </AccordionTrigger>
              <AccordionContent className="text-sm leading-relaxed" style={{ color: "#A1A1AA" }}>
                {item.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
