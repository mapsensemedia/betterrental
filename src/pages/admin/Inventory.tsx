import { useState } from "react";
import { Link } from "react-router-dom";
import { AdminShell } from "@/components/layout/AdminShell";
import { useAdminVehicles, useAdminVehicle, useUpdateVehicle, useCreateVehicle, useDeleteVehicle, type CreateVehicleData } from "@/hooks/use-inventory";
import { useLocations } from "@/hooks/use-locations";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { StatusBadge } from "@/components/shared/StatusBadge";
import {
  Car,
  Search,
  Eye,
  RefreshCw,
  MapPin,
  Calendar,
  Settings,
  Clock,
  DollarSign,
  Users,
  Fuel,
  Cog,
  ShieldAlert,
  Plus,
  X,
  Trash2,
  Wrench,
} from "lucide-react";
import { format } from "date-fns";
import { MaintenanceDialog } from "@/components/admin/MaintenanceDialog";
import { DamageReportDialog } from "@/components/admin/DamageReportDialog";

const CATEGORIES = ["Sedan", "SUV", "Sports", "Luxury", "Electric", "Convertible", "Compact"];
const FUEL_TYPES = ["Petrol", "Diesel", "Electric", "Hybrid"];
const TRANSMISSIONS = ["Automatic", "Manual"];

