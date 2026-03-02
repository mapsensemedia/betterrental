/**
 * SavedCardsSelector - Shows saved payment profiles for authenticated users.
 */
import { useEffect, useState } from "react";
import { CreditCard, Plus, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface SavedCard {
  customerCode: string;
  cardType: string;
  lastFour: string;
  expiryMonth: string;
  expiryYear: string;
}

interface SavedCardsSelectorProps {
  onSelectCard: (customerCode: string | null) => void;
  selectedCard: string | null;
}

export function SavedCardsSelector({ onSelectCard, selectedCard }: SavedCardsSelectorProps) {
  const [cards, setCards] = useState<SavedCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchCards() {
      try {
        const { data, error } = await supabase.functions.invoke("wl-get-profile");
        if (error || data?.error || !data?.cards?.length) {
          setCards([]);
          return;
        }
        setCards(data.cards);
      } catch {
        setCards([]);
      } finally {
        setIsLoading(false);
      }
    }
    fetchCards();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-3 text-sm text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" />
        Checking saved cards...
      </div>
    );
  }

  if (cards.length === 0) return null;

  return (
    <div className="space-y-2 mb-4">
      <p className="text-sm font-medium">Saved payment methods</p>
      <div className="space-y-2">
        {cards.map((card) => (
          <button
            key={card.customerCode}
            type="button"
            onClick={() => onSelectCard(card.customerCode)}
            className={cn(
              "w-full flex items-center gap-3 p-3 rounded-lg border-2 text-left transition-all",
              selectedCard === card.customerCode
                ? "border-primary bg-primary/5"
                : "border-border hover:border-muted-foreground/50"
            )}
          >
            <CreditCard className="w-5 h-5 text-muted-foreground shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium capitalize">{card.cardType} •••• {card.lastFour}</p>
              <p className="text-xs text-muted-foreground">Expires {card.expiryMonth}/{card.expiryYear}</p>
            </div>
          </button>
        ))}
        <button
          type="button"
          onClick={() => onSelectCard(null)}
          className={cn(
            "w-full flex items-center gap-3 p-3 rounded-lg border-2 text-left transition-all",
            selectedCard === null
              ? "border-primary bg-primary/5"
              : "border-border hover:border-muted-foreground/50"
          )}
        >
          <Plus className="w-5 h-5 text-muted-foreground shrink-0" />
          <p className="text-sm font-medium">Add new card</p>
        </button>
      </div>
    </div>
  );
}
