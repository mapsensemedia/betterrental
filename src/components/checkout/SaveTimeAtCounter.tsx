/**
 * SaveTimeAtCounter - Opt-in card for providing additional pickup details
 */
import { useState, useEffect } from "react";
import { Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
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
  // Prefill name if empty and default provided
  useEffect(() => {
    if (!pickupContactName && defaultName) {
      onPickupContactNameChange(defaultName);
    }
  }, [defaultName]);

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

        {/* Additional Fields (shown when "Yes" selected) */}
        {saveTime && (
          <div className="space-y-4 pt-2 border-t animate-in fade-in slide-in-from-top-2 duration-200">
            <p className="text-sm text-muted-foreground">
              Optional details to speed up your pickup:
            </p>
            
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
                <Label htmlFor="pickup-contact-phone">Extra contact phone (optional)</Label>
                <Input
                  id="pickup-contact-phone"
                  value={pickupContactPhone}
                  onChange={(e) => onPickupContactPhoneChange(e.target.value)}
                  placeholder="+1 555-123-4567"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="special-instructions">Special instructions (optional)</Label>
              <Textarea
                id="special-instructions"
                value={specialInstructions}
                onChange={(e) => onSpecialInstructionsChange(e.target.value)}
                placeholder="E.g., arriving early, need child seat installed, specific parking location..."
                rows={3}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
