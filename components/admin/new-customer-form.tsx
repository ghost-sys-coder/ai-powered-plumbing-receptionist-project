"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  BusinessHoursInput,
  type BusinessHoursValue,
} from "@/components/admin/business-hours-input";
import { ServicesInput, type ServiceEntry } from "@/components/admin/services-input";
import {
  ProvisioningProgress,
  type ProvisioningStep,
} from "@/components/admin/provisioning-progress";
import { ChevronDown, ChevronUp, ClipboardPaste } from "lucide-react";
import { IndustryCountryFields } from "@/components/admin/industry-country-fields";
import { PricingFields } from "@/components/admin/pricing-fields";
import { WizardSteps } from "@/components/admin/wizard-steps";
import {
  DEFAULT_INDUSTRY,
  getIndustry,
  isIndustryId,
  type IndustryId,
} from "@/lib/verticals";
import { DEFAULT_COUNTRY, getRegion, isCountryCode, type CountryCode } from "@/lib/regions";

const DEFAULT_HOURS: BusinessHoursValue = {
  Monday: { open: "08:00", close: "17:00", closed: false },
  Tuesday: { open: "08:00", close: "17:00", closed: false },
  Wednesday: { open: "08:00", close: "17:00", closed: false },
  Thursday: { open: "08:00", close: "17:00", closed: false },
  Friday: { open: "08:00", close: "17:00", closed: false },
  Saturday: { open: "09:00", close: "13:00", closed: false },
  Sunday: { open: "", close: "", closed: true },
};

function defaultEmergency(industry: IndustryId, country: CountryCode): string {
  return getIndustry(industry).defaultEmergencyDefinition(getRegion(country));
}

function defaultServices(industry: IndustryId): ServiceEntry[] {
  return getIndustry(industry).defaultServices.map((s) => ({ name: s.name, price: s.price ?? "" }));
}

const SAMPLE_JSON = `{
  "businessName": "Austin Pro Plumbing",
  "industry": "plumbing",
  "country": "US",
  "businessDescription": "",
  "ownerName": "Mike Torres",
  "email": "mike@austinproplumbing.com",
  "phone": "512-555-0147",
  "address": "4821 Burnet Rd",
  "city": "Austin",
  "state": "TX",
  "timezone": "America/Chicago",
  "serviceArea": "Greater Austin, TX and surrounding cities",
  "plan": "standard",
  "stripeCustomerId": "",
  "calendarType": "google_calendar",
  "calendarId": "",
  "appointmentDurationMinutes": 120,
  "appointmentBufferMinutes": 30,
  "emergencyDefinition": "Active water damage, burst pipe, sewage backup, or complete loss of water service. Gas line issues are emergencies — advise caller to call 911 first.",
  "businessHours": {
    "Monday":    { "open": "08:00", "close": "17:00", "closed": false },
    "Tuesday":   { "open": "08:00", "close": "17:00", "closed": false },
    "Wednesday": { "open": "08:00", "close": "17:00", "closed": false },
    "Thursday":  { "open": "08:00", "close": "17:00", "closed": false },
    "Friday":    { "open": "08:00", "close": "17:00", "closed": false },
    "Saturday":  { "open": "09:00", "close": "13:00", "closed": false },
    "Sunday":    { "open": "",      "close": "",       "closed": true  }
  },
  "servicesOffered": [
    { "name": "Drain cleaning",            "price": "$150–$300" },
    { "name": "Water heater repair",       "price": "$200–$500" },
    { "name": "Leak detection & repair",   "price": "$100–$400" },
    { "name": "Toilet repair/replacement", "price": "$125–$350" },
    { "name": "Pipe repair",               "price": "$150–$600" }
  ],
  "pricing": {
    "serviceCallFee":      "$95",
    "hourlyRate":          "$125/hr",
    "afterHoursSurcharge": "$75",
    "freeEstimates":       false
  }
}`;

