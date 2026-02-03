/**
 * MembershipManagementPanel - Admin panel for managing membership tiers
 */
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { 
  Crown, 
  Medal, 
  Award, 
  Gem,
  Plus,
  Pencil,
  Trash2,
  Users,
  Loader2,
  CheckCircle,
} from "lucide-react";

interface MembershipTier {
  id: string;
  name: string;
  display_name: string;
  min_points: number;
  benefits: string[];
  color: string;
  icon: string;
  sort_order: number;
  is_active: boolean;
}

const TIER_ICONS: Record<string, React.ReactNode> = {
  medal: <Medal className="h-5 w-5" />,
  award: <Award className="h-5 w-5" />,
  crown: <Crown className="h-5 w-5" />,
  gem: <Gem className="h-5 w-5" />,
};

function useMembershipTiers() {
  return useQuery({
    queryKey: ["membership-tiers"],
    queryFn: async () => {
      // Use rpc or direct query with type casting since table may not be in types yet
      const { data, error } = await supabase
        .from("membership_tiers" as any)
        .select("*")
        .order("sort_order", { ascending: true });
      
      if (error) throw error;
      return ((data as any[]) || []).map(tier => ({
        ...tier,
        benefits: Array.isArray(tier.benefits) ? tier.benefits : JSON.parse(tier.benefits as string || '[]'),
      })) as MembershipTier[];
    },
  });
}

function useMemberCounts() {
  return useQuery({
    queryKey: ["membership-counts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("membership_tier");
      
      if (error) throw error;
      
      const counts: Record<string, number> = {};
      (data || []).forEach(profile => {
        const tier = profile.membership_tier || 'bronze';
        counts[tier] = (counts[tier] || 0) + 1;
      });
      return counts;
    },
  });
}

export function MembershipManagementPanel() {
  const queryClient = useQueryClient();
  const { data: tiers, isLoading } = useMembershipTiers();
  const { data: memberCounts } = useMemberCounts();
  const [editingTier, setEditingTier] = useState<MembershipTier | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  const updateTierMutation = useMutation({
    mutationFn: async (tier: Partial<MembershipTier> & { id: string }) => {
      const { error } = await supabase
        .from("membership_tiers" as any)
        .update({
          display_name: tier.display_name,
          min_points: tier.min_points,
          benefits: tier.benefits,
          color: tier.color,
          is_active: tier.is_active,
        })
        .eq("id", tier.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["membership-tiers"] });
      toast.success("Tier updated successfully");
      setIsDialogOpen(false);
      setEditingTier(null);
    },
    onError: () => {
      toast.error("Failed to update tier");
    },
  });
  
  const handleEditTier = (tier: MembershipTier) => {
    setEditingTier({ ...tier });
    setIsDialogOpen(true);
  };
  
  const handleSaveTier = () => {
    if (!editingTier) return;
    updateTierMutation.mutate(editingTier);
  };
  
  const handleBenefitChange = (index: number, value: string) => {
    if (!editingTier) return;
    const newBenefits = [...editingTier.benefits];
    newBenefits[index] = value;
    setEditingTier({ ...editingTier, benefits: newBenefits });
  };
  
  const handleAddBenefit = () => {
    if (!editingTier) return;
    setEditingTier({ 
      ...editingTier, 
      benefits: [...editingTier.benefits, ""] 
    });
  };
  
  const handleRemoveBenefit = (index: number) => {
    if (!editingTier) return;
    const newBenefits = editingTier.benefits.filter((_, i) => i !== index);
    setEditingTier({ ...editingTier, benefits: newBenefits });
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="w-4 h-4" />
            Membership Tiers
          </CardTitle>
          <CardDescription>
            Configure membership levels and their benefits
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {tiers?.map((tier) => (
            <div 
              key={tier.id}
              className="flex items-start justify-between p-4 border rounded-lg hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-start gap-3">
                <div 
                  className="w-10 h-10 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: tier.color + '20', color: tier.color }}
                >
                  {TIER_ICONS[tier.icon] || <Medal className="h-5 w-5" />}
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{tier.display_name}</span>
                    {!tier.is_active && (
                      <Badge variant="outline" className="text-[10px]">Inactive</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {tier.min_points.toLocaleString()} points required
                  </p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {tier.benefits.slice(0, 3).map((benefit, i) => (
                      <Badge key={i} variant="secondary" className="text-[10px]">
                        {benefit}
                      </Badge>
                    ))}
                    {tier.benefits.length > 3 && (
                      <Badge variant="outline" className="text-[10px]">
                        +{tier.benefits.length - 3} more
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-sm font-medium">
                    {memberCounts?.[tier.name] || 0}
                  </div>
                  <div className="text-xs text-muted-foreground">members</div>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => handleEditTier(tier)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
      
      {/* Edit Tier Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Membership Tier</DialogTitle>
            <DialogDescription>
              Update tier settings and benefits
            </DialogDescription>
          </DialogHeader>
          
          {editingTier && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Display Name</Label>
                <Input
                  value={editingTier.display_name}
                  onChange={(e) => setEditingTier({ ...editingTier, display_name: e.target.value })}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Minimum Points Required</Label>
                <Input
                  type="number"
                  value={editingTier.min_points}
                  onChange={(e) => setEditingTier({ ...editingTier, min_points: parseInt(e.target.value) || 0 })}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Tier Color</Label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={editingTier.color}
                    onChange={(e) => setEditingTier({ ...editingTier, color: e.target.value })}
                    className="w-12 h-10 p-1"
                  />
                  <Input
                    value={editingTier.color}
                    onChange={(e) => setEditingTier({ ...editingTier, color: e.target.value })}
                    className="flex-1"
                  />
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Benefits</Label>
                  <Button variant="ghost" size="sm" onClick={handleAddBenefit}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add
                  </Button>
                </div>
                <div className="space-y-2">
                  {editingTier.benefits.map((benefit, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        value={benefit}
                        onChange={(e) => handleBenefitChange(index, e.target.value)}
                        placeholder="Enter benefit"
                      />
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleRemoveBenefit(index)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
              
              <Separator />
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Active</Label>
                  <p className="text-xs text-muted-foreground">
                    Inactive tiers won't be assigned
                  </p>
                </div>
                <Switch
                  checked={editingTier.is_active}
                  onCheckedChange={(checked) => setEditingTier({ ...editingTier, is_active: checked })}
                />
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveTier} disabled={updateTierMutation.isPending}>
              {updateTierMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <CheckCircle className="h-4 w-4 mr-2" />
              )}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
