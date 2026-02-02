import { useState } from "react";
import { AdminShell } from "@/components/layout/AdminShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Search,
  Plus,
  Car,
  DollarSign,
  Hash,
  Calendar,
  Eye,
  Edit2,
  Trash2,
  RefreshCw,
  TrendingUp,
  Receipt,
  Fuel,
  Wrench,
  FileText,
  Calculator,
} from "lucide-react";
import { format } from "date-fns";
import { useVehicles } from "@/hooks/use-vehicles";
import {
  useVehicleUnits,
  useCreateVehicleUnit,
  useUpdateVehicleUnit,
  useDeleteVehicleUnit,
  VehicleUnit,
} from "@/hooks/use-vehicle-units";
import { VehicleUnitDetail } from "@/components/admin/VehicleUnitDetail";
import { FleetReportsPanel } from "@/components/admin/FleetReportsPanel";
import { DepreciationCalculator } from "@/components/admin/DepreciationCalculator";

export default function FleetCosts() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [vehicleFilter, setVehicleFilter] = useState("all");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState<VehicleUnit | null>(null);
  const [detailUnit, setDetailUnit] = useState<VehicleUnit | null>(null);
  const [isReportsOpen, setIsReportsOpen] = useState(false);
  const [isDepreciationOpen, setIsDepreciationOpen] = useState(false);

  const { data: vehicles, isLoading: vehiclesLoading } = useVehicles();
  const {
    data: units,
    isLoading: unitsLoading,
    isFetching: unitsFetching,
    refetch,
  } = useVehicleUnits({
    status: statusFilter,
    search,
    vehicleId: vehicleFilter !== "all" ? vehicleFilter : undefined,
  });

  const createUnit = useCreateVehicleUnit();
  const updateUnit = useUpdateVehicleUnit();
  const deleteUnit = useDeleteVehicleUnit();

  // Form state
  const [formData, setFormData] = useState({
    vehicle_id: "",
    vin: "",
    acquisition_cost: "",
    acquisition_date: "",
    license_plate: "",
    color: "",
    mileage_at_acquisition: "",
    current_mileage: "",
    tank_capacity_liters: "",
    notes: "",
    status: "active",
  });

  const resetForm = () => {
    setFormData({
      vehicle_id: "",
      vin: "",
      acquisition_cost: "",
      acquisition_date: "",
      license_plate: "",
      color: "",
      mileage_at_acquisition: "",
      current_mileage: "",
      tank_capacity_liters: "",
      notes: "",
      status: "active",
    });
  };

  const handleAddUnit = () => {
    resetForm();
    setIsAddOpen(true);
  };

  const handleEditUnit = (unit: VehicleUnit) => {
    setSelectedUnit(unit);
    setFormData({
      vehicle_id: unit.vehicle_id,
      vin: unit.vin,
      acquisition_cost: String(unit.acquisition_cost),
      acquisition_date: unit.acquisition_date || "",
      license_plate: unit.license_plate || "",
      color: unit.color || "",
      mileage_at_acquisition: unit.mileage_at_acquisition
        ? String(unit.mileage_at_acquisition)
        : "",
      current_mileage: unit.current_mileage ? String(unit.current_mileage) : "",
      tank_capacity_liters: unit.tank_capacity_liters ? String(unit.tank_capacity_liters) : "",
      notes: unit.notes || "",
      status: unit.status,
    });
    setIsEditOpen(true);
  };

  const handleSubmitAdd = async () => {
    await createUnit.mutateAsync({
      vehicle_id: formData.vehicle_id,
      vin: formData.vin,
      acquisition_cost: Number(formData.acquisition_cost) || 0,
      acquisition_date: formData.acquisition_date || null,
      license_plate: formData.license_plate || null,
      color: formData.color || null,
      mileage_at_acquisition: formData.mileage_at_acquisition
        ? Number(formData.mileage_at_acquisition)
        : null,
      current_mileage: formData.current_mileage
        ? Number(formData.current_mileage)
        : null,
      notes: formData.notes || null,
      status: formData.status,
      category_id: null,
      tank_capacity_liters: formData.tank_capacity_liters ? Number(formData.tank_capacity_liters) : null,
      location_id: null,
    });
    setIsAddOpen(false);
    resetForm();
  };

  const handleSubmitEdit = async () => {
    if (!selectedUnit) return;
    await updateUnit.mutateAsync({
      id: selectedUnit.id,
      vehicle_id: formData.vehicle_id,
      vin: formData.vin,
      acquisition_cost: Number(formData.acquisition_cost) || 0,
      acquisition_date: formData.acquisition_date || null,
      license_plate: formData.license_plate || null,
      color: formData.color || null,
      mileage_at_acquisition: formData.mileage_at_acquisition
        ? Number(formData.mileage_at_acquisition)
        : null,
      current_mileage: formData.current_mileage
        ? Number(formData.current_mileage)
        : null,
      tank_capacity_liters: formData.tank_capacity_liters ? Number(formData.tank_capacity_liters) : null,
      notes: formData.notes || null,
      status: formData.status,
    });
    setIsEditOpen(false);
    setSelectedUnit(null);
    resetForm();
  };

  const handleDeleteUnit = async () => {
    if (!selectedUnit) return;
    await deleteUnit.mutateAsync(selectedUnit.id);
    setIsDeleteOpen(false);
    setSelectedUnit(null);
  };

  // Summary calculations
  const totalAcquisitionCost = units?.reduce(
    (sum, unit) => sum + Number(unit.acquisition_cost),
    0
  ) || 0;
  const totalExpenses = units?.reduce(
    (sum, unit) => sum + (unit.total_expenses || 0),
    0
  ) || 0;
  const totalCost = totalAcquisitionCost + totalExpenses;

  const isLoading = vehiclesLoading || unitsLoading;

  return (
    <AdminShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Fleet Costs</h1>
            <p className="text-sm text-muted-foreground">
              Track VIN numbers, acquisition costs, and all expenses per vehicle
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsReportsOpen(true)}>
              <FileText className="w-4 h-4 mr-2" />
              Reports
            </Button>
            <Button variant="outline" size="sm" onClick={() => setIsDepreciationOpen(true)}>
              <Calculator className="w-4 h-4 mr-2" />
              Depreciation
            </Button>
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={unitsFetching}>
              <RefreshCw className={`w-4 h-4 mr-2 ${unitsFetching ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button size="sm" onClick={handleAddUnit}>
              <Plus className="w-4 h-4 mr-2" />
              Add Vehicle Unit
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Hash className="w-4 h-4" />
                Total Units
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{units?.length || 0}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                Acquisition Cost
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                ${totalAcquisitionCost.toLocaleString()}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Receipt className="w-4 h-4" />
                Total Expenses
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-orange-600">
                ${totalExpenses.toLocaleString()}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Total Investment
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-primary">
                ${totalCost.toLocaleString()}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by VIN or plate..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={vehicleFilter} onValueChange={setVehicleFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filter by category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {vehicles?.map((v) => (
                <SelectItem key={v.id} value={v.id}>
                  {v.make} {v.model}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="sold">Sold</SelectItem>
              <SelectItem value="retired">Retired</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Vehicle Units Table - Responsive */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : !units?.length ? (
              <div className="p-12 text-center">
                <Car className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No vehicle units found</h3>
                <p className="text-muted-foreground mb-4">
                  Add your first vehicle unit with a VIN number to start tracking costs.
                </p>
                <Button onClick={handleAddUnit}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Vehicle Unit
                </Button>
              </div>
            ) : (
              <>
                {/* Mobile Card View */}
                <div className="block md:hidden divide-y">
                  {units.map((unit) => {
                    const totalUnitCost =
                      Number(unit.acquisition_cost) + (unit.total_expenses || 0);
                    return (
                      <div
                        key={unit.id}
                        className="p-4 space-y-3 cursor-pointer hover:bg-muted/50"
                        onClick={() => setDetailUnit(unit)}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="font-mono font-medium text-sm truncate">
                              {unit.vin}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <Car className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                              <span className="text-sm text-muted-foreground truncate">
                                {unit.vehicle?.make} {unit.vehicle?.model}
                              </span>
                            </div>
                            {unit.license_plate && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Plate: {unit.license_plate}
                              </p>
                            )}
                          </div>
                          <Badge
                            variant={
                              unit.status === "active"
                                ? "default"
                                : unit.status === "sold"
                                ? "secondary"
                                : "outline"
                            }
                          >
                            {unit.status}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-sm">
                          <div>
                            <p className="text-muted-foreground text-xs">Acquisition</p>
                            <p className="font-medium">
                              ${Number(unit.acquisition_cost).toLocaleString()}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground text-xs">Expenses</p>
                            <p className="font-medium text-amber-600">
                              ${(unit.total_expenses || 0).toLocaleString()}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground text-xs">Total</p>
                            <p className="font-bold text-primary">
                              ${totalUnitCost.toLocaleString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex justify-end gap-1 pt-2 border-t">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDetailUnit(unit);
                            }}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            View
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditUnit(unit);
                            }}
                          >
                            <Edit2 className="w-4 h-4 mr-1" />
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedUnit(unit);
                              setIsDeleteOpen(true);
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>VIN / Plate</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead className="text-right">Acquisition</TableHead>
                        <TableHead className="text-right">Expenses</TableHead>
                        <TableHead className="text-right">Total Cost</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {units.map((unit) => {
                        const totalUnitCost =
                          Number(unit.acquisition_cost) + (unit.total_expenses || 0);
                        return (
                          <TableRow
                            key={unit.id}
                            className="cursor-pointer hover:bg-muted/50"
                            onClick={() => setDetailUnit(unit)}
                          >
                            <TableCell>
                              <div>
                                <p className="font-mono font-medium text-sm">
                                  {unit.vin}
                                </p>
                                {unit.license_plate && (
                                  <p className="text-xs text-muted-foreground">
                                    {unit.license_plate}
                                  </p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Car className="w-4 h-4 text-muted-foreground" />
                                <span>
                                  {unit.vehicle?.make} {unit.vehicle?.model}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <div>
                                <p className="font-medium">
                                  ${Number(unit.acquisition_cost).toLocaleString()}
                                </p>
                                {unit.acquisition_date && (
                                  <p className="text-xs text-muted-foreground">
                                    {format(new Date(unit.acquisition_date), "MMM d, yyyy")}
                                  </p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <p className="font-medium text-amber-600">
                                ${(unit.total_expenses || 0).toLocaleString()}
                              </p>
                            </TableCell>
                            <TableCell className="text-right">
                              <p className="font-bold text-primary">
                                ${totalUnitCost.toLocaleString()}
                              </p>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  unit.status === "active"
                                    ? "default"
                                    : unit.status === "sold"
                                    ? "secondary"
                                    : "outline"
                                }
                              >
                                {unit.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDetailUnit(unit);
                                  }}
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEditUnit(unit);
                                  }}
                                >
                                  <Edit2 className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-destructive hover:text-destructive"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedUnit(unit);
                                    setIsDeleteOpen(true);
                                  }}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={isAddOpen || isEditOpen} onOpenChange={(open) => {
        if (!open) {
          setIsAddOpen(false);
          setIsEditOpen(false);
          setSelectedUnit(null);
          resetForm();
        }
      }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isAddOpen ? "Add Vehicle Unit" : "Edit Vehicle Unit"}
            </DialogTitle>
            <DialogDescription>
              {isAddOpen
                ? "Add a new vehicle with VIN number and acquisition details."
                : "Update vehicle unit details."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Category *</Label>
              <Select
                value={formData.vehicle_id}
                onValueChange={(v) => setFormData({ ...formData, vehicle_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select vehicle category" />
                </SelectTrigger>
                <SelectContent>
                  {vehicles?.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.year} {v.make} {v.model} ({v.category})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>VIN Number *</Label>
                <Input
                  value={formData.vin}
                  onChange={(e) =>
                    setFormData({ ...formData, vin: e.target.value.toUpperCase() })
                  }
                  placeholder="e.g., 1HGBH41JXMN109186"
                  maxLength={17}
                />
              </div>
              <div className="space-y-2">
                <Label>License Plate</Label>
                <Input
                  value={formData.license_plate}
                  onChange={(e) =>
                    setFormData({ ...formData, license_plate: e.target.value.toUpperCase() })
                  }
                  placeholder="e.g., ABC-1234"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Acquisition Cost *</Label>
                <Input
                  type="number"
                  value={formData.acquisition_cost}
                  onChange={(e) =>
                    setFormData({ ...formData, acquisition_cost: e.target.value })
                  }
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                />
              </div>
              <div className="space-y-2">
                <Label>Acquisition Date</Label>
                <Input
                  type="date"
                  value={formData.acquisition_date}
                  onChange={(e) =>
                    setFormData({ ...formData, acquisition_date: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Color</Label>
                <Input
                  value={formData.color}
                  onChange={(e) =>
                    setFormData({ ...formData, color: e.target.value })
                  }
                  placeholder="e.g., Black"
                />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(v) => setFormData({ ...formData, status: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="sold">Sold</SelectItem>
                    <SelectItem value="retired">Retired</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Mileage at Acquisition</Label>
                <Input
                  type="number"
                  value={formData.mileage_at_acquisition}
                  onChange={(e) =>
                    setFormData({ ...formData, mileage_at_acquisition: e.target.value })
                  }
                  placeholder="0"
                  min="0"
                />
              </div>
              <div className="space-y-2">
                <Label>Current Mileage</Label>
                <Input
                  type="number"
                  value={formData.current_mileage}
                  onChange={(e) =>
                    setFormData({ ...formData, current_mileage: e.target.value })
                  }
                  placeholder="0"
                  min="0"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Tank Capacity (Liters)</Label>
              <Input
                type="number"
                value={formData.tank_capacity_liters}
                onChange={(e) =>
                  setFormData({ ...formData, tank_capacity_liters: e.target.value })
                }
                placeholder="e.g., 60"
                min="20"
                max="200"
                step="0.1"
              />
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Any additional notes..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsAddOpen(false);
                setIsEditOpen(false);
                setSelectedUnit(null);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={isAddOpen ? handleSubmitAdd : handleSubmitEdit}
              disabled={
                !formData.vehicle_id ||
                !formData.vin ||
                createUnit.isPending ||
                updateUnit.isPending
              }
            >
              {isAddOpen ? "Add Unit" : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Vehicle Unit</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this vehicle unit? This will also
              delete all associated expense records. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUnit}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Detail Drawer */}
      {detailUnit && (
        <VehicleUnitDetail
          unit={detailUnit}
          open={!!detailUnit}
          onClose={() => setDetailUnit(null)}
        />
      )}

      {/* Panels */}
      <FleetReportsPanel open={isReportsOpen} onClose={() => setIsReportsOpen(false)} />
      <DepreciationCalculator
        open={isDepreciationOpen}
        onClose={() => setIsDepreciationOpen(false)}
      />
    </AdminShell>
  );
}
