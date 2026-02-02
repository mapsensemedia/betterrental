/**
 * CreditCardInput - Credit card form with real-time type detection and validation
 */
import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { CreditCard, Lock, AlertCircle } from "lucide-react";
import {
  detectCardType,
  formatCardNumber,
  formatExpiryDate,
  validateCard,
  CARD_TYPES,
  CardType,
} from "@/lib/card-validation";

interface CreditCardInputProps {
  cardNumber: string;
  cardName: string;
  expiryDate: string;
  cvv: string;
  onCardNumberChange: (value: string) => void;
  onCardNameChange: (value: string) => void;
  onExpiryDateChange: (value: string) => void;
  onCVVChange: (value: string) => void;
  errors?: Record<string, string>;
  showValidation?: boolean;
  className?: string;
}

const CardTypeIcon = ({ type }: { type: CardType }) => {
  const info = CARD_TYPES[type];
  
  if (type === "visa") {
    return (
      <div className="flex items-center gap-1 px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 rounded text-xs font-bold text-blue-700 dark:text-blue-300">
        VISA
      </div>
    );
  }
  
  if (type === "mastercard") {
    return (
      <div className="flex items-center gap-1">
        <div className="w-4 h-4 bg-red-500 rounded-full -mr-2" />
        <div className="w-4 h-4 bg-amber-500 rounded-full opacity-80" />
      </div>
    );
  }
  
  if (type === "amex") {
    return (
      <div className="flex items-center gap-1 px-2 py-0.5 bg-sky-100 dark:bg-sky-900/30 rounded text-xs font-bold text-sky-700 dark:text-sky-300">
        AMEX
      </div>
    );
  }
  
  if (type === "discover") {
    return (
      <div className="flex items-center gap-1 px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 rounded text-xs font-bold text-amber-700 dark:text-amber-300">
        DISC
      </div>
    );
  }
  
  return <CreditCard className="w-5 h-5 text-muted-foreground" />;
};

export function CreditCardInput({
  cardNumber,
  cardName,
  expiryDate,
  cvv,
  onCardNumberChange,
  onCardNameChange,
  onExpiryDateChange,
  onCVVChange,
  errors = {},
  showValidation = true,
  className,
}: CreditCardInputProps) {
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  
  const cardType = useMemo(() => detectCardType(cardNumber), [cardNumber]);
  const cardInfo = CARD_TYPES[cardType];
  
  const handleCardNumberChange = (value: string) => {
    const formatted = formatCardNumber(value, cardType);
    const maxLength = cardType === "amex" ? 17 : 19; // With spaces
    onCardNumberChange(formatted.slice(0, maxLength));
  };
  
  const handleExpiryChange = (value: string) => {
    const formatted = formatExpiryDate(value);
    onExpiryDateChange(formatted.slice(0, 5));
  };
  
  const handleCVVChange = (value: string) => {
    const cleaned = value.replace(/\D/g, "");
    onCVVChange(cleaned.slice(0, cardInfo.cvvLength));
  };
  
  const showError = (field: string) => 
    showValidation && touched[field] && errors[field];

  return (
    <div className={cn("space-y-4", className)}>
      {/* Card Number */}
      <div className="space-y-2">
        <Label htmlFor="cardNumber" className="flex items-center gap-2">
          Card Number *
        </Label>
        <div className="relative">
          <Input
            id="cardNumber"
            type="text"
            inputMode="numeric"
            placeholder="1234 5678 9012 3456"
            value={cardNumber}
            onChange={(e) => handleCardNumberChange(e.target.value)}
            onBlur={() => setTouched({ ...touched, number: true })}
            className={cn(
              "pl-4 pr-20 font-mono text-lg tracking-wider",
              showError("number") && "border-destructive focus-visible:ring-destructive"
            )}
            autoComplete="cc-number"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
            <CardTypeIcon type={cardType} />
          </div>
        </div>
        {showError("number") && (
          <p className="text-xs text-destructive flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            {errors.number}
          </p>
        )}
      </div>
      
      {/* Cardholder Name */}
      <div className="space-y-2">
        <Label htmlFor="cardName">Cardholder Name *</Label>
        <Input
          id="cardName"
          type="text"
          placeholder="Name on card"
          value={cardName}
          onChange={(e) => onCardNameChange(e.target.value.toUpperCase())}
          onBlur={() => setTouched({ ...touched, name: true })}
          className={cn(
            "uppercase tracking-wide",
            showError("name") && "border-destructive focus-visible:ring-destructive"
          )}
          autoComplete="cc-name"
        />
        {showError("name") && (
          <p className="text-xs text-destructive flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            {errors.name}
          </p>
        )}
      </div>
      
      {/* Expiry and CVV Row */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="expiry">Expiry Date *</Label>
          <Input
            id="expiry"
            type="text"
            inputMode="numeric"
            placeholder="MM/YY"
            value={expiryDate}
            onChange={(e) => handleExpiryChange(e.target.value)}
            onBlur={() => setTouched({ ...touched, expiry: true })}
            className={cn(
              "font-mono",
              showError("expiry") && "border-destructive focus-visible:ring-destructive"
            )}
            autoComplete="cc-exp"
          />
          {showError("expiry") && (
            <p className="text-xs text-destructive flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              {errors.expiry}
            </p>
          )}
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="cvv" className="flex items-center gap-1">
            CVV *
            <Lock className="w-3 h-3 text-muted-foreground" />
          </Label>
          <Input
            id="cvv"
            type="password"
            inputMode="numeric"
            placeholder={cardType === "amex" ? "4 digits" : "3 digits"}
            value={cvv}
            onChange={(e) => handleCVVChange(e.target.value)}
            onBlur={() => setTouched({ ...touched, cvv: true })}
            className={cn(
              "font-mono",
              showError("cvv") && "border-destructive focus-visible:ring-destructive"
            )}
            autoComplete="cc-csc"
          />
          {showError("cvv") && (
            <p className="text-xs text-destructive flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              {errors.cvv}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Compact card display for summaries
 */
export function CreditCardDisplay({
  cardNumber,
  cardType,
  className,
}: {
  cardNumber: string;
  cardType?: CardType;
  className?: string;
}) {
  const type = cardType || detectCardType(cardNumber);
  const last4 = cardNumber.replace(/\s+/g, "").slice(-4);
  
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <CardTypeIcon type={type} />
      <span className="font-mono text-sm">
        •••• {last4}
      </span>
    </div>
  );
}
