/**
 * Points Settings Panel - Admin configuration for loyalty program
 */
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { 
  Star, 
  Gift, 
  ArrowRightLeft, 
  Clock, 
  Save,
  Calculator,
} from "lucide-react";
import { 
  usePointsSettings, 
  useUpdatePointsSettings,
  PointsSettings,
} from "@/hooks/use-points";
import { Skeleton } from "@/components/ui/skeleton";

export function PointsSettingsPanel() {
  const { data: settings, isLoading } = usePointsSettings();
  const updateSettings = useUpdatePointsSettings();
  
  const [localSettings, setLocalSettings] = useState<PointsSettings | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (settings) {
      setLocalSettings(settings);
    }
  }, [settings]);

  const handleChange = <K extends keyof PointsSettings>(
    key: K,
    value: PointsSettings[K]
  ) => {
    if (!localSettings) return;
    setLocalSettings({ ...localSettings, [key]: value });
    setHasChanges(true);
  };

  const handleSave = () => {
    if (!localSettings) return;
    updateSettings.mutate(localSettings, {
      onSuccess: () => setHasChanges(false),
    });
  };

  if (isLoading || !localSettings) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent className="space-y-6">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Star className="w-4 h-4" />
              Loyalty Points Settings
            </CardTitle>
            <CardDescription>
              Configure how customers earn and redeem points
            </CardDescription>
          </div>
          {hasChanges && (
            <Button onClick={handleSave} disabled={updateSettings.isPending} size="sm">
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Earning Settings */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Gift className="w-4 h-4 text-primary" />
            <h4 className="font-medium">Points Earning</h4>
          </div>
          
          <div className="grid gap-4 pl-6">
            <div className="space-y-2">
              <Label>Points earned per $1 spent</Label>
              <div className="flex items-center gap-3">
                <Input
                  type="number"
                  min={1}
                  max={100}
                  value={localSettings.earnRate.points_per_dollar}
                  onChange={(e) => handleChange("earnRate", { 
                    points_per_dollar: parseInt(e.target.value) || 1 
                  })}
                  className="w-24"
                />
                <span className="text-sm text-muted-foreground">
                  points per dollar
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Example: $100 booking = {100 * localSettings.earnRate.points_per_dollar} points
              </p>
            </div>

            <Separator />

            <div className="space-y-3">
              <Label>What counts towards points?</Label>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="text-sm">Include add-ons</span>
                  <p className="text-xs text-muted-foreground">
                    Add-on purchases count towards points
                  </p>
                </div>
                <Switch
                  checked={localSettings.earnBase.include_addons}
                  onCheckedChange={(checked) => handleChange("earnBase", {
                    ...localSettings.earnBase,
                    include_addons: checked,
                  })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="text-sm">Exclude taxes</span>
                  <p className="text-xs text-muted-foreground">
                    Taxes are not counted in points calculation
                  </p>
                </div>
                <Switch
                  checked={localSettings.earnBase.exclude_taxes}
                  onCheckedChange={(checked) => handleChange("earnBase", {
                    ...localSettings.earnBase,
                    exclude_taxes: checked,
                  })}
                />
              </div>
            </div>
          </div>
        </div>

        <Separator />

        {/* Redemption Settings */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <ArrowRightLeft className="w-4 h-4 text-primary" />
            <h4 className="font-medium">Points Redemption</h4>
          </div>

          <div className="grid gap-4 pl-6">
            <div className="space-y-2">
              <Label>Points required for $1 discount</Label>
              <div className="flex items-center gap-3">
                <Input
                  type="number"
                  min={1}
                  max={1000}
                  value={localSettings.redeemRate.points_per_dollar}
                  onChange={(e) => handleChange("redeemRate", {
                    points_per_dollar: parseInt(e.target.value) || 100,
                  })}
                  className="w-24"
                />
                <span className="text-sm text-muted-foreground">
                  points = $1.00
                </span>
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label>Minimum points to redeem</Label>
              <div className="flex items-center gap-3">
                <Input
                  type="number"
                  min={0}
                  max={10000}
                  step={50}
                  value={localSettings.redeemRules.min_points}
                  onChange={(e) => handleChange("redeemRules", {
                    ...localSettings.redeemRules,
                    min_points: parseInt(e.target.value) || 0,
                  })}
                  className="w-24"
                />
                <span className="text-sm text-muted-foreground">
                  minimum points
                </span>
              </div>
            </div>

            <div className="space-y-3">
              <Label>
                Maximum % of booking payable with points: {localSettings.redeemRules.max_percent_of_total}%
              </Label>
              <Slider
                value={[localSettings.redeemRules.max_percent_of_total]}
                onValueChange={([value]) => handleChange("redeemRules", {
                  ...localSettings.redeemRules,
                  max_percent_of_total: value,
                })}
                min={5}
                max={100}
                step={5}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>5%</span>
                <span>100%</span>
              </div>
            </div>
          </div>
        </div>

        <Separator />

        {/* Expiration Settings */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" />
            <h4 className="font-medium">Points Expiration</h4>
            <Badge variant="outline" className="text-xs">Optional</Badge>
          </div>

          <div className="grid gap-4 pl-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-sm">Enable expiration</span>
                <p className="text-xs text-muted-foreground">
                  Points will expire after a set period
                </p>
              </div>
              <Switch
                checked={localSettings.expiration.enabled}
                onCheckedChange={(checked) => handleChange("expiration", {
                  ...localSettings.expiration,
                  enabled: checked,
                })}
              />
            </div>

            {localSettings.expiration.enabled && (
              <div className="space-y-2">
                <Label>Expiration period</Label>
                <div className="flex items-center gap-3">
                  <Input
                    type="number"
                    min={1}
                    max={60}
                    value={localSettings.expiration.months}
                    onChange={(e) => handleChange("expiration", {
                      ...localSettings.expiration,
                      months: parseInt(e.target.value) || 12,
                    })}
                    className="w-24"
                  />
                  <span className="text-sm text-muted-foreground">
                    months
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Preview Box */}
        <div className="p-4 bg-muted/50 rounded-lg border">
          <div className="flex items-center gap-2 mb-3">
            <Calculator className="w-4 h-4" />
            <span className="text-sm font-medium">Quick Preview</span>
          </div>
          <div className="text-sm space-y-1 text-muted-foreground">
            <p>• $100 booking → <strong>{100 * localSettings.earnRate.points_per_dollar} points</strong> earned</p>
            <p>• {localSettings.redeemRate.points_per_dollar} points → <strong>$1.00</strong> discount</p>
            <p>• On a $200 booking, max <strong>${((200 * localSettings.redeemRules.max_percent_of_total) / 100).toFixed(2)}</strong> can be paid with points</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
