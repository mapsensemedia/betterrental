/**
 * ProtectionPricingPanel — Admin panel for viewing protection package pricing
 * across all 3 vehicle groups. Group 1 rates are editable via system_settings;
 * Groups 2 & 3 are code-defined and shown read-only.
 */
import { useState, useEffect } from "react";
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
import { Shield, Save, Loader2, Star, Lock } from "lucide-react";
import {
  useProtectionPackages,
  useUpdateProtectionSettings,
} from "@/hooks/use-protection-settings";
import {
  GROUP_RATES,
  GROUP_LABELS,
  type ProtectionGroup,
} from "@/lib/protection-groups";

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
    const basicRate = parseFloat(basicForm.rate);
    const smartRate = parseFloat(smartForm.rate);
    const premiumRate = parseFloat(premiumForm.rate);

    const smartOriginal = parseFloat(smartForm.originalRate);
    const premiumOriginal = parseFloat(premiumForm.originalRate);
    const hasSmartDiscount = !isNaN(smartOriginal) && !isNaN(smartRate) && smartOriginal > smartRate;
    const hasPremiumDiscount = !isNaN(premiumOriginal) && !isNaN(premiumRate) && premiumOriginal > premiumRate;

    await updateSettings.mutateAsync({
      protection_basic_rate: !isNaN(basicRate) && basicRate > 0 ? basicRate.toFixed(2) : "",
      protection_basic_deductible: basicForm.deductible,
      protection_smart_rate: !isNaN(smartRate) && smartRate > 0 ? smartRate.toFixed(2) : "",
      protection_smart_original_rate: hasSmartDiscount ? smartOriginal.toFixed(2) : "",
      protection_smart_discount: hasSmartDiscount ? smartForm.discount : "",
      protection_smart_deductible: smartForm.deductible,
      protection_premium_rate: !isNaN(premiumRate) && premiumRate > 0 ? premiumRate.toFixed(2) : "",
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
              Pricing varies by vehicle group. Group 1 rates are editable; Groups 2 & 3 are code-defined.
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
      <CardContent className="space-y-6">
        {/* Group 1 — Editable */}
        <GroupSection
          group={1}
          editable
          basicForm={basicForm}
          smartForm={smartForm}
          premiumForm={premiumForm}
          onBasicChange={(f) => { setBasicForm(f); setDirty(true); }}
          onSmartChange={(f) => { setSmartForm(f); setDirty(true); }}
          onPremiumChange={(f) => { setPremiumForm(f); setDirty(true); }}
        />

        <Separator />

        {/* Group 2 — Read-only */}
        <GroupSection group={2} />

        <Separator />

        {/* Group 3 — Read-only */}
        <GroupSection group={3} />
      </CardContent>
    </Card>
  );
}

/* ─── Group Section ─── */
interface GroupSectionProps {
  group: ProtectionGroup;
  editable?: boolean;
  basicForm?: PackageFormState;
  smartForm?: PackageFormState;
  premiumForm?: PackageFormState;
  onBasicChange?: (f: PackageFormState) => void;
  onSmartChange?: (f: PackageFormState) => void;
  onPremiumChange?: (f: PackageFormState) => void;
}

function GroupSection({
  group,
  editable = false,
  basicForm,
  smartForm,
  premiumForm,
  onBasicChange,
  onSmartChange,
  onPremiumChange,
}: GroupSectionProps) {
  const info = GROUP_LABELS[group];
  const rates = GROUP_RATES[group];

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <h4 className="text-sm font-semibold">{info.name}</h4>
        {!editable && (
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 gap-1">
            <Lock className="w-2.5 h-2.5" />
            Code-defined
          </Badge>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        {info.categories.join(", ")}
      </p>

      {editable && basicForm && smartForm && premiumForm && onBasicChange && onSmartChange && onPremiumChange ? (
        <div className="space-y-4">
          <PackageRow
            name="Basic Protection"
            rating={1}
            form={basicForm}
            showOriginalRate={false}
            showDiscount={false}
            onChange={onBasicChange}
          />
          <PackageRow
            name="Smart Protection"
            rating={2}
            recommended
            form={smartForm}
            showOriginalRate
            showDiscount
            onChange={onSmartChange}
          />
          <PackageRow
            name="All Inclusive Protection"
            rating={3}
            form={premiumForm}
            showOriginalRate
            showDiscount
            onChange={onPremiumChange}
          />
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3">
          <ReadOnlyRate label="Basic" rate={rates.basic} deductible="$800" />
          <ReadOnlyRate label="Smart" rate={rates.smart} deductible="$0" recommended />
          <ReadOnlyRate label="All Inclusive" rate={rates.premium} deductible="$0" />
        </div>
      )}
    </div>
  );
}

/* ─── Read-only rate card for Groups 2 & 3 ─── */
function ReadOnlyRate({ label, rate, deductible, recommended }: {
  label: string;
  rate: number;
  deductible: string;
  recommended?: boolean;
}) {
  return (
    <div className="p-3 rounded-lg border bg-muted/30 space-y-1">
      <div className="flex items-center gap-1.5">
        <span className="text-xs font-medium">{label}</span>
        {recommended && (
          <Badge variant="secondary" className="text-[9px] h-4 px-1">
            Recommended
          </Badge>
        )}
      </div>
      <p className="text-sm font-bold">${rate.toFixed(2)}<span className="text-xs font-normal text-muted-foreground">/day</span></p>
      <p className="text-[10px] text-muted-foreground">Deductible: {deductible}</p>
    </div>
  );
}

/* ─── Sub-component: single editable package row ─── */
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
