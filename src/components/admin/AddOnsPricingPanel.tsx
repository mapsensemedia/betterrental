/**
 * Add-Ons Pricing Panel
 * Admin component for managing add-on pricing instantly
 */
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  useManageAddOns,
  useUpdateAddOn,
  useCreateAddOn,
  useDeleteAddOn,
  AddOnRecord,
} from "@/hooks/use-manage-addons";
import { 
  DollarSign, 
  Plus, 
  Pencil, 
  Trash2, 
  Fuel, 
  Loader2,
  Package,
  CheckCircle,
} from "lucide-react";
import { MARKET_FUEL_PRICE_PER_LITER, FUEL_DISCOUNT_CENTS } from "@/lib/fuel-pricing";

interface EditDialogState {
  open: boolean;
  addon: AddOnRecord | null;
}

interface CreateDialogState {
  open: boolean;
}

export function AddOnsPricingPanel() {
  const { data: addOns, isLoading } = useManageAddOns();
  const updateAddOn = useUpdateAddOn();
  const createAddOn = useCreateAddOn();
  const deleteAddOn = useDeleteAddOn();

  const [editDialog, setEditDialog] = useState<EditDialogState>({ open: false, addon: null });
  const [createDialog, setCreateDialog] = useState<CreateDialogState>({ open: false });
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Form state for editing
  const [editForm, setEditForm] = useState({
    name: "",
    description: "",
    daily_rate: "",
    one_time_fee: "",
    is_active: true,
  });

  // Form state for creating
  const [createForm, setCreateForm] = useState({
    name: "",
    description: "",
    daily_rate: "",
    one_time_fee: "",
    is_active: true,
  });

  const openEditDialog = (addon: AddOnRecord) => {
    setEditForm({
      name: addon.name,
      description: addon.description || "",
      daily_rate: String(addon.daily_rate),
      one_time_fee: addon.one_time_fee ? String(addon.one_time_fee) : "",
      is_active: addon.is_active,
    });
    setEditDialog({ open: true, addon });
  };

  const handleEditSubmit = async () => {
    if (!editDialog.addon) return;

    await updateAddOn.mutateAsync({
      id: editDialog.addon.id,
      name: editForm.name,
      description: editForm.description || null,
      daily_rate: parseFloat(editForm.daily_rate) || 0,
      one_time_fee: editForm.one_time_fee ? parseFloat(editForm.one_time_fee) : null,
      is_active: editForm.is_active,
    });

    setEditDialog({ open: false, addon: null });
  };

  const handleCreateSubmit = async () => {
    await createAddOn.mutateAsync({
      name: createForm.name,
      description: createForm.description || undefined,
      daily_rate: parseFloat(createForm.daily_rate) || 0,
      one_time_fee: createForm.one_time_fee ? parseFloat(createForm.one_time_fee) : undefined,
      is_active: createForm.is_active,
    });

    setCreateForm({
      name: "",
      description: "",
      daily_rate: "",
      one_time_fee: "",
      is_active: true,
    });
    setCreateDialog({ open: false });
  };

  const handleDelete = async (id: string) => {
    await deleteAddOn.mutateAsync(id);
    setDeleteConfirm(null);
  };

  const handleToggleActive = async (addon: AddOnRecord) => {
    await updateAddOn.mutateAsync({
      id: addon.id,
      is_active: !addon.is_active,
    });
  };

  const isFuelAddOn = (name: string) => {
    const lowerName = name.toLowerCase();
    return lowerName.includes("fuel") && lowerName.includes("tank");
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
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Package className="w-4 h-4" />
                Add-Ons & Pricing
              </CardTitle>
              <CardDescription>
                Manage add-on pricing - changes apply instantly across all bookings
              </CardDescription>
            </div>
            <Button
              size="sm"
              onClick={() => setCreateDialog({ open: true })}
              className="gap-1"
            >
              <Plus className="w-4 h-4" />
              New Add-On
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Fuel Pricing Info */}
          <div className="bg-accent/50 border border-border rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Fuel className="w-5 h-5 text-primary mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-medium">
                  Fuel Service Pricing
                </p>
                <p className="text-xs text-muted-foreground">
                  Market rate: CA${MARKET_FUEL_PRICE_PER_LITER.toFixed(2)}/L • 
                  Our discount: {FUEL_DISCOUNT_CENTS}¢/L below market •
                  Price is calculated based on each vehicle's tank capacity
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  To update market rate, edit <code className="bg-muted px-1 rounded">src/lib/fuel-pricing.ts</code>
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Add-Ons List */}
          <div className="space-y-3">
            {addOns?.map((addon) => (
              <div
                key={addon.id}
                className={`flex items-center justify-between p-4 rounded-lg border ${
                  addon.is_active 
                    ? "bg-background" 
                    : "bg-muted/50 opacity-60"
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium text-sm truncate">{addon.name}</h4>
                    {!addon.is_active && (
                      <Badge variant="secondary" className="text-xs">Inactive</Badge>
                    )}
                    {isFuelAddOn(addon.name) && (
                      <Badge variant="outline" className="text-xs gap-1">
                        <Fuel className="w-3 h-3" />
                        Dynamic
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {addon.description || "No description"}
                  </p>
                </div>

                <div className="flex items-center gap-4 ml-4">
                  {/* Pricing Display */}
                  <div className="text-right">
                    {isFuelAddOn(addon.name) ? (
                      <span className="text-sm text-muted-foreground">Per tank</span>
                    ) : (
                      <>
                        {addon.daily_rate > 0 && (
                          <div className="flex items-center gap-1 text-sm font-medium">
                            <DollarSign className="w-3 h-3" />
                            {addon.daily_rate.toFixed(2)}/day
                          </div>
                        )}
                        {addon.one_time_fee && addon.one_time_fee > 0 && (
                          <div className="text-xs text-muted-foreground">
                            + ${addon.one_time_fee.toFixed(2)} one-time
                          </div>
                        )}
                        {addon.daily_rate === 0 && !addon.one_time_fee && (
                          <span className="text-sm text-muted-foreground">Free</span>
                        )}
                      </>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={addon.is_active}
                      onCheckedChange={() => handleToggleActive(addon)}
                      disabled={updateAddOn.isPending}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEditDialog(addon)}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteConfirm(addon.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}

            {addOns?.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Package className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No add-ons configured</p>
                <Button
                  variant="link"
                  onClick={() => setCreateDialog({ open: true })}
                  className="mt-2"
                >
                  Create your first add-on
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editDialog.open} onOpenChange={(open) => setEditDialog({ open, addon: editDialog.addon })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Add-On</DialogTitle>
            <DialogDescription>
              Update pricing or details. Changes apply immediately.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                placeholder="e.g., Child Seat"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                placeholder="Brief description..."
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-daily">Daily Rate ($)</Label>
                <Input
                  id="edit-daily"
                  type="number"
                  min="0"
                  step="0.01"
                  value={editForm.daily_rate}
                  onChange={(e) => setEditForm({ ...editForm, daily_rate: e.target.value })}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-onetime">One-Time Fee ($)</Label>
                <Input
                  id="edit-onetime"
                  type="number"
                  min="0"
                  step="0.01"
                  value={editForm.one_time_fee}
                  onChange={(e) => setEditForm({ ...editForm, one_time_fee: e.target.value })}
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                id="edit-active"
                checked={editForm.is_active}
                onCheckedChange={(checked) => setEditForm({ ...editForm, is_active: checked })}
              />
              <Label htmlFor="edit-active">Active (visible to customers)</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialog({ open: false, addon: null })}>
              Cancel
            </Button>
            <Button onClick={handleEditSubmit} disabled={updateAddOn.isPending}>
              {updateAddOn.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Dialog */}
      <Dialog open={createDialog.open} onOpenChange={(open) => setCreateDialog({ open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Add-On</DialogTitle>
            <DialogDescription>
              Add a new rental add-on or service.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="create-name">Name *</Label>
              <Input
                id="create-name"
                value={createForm.name}
                onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                placeholder="e.g., Child Seat"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="create-description">Description</Label>
              <Textarea
                id="create-description"
                value={createForm.description}
                onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                placeholder="Brief description..."
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="create-daily">Daily Rate ($) *</Label>
                <Input
                  id="create-daily"
                  type="number"
                  min="0"
                  step="0.01"
                  value={createForm.daily_rate}
                  onChange={(e) => setCreateForm({ ...createForm, daily_rate: e.target.value })}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-onetime">One-Time Fee ($)</Label>
                <Input
                  id="create-onetime"
                  type="number"
                  min="0"
                  step="0.01"
                  value={createForm.one_time_fee}
                  onChange={(e) => setCreateForm({ ...createForm, one_time_fee: e.target.value })}
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                id="create-active"
                checked={createForm.is_active}
                onCheckedChange={(checked) => setCreateForm({ ...createForm, is_active: checked })}
              />
              <Label htmlFor="create-active">Active (visible to customers)</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialog({ open: false })}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreateSubmit} 
              disabled={createAddOn.isPending || !createForm.name}
            >
              {createAddOn.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Add-On
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Add-On?</DialogTitle>
            <DialogDescription>
              This action cannot be undone. The add-on will be permanently removed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
              disabled={deleteAddOn.isPending}
            >
              {deleteAddOn.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
