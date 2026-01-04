import { cn } from "@/lib/utils";

interface PriceWithDisclaimerProps {
  /** Price amount to display */
  amount: number;
  /** Optional suffix like "/day" */
  suffix?: string;
  /** Size variant */
  variant?: "card" | "detail" | "summary";
  /** Show the disclaimer text below the price */
  showDisclaimer?: boolean;
  /** Custom className for the container */
  className?: string;
  /** Dark mode variant (for dark cards) */
  isDark?: boolean;
}

const DISCLAIMER_TEXT = "Price does not include taxes and fees";

/**
 * Reusable price display component with asterisk and optional disclaimer.
 * Use `showDisclaimer={true}` on ONE instance per page/screen to avoid duplicates.
 */
export function PriceWithDisclaimer({
  amount,
  suffix = "/day",
  variant = "card",
  showDisclaimer = false,
  className,
  isDark = false,
}: PriceWithDisclaimerProps) {
  const formattedPrice = `$${amount.toLocaleString()}`;

  const sizeStyles = {
    card: {
      price: "text-xl font-bold",
      suffix: "text-sm",
      disclaimer: "text-[10px]",
    },
    detail: {
      price: "text-3xl font-bold",
      suffix: "text-lg font-normal",
      disclaimer: "text-xs",
    },
    summary: {
      price: "text-lg font-semibold",
      suffix: "text-sm",
      disclaimer: "text-[10px]",
    },
  };

  const styles = sizeStyles[variant];

  return (
    <div className={cn("flex flex-col", className)}>
      <div className="flex items-baseline">
        <span
          className={cn(
            styles.price,
            isDark ? "text-background" : "text-foreground"
          )}
        >
          {formattedPrice}
          <span className="text-destructive">*</span>
        </span>
        {suffix && (
          <span
            className={cn(
              styles.suffix,
              "ml-0.5",
              isDark ? "text-background/50" : "text-muted-foreground"
            )}
          >
            {suffix}
          </span>
        )}
      </div>
      {showDisclaimer && (
        <p
          className={cn(
            styles.disclaimer,
            "mt-1",
            isDark ? "text-background/40" : "text-muted-foreground"
          )}
        >
          *{DISCLAIMER_TEXT}
        </p>
      )}
    </div>
  );
}

/**
 * Standalone disclaimer line - use when you need the disclaimer separate from the price.
 */
export function PriceDisclaimer({
  className,
  variant = "card",
}: {
  className?: string;
  variant?: "card" | "detail" | "summary";
}) {
  const sizeStyles = {
    card: "text-[10px]",
    detail: "text-xs",
    summary: "text-[10px]",
  };

  return (
    <p className={cn(sizeStyles[variant], "text-muted-foreground", className)}>
      *{DISCLAIMER_TEXT}
    </p>
  );
}
