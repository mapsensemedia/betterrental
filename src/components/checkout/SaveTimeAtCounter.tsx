/**
 * SaveTimeAtCounter - Opt-in card for providing additional pickup details
 * with a multi-step driver's license lookup flow
 */
import { useState, useEffect } from "react";
import { Clock, ArrowRight, Shield } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface SaveTimeAtCounterProps {
  saveTime: boolean;
  onSaveTimeChange: (saveTime: boolean) => void;
  pickupContactName: string;
  onPickupContactNameChange: (name: string) => void;
  pickupContactPhone: string;
  onPickupContactPhoneChange: (phone: string) => void;
  specialInstructions: string;
  onSpecialInstructionsChange: (instructions: string) => void;
  defaultName?: string;
}

const COUNTRIES = [
  "Canada",
  "United States",
  "United Kingdom",
  "Australia",
  "Germany",
  "France",
  "Other",
];

const PROVINCES_CA = [
  "Alberta",
  "British Columbia",
  "Manitoba",
  "New Brunswick",
  "Newfoundland and Labrador",
  "Nova Scotia",
  "Ontario",
  "Prince Edward Island",
  "Quebec",
  "Saskatchewan",
];

const STATES_US = [
  "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado",
  "Connecticut", "Delaware", "Florida", "Georgia", "Hawaii", "Idaho",
  "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky", "Louisiana",
  "Maine", "Maryland", "Massachusetts", "Michigan", "Minnesota",
  "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada",
  "New Hampshire", "New Jersey", "New Mexico", "New York",
  "North Carolina", "North Dakota", "Ohio", "Oklahoma", "Oregon",
  "Pennsylvania", "Rhode Island", "South Carolina", "South Dakota",
  "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington",
  "West Virginia", "Wisconsin", "Wyoming",
];

