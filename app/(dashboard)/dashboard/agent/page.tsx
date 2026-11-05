import { notFound, redirect } from "next/navigation";
import { getCustomerId } from "@/lib/auth/get-customer-id";
import { getAgentConfig } from "@/lib/services/dashboard";
import { getCachedLiveAssistantPhoneNumber } from "@/lib/services/live-phone";
import { PageHeader } from "@/components/layout/page-header";
import { AgentStatusCard } from "@/components/agent/agent-status-card";
import { BusinessHoursCard } from "@/components/agent/business-hours-card";
import { ServicesCard } from "@/components/agent/services-card";
import { PricingCard } from "@/components/agent/pricing-card";
import { Card, CardContent } from "@/components/ui/card";
import { GoogleCalendarConnect } from "@/components/integrations/google-calendar-connect";
import { getCalendarConnection } from "@/lib/services/calendar-connections";
import { isGoogleOAuthConfigured } from "@/lib/google/oauth";

const AgentPage = async ({
  searchParams,
}: {
  searchParams: Promise<{ calendar?: string }>;
}) => {
  const { calendar: calendarNotice } = await searchParams;
  const customerId = await getCustomerId();
  if (!customerId) redirect("/dashboard");

  const agent = await getAgentConfig(customerId);

  if (!agent) notFound();

  // Pull the number actually attached to the assistant in Vapi (source of
  // truth); fall back to the stored value if the live lookup fails.
  const livePhone = await getCachedLiveAssistantPhoneNumber({ customerId: agent.customerId });

  const supportEmail =
    process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "frank@veilcode.studio";

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title="Your AI Agent"
        description="Managed by PlumberAnswered — contact us to make changes"
      />

      <div className="grid gap-4 md:grid-cols-2">
        <AgentStatusCard agent={agent} livePhoneNumber={livePhone?.number ?? null} />
        <Card>
          <CardContent className="space-y-2 pt-6 text-sm">
            <p className="font-medium">Emergency definition</p>
            <p className="text-muted-foreground">
              {agent.emergencyDefinition ?? "Not configured."}
            </p>
          </CardContent>
        </Card>
      </div>

      <GoogleCalendarConnect
        customerId={agent.customerId}
        configured={isGoogleOAuthConfigured()}
        connection={await getCalendarConnection(agent.customerId)}
        returnTo="/dashboard/agent"
        notice={calendarNotice ?? null}
      />

      <BusinessHoursCard hours={agent.businessHours} />

      <div className="grid gap-4 md:grid-cols-2">
        <ServicesCard services={agent.servicesOffered} />
        <PricingCard pricing={agent.pricingTable} />
      </div>

      <Card className="border-dashed">
        <CardContent className="pt-6 text-sm">
          <p className="font-medium">Need to update your settings?</p>
          <p className="mt-1 text-muted-foreground">
            Contact your PlumberAnswered manager to update your agent configuration.
            Changes are applied within 24 hours.
          </p>
          <a
            href={`mailto:${supportEmail}`}
            className="mt-2 inline-block font-medium text-primary underline-offset-4 hover:underline"
          >
            {supportEmail}
          </a>
        </CardContent>
      </Card>
    </div>
  );
};

export default AgentPage;
