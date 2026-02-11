/**
 * ProtectionPricingPanel — Admin panel for managing protection package pricing
 * across all 3 vehicle groups. All groups are now editable via system_settings.
 */
import { useState, useEffect } from "react";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Shield, Save, Loader2, Star, Users } from "lucide-react";
import {
  useProtectionPackages,
  useUpdateProtectionSettings,
  getGroupSettingsFromRows,
  type GroupSettings,
} from "@/hooks/use-protection-settings";
import { useDriverFeeSettings } from "@/hooks/use-driver-fee-settings";
import { GROUP_LABELS, type ProtectionGroup } from "@/lib/protection-groups";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface PackageFormState {
  rate: string;
  originalRate: string;
  discount: string;
  deductible: string;
}

function settingsToForms(s: GroupSettings): {
  basic: PackageFormState;
  smart: PackageFormState;
  premium: PackageFormState;
} {
  return {
    basic: {
      rate: s.basic_rate,
      originalRate: "",
      discount: "",
      deductible: s.basic_deductible,
    },
    smart: {
      rate: s.smart_rate,
      originalRate: s.smart_original_rate,
      discount: s.smart_discount,
      deductible: s.smart_deductible,
    },
    premium: {
      rate: s.premium_rate,
      originalRate: s.premium_original_rate,
      discount: s.premium_discount,
      deductible: s.premium_deductible,
    },
  };
}

