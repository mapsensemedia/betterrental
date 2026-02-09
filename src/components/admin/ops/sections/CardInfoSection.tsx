/**
 * Card Info Section - Displays credit card information with password-protected full reveal
 */
import { useState } from "react";
import { CreditCard, Eye, EyeOff, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CardType } from "@/lib/card-validation";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
  const [showDetails, setShowDetails] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [verifying, setVerifying] = useState(false);

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

  const handleRevealClick = () => {
    if (showDetails) {
      setShowDetails(false);
      return;
    }
    setShowPasswordPrompt(true);
    setPasswordInput("");
  };

  const handleVerifyPassword = async () => {
    setVerifying(true);
    try {
      const { data } = await supabase
        .from("system_settings" as any)
        .select("value")
        .eq("key", "card_view_password")
        .maybeSingle();
      
      const storedPassword = (data as any)?.value || "admin123";
      
      if (passwordInput === storedPassword) {
        setShowDetails(true);
        setShowPasswordPrompt(false);
        setPasswordInput("");
        // Auto-hide after 30 seconds
        setTimeout(() => setShowDetails(false), 30000);
      } else {
        toast.error("Incorrect password");
      }
    } catch {
      toast.error("Failed to verify password");
    } finally {
      setVerifying(false);
    }
  };
  
  return (
    <div className="space-y-2">
      <div className="p-4 bg-gradient-to-br from-slate-800 to-slate-900 dark:from-slate-700 dark:to-slate-800 rounded-xl border shadow-lg text-white min-w-0">
        <div className="flex items-center justify-between mb-4">
          <span className="text-[10px] uppercase tracking-wider text-slate-300">Card on File</span>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 text-slate-300 hover:text-white hover:bg-slate-700"
              onClick={handleRevealClick}
              title={showDetails ? "Hide details" : "Show full details"}
            >
              {showDetails ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </Button>
            <CardTypeIcon type={(cardType as CardType) || "unknown"} />
          </div>
        </div>
        
        {/* Card number display */}
        <div className="mb-3">
          <div className="font-mono text-xl sm:text-2xl tracking-[0.2em] font-semibold">
            {showDetails ? (
              <>
                <span className="text-slate-400">•••• •••• ••••</span> {cardLastFour}
              </>
            ) : (
              <>
                <span className="text-slate-500">••••</span> {cardLastFour}
              </>
            )}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            {showDetails ? "Full card reference (last 4 only stored)" : "Last 4 digits"}
          </div>
        </div>
        
        {/* Expiry and Name Row */}
        <div className="flex items-end justify-between gap-4">
          <div className="min-w-0 flex-1">
            {cardHolderName && (
              <div className="text-xs text-slate-300 uppercase tracking-wide break-words">
                {showDetails ? cardHolderName : "•••• ••••"}
              </div>
            )}
          </div>
          {cardExpiry && showDetails && (
            <div className="text-right flex-shrink-0">
              <div className="text-[10px] uppercase text-slate-400 mb-0.5">Expires</div>
              <div className="font-mono text-sm font-medium">{cardExpiry}</div>
            </div>
          )}
        </div>
      </div>

      {/* Password prompt */}
      {showPasswordPrompt && (
        <div className="flex items-center gap-2 p-2 bg-muted rounded-lg border">
          <Lock className="w-4 h-4 text-muted-foreground shrink-0" />
          <Input
            type="password"
            placeholder="Enter admin password"
            value={passwordInput}
            onChange={(e) => setPasswordInput(e.target.value)}
            className="h-8 text-xs"
            onKeyDown={(e) => e.key === "Enter" && handleVerifyPassword()}
            autoFocus
          />
          <Button
            size="sm"
            className="h-8 text-xs shrink-0"
            onClick={handleVerifyPassword}
            disabled={!passwordInput || verifying}
          >
            {verifying ? "..." : "Verify"}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs shrink-0"
            onClick={() => { setShowPasswordPrompt(false); setPasswordInput(""); }}
          >
            Cancel
          </Button>
        </div>
      )}
    </div>
  );
}
