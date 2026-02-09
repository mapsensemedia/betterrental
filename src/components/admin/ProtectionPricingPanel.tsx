/**
 * ProtectionPricingPanel — Admin panel for editing protection package pricing.
 * Reads from and writes to system_settings via the protection settings hook.
 */
import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Shield, Save, Loader2, Star } from "lucide-react";
import {
  useProtectionPackages,
  useUpdateProtectionSettings,
} from "@/hooks/use-protection-settings";

interface PackageFormState {
  rate: string;
  originalRate: string;
  discount: string;
  deductible: string;
}

export function ProtectionPricingPanel() {
  const { settings, isLoading } = useProtectionPackages();
  const updateSettings = useUpdateProtectionSettings();

  const [basicForm, setBasicForm] = useState<PackageFormState>({
    rate: "",
    originalRate: "",
    discount: "",
    deductible: "",
  });
  const [smartForm, setSmartForm] = useState<PackageFormState>({
    rate: "",
    originalRate: "",
    discount: "",
    deductible: "",
  });
  const [premiumForm, setPremiumForm] = useState<PackageFormState>({
    rate: "",
    originalRate: "",
    discount: "",
    deductible: "",
  });
  const [dirty, setDirty] = useState(false);

  // Sync form when settings load
  useEffect(() => {
    if (settings && !dirty) {
      setBasicForm({
        rate: settings.protection_basic_rate,
        originalRate: "",
        discount: "",
        deductible: settings.protection_basic_deductible,
      });
      setSmartForm({
        rate: settings.protection_smart_rate,
        originalRate: settings.protection_smart_original_rate,
        discount: settings.protection_smart_discount,
        deductible: settings.protection_smart_deductible,
      });
      setPremiumForm({
        rate: settings.protection_premium_rate,
        originalRate: settings.protection_premium_original_rate,
        discount: settings.protection_premium_discount,
        deductible: settings.protection_premium_deductible,
      });
    }
  }, [settings, dirty]);

  const handleSave = async () => {
    // Validate rates are not empty
    const basicRate = parseFloat(basicForm.rate);
    const smartRate = parseFloat(smartForm.rate);
    const premiumRate = parseFloat(premiumForm.rate);

    if (isNaN(basicRate) || basicRate <= 0) {
      toast.error("Basic Protection daily rate is required");
      return;
    }
    if (isNaN(smartRate) || smartRate <= 0) {
      toast.error("Smart Protection daily rate is required");
      return;
    }
    if (isNaN(premiumRate) || premiumRate <= 0) {
      toast.error("All Inclusive Protection daily rate is required");
      return;
    }

    // Only save originalRate/discount if there's an actual discount (originalRate > rate)
    const smartOriginal = parseFloat(smartForm.originalRate);
    const premiumOriginal = parseFloat(premiumForm.originalRate);
    const hasSmartDiscount = !isNaN(smartOriginal) && smartOriginal > smartRate;
    const hasPremiumDiscount = !isNaN(premiumOriginal) && premiumOriginal > premiumRate;

    await updateSettings.mutateAsync({
      protection_basic_rate: basicRate.toFixed(2),
      protection_basic_deductible: basicForm.deductible,
      protection_smart_rate: smartRate.toFixed(2),
      protection_smart_original_rate: hasSmartDiscount ? smartOriginal.toFixed(2) : "",
      protection_smart_discount: hasSmartDiscount ? smartForm.discount : "",
      protection_smart_deductible: smartForm.deductible,
      protection_premium_rate: premiumRate.toFixed(2),
      protection_premium_original_rate: hasPremiumDiscount ? premiumOriginal.toFixed(2) : "",
      protection_premium_discount: hasPremiumDiscount ? premiumForm.discount : "",
      protection_premium_deductible: premiumForm.deductible,
    });
    setDirty(false);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
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
              <Shield className="w-4 h-4" />
              Protection Package Pricing
            </CardTitle>
            <CardDescription>
              Update daily rates and deductibles — changes apply instantly
            </CardDescription>
          </div>
          {dirty && (
            <Button
              size="sm"
              className="gap-1"
              onClick={handleSave}
              disabled={updateSettings.isPending}
            >
              {updateSettings.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Save Changes
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Basic */}
        <PackageRow
          name="Basic Protection"
          rating={1}
          form={basicForm}
          showOriginalRate={false}
          showDiscount={false}
          onChange={(f) => {
            setBasicForm(f);
            setDirty(true);
          }}
        />

        <Separator />

        {/* Smart */}
        <PackageRow
          name="Smart Protection"
          rating={2}
          recommended
          form={smartForm}
          showOriginalRate
          showDiscount
          onChange={(f) => {
            setSmartForm(f);
            setDirty(true);
          }}
        />

        <Separator />

        {/* Premium */}
        <PackageRow
          name="All Inclusive Protection"
          rating={3}
          form={premiumForm}
          showOriginalRate
          showDiscount
          onChange={(f) => {
            setPremiumForm(f);
            setDirty(true);
          }}
        />
      </CardContent>
    </Card>
  );
}

/* ─── Sub-component: single package row ─── */
interface PackageRowProps {
  name: string;
  rating: number;
  recommended?: boolean;
  form: PackageFormState;
  showOriginalRate: boolean;
  showDiscount: boolean;
  onChange: (form: PackageFormState) => void;
}

function PackageRow({
  name,
  rating,
  recommended,
  form,
  showOriginalRate,
  showDiscount,
  onChange,
}: PackageRowProps) {
  const update = (field: keyof PackageFormState, value: string) =>
    onChange({ ...form, [field]: value });

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="flex gap-0.5">
          {[...Array(3)].map((_, i) => (
            <Star
              key={i}
              className={`w-3.5 h-3.5 ${
                i < rating
                  ? "text-amber-500 fill-amber-500"
                  : "text-muted-foreground/30"
              }`}
            />
          ))}
        </div>
        <span className="text-sm font-medium">{name}</span>
        {recommended && (
          <Badge variant="secondary" className="text-[10px] h-5">
            Recommended
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Daily Rate ($)</Label>
          <Input
            type="number"
            min="0"
            step="0.01"
            value={form.rate}
            onChange={(e) => update("rate", e.target.value)}
            className="h-9"
          />
        </div>

        {showOriginalRate && (
          <div className="space-y-1">
            <Label className="text-xs">Original Rate ($)</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={form.originalRate}
              onChange={(e) => update("originalRate", e.target.value)}
              className="h-9"
            />
          </div>
        )}

        {showDiscount && (
          <div className="space-y-1">
            <Label className="text-xs">Discount Label</Label>
            <Input
              value={form.discount}
              onChange={(e) => update("discount", e.target.value)}
              placeholder="e.g. 23% online discount"
              className="h-9"
            />
          </div>
        )}

        <div className="space-y-1">
          <Label className="text-xs">Deductible Text</Label>
          <Input
            value={form.deductible}
            onChange={(e) => update("deductible", e.target.value)}
            placeholder="e.g. Up to $800.00"
            className="h-9"
          />
        </div>
      </div>
    </div>
  );
}
