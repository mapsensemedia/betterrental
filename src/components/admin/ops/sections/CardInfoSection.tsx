/**
 * Card Info Section - Displays credit card information prominently
 */
import { CreditCard } from "lucide-react";
import { CardType } from "@/lib/card-validation";

interface CardInfoSectionProps {
  cardLastFour: string | null;
  cardType: string | null;
  cardHolderName: string | null;
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

export function CardInfoSection({ cardLastFour, cardType, cardHolderName }: CardInfoSectionProps) {
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
    <div className="p-3 bg-gradient-to-br from-muted to-muted/70 rounded-lg border shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Card on File</span>
        <CardTypeIcon type={(cardType as CardType) || "unknown"} />
      </div>
      
      <div className="flex items-center gap-1 mb-2">
        <span className="text-muted-foreground text-lg">••••</span>
        <span className="text-muted-foreground text-lg">••••</span>
        <span className="text-muted-foreground text-lg">••••</span>
        <span className="text-foreground font-mono text-lg tracking-wider font-semibold">{cardLastFour}</span>
      </div>
      
      {cardHolderName && (
        <div className="text-xs text-muted-foreground uppercase tracking-wide truncate">
          {cardHolderName}
        </div>
      )}
    </div>
  );
}