export function SaveTimeAtCounter({
  saveTime,
  onSaveTimeChange,
  pickupContactName,
  onPickupContactNameChange,
  pickupContactPhone,
  onPickupContactPhoneChange,
  specialInstructions,
  onSpecialInstructionsChange,
  defaultName,
}: SaveTimeAtCounterProps) {
  const [step, setStep] = useState(1);
  const [country, setCountry] = useState("Canada");
  const [authority, setAuthority] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");

  // Prefill name if empty and default provided
  useEffect(() => {
    if (!pickupContactName && defaultName) {
      onPickupContactNameChange(defaultName);
    }
  }, [defaultName]);

  // Reset step when toggling saveTime
  useEffect(() => {
    if (!saveTime) {
      setStep(1);
    }
  }, [saveTime]);

  const getAuthorities = () => {
    if (country === "Canada") return PROVINCES_CA;
    if (country === "United States") return STATES_US;
    return [];
  };

  const canProceedToStep2 = country && authority && licenseNumber.trim();

  return (
    <Card>
      <CardContent className="pt-6 space-y-6">
        {/* Header */}
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-muted">
            <Clock className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-lg">Save Time at the Counter</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Provide more rental details and <strong>spend less time at the counter</strong>.
            </p>
          </div>
        </div>

        {/* Benefits */}
        <ul className="space-y-2 text-sm text-muted-foreground pl-1">
          <li className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
            You won't be charged right now
          </li>
          <li className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
            You can cancel at any time
          </li>
          <li className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
            It should only take a couple of minutes
          </li>
        </ul>

        {/* Radio Options */}
        <div className="space-y-3">
          <p className="font-medium text-sm">Would you like to save time at the counter?</p>
          <RadioGroup
            value={saveTime ? "yes" : "no"}
            onValueChange={(value) => onSaveTimeChange(value === "yes")}
            className="space-y-2"
          >
            <div className="flex items-center space-x-3">
              <RadioGroupItem value="yes" id="save-time-yes" />
              <Label htmlFor="save-time-yes" className="cursor-pointer font-normal">
                Yes, I'd like to save time
              </Label>
            </div>
            <div className="flex items-center space-x-3">
              <RadioGroupItem value="no" id="save-time-no" />
              <Label htmlFor="save-time-no" className="cursor-pointer font-normal">
                No, I'll provide my information at the counter
              </Label>
            </div>
          </RadioGroup>
        </div>

        {/* Multi-step form (shown when "Yes" selected) */}
        {saveTime && (
          <div className="space-y-5 pt-4 border-t animate-in fade-in slide-in-from-top-2 duration-200">
            {/* Step Indicator */}
            <div className="flex items-center gap-2 text-sm border-b pb-4">
              <div className={cn(
                "flex items-center gap-2",
                step === 1 ? "text-foreground font-medium" : "text-muted-foreground"
              )}>
                <span className={cn(
                  "flex items-center justify-center w-5 h-5 rounded-full text-xs border",
                  step === 1 ? "border-primary text-primary" : "border-muted-foreground"
                )}>
                  1
                </span>
                <span className="hidden sm:inline">LOOKUP YOUR DETAILS</span>
                <span className="sm:hidden">LOOKUP</span>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
              <div className={cn(
                "flex items-center gap-2",
                step === 2 ? "text-foreground font-medium" : "text-muted-foreground"
              )}>
                <span className={cn(
                  "flex items-center justify-center w-5 h-5 rounded-full text-xs border",
                  step === 2 ? "border-primary text-primary" : "border-muted-foreground"
                )}>
                  2
                </span>
                <span className="hidden sm:inline">VERIFY / COMPLETE YOUR DETAILS</span>
                <span className="sm:hidden">VERIFY</span>
              </div>
            </div>

            {step === 1 && (
              <div className="space-y-5">
                <h4 className="font-medium text-sm uppercase tracking-wide text-muted-foreground">
                  Driver's License
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="issuing-country">
                      Issuing Country<span className="text-destructive">*</span>
                    </Label>
                    <Select value={country} onValueChange={(val) => {
                      setCountry(val);
                      setAuthority("");
                    }}>
                      <SelectTrigger id="issuing-country">
                        <SelectValue placeholder="Select country" />
                      </SelectTrigger>
                      <SelectContent>
                        {COUNTRIES.map((c) => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="issuing-authority">
                      Issuing Authority<span className="text-destructive">*</span>
                    </Label>
                    <Select 
                      value={authority} 
                      onValueChange={setAuthority}
                      disabled={!getAuthorities().length}
                    >
                      <SelectTrigger id="issuing-authority">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        {getAuthorities().map((a) => (
                          <SelectItem key={a} value={a}>{a}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="license-number">
                    Driver's License Number<span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="license-number"
                    value={licenseNumber}
                    onChange={(e) => setLicenseNumber(e.target.value)}
                    placeholder="Enter your license number"
                  />
                </div>

                {/* Security note + Next button */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-2 border-t">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Shield className="h-4 w-4" />
                    <span>
                      Your information will be submitted over a <strong>secure connection</strong>.
                    </span>
                  </div>
                  <Button
                    type="button"
                    onClick={() => setStep(2)}
                    disabled={!canProceedToStep2}
                    className="w-full sm:w-auto"
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-5">
                <div className="p-3 bg-muted/50 rounded-lg text-sm">
                  <p className="font-medium">License Details</p>
                  <p className="text-muted-foreground">
                    {country} • {authority} • {licenseNumber}
                  </p>
                  <button 
                    type="button"
                    onClick={() => setStep(1)} 
                    className="text-primary hover:underline text-sm mt-1"
                  >
                    Edit
                  </button>
                </div>

                <h4 className="font-medium text-sm uppercase tracking-wide text-muted-foreground">
                  Additional Details (Optional)
                </h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="pickup-contact-name">Preferred pickup person name</Label>
                    <Input
                      id="pickup-contact-name"
                      value={pickupContactName}
                      onChange={(e) => onPickupContactNameChange(e.target.value)}
                      placeholder="John Doe"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pickup-contact-phone">Extra contact phone</Label>
                    <Input
                      id="pickup-contact-phone"
                      value={pickupContactPhone}
                      onChange={(e) => onPickupContactPhoneChange(e.target.value)}
                      placeholder="+1 555-123-4567"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="special-instructions">Special instructions</Label>
                  <Textarea
                    id="special-instructions"
                    value={specialInstructions}
                    onChange={(e) => onSpecialInstructionsChange(e.target.value)}
                    placeholder="E.g., arriving early, need child seat installed, specific parking location..."
                    rows={3}
                  />
                </div>

                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Your details are saved securely. You can complete checkout now.
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
