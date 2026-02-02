/**
 * Admin Offers Management Page
 * Create and manage points-based offers
 */
import { useState } from "react";
import { AdminShell } from "@/components/layout/AdminShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Gift,
  Plus,
  Pencil,
  Trash2,
  Percent,
  DollarSign,
  Star,
  ArrowUp,
  Calendar,
} from "lucide-react";
import { format } from "date-fns";
import {
  useAdminOffers,
  useCreateOffer,
  useUpdateOffer,
  useDeleteOffer,
  PointsOffer,
} from "@/hooks/use-offers";
import { Skeleton } from "@/components/ui/skeleton";

type OfferType = PointsOffer["offerType"];

const offerTypeLabels: Record<OfferType, { label: string; icon: React.ReactNode }> = {
  percent_off: { label: "Percent Off", icon: <Percent className="w-4 h-4" /> },
  dollar_off: { label: "Dollar Off", icon: <DollarSign className="w-4 h-4" /> },
  free_addon: { label: "Free Add-on", icon: <Gift className="w-4 h-4" /> },
  free_upgrade: { label: "Free Upgrade", icon: <ArrowUp className="w-4 h-4" /> },
};

interface OfferFormData {
  name: string;
  description: string;
  offerType: OfferType;
  offerValue: number;
  pointsRequired: number;
  isActive: boolean;
  validFrom: string;
  validUntil: string;
  minRentalDays: number | null;
  maxUsesTotal: number | null;
  maxUsesPerUser: number;
}

const defaultFormData: OfferFormData = {
  name: "",
  description: "",
  offerType: "percent_off",
  offerValue: 10,
  pointsRequired: 500,
  isActive: true,
  validFrom: "",
  validUntil: "",
  minRentalDays: null,
  maxUsesTotal: null,
  maxUsesPerUser: 1,
};

