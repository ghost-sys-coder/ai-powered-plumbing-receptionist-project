"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { HelpCircle } from "lucide-react";

export function FaqV2() {
  const faqs = [
    {
      q: "Will my customers realize they're speaking to an AI?",
      a: "PlumberAnswered uses high-fidelity neural voice synthesis with natural human inflections and sub-second response times. Callers rarely ask—they are simply relieved that a polite, professional receptionist answered immediately instead of an answering machine.",
    },
    {
      q: "Do I have to change my existing business phone number?",
      a: "No. We issue you a dedicated number and help you configure call forwarding on your existing carrier (AT&T, Verizon, T-Mobile, etc.). You can forward all calls or only missed calls when you're busy or under a sink.",
    },
    {
      q: "How does the AI know which jobs are true emergencies?",
      a: "During our 20-minute setup, you define your emergency guidelines (e.g. active flooding, frozen pipes, sewer backup). When an emergency occurs, the AI guides the caller through safety steps (like the main shutoff valve) and sends you an instant high-priority SMS alert.",
    },
    {
      q: "What if a caller asks a complex question the AI doesn't know?",
      a: "The AI never guesses or makes false promises. It politely informs the homeowner: 'Let me capture these exact details and have our lead plumber call you directly.' You receive the full recording, contact info, and notes immediately.",
    },
    {
      q: "How does calendar booking work?",
      a: "PlumberAnswered connects directly to your Google Calendar. It only offers time slots that are currently open and respects your custom travel buffer times between jobs, avoiding double-bookings.",
    },
    {
      q: "Can I turn the AI off whenever I want to answer myself?",
      a: "Yes. From your dashboard or by dialing a simple star code on your phone, you can pause the AI receptionist in one click, routing incoming calls directly to your cell or standard voicemail.",
    },
  ];

  return (
    <section id="faq" className="py-24 bg-[#081020] border-t border-slate-800">
      <div className="mx-auto max-w-4xl px-6 sm:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-3.5 py-1 text-xs font-semibold text-blue-300 mb-4">
            <HelpCircle className="h-3.5 w-3.5" />
            <span>Frequently Asked Questions</span>
          </div>

          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Everything you need to know
          </h2>

          <p className="mt-4 text-base sm:text-lg text-slate-400 leading-relaxed">
            Got questions about how PlumberAnswered works in the field? Here are the answers.
          </p>
        </div>

        {/* Accordion */}
        <Accordion type="single" collapsible className="space-y-4">
          {faqs.map((faq, i) => (
            <AccordionItem
              key={i}
              value={`item-${i}`}
              className="rounded-2xl border border-slate-800 bg-[#0f172a]/80 px-6 transition-all duration-200 hover:border-slate-700"
            >
              <AccordionTrigger className="py-5 text-left text-base font-semibold text-white hover:text-blue-400 hover:no-underline">
                {faq.q}
              </AccordionTrigger>
              <AccordionContent className="pb-5 text-sm leading-relaxed text-slate-300">
                {faq.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
