/**
 * Card Info Section - Displays credit card information prominently
 */
import { CreditCard } from "lucide-react";
import { CardType } from "@/lib/card-validation";

interface CardInfoSectionProps {
  cardLastFour: string | null;
  cardType: string | null;
  cardHolderName: string | null;
  cardExpiry?: string | null;
}

const CardTypeIcon = ({ type }: { type: CardType }) => {
  if (type === "visa") {
    return (
      <div className="flex items-center justify-center w-10 h-6 bg-blue-900 rounded text-white text-[10px] font-bold tracking-wide">
        VISA
      </div>
    );
  }
  
  if (type === "mastercard") {
    return (
      <div className="flex items-center">
        <div className="w-5 h-5 bg-red-600 rounded-full" />
        <div className="w-5 h-5 bg-amber-500 rounded-full -ml-2.5" />
      </div>
    );
  }
  
  if (type === "amex") {
    return (
      <div className="flex items-center justify-center w-10 h-6 bg-blue-600 rounded text-white text-[10px] font-bold">
        AMEX
      </div>
    );
  }
  
  if (type === "discover") {
    return (
      <div className="flex items-center justify-center w-10 h-6 bg-gradient-to-r from-orange-500 to-amber-500 rounded text-white text-[10px] font-bold">
        DISC
      </div>
    );
  }
  
  return <CreditCard className="w-5 h-5 text-muted-foreground" />;
};

export function CardInfoSection({ cardLastFour, cardType, cardHolderName, cardExpiry }: CardInfoSectionProps) {
  if (!cardLastFour) {
    return (
      <div className="p-3 bg-muted/50 rounded-lg border border-dashed border-muted-foreground/30">
        <div className="flex items-center gap-2 text-muted-foreground">
          <CreditCard className="h-4 w-4" />
          <span className="text-xs">No card on file</span>
        </div>
      </div>
    );
  }
  
  return (
    <div className="p-4 bg-gradient-to-br from-slate-800 to-slate-900 dark:from-slate-700 dark:to-slate-800 rounded-xl border shadow-lg text-white min-w-0">
      <div className="flex items-center justify-between mb-4">
        <span className="text-[10px] uppercase tracking-wider text-slate-300">Card on File</span>
        <CardTypeIcon type={(cardType as CardType) || "unknown"} />
      </div>
      
      {/* Full card number display (masked except last 4) */}
      <div className="mb-3">
        <div className="font-mono text-lg sm:text-xl tracking-[0.15em] flex items-center flex-wrap gap-x-3">
          <span className="text-slate-300 flex gap-1">
            <span className="w-2 h-2 bg-slate-400 rounded-full"></span>
            <span className="w-2 h-2 bg-slate-400 rounded-full"></span>
            <span className="w-2 h-2 bg-slate-400 rounded-full"></span>
            <span className="w-2 h-2 bg-slate-400 rounded-full"></span>
          </span>
          <span className="text-slate-300 flex gap-1">
            <span className="w-2 h-2 bg-slate-400 rounded-full"></span>
            <span className="w-2 h-2 bg-slate-400 rounded-full"></span>
            <span className="w-2 h-2 bg-slate-400 rounded-full"></span>
            <span className="w-2 h-2 bg-slate-400 rounded-full"></span>
          </span>
          <span className="text-slate-300 flex gap-1">
            <span className="w-2 h-2 bg-slate-400 rounded-full"></span>
            <span className="w-2 h-2 bg-slate-400 rounded-full"></span>
            <span className="w-2 h-2 bg-slate-400 rounded-full"></span>
            <span className="w-2 h-2 bg-slate-400 rounded-full"></span>
          </span>
          <span className="text-white font-semibold">{cardLastFour}</span>
        </div>
      </div>
      
      {/* Expiry and Name Row */}
      <div className="flex items-end justify-between gap-4">
        <div className="min-w-0 flex-1">
          {cardHolderName && (
            <div className="text-xs text-slate-300 uppercase tracking-wide break-words">
              {cardHolderName}
            </div>
          )}
        </div>
        {cardExpiry && (
          <div className="text-right flex-shrink-0">
            <div className="text-[10px] uppercase text-slate-400 mb-0.5">Expires</div>
            <div className="font-mono text-sm font-medium">{cardExpiry}</div>
          </div>
        )}
      </div>
    </div>
  );
}
