/**
 * Credit Card Validation & Type Detection
 * Identifies card type and validates card numbers using Luhn algorithm
 */

export type CardType = "visa" | "mastercard" | "amex" | "discover" | "unknown";

export interface CardInfo {
  type: CardType;
  name: string;
  lengths: number[];
  cvvLength: number;
  icon: string;
  color: string;
}

export const CARD_TYPES: Record<CardType, CardInfo> = {
  visa: {
    type: "visa",
    name: "Visa",
    lengths: [13, 16, 19],
    cvvLength: 3,
    icon: "💳",
    color: "text-blue-600",
  },
  mastercard: {
    type: "mastercard",
    name: "Mastercard",
    lengths: [16],
    cvvLength: 3,
    icon: "💳",
    color: "text-orange-600",
  },
  amex: {
    type: "amex",
    name: "American Express",
    lengths: [15],
    cvvLength: 4,
    icon: "💳",
    color: "text-sky-600",
  },
  discover: {
    type: "discover",
    name: "Discover",
    lengths: [16, 19],
    cvvLength: 3,
    icon: "💳",
    color: "text-amber-600",
  },
  unknown: {
    type: "unknown",
    name: "Credit Card",
    lengths: [16],
    cvvLength: 3,
    icon: "💳",
    color: "text-muted-foreground",
  },
};

/**
 * Detect card type from card number
 */
export function detectCardType(cardNumber: string): CardType {
  const cleaned = cardNumber.replace(/\s+/g, "");
  
  if (!cleaned) return "unknown";
  
  // Visa: starts with 4
  if (/^4/.test(cleaned)) return "visa";
  
  // Mastercard: 51-55, 2221-2720
  if (/^5[1-5]/.test(cleaned)) return "mastercard";
  if (/^2[2-7]/.test(cleaned)) return "mastercard";
  
  // Amex: 34 or 37
  if (/^3[47]/.test(cleaned)) return "amex";
  
  // Discover: 6011, 65, 644-649
  if (/^6011/.test(cleaned)) return "discover";
  if (/^65/.test(cleaned)) return "discover";
  if (/^64[4-9]/.test(cleaned)) return "discover";
  
  return "unknown";
}

/**
 * Luhn algorithm for card number validation
 */
export function luhnCheck(cardNumber: string): boolean {
  const cleaned = cardNumber.replace(/\s+/g, "");
  
  if (!/^\d+$/.test(cleaned)) return false;
  if (cleaned.length < 13 || cleaned.length > 19) return false;
  
  let sum = 0;
  let isEven = false;
  
  for (let i = cleaned.length - 1; i >= 0; i--) {
    let digit = parseInt(cleaned[i], 10);
    
    if (isEven) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    
    sum += digit;
    isEven = !isEven;
  }
  
  return sum % 10 === 0;
}

/**
 * Validate card number length for detected type
 */
export function validateCardLength(cardNumber: string): boolean {
  const cleaned = cardNumber.replace(/\s+/g, "");
  const type = detectCardType(cleaned);
  const info = CARD_TYPES[type];
  
  return info.lengths.includes(cleaned.length);
}

/**
 * Format card number with spaces
 */
export function formatCardNumber(value: string, cardType: CardType): string {
  const cleaned = value.replace(/\D/g, "");
  
  if (cardType === "amex") {
    // Amex: 4-6-5 format
    const match = cleaned.match(/^(\d{0,4})(\d{0,6})(\d{0,5})$/);
    if (match) {
      return [match[1], match[2], match[3]].filter(Boolean).join(" ");
    }
  }
  
  // Default: 4-4-4-4 format
  const groups = [];
  for (let i = 0; i < cleaned.length; i += 4) {
    groups.push(cleaned.slice(i, i + 4));
  }
  return groups.join(" ");
}

/**
 * Format expiry date as MM/YY
 */
export function formatExpiryDate(value: string): string {
  const cleaned = value.replace(/\D/g, "");
  
  if (cleaned.length === 0) return "";
  if (cleaned.length <= 2) return cleaned;
  
  return `${cleaned.slice(0, 2)}/${cleaned.slice(2, 4)}`;
}

/**
 * Validate expiry date (not expired)
 */
export function validateExpiryDate(value: string): { valid: boolean; error?: string } {
  const match = value.match(/^(\d{2})\/(\d{2})$/);
  
  if (!match) {
    return { valid: false, error: "Invalid format (MM/YY)" };
  }
  
  const month = parseInt(match[1], 10);
  const year = parseInt(`20${match[2]}`, 10);
  
  if (month < 1 || month > 12) {
    return { valid: false, error: "Invalid month" };
  }
  
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  
  if (year < currentYear || (year === currentYear && month < currentMonth)) {
    return { valid: false, error: "Card expired" };
  }
  
  return { valid: true };
}

/**
 * Validate CVV length
 */
export function validateCVV(cvv: string, cardType: CardType): boolean {
  const cleaned = cvv.replace(/\D/g, "");
  const expectedLength = CARD_TYPES[cardType]?.cvvLength || 3;
  return cleaned.length === expectedLength;
}

/**
 * Mask card number for display (show last 4 digits)
 */
export function maskCardNumber(cardNumber: string): string {
  const cleaned = cardNumber.replace(/\s+/g, "");
  if (cleaned.length < 4) return "••••";
  
  const last4 = cleaned.slice(-4);
  return `•••• •••• •••• ${last4}`;
}

/**
 * Complete card validation
 */
export function validateCard(card: {
  number: string;
  expiry: string;
  cvv: string;
  name: string;
}): { valid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  const cardType = detectCardType(card.number);
  
  // Validate card number
  if (!card.number.trim()) {
    errors.number = "Card number is required";
  } else if (!validateCardLength(card.number)) {
    errors.number = "Invalid card number length";
  } else if (!luhnCheck(card.number)) {
    errors.number = "Invalid card number";
  }
  
  // Validate expiry
  if (!card.expiry.trim()) {
    errors.expiry = "Expiry date is required";
  } else {
    const expiryResult = validateExpiryDate(card.expiry);
    if (!expiryResult.valid) {
      errors.expiry = expiryResult.error || "Invalid expiry";
    }
  }
  
  // Validate CVV
  if (!card.cvv.trim()) {
    errors.cvv = "CVV is required";
  } else if (!validateCVV(card.cvv, cardType)) {
    errors.cvv = `CVV must be ${CARD_TYPES[cardType].cvvLength} digits`;
  }
  
  // Validate name
  if (!card.name.trim()) {
    errors.name = "Cardholder name is required";
  } else if (card.name.trim().length < 2) {
    errors.name = "Name is too short";
  }
  
  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}
