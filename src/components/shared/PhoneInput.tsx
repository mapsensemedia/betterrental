import { useState } from "react";
import { Phone } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  required?: boolean;
  className?: string;
  label?: string;
}

export function PhoneInput({
  value,
  onChange,
  error,
  required = false,
  className,
  label = "Phone Number",
}: PhoneInputProps) {
  const [touched, setTouched] = useState(false);

  // Format phone for E.164 (basic)
  const formatPhone = (input: string): string => {
    // Remove all non-digit characters except +
    let cleaned = input.replace(/[^\d+]/g, "");
    
    // Ensure it starts with + if it has country code
    if (cleaned.length > 10 && !cleaned.startsWith("+")) {
      cleaned = "+" + cleaned;
    }
    
    return cleaned;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhone(e.target.value);
    onChange(formatted);
  };

  const isValid = value.length >= 10;
  const showError = touched && required && !isValid;

  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor="phone">
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </Label>
      <div className="relative">
        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          id="phone"
          type="tel"
          placeholder="+1 (555) 000-0000"
          value={value}
          onChange={handleChange}
          onBlur={() => setTouched(true)}
          className={cn("pl-10", showError && "border-destructive")}
          required={required}
        />
      </div>
      {showError && (
        <p className="text-sm text-destructive">
          {error || "Please enter a valid phone number"}
        </p>
      )}
      <p className="text-xs text-muted-foreground">
        We'll send booking confirmations via SMS
      </p>
    </div>
  );
}