export function ProtectionPricingPanel() {
  const { allRows, isLoading } = useProtectionPackages();
  const updateSettings = useUpdateProtectionSettings();
  const { data: driverFees } = useDriverFeeSettings();
  const queryClient = useQueryClient();

  // Per-group form state
  const [groupForms, setGroupForms] = useState<Record<ProtectionGroup, {
    basic: PackageFormState; smart: PackageFormState; premium: PackageFormState;
  }>>({
    1: settingsToForms(getGroupSettingsFromRows([], 1)),
    2: settingsToForms(getGroupSettingsFromRows([], 2)),
    3: settingsToForms(getGroupSettingsFromRows([], 3)),
  });
  const [dirtyGroups, setDirtyGroups] = useState<Set<ProtectionGroup>>(new Set());

  // Driver fee form
  const [driverFeeForm, setDriverFeeForm] = useState({
    additionalDriverRate: "15.99",
    youngAdditionalDriverRate: "15.00",
  });
  const [driverFeeDirty, setDriverFeeDirty] = useState(false);

  // Sync forms when data loads
  useEffect(() => {
    if (allRows && allRows.length > 0) {
      const newForms = { ...groupForms };
      for (const g of [1, 2, 3] as ProtectionGroup[]) {
        if (!dirtyGroups.has(g)) {
          newForms[g] = settingsToForms(getGroupSettingsFromRows(allRows, g));
        }
      }
      setGroupForms(newForms);
    }
  }, [allRows]);

  useEffect(() => {
    if (driverFees && !driverFeeDirty) {
      setDriverFeeForm({
        additionalDriverRate: String(driverFees.additionalDriverDailyRate),
        youngAdditionalDriverRate: String(driverFees.youngAdditionalDriverDailyRate),
      });
    }
  }, [driverFees, driverFeeDirty]);

  const updateDriverFees = useMutation({
    mutationFn: async (values: { additionalDriverRate: number; youngAdditionalDriverRate: number }) => {
      const { error: err1 } = await supabase
        .from("system_settings" as any)
        .upsert({ key: "additional_driver_daily_rate", value: String(values.additionalDriverRate) } as any, { onConflict: "key" });
      const { error: err2 } = await supabase
        .from("system_settings" as any)
        .upsert({ key: "young_additional_driver_daily_rate", value: String(values.youngAdditionalDriverRate) } as any, { onConflict: "key" });
      if (err1 || err2) throw new Error(err1?.message || err2?.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["driver-fee-settings"] });
      toast.success("Driver fees updated");
    },
    onError: (error: Error) => toast.error("Failed: " + error.message),
  });

  const handleGroupSave = async (group: ProtectionGroup) => {
    const forms = groupForms[group];
    const basicRate = parseFloat(forms.basic.rate);
    const smartRate = parseFloat(forms.smart.rate);
    const premiumRate = parseFloat(forms.premium.rate);
    const smartOriginal = parseFloat(forms.smart.originalRate);
    const premiumOriginal = parseFloat(forms.premium.originalRate);
    const hasSmartDiscount = !isNaN(smartOriginal) && !isNaN(smartRate) && smartOriginal > smartRate;
    const hasPremiumDiscount = !isNaN(premiumOriginal) && !isNaN(premiumRate) && premiumOriginal > premiumRate;

    await updateSettings.mutateAsync({
      group,
      settings: {
        basic_rate: !isNaN(basicRate) && basicRate > 0 ? basicRate.toFixed(2) : "",
        basic_deductible: forms.basic.deductible,
        smart_rate: !isNaN(smartRate) && smartRate > 0 ? smartRate.toFixed(2) : "",
        smart_original_rate: hasSmartDiscount ? smartOriginal.toFixed(2) : "",
        smart_discount: hasSmartDiscount ? forms.smart.discount : "",
        smart_deductible: forms.smart.deductible,
        premium_rate: !isNaN(premiumRate) && premiumRate > 0 ? premiumRate.toFixed(2) : "",
        premium_original_rate: hasPremiumDiscount ? premiumOriginal.toFixed(2) : "",
        premium_discount: hasPremiumDiscount ? forms.premium.discount : "",
        premium_deductible: forms.premium.deductible,
      },
    });
    setDirtyGroups((prev) => {
      const next = new Set(prev);
      next.delete(group);
      return next;
    });
  };

  const updateGroupForm = (group: ProtectionGroup, pkg: "basic" | "smart" | "premium", form: PackageFormState) => {
    setGroupForms((prev) => ({
      ...prev,
      [group]: { ...prev[group], [pkg]: form },
    }));
    setDirtyGroups((prev) => new Set(prev).add(group));
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
    <div className="space-y-6">
      {/* Protection Pricing Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Protection Package Pricing
          </CardTitle>
          <CardDescription>
            Set daily rates, deductibles, and discount labels for each vehicle group.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          {([1, 2, 3] as ProtectionGroup[]).map((group, idx) => {
            const info = GROUP_LABELS[group];
            const forms = groupForms[group];
            const isDirty = dirtyGroups.has(group);

            return (
              <div key={group}>
                {idx > 0 && <Separator className="mb-6" />}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-semibold">{info.name}</h4>
                      <p className="text-xs text-muted-foreground">{info.categories.join(", ")}</p>
                    </div>
                    {isDirty && (
                      <Button
                        size="sm"
                        className="gap-1"
                        onClick={() => handleGroupSave(group)}
                        disabled={updateSettings.isPending}
                      >
                        {updateSettings.isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Save className="w-4 h-4" />
                        )}
                        Save Group {group}
                      </Button>
                    )}
                  </div>

                  <PackageRow
                    name="Basic Protection"
                    rating={1}
                    form={forms.basic}
                    showOriginalRate={false}
                    showDiscount={false}
                    onChange={(f) => updateGroupForm(group, "basic", f)}
                  />
                  <PackageRow
                    name="Smart Protection"
                    rating={2}
                    recommended
                    form={forms.smart}
                    showOriginalRate
                    showDiscount
                    onChange={(f) => updateGroupForm(group, "smart", f)}
                  />
                  <PackageRow
                    name="All Inclusive Protection"
                    rating={3}
                    form={forms.premium}
                    showOriginalRate
                    showDiscount
                    onChange={(f) => updateGroupForm(group, "premium", f)}
                  />
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Driver Fees Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="w-4 h-4" />
            Additional Driver Fees
          </CardTitle>
          <CardDescription>
            Set the daily rate for additional drivers and the young driver surcharge (20-24 age band).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label className="text-xs">Additional Driver Fee ($/day)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={driverFeeForm.additionalDriverRate}
                onChange={(e) => {
                  setDriverFeeForm((p) => ({ ...p, additionalDriverRate: e.target.value }));
                  setDriverFeeDirty(true);
                }}
                className="h-9"
              />
              <p className="text-[10px] text-muted-foreground">Flat rate per additional driver per day</p>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Young Additional Driver Surcharge ($/day)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={driverFeeForm.youngAdditionalDriverRate}
                onChange={(e) => {
                  setDriverFeeForm((p) => ({ ...p, youngAdditionalDriverRate: e.target.value }));
                  setDriverFeeDirty(true);
                }}
                className="h-9"
              />
              <p className="text-[10px] text-muted-foreground">Extra daily charge for drivers aged 20-24</p>
            </div>
          </div>
          {driverFeeDirty && (
            <div className="flex justify-end mt-4">
              <Button
                size="sm"
                className="gap-1"
                onClick={async () => {
                  await updateDriverFees.mutateAsync({
                    additionalDriverRate: parseFloat(driverFeeForm.additionalDriverRate) || 15.99,
                    youngAdditionalDriverRate: parseFloat(driverFeeForm.youngAdditionalDriverRate) || 15.00,
                  });
                  setDriverFeeDirty(false);
                }}
                disabled={updateDriverFees.isPending}
              >
                {updateDriverFees.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Save Driver Fees
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/* ─── Editable package row ─── */
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
  name, rating, recommended, form, showOriginalRate, showDiscount, onChange,
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
                i < rating ? "text-amber-500 fill-amber-500" : "text-muted-foreground/30"
              }`}
            />
          ))}
        </div>
        <span className="text-sm font-medium">{name}</span>
        {recommended && (
          <Badge variant="secondary" className="text-[10px] h-5">Recommended</Badge>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Daily Rate ($)</Label>
          <Input type="number" min="0" step="0.01" value={form.rate} onChange={(e) => update("rate", e.target.value)} className="h-9" />
        </div>
        {showOriginalRate && (
          <div className="space-y-1">
            <Label className="text-xs">Original Rate ($)</Label>
            <Input type="number" min="0" step="0.01" value={form.originalRate} onChange={(e) => update("originalRate", e.target.value)} className="h-9" />
          </div>
        )}
        {showDiscount && (
          <div className="space-y-1">
            <Label className="text-xs">Discount Label</Label>
            <Input value={form.discount} onChange={(e) => update("discount", e.target.value)} placeholder="e.g. 23% online discount" className="h-9" />
          </div>
        )}
        <div className="space-y-1">
          <Label className="text-xs">Deductible Text</Label>
          <Input value={form.deductible} onChange={(e) => update("deductible", e.target.value)} placeholder="e.g. Up to $800.00" className="h-9" />
        </div>
      </div>
    </div>
  );
}
