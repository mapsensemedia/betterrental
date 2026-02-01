/**
 * Maintenance Log Dialog
 * Add/edit maintenance records
 */
import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useVehicleUnits } from "@/hooks/use-vehicle-units";
import { useCreateMaintenanceLog, useUpdateMaintenanceLog, MaintenanceLog } from "@/hooks/use-maintenance-logs";
import { format } from "date-fns";

interface MaintenanceLogDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicleUnitId?: string;
  maintenanceLog?: MaintenanceLog | null;
}

const MAINTENANCE_TYPES = [
  { value: "scheduled_service", label: "Scheduled Service" },
  { value: "repair", label: "Repair" },
  { value: "inspection", label: "Inspection" },
  { value: "tire_replacement", label: "Tire Replacement" },
  { value: "oil_change", label: "Oil Change" },
  { value: "brake_service", label: "Brake Service" },
  { value: "other", label: "Other" },
];

export function MaintenanceLogDialog({
  open,
  onOpenChange,
  vehicleUnitId,
  maintenanceLog,
}: MaintenanceLogDialogProps) {
  const [formData, setFormData] = useState({
    vehicle_unit_id: vehicleUnitId || "",
    maintenance_type: "scheduled_service",
    description: "",
    cost: "",
    mileage_at_service: "",
    service_date: format(new Date(), "yyyy-MM-dd"),
    vendor_name: "",
    invoice_number: "",
    notes: "",
  });

  const { data: units } = useVehicleUnits();
  const createMutation = useCreateMaintenanceLog();
  const updateMutation = useUpdateMaintenanceLog();
  const isEdit = !!maintenanceLog;

  useEffect(() => {
    if (maintenanceLog) {
      setFormData({
        vehicle_unit_id: maintenanceLog.vehicle_unit_id,
        maintenance_type: maintenanceLog.maintenance_type,
        description: maintenanceLog.description || "",
        cost: String(maintenanceLog.cost),
        mileage_at_service: maintenanceLog.mileage_at_service ? String(maintenanceLog.mileage_at_service) : "",
        service_date: maintenanceLog.service_date,
        vendor_name: maintenanceLog.vendor_name || "",
        invoice_number: maintenanceLog.invoice_number || "",
        notes: maintenanceLog.notes || "",
      });
    } else {
      setFormData({
        vehicle_unit_id: vehicleUnitId || "",
        maintenance_type: "scheduled_service",
        description: "",
        cost: "",
        mileage_at_service: "",
        service_date: format(new Date(), "yyyy-MM-dd"),
        vendor_name: "",
        invoice_number: "",
        notes: "",
      });
    }
  }, [maintenanceLog, vehicleUnitId, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.vehicle_unit_id || !formData.cost) return;

    try {
      const params = {
        vehicle_unit_id: formData.vehicle_unit_id,
        maintenance_type: formData.maintenance_type,
        description: formData.description || undefined,
        cost: parseFloat(formData.cost),
        mileage_at_service: formData.mileage_at_service ? parseInt(formData.mileage_at_service) : undefined,
        service_date: formData.service_date,
        vendor_name: formData.vendor_name || undefined,
        invoice_number: formData.invoice_number || undefined,
        notes: formData.notes || undefined,
      };

      if (isEdit && maintenanceLog) {
        await updateMutation.mutateAsync({ id: maintenanceLog.id, ...params });
      } else {
        await createMutation.mutateAsync(params);
      }
      onOpenChange(false);
    } catch (error) {
      // Error handled by mutation
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Maintenance Log" : "Add Maintenance Log"}</DialogTitle>
          <DialogDescription>
            Record a maintenance expense for a vehicle.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!vehicleUnitId && (
            <div className="space-y-2">
              <Label htmlFor="vehicle_unit_id">Vehicle</Label>
              <Select
                value={formData.vehicle_unit_id}
                onValueChange={(value) => setFormData({ ...formData, vehicle_unit_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a vehicle" />
                </SelectTrigger>
                <SelectContent>
                  {units?.map((unit) => {
                    const vehicle = unit.vehicle as any;
                    return (
                      <SelectItem key={unit.id} value={unit.id}>
                        {vehicle?.year} {vehicle?.make} {vehicle?.model} - {unit.vin}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="maintenance_type">Type</Label>
              <Select
                value={formData.maintenance_type}
                onValueChange={(value) => setFormData({ ...formData, maintenance_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MAINTENANCE_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="service_date">Service Date</Label>
              <Input
                id="service_date"
                type="date"
                value={formData.service_date}
                onChange={(e) => setFormData({ ...formData, service_date: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Brief description of the service"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cost">Cost ($)</Label>
              <Input
                id="cost"
                type="number"
                step="0.01"
                min="0"
                value={formData.cost}
                onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                placeholder="0.00"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="mileage">Mileage at Service</Label>
              <Input
                id="mileage"
                type="number"
                min="0"
                value={formData.mileage_at_service}
                onChange={(e) => setFormData({ ...formData, mileage_at_service: e.target.value })}
                placeholder="Optional"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="vendor_name">Vendor Name</Label>
              <Input
                id="vendor_name"
                value={formData.vendor_name}
                onChange={(e) => setFormData({ ...formData, vendor_name: e.target.value })}
                placeholder="Service provider"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="invoice_number">Invoice #</Label>
              <Input
                id="invoice_number"
                value={formData.invoice_number}
                onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value })}
                placeholder="Optional"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Additional notes..."
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !formData.vehicle_unit_id || !formData.cost}>
              {isLoading ? "Saving..." : isEdit ? "Update" : "Add Log"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