const INITIAL_STEPS: ProvisioningStep[] = [
  { label: "Creating account...", status: "pending" },
  { label: "Provisioning AI assistant...", status: "pending" },
  { label: "Assigning phone number...", status: "pending" },
  { label: "Activating agent...", status: "pending" },
  { label: "Done ✓", status: "pending" },
];

type AgencyOption = { id: string; name: string; isHouse: boolean };

// `agencies` is passed only to platform admins, who choose the owning agency
// (default: the house agency for direct customers). Agency staff get null and
// the server assigns their own agency.
export function NewCustomerForm({ agencies }: { agencies: AgencyOption[] | null }) {
  const router = useRouter();
  const [organizationId, setOrganizationId] = useState(
    agencies?.find((a) => a.isHouse)?.id ?? agencies?.[0]?.id ?? ""
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [steps, setSteps] = useState<ProvisioningStep[]>(INITIAL_STEPS);
  const [error, setError] = useState<string | null>(null);
  // Setup finished but no number could be issued for the business's country.
  const [phoneNotice, setPhoneNotice] = useState<{ customerId: string; text: string } | null>(null);

  const [jsonPanelOpen, setJsonPanelOpen] = useState(false);
  const [jsonInput, setJsonInput] = useState("");
  const [jsonError, setJsonError] = useState<string | null>(null);

  const [businessName, setBusinessName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [industry, setIndustry] = useState<IndustryId>(DEFAULT_INDUSTRY);
  const [country, setCountry] = useState<CountryCode>(DEFAULT_COUNTRY);
  const [businessDescription, setBusinessDescription] = useState("");
  const [timezone, setTimezone] = useState(getRegion(DEFAULT_COUNTRY).defaultTimezone);
  const [serviceArea, setServiceArea] = useState("");
  // Emergency definition and services follow the chosen industry/country until
  // the admin edits them; after that, switching industry leaves them alone.
  const [emergencyDefinition, setEmergencyDefinition] = useState(
    defaultEmergency(DEFAULT_INDUSTRY, DEFAULT_COUNTRY)
  );
  const [emergencyTouched, setEmergencyTouched] = useState(false);
  const [businessHours, setBusinessHours] =
    useState<BusinessHoursValue>(DEFAULT_HOURS);
  const [services, setServices] = useState<ServiceEntry[]>(defaultServices(DEFAULT_INDUSTRY));
  const [servicesTouched, setServicesTouched] = useState(false);
  const [serviceCallFee, setServiceCallFee] = useState("");
  const [hourlyRate, setHourlyRate] = useState("");
  const [afterHoursSurcharge, setAfterHoursSurcharge] = useState("");
  const [freeEstimates, setFreeEstimates] = useState(false);
  const [plan, setPlan] = useState("standard");
  const [stripeCustomerId, setStripeCustomerId] = useState("");
  const [calendarType, setCalendarType] = useState("google_calendar");
  const [calendarId, setCalendarId] = useState("");
  const [appointmentDuration, setAppointmentDuration] = useState("120");
  const [appointmentBuffer, setAppointmentBuffer] = useState("30");

  const region = getRegion(country);
  const pricingLabels = getIndustry(industry).pricingLabels;

  function handleIndustryChange(next: IndustryId) {
    setIndustry(next);
    if (!emergencyTouched) setEmergencyDefinition(defaultEmergency(next, country));
    if (!servicesTouched) setServices(defaultServices(next));
  }

  function handleCountryChange(next: CountryCode) {
    setCountry(next);
    const nextRegion = getRegion(next);
    if (!nextRegion.timezones.some((tz) => tz.value === timezone)) {
      setTimezone(nextRegion.defaultTimezone);
    }
    if (!emergencyTouched) setEmergencyDefinition(defaultEmergency(industry, next));
  }

  function fillFromJson() {
    setJsonError(null);
    try {
      const parsed = JSON.parse(jsonInput);

      if (isIndustryId(parsed.industry)) setIndustry(parsed.industry);
      if (isCountryCode(parsed.country)) setCountry(parsed.country);
      if (parsed.businessDescription !== undefined) setBusinessDescription(parsed.businessDescription ?? "");
      if (parsed.businessName)          setBusinessName(parsed.businessName);
      if (parsed.ownerName)             setOwnerName(parsed.ownerName);
      if (parsed.email)                 setEmail(parsed.email);
      if (parsed.phone !== undefined)   setPhone(parsed.phone ?? "");
      if (parsed.address !== undefined) setAddress(parsed.address ?? "");
      if (parsed.city !== undefined)    setCity(parsed.city ?? "");
      if (parsed.state !== undefined)   setState(parsed.state ?? "");
      if (parsed.timezone)              setTimezone(parsed.timezone);
      if (parsed.serviceArea !== undefined) setServiceArea(parsed.serviceArea ?? "");
      if (parsed.emergencyDefinition) {
        setEmergencyDefinition(parsed.emergencyDefinition);
        setEmergencyTouched(true);
      }
      if (parsed.businessHours)         setBusinessHours(parsed.businessHours);
      if (Array.isArray(parsed.servicesOffered)) {
        setServices(parsed.servicesOffered);
        setServicesTouched(true);
      }
      if (parsed.pricing) {
        if (parsed.pricing.serviceCallFee !== undefined)      setServiceCallFee(parsed.pricing.serviceCallFee ?? "");
        if (parsed.pricing.hourlyRate !== undefined)          setHourlyRate(parsed.pricing.hourlyRate ?? "");
        if (parsed.pricing.afterHoursSurcharge !== undefined) setAfterHoursSurcharge(parsed.pricing.afterHoursSurcharge ?? "");
        if (parsed.pricing.freeEstimates !== undefined)       setFreeEstimates(Boolean(parsed.pricing.freeEstimates));
      }
      if (parsed.plan)                          setPlan(parsed.plan);
      if (parsed.stripeCustomerId !== undefined) setStripeCustomerId(parsed.stripeCustomerId ?? "");
      if (parsed.calendarType)                  setCalendarType(parsed.calendarType);
      if (parsed.calendarId !== undefined)      setCalendarId(parsed.calendarId ?? "");
      if (parsed.appointmentDurationMinutes !== undefined) setAppointmentDuration(String(parsed.appointmentDurationMinutes));
      if (parsed.appointmentBufferMinutes !== undefined)   setAppointmentBuffer(String(parsed.appointmentBufferMinutes));

      setJsonPanelOpen(false);
      setJsonInput("");
    } catch {
      setJsonError("Invalid JSON — check the format and try again.");
    }
  }

  // Setup wizard. Each step validates before moving on; the last step submits.
  const WIZARD_STEPS = ["Business", "Location", "Call handling", "Booking", "Review & launch"];
  const LAST_STEP = WIZARD_STEPS.length - 1;
  const [wizardStep, setWizardStep] = useState(0);

  function stepError(step: number): string | null {
    if (step === 0) {
      if (agencies && !organizationId) return "Choose which agency this customer belongs to.";
      if (!businessName.trim() || !ownerName.trim() || !email.trim()) {
        return "Business name, owner name and email are required.";
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return "Enter a valid email address.";
      if (industry === "general" && !businessDescription.trim()) {
        return 'Describe what the business does, e.g. "a dog grooming salon".';
      }
    }
    if (step === 2 && !emergencyDefinition.trim()) {
      return "Describe what counts as an emergency for this business.";
    }
    return null;
  }

  function goToStep(next: number) {
    // Moving forward validates every step being skipped over.
    for (let i = wizardStep; i < next; i++) {
      const problem = stepError(i);
      if (problem) {
        setError(problem);
        setWizardStep(i);
        return;
      }
    }
    setError(null);
    setWizardStep(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function setStepStatus(index: number, status: ProvisioningStep["status"]) {
    setSteps((prev) =>
      prev.map((s, i) => (i === index ? { ...s, status } : s))
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (wizardStep < LAST_STEP) {
      goToStep(wizardStep + 1);
      return;
    }
    const problem = [0, 1, 2, 3].map(stepError).find(Boolean);
    if (problem) {
      goToStep(LAST_STEP);
      return;
    }
    if (!businessName || !ownerName || !email || !emergencyDefinition) {
      setError("Please fill in all required fields.");
      return;
    }
    if (industry === "general" && !businessDescription.trim()) {
      setError('Describe what the business does, e.g. "a dog grooming salon".');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSteps(INITIAL_STEPS.map((s, i) => (i === 0 ? { ...s, status: "active" } : s)));

    try {
      const res = await fetch("/api/admin/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessName,
          ownerName,
          email,
          phone,
          address,
          city,
          state,
          timezone,
          serviceArea,
          organizationId: agencies ? organizationId : undefined,
          industry,
          country,
          businessDescription,
          emergencyDefinition,
          businessHours,
          servicesOffered: services,
          pricing: { serviceCallFee, hourlyRate, afterHoursSurcharge, freeEstimates },
          plan,
          stripeCustomerId: stripeCustomerId || undefined,
          calendarType,
          calendarId: calendarId || undefined,
          appointmentDurationMinutes: Number(appointmentDuration) || 120,
          appointmentBufferMinutes: Number(appointmentBuffer) || 30,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        const failedStep = data.failedStep ?? 0;
        setSteps((prev) =>
          prev.map((s, i) =>
            i < failedStep
              ? { ...s, status: "done" }
              : i === failedStep
              ? { ...s, status: "error" }
              : s
          )
        );
        setError(data.error ?? "Provisioning failed. The account was saved — you can retry.");
        setIsSubmitting(false);
        return;
      }

      // Animate remaining steps
      for (let i = 1; i <= 4; i++) {
        setStepStatus(i - 1, "done");
        if (i < 4) setStepStatus(i, "active");
        await new Promise((r) => setTimeout(r, 500));
      }
      setStepStatus(4, "done");

      if (data.phoneWarning) {
        setPhoneNotice({ customerId: data.customerId, text: data.phoneWarning });
        router.refresh();
        return;
      }

      await new Promise((r) => setTimeout(r, 600));
      router.push(`/admin/customers/${data.customerId}`);
      router.refresh(); // invalidate cached lists so the new customer appears
    } catch {
      setError("Unexpected error. Please try again.");
      setIsSubmitting(false);
    }
  }

  if (isSubmitting) {
    return (
      <div className="flex min-h-64 flex-col items-center justify-center gap-6 py-12">
        <h2 className="text-lg font-semibold">Setting up account...</h2>
        <div className="w-72">
          <ProvisioningProgress steps={steps} />
        </div>
        {error && (
          <div className="w-72 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-400">
            {error}
            <button
              onClick={() => setIsSubmitting(false)}
              className="mt-2 block text-xs underline"
            >
              Back to form
            </button>
          </div>
        )}
        {phoneNotice && (
          <div className="w-80 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300">
            <p className="font-medium">The receptionist is set up, but has no phone number yet.</p>
            <p className="mt-1">{phoneNotice.text}</p>
            <Button
              type="button"
              size="sm"
              className="mt-3"
              onClick={() => router.push(`/admin/customers/${phoneNotice.customerId}`)}
            >
              Go to customer
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <WizardSteps steps={WIZARD_STEPS} current={wizardStep} onSelect={goToStep} />

      {/* JSON paste panel */}
      {wizardStep === 0 && (
      <Card className="border-dashed">
        <CardHeader className="pb-3">
          <button
            type="button"
            onClick={() => setJsonPanelOpen((o) => !o)}
            className="flex w-full items-center justify-between text-left"
          >
            <div className="flex items-center gap-2">
              <ClipboardPaste className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Fill from JSON</span>
              <span className="text-xs text-muted-foreground">
                — paste a JSON blob to instantly populate all fields
              </span>
            </div>
            {jsonPanelOpen ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
        </CardHeader>

        {jsonPanelOpen && (
          <CardContent className="space-y-3 pt-0">
            <Textarea
              value={jsonInput}
              onChange={(e) => setJsonInput(e.target.value)}
              placeholder={SAMPLE_JSON}
              rows={12}
              className="font-mono text-xs"
            />
            {jsonError && (
              <p className="text-xs text-destructive">{jsonError}</p>
            )}
            <div className="flex gap-2">
              <Button type="button" size="sm" onClick={fillFromJson}>
                Fill form
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setJsonInput(SAMPLE_JSON);
                  setJsonError(null);
                }}
              >
                Load sample
              </Button>
            </div>
          </CardContent>
        )}
      </Card>
      )}

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-400">
          {error}
        </div>
      )}

      {wizardStep === 0 && (
      <Card>
        <CardHeader>
          <CardTitle>Business info</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          {agencies && (
            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="agency">Agency *</Label>
              <Select value={organizationId} onValueChange={setOrganizationId}>
                <SelectTrigger id="agency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {agencies.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.isHouse ? `${a.name} (direct)` : a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <IndustryCountryFields
            industry={industry}
            country={country}
            businessDescription={businessDescription}
            onIndustryChange={handleIndustryChange}
            onCountryChange={handleCountryChange}
            onBusinessDescriptionChange={setBusinessDescription}
          />
          <div className="space-y-1.5">
            <Label htmlFor="businessName">Business name *</Label>
            <Input
              id="businessName"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ownerName">Owner name *</Label>
            <Input
              id="ownerName"
              value={ownerName}
              onChange={(e) => setOwnerName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>
      )}

      {wizardStep === 1 && (
      <Card>
        <CardHeader>
          <CardTitle>Location</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5 md:col-span-2">
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="city">City</Label>
            <Input
              id="city"
              value={city}
              onChange={(e) => setCity(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="state">{region.subdivisionLabel}</Label>
            <Input
              id="state"
              value={state}
              onChange={(e) => setState(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="timezone">Timezone</Label>
            <Select value={timezone} onValueChange={setTimezone}>
              <SelectTrigger id="timezone">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {region.timezones.map((tz) => (
                  <SelectItem key={tz.value} value={tz.value}>
                    {tz.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="serviceArea">Service area</Label>
            <Input
              id="serviceArea"
              value={serviceArea}
              onChange={(e) => setServiceArea(e.target.value)}
              placeholder="e.g. the city and surrounding areas you cover"
            />
            <p className="text-xs text-muted-foreground">
              The receptionist tells callers this is where the business works.
            </p>
          </div>
        </CardContent>
      </Card>
      )}

      {wizardStep === 2 && (
      <Card>
        <CardHeader>
          <CardTitle>How the receptionist handles calls</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-1.5">
            <Label htmlFor="emergency">Emergency definition *</Label>
            <Textarea
              id="emergency"
              value={emergencyDefinition}
              onChange={(e) => {
                setEmergencyDefinition(e.target.value);
                setEmergencyTouched(true);
              }}
              rows={3}
              required
            />
          </div>

          <Separator />

          <div className="space-y-2">
            <Label>Business hours</Label>
            <BusinessHoursInput value={businessHours} onChange={setBusinessHours} />
          </div>

          <Separator />

          <div className="space-y-2">
            <Label>Services offered</Label>
            <ServicesInput
              value={services}
              onChange={(next) => {
                setServices(next);
                setServicesTouched(true);
              }}
            />
          </div>

          <Separator />

          <PricingFields
            labels={pricingLabels}
            serviceCallFee={serviceCallFee}
            hourlyRate={hourlyRate}
            afterHoursSurcharge={afterHoursSurcharge}
            freeEstimates={freeEstimates}
            onServiceCallFee={setServiceCallFee}
            onHourlyRate={setHourlyRate}
            onAfterHoursSurcharge={setAfterHoursSurcharge}
            onFreeEstimates={setFreeEstimates}
          />
        </CardContent>
      </Card>
      )}

      {wizardStep === 3 && (
      <Card>
        <CardHeader>
          <CardTitle>Booking & calendar</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="calendarType">Calendar integration</Label>
            <Select value={calendarType} onValueChange={setCalendarType}>
              <SelectTrigger id="calendarType">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="google_calendar">Google Calendar (direct booking)</SelectItem>
                <SelectItem value="manual">Manual scheduling (AI takes messages)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {calendarType === "google_calendar" && (
            <div className="space-y-1.5">
              <Label htmlFor="calendarId">Calendar ID</Label>
              <Input
                id="calendarId"
                value={calendarId}
                onChange={(e) => setCalendarId(e.target.value)}
                placeholder="abc123@group.calendar.google.com"
              />
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="appointmentDuration">Appointment duration (minutes)</Label>
            <Input
              id="appointmentDuration"
              type="number"
              min={30}
              max={480}
              step={30}
              value={appointmentDuration}
              onChange={(e) => setAppointmentDuration(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              How long to block on the calendar per booking.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="appointmentBuffer">Buffer time between appointments (minutes)</Label>
            <Input
              id="appointmentBuffer"
              type="number"
              min={0}
              max={120}
              step={15}
              value={appointmentBuffer}
              onChange={(e) => setAppointmentBuffer(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">Travel/prep time between jobs.</p>
          </div>
          {calendarType === "google_calendar" && !calendarId && (
            <p className="text-xs text-muted-foreground md:col-span-2">
              No calendar yet? Leave the ID blank and connect it later from the customer&apos;s
              page — until then the receptionist takes booking requests as messages.
            </p>
          )}
        </CardContent>
      </Card>
      )}

      {wizardStep === 4 && (
        <Card>
          <CardHeader>
            <CardTitle>Review</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-x-6 gap-y-3 text-sm md:grid-cols-2">
              {[
                ["Business", businessName],
                ["Industry", getIndustry(industry).label],
                ["Country", region.label],
                ["Owner", `${ownerName} · ${email}`],
                ["Service area", serviceArea || "—"],
                ["Timezone", timezone],
                ["Services", services.map((sv) => sv.name).filter(Boolean).join(", ") || "—"],
                [
                  "Booking",
                  calendarType === "manual"
                    ? "AI takes messages; the business calls back"
                    : calendarId
                    ? `Google Calendar, ${appointmentDuration}-minute appointments`
                    : "Google Calendar — connect later",
                ],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="text-muted-foreground">{label}</dt>
                  <dd className="font-medium">{value}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-4 text-xs text-muted-foreground">
              Launching creates the AI receptionist and assigns it a phone number. You can change
              any of this afterwards.
            </p>
          </CardContent>
        </Card>
      )}

      {wizardStep === 4 && agencies && (
      <Card>
        <CardHeader>
          <CardTitle>Billing</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="plan">Plan</Label>
            <Select value={plan} onValueChange={setPlan}>
              <SelectTrigger id="plan">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="standard">Standard</SelectItem>
                <SelectItem value="pilot">Pilot</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="stripeId">Stripe customer ID</Label>
            <Input
              id="stripeId"
              value={stripeCustomerId}
              onChange={(e) => setStripeCustomerId(e.target.value)}
              placeholder="cus_..."
            />
          </div>
        </CardContent>
      </Card>
      )}

      <div className="flex items-center justify-between gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => goToStep(wizardStep - 1)}
          disabled={wizardStep === 0}
        >
          Back
        </Button>
        {wizardStep < LAST_STEP ? (
          <Button type="submit" size="lg" className="min-w-32">
            Next
          </Button>
        ) : (
          <Button type="submit" size="lg" className="min-w-56">
            Launch receptionist
          </Button>
        )}
      </div>
    </form>
  );
}