export default function AdminInventory() {
  const [filters, setFilters] = useState({
    locationId: "",
    status: "all" as "available" | "unavailable" | "all",
    category: "",
    search: "",
  });
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editDialog, setEditDialog] = useState<{
    open: boolean;
    vehicleId: string | null;
    make: string;
    model: string;
    year: number;
    category: string;
    dailyRate: number;
    seats: number;
    fuelType: string;
    transmission: string;
    imageUrl: string;
    locationId: string;
    isAvailable: boolean;
    isFeatured: boolean;
    bufferHours: number;
  }>({
    open: false,
    vehicleId: null,
    make: "",
    model: "",
    year: new Date().getFullYear(),
    category: "Sedan",
    dailyRate: 100,
    seats: 5,
    fuelType: "Petrol",
    transmission: "Automatic",
    imageUrl: "",
    locationId: "",
    isAvailable: true,
    isFeatured: false,
    bufferHours: 2,
  });
  
  // Add vehicle dialog state
  const [addVehicleOpen, setAddVehicleOpen] = useState(false);
  const [newVehicle, setNewVehicle] = useState<CreateVehicleData>({
    make: "",
    model: "",
    year: new Date().getFullYear(),
    category: "Sedan",
    dailyRate: 100,
    seats: 5,
    fuelType: "Petrol",
    transmission: "Automatic",
    imageUrl: "",
    locationId: "",
    isAvailable: true,
    isFeatured: false,
    cleaningBufferHours: 2,
  });

  // Delete confirmation state
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    vehicleId: string | null;
    vehicleName: string;
  }>({ open: false, vehicleId: null, vehicleName: "" });

  // Maintenance dialog state
  const [maintenanceDialog, setMaintenanceDialog] = useState<{
    open: boolean;
    vehicleId: string;
    vehicleName: string;
    status: string | null;
    reason: string | null;
    until: string | null;
  }>({ open: false, vehicleId: "", vehicleName: "", status: null, reason: null, until: null });

  // Damage report dialog state
  const [damageDialog, setDamageDialog] = useState<{
    open: boolean;
    vehicleId: string;
    vehicleName: string;
  }>({ open: false, vehicleId: "", vehicleName: "" });

  const { data: vehicles, isLoading, refetch } = useAdminVehicles(filters);
  const { data: locations } = useLocations();
  const { data: vehicleDetail } = useAdminVehicle(selectedVehicleId);
  const updateVehicle = useUpdateVehicle();
  const createVehicle = useCreateVehicle();
  const deleteVehicle = useDeleteVehicle();

  const categories = [...new Set(vehicles?.map(v => v.category) || [])];

  const handleOpenDetail = (vehicleId: string) => {
    setSelectedVehicleId(vehicleId);
    setDetailOpen(true);
  };

  const handleOpenEdit = (vehicle: any) => {
    setEditDialog({
      open: true,
      vehicleId: vehicle.id,
      make: vehicle.make || "",
      model: vehicle.model || "",
      year: vehicle.year || new Date().getFullYear(),
      category: vehicle.category || "Sedan",
      dailyRate: vehicle.dailyRate || 100,
      seats: vehicle.seats || 5,
      fuelType: vehicle.fuelType || "Petrol",
      transmission: vehicle.transmission || "Automatic",
      imageUrl: vehicle.imageUrl || "",
      locationId: vehicle.locationId || "",
      isAvailable: vehicle.isAvailable ?? true,
      isFeatured: vehicle.isFeatured ?? false,
      bufferHours: vehicle.cleaningBufferHours ?? 2,
    });
  };

  const handleSaveEdit = () => {
    if (editDialog.vehicleId) {
      updateVehicle.mutate({
        vehicleId: editDialog.vehicleId,
        updates: {
          make: editDialog.make,
          model: editDialog.model,
          year: editDialog.year,
          category: editDialog.category,
          daily_rate: editDialog.dailyRate,
          seats: editDialog.seats,
          fuel_type: editDialog.fuelType,
          transmission: editDialog.transmission,
          image_url: editDialog.imageUrl || null,
          location_id: editDialog.locationId || null,
          is_available: editDialog.isAvailable,
          is_featured: editDialog.isFeatured,
          cleaning_buffer_hours: editDialog.bufferHours,
        },
      });
      setEditDialog({
        open: false,
        vehicleId: null,
        make: "",
        model: "",
        year: new Date().getFullYear(),
        category: "Sedan",
        dailyRate: 100,
        seats: 5,
        fuelType: "Petrol",
        transmission: "Automatic",
        imageUrl: "",
        locationId: "",
        isAvailable: true,
        isFeatured: false,
        bufferHours: 2,
      });
    }
  };

  const handleOpenDeleteConfirm = (vehicle: any) => {
    setDeleteDialog({
      open: true,
      vehicleId: vehicle.id,
      vehicleName: `${vehicle.year} ${vehicle.make} ${vehicle.model}`,
    });
  };

  const handleConfirmDelete = () => {
    if (deleteDialog.vehicleId) {
      deleteVehicle.mutate(deleteDialog.vehicleId);
      setDeleteDialog({ open: false, vehicleId: null, vehicleName: "" });
    }
  };

  const handleAddVehicle = () => {
    if (!newVehicle.make || !newVehicle.model || !newVehicle.year || !newVehicle.dailyRate) {
      return;
    }
    if (newVehicle.dailyRate <= 0) {
      return;
    }
    if ((newVehicle.seats || 5) < 1) {
      return;
    }
    createVehicle.mutate({
      ...newVehicle,
      locationId: newVehicle.locationId || undefined,
    }, {
      onSuccess: () => {
        setAddVehicleOpen(false);
        setNewVehicle({
          make: "",
          model: "",
          year: new Date().getFullYear(),
          category: "Sedan",
          dailyRate: 100,
          seats: 5,
          fuelType: "Petrol",
          transmission: "Automatic",
          imageUrl: "",
          locationId: "",
          isAvailable: true,
          isFeatured: false,
          cleaningBufferHours: 2,
        });
      },
    });
  };

  return (
    <AdminShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="heading-2">Inventory</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Manage your vehicle fleet
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => refetch()} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
            <Button onClick={() => setAddVehicleOpen(true)} size="sm">
              <Plus className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Add Vehicle</span>
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search make, model, year..."
                  value={filters.search}
                  onChange={(e) => setFilters(f => ({ ...f, search: e.target.value }))}
                  className="pl-10"
                />
              </div>

              <Select
                value={filters.locationId || "all"}
                onValueChange={(v) => setFilters(f => ({ ...f, locationId: v === "all" ? "" : v }))}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All Locations" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Locations</SelectItem>
                  {locations?.map((loc) => (
                    <SelectItem key={loc.id} value={loc.id}>
                      {loc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={filters.status}
                onValueChange={(v) => setFilters(f => ({ ...f, status: v as any }))}
              >
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="unavailable">Unavailable</SelectItem>
                </SelectContent>
              </Select>

              {categories.length > 0 && (
                <Select
                  value={filters.category || "all"}
                  onValueChange={(v) => setFilters(f => ({ ...f, category: v === "all" ? "" : v }))}
                >
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Vehicles Table */}
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <Table className="min-w-[800px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Daily Rate</TableHead>
                  <TableHead>Buffer</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <div className="flex items-center justify-center gap-2 text-muted-foreground">
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        Loading vehicles...
                      </div>
                    </TableCell>
                  </TableRow>
                ) : vehicles?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <div className="text-muted-foreground">
                        <Car className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p className="font-medium">No vehicles found</p>
                        <p className="text-sm">Try adjusting your filters</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  vehicles?.map((vehicle) => (
                    <TableRow key={vehicle.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {vehicle.imageUrl ? (
                            <img
                              src={vehicle.imageUrl}
                              alt={`${vehicle.make} ${vehicle.model}`}
                              className="w-12 h-12 rounded-lg object-cover"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                              <Car className="h-6 w-6 text-muted-foreground" />
                            </div>
                          )}
                          <div>
                            <p className="font-medium">
                              {vehicle.year} {vehicle.make} {vehicle.model}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {vehicle.transmission} • {vehicle.fuelType}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="capitalize">
                          {vehicle.category}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{vehicle.location?.name || "—"}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">${vehicle.dailyRate}</span>
                        <span className="text-muted-foreground">/day</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          {vehicle.cleaningBufferHours || 2}h
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={vehicle.isAvailable ? "default" : "secondary"}>
                          {vehicle.isAvailable ? "Available" : "Unavailable"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenDetail(vehicle.id)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenEdit(vehicle)}
                          >
                            <Settings className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setMaintenanceDialog({
                              open: true,
                              vehicleId: vehicle.id,
                              vehicleName: `${vehicle.year} ${vehicle.make} ${vehicle.model}`,
                              status: null,
                              reason: null,
                              until: null,
                            })}
                          >
                            <Wrench className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDamageDialog({
                              open: true,
                              vehicleId: vehicle.id,
                              vehicleName: `${vehicle.year} ${vehicle.make} ${vehicle.model}`,
                            })}
                            className="text-red-500 hover:text-red-600"
                          >
                            <ShieldAlert className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenDeleteConfirm(vehicle)}
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Stats */}
        {vehicles && vehicles.length > 0 && (
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>{vehicles.length} vehicle{vehicles.length !== 1 ? "s" : ""}</span>
            <span>
              {vehicles.filter(v => v.isAvailable).length} available,{" "}
              {vehicles.filter(v => !v.isAvailable).length} unavailable
            </span>
          </div>
        )}
      </div>

      {/* Vehicle Detail Sheet */}
      <Sheet open={detailOpen} onOpenChange={setDetailOpen}>
        <SheetContent className="w-full sm:max-w-xl overflow-hidden p-0">
          <SheetHeader className="px-6 py-4 border-b bg-muted/30">
            <SheetTitle>Vehicle Details</SheetTitle>
          </SheetHeader>

          <ScrollArea className="h-[calc(100vh-80px)]">
            {vehicleDetail ? (
              <div className="p-6 space-y-6">
                {/* Vehicle Info */}
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex gap-4">
                      {vehicleDetail.image_url ? (
                        <img
                          src={vehicleDetail.image_url}
                          alt={`${vehicleDetail.make} ${vehicleDetail.model}`}
                          className="w-32 h-24 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="w-32 h-24 rounded-lg bg-muted flex items-center justify-center">
                          <Car className="h-12 w-12 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold">
                          {vehicleDetail.year} {vehicleDetail.make} {vehicleDetail.model}
                        </h3>
                        <Badge variant="secondary" className="capitalize mt-1">
                          {vehicleDetail.category}
                        </Badge>
                        <div className="mt-3 flex flex-wrap gap-4 text-sm">
                          <div className="flex items-center gap-1.5">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            {vehicleDetail.seats} seats
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Fuel className="h-4 w-4 text-muted-foreground" />
                            {vehicleDetail.fuel_type}
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Cog className="h-4 w-4 text-muted-foreground" />
                            {vehicleDetail.transmission}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Status & Settings */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Status & Settings</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Availability</span>
                      <Badge variant={vehicleDetail.is_available ? "default" : "secondary"}>
                        {vehicleDetail.is_available ? "Available" : "Unavailable"}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Cleaning Buffer</span>
                      <span className="text-sm font-medium">{vehicleDetail.cleaning_buffer_hours || 2} hours</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Daily Rate</span>
                      <span className="text-sm font-medium">${Number(vehicleDetail.daily_rate).toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Location</span>
                      <span className="text-sm">{vehicleDetail.locations?.name || "—"}</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Recent Bookings */}
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        Recent Bookings
                      </CardTitle>
                      <Button variant="outline" size="sm" asChild>
                        <a href={`/admin/calendar?vehicle=${vehicleDetail.id}`}>
                          View Calendar
                        </a>
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {vehicleDetail.recentBookings?.length > 0 ? (
                      <div className="space-y-2">
                        {vehicleDetail.recentBookings.map((booking: any) => (
                          <div
                            key={booking.id}
                            className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50"
                          >
                            <div>
                              <Badge variant="outline" className="font-mono text-xs">
                                {booking.booking_code}
                              </Badge>
                              <p className="text-xs text-muted-foreground mt-1">
                                {format(new Date(booking.start_at), "MMM d")} - {format(new Date(booking.end_at), "MMM d")}
                              </p>
                            </div>
                            <StatusBadge status={booking.status} />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No recent bookings</p>
                    )}
                  </CardContent>
                </Card>

                {/* Damage History */}
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <ShieldAlert className="h-4 w-4" />
                        Damage History
                      </CardTitle>
                      <Button variant="outline" size="sm" asChild>
                        <a href={`/admin/damages?vehicle=${vehicleDetail.id}`}>
                          View All
                        </a>
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {vehicleDetail.damageHistory?.length > 0 ? (
                      <div className="space-y-2">
                        {vehicleDetail.damageHistory.map((damage: any) => (
                          <div
                            key={damage.id}
                            className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50"
                          >
                            <div>
                              <p className="text-sm font-medium">{damage.description}</p>
                              <p className="text-xs text-muted-foreground">
                                {format(new Date(damage.created_at), "PPp")}
                              </p>
                            </div>
                            <Badge variant={damage.severity === "severe" ? "destructive" : "secondary"}>
                              {damage.severity}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No damage reports</p>
                    )}
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="flex items-center justify-center h-64">
                <div className="animate-pulse text-muted-foreground">Loading...</div>
              </div>
            )}
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* Edit Dialog */}
      <Dialog open={editDialog.open} onOpenChange={(open) => !open && setEditDialog(prev => ({
        ...prev,
        open: false,
        vehicleId: null,
        make: "",
        model: "",
        year: new Date().getFullYear(),
        category: "Sedan",
        dailyRate: 100,
        seats: 5,
        fuelType: "Petrol",
        transmission: "Automatic",
        imageUrl: "",
        locationId: "",
        isAvailable: true,
        isFeatured: false,
        bufferHours: 2,
      }))}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Vehicle</DialogTitle>
            <DialogDescription>
              Update vehicle details, category, location, and settings.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-6 py-4">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-make">Make *</Label>
                <Input
                  id="edit-make"
                  placeholder="e.g., BMW, Mercedes, Audi"
                  value={editDialog.make}
                  onChange={(e) => setEditDialog(v => ({ ...v, make: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-model">Model *</Label>
                <Input
                  id="edit-model"
                  placeholder="e.g., 3 Series, C-Class, A4"
                  value={editDialog.model}
                  onChange={(e) => setEditDialog(v => ({ ...v, model: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-year">Year *</Label>
                <Input
                  id="edit-year"
                  type="number"
                  min={2000}
                  max={new Date().getFullYear() + 1}
                  value={editDialog.year}
                  onChange={(e) => setEditDialog(v => ({ ...v, year: parseInt(e.target.value) || new Date().getFullYear() }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-dailyRate">Daily Rate ($) *</Label>
                <Input
                  id="edit-dailyRate"
                  type="number"
                  min={0}
                  step={10}
                  value={editDialog.dailyRate}
                  onChange={(e) => setEditDialog(v => ({ ...v, dailyRate: parseFloat(e.target.value) || 0 }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-seats">Seats</Label>
                <Input
                  id="edit-seats"
                  type="number"
                  min={1}
                  max={12}
                  value={editDialog.seats}
                  onChange={(e) => setEditDialog(v => ({ ...v, seats: parseInt(e.target.value) || 5 }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select
                  value={editDialog.category}
                  onValueChange={(val) => setEditDialog(v => ({ ...v, category: val }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Fuel Type</Label>
                <Select
                  value={editDialog.fuelType}
                  onValueChange={(val) => setEditDialog(v => ({ ...v, fuelType: val }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FUEL_TYPES.map((fuel) => (
                      <SelectItem key={fuel} value={fuel}>{fuel}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Transmission</Label>
                <Select
                  value={editDialog.transmission}
                  onValueChange={(val) => setEditDialog(v => ({ ...v, transmission: val }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TRANSMISSIONS.map((trans) => (
                      <SelectItem key={trans} value={trans}>{trans}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Location</Label>
                <Select
                  value={editDialog.locationId || "none"}
                  onValueChange={(val) => setEditDialog(v => ({ ...v, locationId: val === "none" ? "" : val }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select location" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Location</SelectItem>
                    {locations?.map((loc) => (
                      <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Cleaning Buffer</Label>
                <Select
                  value={editDialog.bufferHours.toString()}
                  onValueChange={(v) => setEditDialog((s) => ({ ...s, bufferHours: parseInt(v) }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 hour</SelectItem>
                    <SelectItem value="2">2 hours</SelectItem>
                    <SelectItem value="3">3 hours</SelectItem>
                    <SelectItem value="4">4 hours</SelectItem>
                    <SelectItem value="6">6 hours</SelectItem>
                    <SelectItem value="8">8 hours</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-imageUrl">Image URL</Label>
              <Input
                id="edit-imageUrl"
                placeholder="https://example.com/car-image.jpg"
                value={editDialog.imageUrl}
                onChange={(e) => setEditDialog(v => ({ ...v, imageUrl: e.target.value }))}
              />
            </div>

            <Separator />

            <div className="flex items-center gap-8">
              <div className="flex items-center gap-2">
                <Switch
                  id="edit-isAvailable"
                  checked={editDialog.isAvailable}
                  onCheckedChange={(checked) => setEditDialog((s) => ({ ...s, isAvailable: checked }))}
                />
                <Label htmlFor="edit-isAvailable">Available for Booking</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="edit-isFeatured"
                  checked={editDialog.isFeatured}
                  onCheckedChange={(checked) => setEditDialog((s) => ({ ...s, isFeatured: checked }))}
                />
                <Label htmlFor="edit-isFeatured">Featured Vehicle</Label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialog(prev => ({
              ...prev,
              open: false,
              vehicleId: null,
              make: "",
              model: "",
              year: new Date().getFullYear(),
              category: "Sedan",
              dailyRate: 100,
              seats: 5,
              fuelType: "Petrol",
              transmission: "Automatic",
              imageUrl: "",
              locationId: "",
              isAvailable: true,
              isFeatured: false,
              bufferHours: 2,
            }))}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={updateVehicle.isPending}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Vehicle Dialog */}
      <Dialog open={addVehicleOpen} onOpenChange={setAddVehicleOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Vehicle</DialogTitle>
            <DialogDescription>
              Add a new vehicle to your inventory. It will be immediately available for booking.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-6 py-4">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="make">Make *</Label>
                <Input
                  id="make"
                  placeholder="e.g., BMW, Mercedes, Audi"
                  value={newVehicle.make}
                  onChange={(e) => setNewVehicle(v => ({ ...v, make: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="model">Model *</Label>
                <Input
                  id="model"
                  placeholder="e.g., 3 Series, C-Class, A4"
                  value={newVehicle.model}
                  onChange={(e) => setNewVehicle(v => ({ ...v, model: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="year">Year *</Label>
                <Input
                  id="year"
                  type="number"
                  min={2000}
                  max={new Date().getFullYear() + 1}
                  value={newVehicle.year}
                  onChange={(e) => setNewVehicle(v => ({ ...v, year: parseInt(e.target.value) || new Date().getFullYear() }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dailyRate">Daily Rate ($) *</Label>
                <Input
                  id="dailyRate"
                  type="number"
                  min={0}
                  step={10}
                  value={newVehicle.dailyRate}
                  onChange={(e) => setNewVehicle(v => ({ ...v, dailyRate: parseFloat(e.target.value) || 0 }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="seats">Seats</Label>
                <Input
                  id="seats"
                  type="number"
                  min={1}
                  max={12}
                  value={newVehicle.seats}
                  onChange={(e) => setNewVehicle(v => ({ ...v, seats: parseInt(e.target.value) || 5 }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select
                  value={newVehicle.category}
                  onValueChange={(val) => setNewVehicle(v => ({ ...v, category: val }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Fuel Type</Label>
                <Select
                  value={newVehicle.fuelType}
                  onValueChange={(val) => setNewVehicle(v => ({ ...v, fuelType: val }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FUEL_TYPES.map((fuel) => (
                      <SelectItem key={fuel} value={fuel}>{fuel}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Transmission</Label>
                <Select
                  value={newVehicle.transmission}
                  onValueChange={(val) => setNewVehicle(v => ({ ...v, transmission: val }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TRANSMISSIONS.map((trans) => (
                      <SelectItem key={trans} value={trans}>{trans}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Location</Label>
              <Select
                value={newVehicle.locationId || "none"}
                onValueChange={(val) => setNewVehicle(v => ({ ...v, locationId: val === "none" ? "" : val }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Location</SelectItem>
                  {locations?.map((loc) => (
                    <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="imageUrl">Image URL</Label>
              <Input
                id="imageUrl"
                placeholder="https://example.com/car-image.jpg"
                value={newVehicle.imageUrl}
                onChange={(e) => setNewVehicle(v => ({ ...v, imageUrl: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground">
                Enter a URL to a vehicle image (optional)
              </p>
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Cleaning Buffer</Label>
                <Select
                  value={(newVehicle.cleaningBufferHours || 2).toString()}
                  onValueChange={(val) => setNewVehicle(v => ({ ...v, cleaningBufferHours: parseInt(val) }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 hour</SelectItem>
                    <SelectItem value="2">2 hours</SelectItem>
                    <SelectItem value="3">3 hours</SelectItem>
                    <SelectItem value="4">4 hours</SelectItem>
                    <SelectItem value="6">6 hours</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-4 pt-6">
                <div className="flex items-center gap-2">
                  <Switch
                    id="isAvailable"
                    checked={newVehicle.isAvailable}
                    onCheckedChange={(checked) => setNewVehicle(v => ({ ...v, isAvailable: checked }))}
                  />
                  <Label htmlFor="isAvailable">Available for booking</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    id="isFeatured"
                    checked={newVehicle.isFeatured}
                    onCheckedChange={(checked) => setNewVehicle(v => ({ ...v, isFeatured: checked }))}
                  />
                  <Label htmlFor="isFeatured">Featured vehicle</Label>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAddVehicleOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleAddVehicle} 
              disabled={createVehicle.isPending || !newVehicle.make || !newVehicle.model}
            >
              {createVehicle.isPending ? "Adding..." : "Add Vehicle"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => !open && setDeleteDialog({ open: false, vehicleId: null, vehicleName: "" })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Vehicle from Inventory</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove <strong>{deleteDialog.vehicleName}</strong> from your inventory?
              <br /><br />
              This will mark the vehicle as unavailable and hide it from customers. Historical bookings will remain intact.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteVehicle.isPending ? "Removing..." : "Remove Vehicle"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Maintenance Dialog */}
      <MaintenanceDialog
        open={maintenanceDialog.open}
        onOpenChange={(open) => !open && setMaintenanceDialog({ ...maintenanceDialog, open: false })}
        vehicleId={maintenanceDialog.vehicleId}
        vehicleName={maintenanceDialog.vehicleName}
        currentStatus={maintenanceDialog.status}
        currentReason={maintenanceDialog.reason}
        currentUntil={maintenanceDialog.until}
      />

      {/* Damage Report Dialog */}
      <DamageReportDialog
        open={damageDialog.open}
        onOpenChange={(open) => !open && setDamageDialog({ ...damageDialog, open: false })}
        vehicleId={damageDialog.vehicleId}
        vehicleName={damageDialog.vehicleName}
      />
    </AdminShell>
  );
}
