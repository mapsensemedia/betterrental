import { useState } from "react";
import { AdminShell } from "@/components/layout/AdminShell";
import { useAdminVehicles, useAdminVehicle, useUpdateVehicle } from "@/hooks/use-inventory";
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
} from "lucide-react";
import { format } from "date-fns";

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
    isAvailable: boolean;
    bufferHours: number;
  }>({ open: false, vehicleId: null, isAvailable: true, bufferHours: 2 });

  const { data: vehicles, isLoading, refetch } = useAdminVehicles(filters);
  const { data: locations } = useLocations();
  const { data: vehicleDetail } = useAdminVehicle(selectedVehicleId);
  const updateVehicle = useUpdateVehicle();

  const categories = [...new Set(vehicles?.map(v => v.category) || [])];

  const handleOpenDetail = (vehicleId: string) => {
    setSelectedVehicleId(vehicleId);
    setDetailOpen(true);
  };

  const handleOpenEdit = (vehicle: any) => {
    setEditDialog({
      open: true,
      vehicleId: vehicle.id,
      isAvailable: vehicle.isAvailable ?? true,
      bufferHours: vehicle.cleaningBufferHours ?? 2,
    });
  };

  const handleSaveEdit = () => {
    if (editDialog.vehicleId) {
      updateVehicle.mutate({
        vehicleId: editDialog.vehicleId,
        updates: {
          is_available: editDialog.isAvailable,
          cleaning_buffer_hours: editDialog.bufferHours,
        },
      });
      setEditDialog({ open: false, vehicleId: null, isAvailable: true, bufferHours: 2 });
    }
  };

  return (
    <AdminShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="heading-2">Inventory</h1>
            <p className="text-muted-foreground mt-1">
              Manage your vehicle fleet
            </p>
          </div>
          <Button onClick={() => refetch()} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-4">
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
          <CardContent className="p-0">
            <Table>
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
      <Dialog open={editDialog.open} onOpenChange={(open) => !open && setEditDialog({ open: false, vehicleId: null, isAvailable: true, bufferHours: 2 })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Vehicle Settings</DialogTitle>
            <DialogDescription>
              Update availability status and cleaning buffer time.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Available for Booking</Label>
                <p className="text-sm text-muted-foreground">
                  Toggle to make vehicle available or unavailable
                </p>
              </div>
              <Switch
                checked={editDialog.isAvailable}
                onCheckedChange={(checked) =>
                  setEditDialog((s) => ({ ...s, isAvailable: checked }))
                }
              />
            </div>

            <Separator />

            <div className="space-y-2">
              <Label>Cleaning Buffer (hours)</Label>
              <Select
                value={editDialog.bufferHours.toString()}
                onValueChange={(v) =>
                  setEditDialog((s) => ({ ...s, bufferHours: parseInt(v) }))
                }
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
              <p className="text-sm text-muted-foreground">
                Time required between bookings for cleaning
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialog({ open: false, vehicleId: null, isAvailable: true, bufferHours: 2 })}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={updateVehicle.isPending}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminShell>
  );
}
