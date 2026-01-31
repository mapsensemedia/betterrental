/**
 * Competitor Pricing Tab - Internal reference for market comparison
 */
import { useState } from "react";
import { useVehicles } from "@/hooks/use-vehicles";
import { useCompetitorPricing, useUpsertCompetitorPricing, useDeleteCompetitorPricing } from "@/hooks/use-competitor-pricing";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Building2, Plus, Trash2, Edit2 } from "lucide-react";

const COMPETITORS = ["Hertz", "Avis", "Enterprise", "Budget", "National", "Other"];

export function CompetitorPricingTab() {
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPricing, setEditingPricing] = useState<any>(null);
  
  const { data: vehicles, isLoading: vehiclesLoading } = useVehicles();
  const { data: pricing, isLoading: pricingLoading } = useCompetitorPricing(
    selectedVehicleId !== "all" ? selectedVehicleId : undefined
  );
  const upsertMutation = useUpsertCompetitorPricing();
  const deleteMutation = useDeleteCompetitorPricing();

  const [formData, setFormData] = useState({
    vehicleId: "",
    competitorName: "",
    dailyRate: "",
    weeklyRate: "",
    monthlyRate: "",
    notes: "",
  });

  const handleOpenDialog = (data?: any) => {
    if (data) {
      setEditingPricing(data);
      setFormData({
        vehicleId: data.vehicleId,
        competitorName: data.competitorName,
        dailyRate: data.dailyRate?.toString() || "",
        weeklyRate: data.weeklyRate?.toString() || "",
        monthlyRate: data.monthlyRate?.toString() || "",
        notes: data.notes || "",
      });
    } else {
      setEditingPricing(null);
      setFormData({
        vehicleId: selectedVehicleId !== "all" ? selectedVehicleId : "",
        competitorName: "",
        dailyRate: "",
        weeklyRate: "",
        monthlyRate: "",
        notes: "",
      });
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    await upsertMutation.mutateAsync({
      id: editingPricing?.id,
      vehicleId: formData.vehicleId,
      competitorName: formData.competitorName,
      dailyRate: formData.dailyRate ? parseFloat(formData.dailyRate) : null,
      weeklyRate: formData.weeklyRate ? parseFloat(formData.weeklyRate) : null,
      monthlyRate: formData.monthlyRate ? parseFloat(formData.monthlyRate) : null,
      notes: formData.notes || null,
    });
    setDialogOpen(false);
  };

  const handleDelete = async (id: string) => {
    await deleteMutation.mutateAsync(id);
  };

  const formatCurrency = (value: number | null) =>
    value ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value) : "—";

  const getVehicleDetails = (vehicleId: string) => {
    const vehicle = vehicles?.find((v) => v.id === vehicleId);
    return vehicle ? `${vehicle.year} ${vehicle.make} ${vehicle.model}` : "Unknown";
  };

  const getOurRate = (vehicleId: string) => {
    const vehicle = vehicles?.find((v) => v.id === vehicleId);
    return vehicle?.dailyRate || 0;
  };

  if (vehiclesLoading || pricingLoading) {
    return <Skeleton className="h-96" />;
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Select value={selectedVehicleId} onValueChange={setSelectedVehicleId}>
          <SelectTrigger className="w-[250px]">
            <SelectValue placeholder="All Vehicles" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Vehicles</SelectItem>
            {vehicles?.map((v) => (
              <SelectItem key={v.id} value={v.id}>
                {v.year} {v.make} {v.model}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="w-4 h-4 mr-2" />
              Add Competitor Rate
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingPricing ? "Edit" : "Add"} Competitor Pricing</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Vehicle</Label>
                <Select
                  value={formData.vehicleId}
                  onValueChange={(v) => setFormData({ ...formData, vehicleId: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select vehicle" />
                  </SelectTrigger>
                  <SelectContent>
                    {vehicles?.map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.year} {v.make} {v.model}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Competitor</Label>
                <Select
                  value={formData.competitorName}
                  onValueChange={(v) => setFormData({ ...formData, competitorName: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select competitor" />
                  </SelectTrigger>
                  <SelectContent>
                    {COMPETITORS.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label>Daily Rate</Label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={formData.dailyRate}
                    onChange={(e) => setFormData({ ...formData, dailyRate: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Weekly Rate</Label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={formData.weeklyRate}
                    onChange={(e) => setFormData({ ...formData, weeklyRate: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Monthly Rate</Label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={formData.monthlyRate}
                    onChange={(e) => setFormData({ ...formData, monthlyRate: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  placeholder="Additional notes..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                />
              </div>
              <Button
                onClick={handleSave}
                disabled={!formData.vehicleId || !formData.competitorName || upsertMutation.isPending}
                className="w-full"
              >
                {upsertMutation.isPending ? "Saving..." : "Save"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Competitor Pricing Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            Competitor Pricing Reference
          </CardTitle>
          <CardDescription>Internal reference only — not shown to customers</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vehicle</TableHead>
                <TableHead>Competitor</TableHead>
                <TableHead>Daily Rate</TableHead>
                <TableHead>Our Rate</TableHead>
                <TableHead>Diff</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pricing?.map((p) => {
                const ourRate = getOurRate(p.vehicleId);
                const diff = p.dailyRate ? ourRate - p.dailyRate : null;
                return (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{getVehicleDetails(p.vehicleId)}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{p.competitorName}</Badge>
                    </TableCell>
                    <TableCell>{formatCurrency(p.dailyRate)}</TableCell>
                    <TableCell className="font-medium">{formatCurrency(ourRate)}</TableCell>
                    <TableCell>
                      {diff !== null && (
                        <span className={diff > 0 ? "text-destructive" : "text-green-600"}>
                          {diff > 0 ? "+" : ""}{formatCurrency(diff)}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                      {p.notes || "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpenDialog(p)}>
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => handleDelete(p.id)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {!pricing?.length && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No competitor pricing data yet
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
