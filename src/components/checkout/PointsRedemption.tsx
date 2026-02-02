/**
 * Points Redemption Component
 * Shows points balance and allows redemption at checkout
 */
import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Gift, Star, Sparkles, Check, X } from "lucide-react";
import { 
  useMembershipInfo, 
  usePointsSettings,
  calculatePointsDiscount,
} from "@/hooks/use-points";
import { cn } from "@/lib/utils";

interface PointsRedemptionProps {
  bookingTotal: number;
  onApplyDiscount: (discount: number, pointsUsed: number) => void;
  appliedDiscount?: number;
  appliedPoints?: number;
}

export function PointsRedemption({
  bookingTotal,
  onApplyDiscount,
  appliedDiscount = 0,
  appliedPoints = 0,
}: PointsRedemptionProps) {
  const { data: membership, isLoading: membershipLoading } = useMembershipInfo();
  const { data: settings, isLoading: settingsLoading } = usePointsSettings();
  
  const [pointsToUse, setPointsToUse] = useState(appliedPoints);
  const [isApplied, setIsApplied] = useState(appliedPoints > 0);

  // Calculate max usable points
  const maxUsablePoints = useMemo(() => {
    if (!membership || !settings) return 0;
    
    // Can't use more than balance
    const balanceLimit = membership.pointsBalance;
    
    // Can't exceed max discount percentage
    const maxDiscountAmount = (bookingTotal * settings.redeemRules.max_percent_of_total) / 100;
    const pointsForMaxDiscount = Math.ceil(maxDiscountAmount * settings.redeemRate.points_per_dollar);
    
    return Math.min(balanceLimit, pointsForMaxDiscount);
  }, [membership, settings, bookingTotal]);

  // Calculate discount for current points selection
  const discountInfo = useMemo(() => {
    if (!settings || pointsToUse === 0) {
      return { discount: 0, actualPointsUsed: 0 };
    }
    return calculatePointsDiscount(pointsToUse, bookingTotal, settings);
  }, [pointsToUse, bookingTotal, settings]);

  // Can user redeem?
  const canRedeem = useMemo(() => {
    if (!membership || !settings) return false;
    if (membership.status !== "active") return false;
    if (membership.pointsBalance < settings.redeemRules.min_points) return false;
    return true;
  }, [membership, settings]);

  const handleApply = () => {
    if (pointsToUse > 0 && discountInfo.discount > 0) {
      onApplyDiscount(discountInfo.discount, discountInfo.actualPointsUsed);
      setIsApplied(true);
    }
  };

  const handleRemove = () => {
    setPointsToUse(0);
    onApplyDiscount(0, 0);
    setIsApplied(false);
  };

  // Don't show if not logged in or loading
  if (membershipLoading || settingsLoading) {
    return null;
  }

  // Don't show if no membership or no points
  if (!membership || membership.pointsBalance === 0) {
    return null;
  }

  // Check minimum points requirement
  if (!canRedeem) {
    return (
      <Card className="p-4 bg-muted/30 border-dashed">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
            <Star className="w-5 h-5 text-muted-foreground" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium">Loyalty Points</p>
            <p className="text-xs text-muted-foreground">
              You have <span className="font-semibold">{membership.pointsBalance}</span> points.
              {settings && membership.pointsBalance < settings.redeemRules.min_points && (
                <> Need {settings.redeemRules.min_points - membership.pointsBalance} more to redeem.</>
              )}
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-5 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <Gift className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">Use Your Points</h3>
            <p className="text-xs text-muted-foreground">
              {membership.pointsBalance.toLocaleString()} points available
            </p>
          </div>
        </div>
        <Badge variant="outline" className="bg-background">
          <Sparkles className="w-3 h-3 mr-1" />
          {membership.tier}
        </Badge>
      </div>

      {isApplied ? (
        // Applied state
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-accent border border-border rounded-lg">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">
                {appliedPoints.toLocaleString()} points applied
              </span>
            </div>
            <span className="font-semibold text-primary">
              -CA${appliedDiscount.toFixed(2)}
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRemove}
            className="text-muted-foreground"
          >
            <X className="w-4 h-4 mr-1" />
            Remove points discount
          </Button>
        </div>
      ) : (
        // Selection state
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-sm">Points to redeem</Label>
              <span className="text-sm font-medium">
                {pointsToUse.toLocaleString()} pts = CA${discountInfo.discount.toFixed(2)} off
              </span>
            </div>
            <Slider
              value={[pointsToUse]}
              onValueChange={([value]) => setPointsToUse(value)}
              max={maxUsablePoints}
              min={0}
              step={settings?.redeemRules.min_points || 100}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>0</span>
              <span>{maxUsablePoints.toLocaleString()} max</span>
            </div>
          </div>

          <Separator />

          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Discount</span>
            <span className={cn(
              "font-semibold",
              discountInfo.discount > 0 && "text-primary"
            )}>
              {discountInfo.discount > 0 
                ? `-CA$${discountInfo.discount.toFixed(2)}`
                : "Select points to redeem"
              }
            </span>
          </div>

          {settings && (
            <p className="text-xs text-muted-foreground">
              Max {settings.redeemRules.max_percent_of_total}% of total can be paid with points.
              {settings.redeemRate.points_per_dollar} points = CA$1.00
            </p>
          )}

          <Button
            onClick={handleApply}
            disabled={pointsToUse === 0 || discountInfo.discount === 0}
            className="w-full"
          >
            <Gift className="w-4 h-4 mr-2" />
            Apply {pointsToUse.toLocaleString()} Points
          </Button>
        </div>
      )}
    </Card>
  );
}
