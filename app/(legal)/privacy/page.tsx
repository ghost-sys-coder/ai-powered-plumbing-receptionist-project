import type { Metadata } from "next";
import Link from "next/link";
import { legal } from "@/lib/legal";
import { LegalDocument, LegalSection, SupportEmailLink } from "@/components/legal/legal-document";

export const metadata: Metadata = {
  title: `Privacy Policy — ${legal.serviceName}`,
  description: `How ${legal.serviceName} collects, uses, and protects business and caller information.`,
};

export default function PrivacyPage() {
  const { serviceName, companyName } = legal;

  return (
    <LegalDocument
      title="Privacy Policy"
      intro={
        <p>
          {serviceName} is an AI receptionist for service businesses, operated by {companyName}{" "}
          (&ldquo;we&rdquo;, &ldquo;us&rdquo;). It answers our customers&rsquo; phone calls,
          captures what each caller needs, and books appointments. This policy explains what
          information we handle, why, and the choices you have — whether you are a business using{" "}
          {serviceName} or someone who called one.
        </p>
      }
    >
      <LegalSection id="who-this-covers" title="1. Who this policy covers">
        <ul>
          <li>
            <strong>Customers</strong> — businesses that subscribe to {serviceName}, and the people
            they authorize to use the client portal.
          </li>
          <li>
            <strong>Callers</strong> — members of the public who phone a customer&rsquo;s business
            line and speak with the AI receptionist.
          </li>
          <li>
            <strong>Visitors</strong> — anyone browsing our website.
          </li>
        </ul>
        <p>
          For caller information, we act on behalf of the business you called: that business
          decides why the call is handled and what happens to the details you share, and we
          process them to provide our service to it. For customer account information, we decide
          how it is used, as described below.
        </p>
      </LegalSection>

      <LegalSection id="information-we-collect" title="2. Information we collect">
        <h3>From customers</h3>
        <ul>
          <li>
            Business and contact details: business name, owner name, email address, phone number,
            business address, service area, and timezone.
          </li>
          <li>
            Receptionist configuration: services offered, pricing, business hours, emergency
            criteria, and appointment settings you ask us to set up.
          </li>
          <li>
            Login details for the client portal (name, email address, and sign-in activity),
            managed through our authentication provider.
          </li>
          <li>Billing identifiers, where a paid plan applies.</li>
        </ul>

        <h3>From callers</h3>
        <ul>
          <li>Your phone number (caller ID) and the date, time, and length of the call.</li>
          <li>
            What you tell the receptionist — typically your name, service address, a description
            of the problem, and how urgent it is.
          </li>
          <li>
            <strong>An audio recording and a written transcript of the call</strong>, and an
            AI-generated summary of it.
          </li>
          <li>Appointment details if you book a visit.</li>
        </ul>

        <h3>From website visitors</h3>
        <ul>
          <li>
            Details you enter when booking a demo (such as your name and email), and basic
            technical information like browser type and pages requested, which our hosting provider
            logs to keep the site running and secure.
          </li>
        </ul>
      </LegalSection>

      <LegalSection id="how-we-use-it" title="3. How we use information">
        <ul>
          <li>
            To answer calls on a customer&rsquo;s behalf, understand the caller&rsquo;s request,
            flag emergencies, and book appointments into the customer&rsquo;s calendar.
          </li>
          <li>
            To show customers their calls, recordings, transcripts, summaries, and bookings in the
            client portal.
          </li>
          <li>To set up, maintain, and troubleshoot each customer&rsquo;s receptionist.</li>
          <li>To manage accounts, send invitations and service messages, and handle billing.</li>
          <li>To keep the service secure and prevent misuse.</li>
          <li>To comply with legal obligations.</li>
        </ul>
        <p>
          We do not sell personal information, and we do not use it for advertising. We do not use
          call recordings or transcripts to train our own AI models.
        </p>
      </LegalSection>

      <LegalSection id="call-recording" title="4. Call recording and AI">
        <p>
          Calls to a {serviceName} line are answered by an AI voice assistant, not a person, and
          are recorded and transcribed so the business can review what was discussed. Recordings,
          transcripts, and summaries are available to the business you called.
        </p>
        <p>
          Laws in some places require that callers are told a call is recorded, or that all parties
          consent. Our customers are responsible for providing any notice or obtaining any consent
          that applies to their calls. If you do not want your call recorded, please hang up and
          contact the business another way.
        </p>
      </LegalSection>

      <LegalSection id="sharing" title="5. Who we share information with">
        <p>
          <strong>The business you called.</strong> Caller information is shared with the customer
          whose line you called — that is the purpose of the service.
        </p>
        <p>
          <strong>Service providers.</strong> We rely on carefully chosen providers who process
          information only to run {serviceName} for us:
        </p>
        <ul>
          <li>
            <strong>Vapi</strong> — voice AI platform that handles calls, speech recognition, call
            recordings, and transcripts.
          </li>
          <li>
            <strong>OpenAI</strong> — language model that powers the receptionist&rsquo;s
            understanding and responses.
          </li>
          <li>
            <strong>ElevenLabs</strong> — generates the receptionist&rsquo;s voice.
          </li>
          <li>
            <strong>Twilio</strong> — telephone numbers, for customers whose line is provided
            through Twilio.
          </li>
          <li>
            <strong>Google</strong> — Google Calendar, to check availability and create
            appointments in the customer&rsquo;s own calendar.
          </li>
          <li>
            <strong>Clerk</strong> — portal sign-in, account security, and invitation emails.
          </li>
          <li>
            <strong>Neon</strong> — database hosting, and <strong>Vercel</strong> — application
            hosting.
          </li>
          <li>
            <strong>Cal.com</strong> — demo scheduling on our website, and{" "}
            <strong>Stripe</strong> — payment processing, where a paid plan applies.
          </li>
        </ul>
        <p>
          <strong>Legal reasons.</strong> We may disclose information if required by law, to
          protect the rights and safety of others, or as part of a merger or sale of our business
          (in which case this policy would continue to apply).
        </p>
      </LegalSection>

      <LegalSection id="retention" title="6. How long we keep information">
        <ul>
          <li>
            Call records, recordings, transcripts, and bookings are kept for as long as the
            customer&rsquo;s account is active, unless the customer or caller asks us to delete them
            sooner.
          </li>
          <li>
            When a customer account is closed, we delete its portal logins, receptionist
            configuration, call records, and bookings.
          </li>
          <li>
            Appointments already created in a customer&rsquo;s Google Calendar live in that
            customer&rsquo;s calendar and are controlled by them.
          </li>
          <li>
            Limited records may be kept longer where the law requires (for example, billing
            records), and deleted data may persist briefly in secure backups before being
            overwritten.
          </li>
        </ul>
        <p>
          See our <Link href="/data-deletion">Data Deletion</Link> page for how to request
          deletion.
        </p>
      </LegalSection>

      <LegalSection id="security" title="7. How we protect information">
        <p>
          Information is encrypted in transit, the client portal is accessible only to invited
          users, and each business can see only its own calls. Incoming call events from our voice
          platform are verified before they are accepted. Access to customer data within our team is
          limited to what is needed to run and support the service. No system is perfectly secure,
          but we work to protect information and will notify affected customers of a breach as the
          law requires.
        </p>
      </LegalSection>

      <LegalSection id="your-rights" title="8. Your rights and choices">
        <p>
          Depending on where you live, you may have the right to access, correct, delete, or get a
          copy of your personal information, and to object to or limit how it is used. Residents of
          California and other US states with privacy laws, and of the UK and European Economic
          Area, have specific rights under those laws. We will not discriminate against you for
          exercising them.
        </p>
        <ul>
          <li>
            <strong>Callers:</strong> you can contact the business you called, or email us at{" "}
            <SupportEmailLink /> with the phone number you called from. Where we hold the data on a
            business&rsquo;s behalf, we will work with that business to respond.
          </li>
          <li>
            <strong>Customers:</strong> you can update most business details by contacting your
            account manager, and request a copy or deletion of your data at any time.
          </li>
        </ul>
        <p>
          We will verify requests before acting on them, and respond within the time the law
          requires.
        </p>
      </LegalSection>

      <LegalSection id="cookies" title="9. Cookies">
        <p>
          We use only the cookies and browser storage needed to run the service: to keep you signed
          in to the client portal securely and to remember your light or dark display preference. We
          do not use advertising or cross-site tracking cookies.
        </p>
      </LegalSection>

      <LegalSection id="international" title="10. International transfers">
        <p>
          {serviceName} and its providers operate primarily in the United States. If you access it
          from elsewhere, your information will be transferred to and processed in the United States
          and other countries where our providers operate, with safeguards required by applicable
          law.
        </p>
      </LegalSection>

      <LegalSection id="children" title="11. Children">
        <p>
          {serviceName} is a business service and is not directed to children. We do not knowingly
          collect personal information from children under 13 (or under 16 where local law sets a
          higher age). If you believe a child has provided us information, contact us and we will
          delete it.
        </p>
      </LegalSection>

      <LegalSection id="changes" title="12. Changes to this policy">
        <p>
          We may update this policy as the service changes. We will change the &ldquo;last
          updated&rdquo; date above and, for material changes, notify customers by email or in the
          client portal before the changes take effect.
        </p>
      </LegalSection>

      <LegalSection id="contact" title="13. Contact us">
        <p>
          Questions or requests about privacy: <SupportEmailLink />.
        </p>
      </LegalSection>
    </LegalDocument>
  );
}