export default function AdminOffers() {
  const { data: offers, isLoading } = useAdminOffers();
  const createOffer = useCreateOffer();
  const updateOffer = useUpdateOffer();
  const deleteOffer = useDeleteOffer();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingOffer, setEditingOffer] = useState<PointsOffer | null>(null);
  const [formData, setFormData] = useState<OfferFormData>(defaultFormData);

  const handleOpenCreate = () => {
    setEditingOffer(null);
    setFormData(defaultFormData);
    setDialogOpen(true);
  };

  const handleOpenEdit = (offer: PointsOffer) => {
    setEditingOffer(offer);
    setFormData({
      name: offer.name,
      description: offer.description || "",
      offerType: offer.offerType,
      offerValue: offer.offerValue,
      pointsRequired: offer.pointsRequired,
      isActive: offer.isActive,
      validFrom: offer.validFrom ? offer.validFrom.split("T")[0] : "",
      validUntil: offer.validUntil ? offer.validUntil.split("T")[0] : "",
      minRentalDays: offer.minRentalDays,
      maxUsesTotal: offer.maxUsesTotal,
      maxUsesPerUser: offer.maxUsesPerUser,
    });
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    const offerData = {
      name: formData.name,
      description: formData.description || null,
      offerType: formData.offerType,
      offerValue: formData.offerValue,
      pointsRequired: formData.pointsRequired,
      isActive: formData.isActive,
      validFrom: formData.validFrom ? new Date(formData.validFrom).toISOString() : null,
      validUntil: formData.validUntil ? new Date(formData.validUntil).toISOString() : null,
      minRentalDays: formData.minRentalDays,
      eligibleCategories: null,
      eligibleLocations: null,
      maxUsesTotal: formData.maxUsesTotal,
      maxUsesPerUser: formData.maxUsesPerUser,
    };

    if (editingOffer) {
      updateOffer.mutate(
        { id: editingOffer.id, updates: offerData },
        { onSuccess: () => setDialogOpen(false) }
      );
    } else {
      createOffer.mutate(offerData, { onSuccess: () => setDialogOpen(false) });
    }
  };

  const handleDelete = (id: string) => {
    deleteOffer.mutate(id);
  };

  const formatOfferValue = (offer: PointsOffer) => {
    switch (offer.offerType) {
      case "percent_off":
        return `${offer.offerValue}% off`;
      case "dollar_off":
        return `$${offer.offerValue} off`;
      case "free_addon":
        return "Free add-on";
      case "free_upgrade":
        return "Free upgrade";
    }
  };

  return (
    <AdminShell>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Gift className="w-6 h-6" />
              Points Offers
            </h1>
            <p className="text-muted-foreground mt-1">
              Create offers that customers can unlock with loyalty points
            </p>
          </div>
          <Button onClick={handleOpenCreate}>
            <Plus className="w-4 h-4 mr-2" />
            Create Offer
          </Button>
        </div>

        {isLoading ? (
          <Card>
            <CardContent className="p-6">
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            </CardContent>
          </Card>
        ) : !offers?.length ? (
          <Card className="p-12">
            <div className="text-center space-y-4">
              <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                <Gift className="w-6 h-6 text-muted-foreground" />
              </div>
              <div>
                <h3 className="font-semibold">No offers yet</h3>
                <p className="text-sm text-muted-foreground">
                  Create your first points-based offer to reward loyal customers
                </p>
              </div>
              <Button onClick={handleOpenCreate}>
                <Plus className="w-4 h-4 mr-2" />
                Create Offer
              </Button>
            </div>
          </Card>
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Offer</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Points Required</TableHead>
                  <TableHead>Usage</TableHead>
                  <TableHead>Valid Period</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {offers.map((offer) => (
                  <TableRow key={offer.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{offer.name}</p>
                        {offer.description && (
                          <p className="text-sm text-muted-foreground line-clamp-1">
                            {offer.description}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {offerTypeLabels[offer.offerType].icon}
                        <span>{formatOfferValue(offer)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 text-primary" />
                        <span>{offer.pointsRequired.toLocaleString()}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-muted-foreground">
                        {offer.currentUses}
                        {offer.maxUsesTotal && ` / ${offer.maxUsesTotal}`}
                      </span>
                    </TableCell>
                    <TableCell>
                      {offer.validFrom || offer.validUntil ? (
                        <div className="text-sm">
                          {offer.validFrom && (
                            <p>{format(new Date(offer.validFrom), "MMM d, yyyy")}</p>
                          )}
                          {offer.validUntil && (
                            <p className="text-muted-foreground">
                              to {format(new Date(offer.validUntil), "MMM d, yyyy")}
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">No limit</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={offer.isActive ? "default" : "secondary"}>
                        {offer.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenEdit(offer)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Offer</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete "{offer.name}"? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(offer.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}

        {/* Create/Edit Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {editingOffer ? "Edit Offer" : "Create New Offer"}
              </DialogTitle>
              <DialogDescription>
                {editingOffer
                  ? "Update the offer details below"
                  : "Set up a new points-based offer for customers"}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Offer Name *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., 10% Off Your Next Rental"
                />
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe the offer..."
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Offer Type *</Label>
                  <Select
                    value={formData.offerType}
                    onValueChange={(v) => setFormData({ ...formData, offerType: v as OfferType })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(offerTypeLabels).map(([value, { label, icon }]) => (
                        <SelectItem key={value} value={value}>
                          <div className="flex items-center gap-2">
                            {icon}
                            {label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>
                    {formData.offerType === "percent_off" ? "Percentage" : "Value"} *
                  </Label>
                  <Input
                    type="number"
                    min={1}
                    value={formData.offerValue}
                    onChange={(e) => setFormData({ ...formData, offerValue: Number(e.target.value) })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Points Required *</Label>
                <Input
                  type="number"
                  min={1}
                  value={formData.pointsRequired}
                  onChange={(e) => setFormData({ ...formData, pointsRequired: Number(e.target.value) })}
                />
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Valid From</Label>
                  <Input
                    type="date"
                    value={formData.validFrom}
                    onChange={(e) => setFormData({ ...formData, validFrom: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Valid Until</Label>
                  <Input
                    type="date"
                    value={formData.validUntil}
                    onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Min Rental Days</Label>
                  <Input
                    type="number"
                    min={1}
                    value={formData.minRentalDays || ""}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      minRentalDays: e.target.value ? Number(e.target.value) : null 
                    })}
                    placeholder="No minimum"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Max Total Uses</Label>
                  <Input
                    type="number"
                    min={1}
                    value={formData.maxUsesTotal || ""}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      maxUsesTotal: e.target.value ? Number(e.target.value) : null 
                    })}
                    placeholder="Unlimited"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Active</Label>
                  <p className="text-xs text-muted-foreground">
                    Offer is visible and redeemable
                  </p>
                </div>
                <Switch
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!formData.name || createOffer.isPending || updateOffer.isPending}
              >
                {editingOffer ? "Save Changes" : "Create Offer"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminShell>
  );
}
