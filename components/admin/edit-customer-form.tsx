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
import { ChevronDown, ChevronUp, ClipboardPaste } from "lucide-react";

const US_TIMEZONES = [
  { value: "America/New_York", label: "Eastern Time" },
  { value: "America/Chicago", label: "Central Time" },
  { value: "America/Denver", label: "Mountain Time" },
  { value: "America/Los_Angeles", label: "Pacific Time" },
  { value: "America/Anchorage", label: "Alaska Time" },
  { value: "Pacific/Honolulu", label: "Hawaii Time" },
];

const SAMPLE_JSON = `{
  "businessName": "Austin Pro Plumbing",
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

export interface EditCustomerFormProps {
  customerId: string;
  initial: {
    businessName: string;
    ownerName: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    timezone: string;
    serviceArea: string;
    emergencyDefinition: string;
    businessHours: BusinessHoursValue;
    servicesOffered: ServiceEntry[];
    serviceCallFee: string;
    hourlyRate: string;
    afterHoursSurcharge: string;
    freeEstimates: boolean;
    plan: string;
    stripeCustomerId: string;
  };
}

export function EditCustomerForm({ customerId, initial }: EditCustomerFormProps) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // JSON paste panel state
  const [jsonPanelOpen, setJsonPanelOpen] = useState(false);
  const [jsonInput, setJsonInput] = useState("");
  const [jsonError, setJsonError] = useState<string | null>(null);

  // Form fields
  const [businessName, setBusinessName] = useState(initial.businessName);
  const [ownerName, setOwnerName] = useState(initial.ownerName);
  const [email, setEmail] = useState(initial.email);
  const [phone, setPhone] = useState(initial.phone);
  const [address, setAddress] = useState(initial.address);
  const [city, setCity] = useState(initial.city);
  const [state, setState] = useState(initial.state);
  const [timezone, setTimezone] = useState(initial.timezone);
  const [serviceArea, setServiceArea] = useState(initial.serviceArea);
  const [emergencyDefinition, setEmergencyDefinition] = useState(initial.emergencyDefinition);
  const [businessHours, setBusinessHours] = useState<BusinessHoursValue>(initial.businessHours);
  const [services, setServices] = useState<ServiceEntry[]>(initial.servicesOffered);
  const [serviceCallFee, setServiceCallFee] = useState(initial.serviceCallFee);
  const [hourlyRate, setHourlyRate] = useState(initial.hourlyRate);
  const [afterHoursSurcharge, setAfterHoursSurcharge] = useState(initial.afterHoursSurcharge);
  const [freeEstimates, setFreeEstimates] = useState(initial.freeEstimates);
  const [plan, setPlan] = useState(initial.plan);
  const [stripeCustomerId, setStripeCustomerId] = useState(initial.stripeCustomerId);

  function fillFromJson() {
    setJsonError(null);
    try {
      const parsed = JSON.parse(jsonInput);

      if (parsed.businessName)        setBusinessName(parsed.businessName);
      if (parsed.ownerName)           setOwnerName(parsed.ownerName);
      if (parsed.email)               setEmail(parsed.email);
      if (parsed.phone !== undefined) setPhone(parsed.phone ?? "");
      if (parsed.address !== undefined) setAddress(parsed.address ?? "");
      if (parsed.city !== undefined)  setCity(parsed.city ?? "");
      if (parsed.state !== undefined) setState(parsed.state ?? "");
      if (parsed.timezone)            setTimezone(parsed.timezone);
      if (parsed.serviceArea !== undefined) setServiceArea(parsed.serviceArea ?? "");
      if (parsed.emergencyDefinition) setEmergencyDefinition(parsed.emergencyDefinition);
      if (parsed.businessHours)       setBusinessHours(parsed.businessHours);
      if (Array.isArray(parsed.servicesOffered)) setServices(parsed.servicesOffered);
      if (parsed.pricing) {
        if (parsed.pricing.serviceCallFee !== undefined)      setServiceCallFee(parsed.pricing.serviceCallFee ?? "");
        if (parsed.pricing.hourlyRate !== undefined)          setHourlyRate(parsed.pricing.hourlyRate ?? "");
        if (parsed.pricing.afterHoursSurcharge !== undefined) setAfterHoursSurcharge(parsed.pricing.afterHoursSurcharge ?? "");
        if (parsed.pricing.freeEstimates !== undefined)       setFreeEstimates(Boolean(parsed.pricing.freeEstimates));
      }
      if (parsed.plan)               setPlan(parsed.plan);
      if (parsed.stripeCustomerId !== undefined) setStripeCustomerId(parsed.stripeCustomerId ?? "");

      setJsonPanelOpen(false);
      setJsonInput("");
    } catch {
      setJsonError("Invalid JSON — check the format and try again.");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!businessName || !ownerName || !email || !emergencyDefinition) {
      setError("Please fill in all required fields.");
      return;
    }

    setIsSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const res = await fetch(`/api/admin/customers/${customerId}`, {
        method: "PATCH",
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
          emergencyDefinition,
          businessHours,
          servicesOffered: services,
          pricing: { serviceCallFee, hourlyRate, afterHoursSurcharge, freeEstimates },
          plan,
          stripeCustomerId: stripeCustomerId || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Failed to save changes.");
        return;
      }

      setSuccess(true);
      setTimeout(() => router.push(`/admin/customers/${customerId}`), 1200);
    } catch {
      setError("Unexpected error. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* JSON paste panel */}
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

      {error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-md border border-green-300 bg-green-50 px-4 py-3 text-sm text-green-700 dark:bg-green-950/30 dark:text-green-400">
          Changes saved — redirecting...
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Business info</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
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
            <Label htmlFor="state">State</Label>
            <Input
              id="state"
              value={state}
              onChange={(e) => setState(e.target.value)}
              placeholder="TX"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="timezone">Timezone</Label>
            <Select value={timezone} onValueChange={setTimezone}>
              <SelectTrigger id="timezone">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {US_TIMEZONES.map((tz) => (
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
              placeholder="Greater Austin, TX"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Agent config</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-1.5">
            <Label htmlFor="emergency">Emergency definition *</Label>
            <Textarea
              id="emergency"
              value={emergencyDefinition}
              onChange={(e) => setEmergencyDefinition(e.target.value)}
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
            <ServicesInput value={services} onChange={setServices} />
          </div>

          <Separator />

          <div className="space-y-3">
            <Label>Pricing</Label>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="serviceCallFee" className="text-sm text-muted-foreground">
                  Service call fee
                </Label>
                <Input
                  id="serviceCallFee"
                  value={serviceCallFee}
                  onChange={(e) => setServiceCallFee(e.target.value)}
                  placeholder="$95"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="hourlyRate" className="text-sm text-muted-foreground">
                  Hourly rate
                </Label>
                <Input
                  id="hourlyRate"
                  value={hourlyRate}
                  onChange={(e) => setHourlyRate(e.target.value)}
                  placeholder="$125/hr"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="afterHours" className="text-sm text-muted-foreground">
                  After-hours surcharge
                </Label>
                <Input
                  id="afterHours"
                  value={afterHoursSurcharge}
                  onChange={(e) => setAfterHoursSurcharge(e.target.value)}
                  placeholder="$75"
                />
              </div>
              <div className="flex items-center gap-2 pt-5">
                <Input
                  type="checkbox"
                  id="freeEstimates"
                  checked={freeEstimates}
                  onChange={(e) => setFreeEstimates(e.target.checked)}
                  className="h-4 w-4 rounded border-border"
                />
                <Label htmlFor="freeEstimates" className="text-sm">
                  Free estimates
                </Label>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

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

      <div className="flex items-center justify-end gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push(`/admin/customers/${customerId}`)}
        >
          Cancel
        </Button>
        <Button type="submit" size="lg" className="min-w-40" disabled={isSaving}>
          {isSaving ? "Saving..." : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
