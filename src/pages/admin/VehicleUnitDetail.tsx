/**
 * Vehicle Unit Detail Page
 * Shows complete cost analysis, timeline, bookings, and recommendations for a VIN
 */
import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AdminShell } from "@/components/layout/AdminShell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { useVehicleUnit } from "@/hooks/use-vehicle-units";
import { useVehicleUnitCostTimeline, useFleetCostAnalysisByVehicle } from "@/hooks/use-fleet-cost-analysis";
import { useMaintenanceLogsByUnit } from "@/hooks/use-maintenance-logs";
import { MaintenanceLogDialog } from "@/components/admin/fleet/MaintenanceLogDialog";
import { VehicleUnitEditDialog } from "@/components/admin/fleet/VehicleUnitEditDialog";
import { useUnitRentalHistory } from "@/hooks/use-unit-rental-history";
import { format } from "date-fns";
import {
  ArrowLeft,
  Car,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Calendar,
  Wrench,
  AlertTriangle,
  Plus,
  Download,
  Activity,
  Gauge,
  FileText,
  Lightbulb,
  Edit2,
  ClipboardList,
} from "lucide-react";

export default function VehicleUnitDetail() {
  const { unitId } = useParams<{ unitId: string }>();
  const navigate = useNavigate();
  const [maintenanceDialogOpen, setMaintenanceDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const { data: unit, isLoading: unitLoading } = useVehicleUnit(unitId || null);
  const { data: vehicleMetrics } = useFleetCostAnalysisByVehicle();
  const { data: timeline, isLoading: timelineLoading } = useVehicleUnitCostTimeline(unitId || null);
  const { data: maintenanceLogs } = useMaintenanceLogsByUnit(unitId || null);
  const { data: rentalHistory, isLoading: rentalHistoryLoading } = useUnitRentalHistory(unitId || null);

  const metrics = vehicleMetrics?.find((v) => v.vehicleUnitId === unitId);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);

  const handleExportCSV = () => {
    if (!timeline?.length || !unit) return;

    const headers = ["Date", "Type", "Description", "Amount"];
    const rows = timeline.map((e) => [
      format(new Date(e.date), "yyyy-MM-dd"),
      e.type,
      e.description,
      e.isPositive ? e.amount : -e.amount,
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `vehicle-${unit.vin}-timeline.csv`;
    a.click();
  };

  if (unitLoading) {
    return (
      <AdminShell>
        <div className="space-y-4">
          <Skeleton className="h-8 w-64" />
          <div className="grid md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24" />)}
          </div>
          <Skeleton className="h-96" />
        </div>
      </AdminShell>
    );
  }

  if (!unit) {
    return (
      <AdminShell>
        <div className="flex flex-col items-center justify-center py-12">
          <Car className="w-12 h-12 text-muted-foreground mb-4" />
          <h2 className="text-lg font-medium">Vehicle not found</h2>
          <Button variant="outline" onClick={() => navigate(-1)} className="mt-4">
            Go Back
          </Button>
        </div>
      </AdminShell>
    );
  }

  const vehicle = unit.vehicle as any;

  return (
    <AdminShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                {vehicle?.year} {vehicle?.make} {vehicle?.model}
              </h1>
              <p className="text-muted-foreground">
                VIN: {unit.vin} • Plate: {unit.license_plate || "Not assigned"}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={unit.status === "active" ? "default" : "secondary"}>
              {unit.status}
            </Badge>
            <Button variant="outline" size="sm" onClick={() => setEditDialogOpen(true)}>
              <Edit2 className="w-4 h-4 mr-2" />
              Edit
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportCSV}>
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        {/* Key Metrics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <DollarSign className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{formatCurrency(metrics?.acquisitionCost || 0)}</p>
                  <p className="text-xs text-muted-foreground">Acquisition Cost</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/10">
                  <TrendingUp className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{formatCurrency(metrics?.totalRentalRevenue || 0)}</p>
                  <p className="text-xs text-muted-foreground">Total Revenue</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-500/10">
                  <Activity className="w-5 h-5 text-amber-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{formatCurrency(metrics?.totalExpenses || 0)}</p>
                  <p className="text-xs text-muted-foreground">Total Costs</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${(metrics?.netProfit || 0) >= 0 ? "bg-green-500/10" : "bg-destructive/10"}`}>
                  {(metrics?.netProfit || 0) >= 0 ? (
                    <TrendingUp className="w-5 h-5 text-green-500" />
                  ) : (
                    <TrendingDown className="w-5 h-5 text-destructive" />
                  )}
                </div>
                <div>
                  <p className={`text-2xl font-bold ${(metrics?.netProfit || 0) >= 0 ? "text-green-600" : "text-destructive"}`}>
                    {formatCurrency(metrics?.netProfit || 0)}
                  </p>
                  <p className="text-xs text-muted-foreground">Net Profit</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recommendation Banner */}
        {metrics?.recommendation && metrics.recommendation !== "Vehicle performing well" && (
          <Card className="border-amber-500/50 bg-amber-500/5">
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <Lightbulb className="w-5 h-5 text-amber-500" />
                <div>
                  <p className="font-medium">Recommendation</p>
                  <p className="text-sm text-muted-foreground">{metrics.recommendation}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tabs */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview" className="gap-1.5">
              <Car className="w-3.5 h-3.5" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="timeline" className="gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              Timeline
            </TabsTrigger>
            <TabsTrigger value="maintenance" className="gap-1.5">
              <Wrench className="w-3.5 h-3.5" />
              Maintenance
            </TabsTrigger>
            <TabsTrigger value="rental-history" className="gap-1.5">
              <ClipboardList className="w-3.5 h-3.5" />
              Rental History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              {/* Vehicle Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Vehicle Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Make/Model</span>
                    <span className="font-medium">{vehicle?.make} {vehicle?.model}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Year</span>
                    <span className="font-medium">{vehicle?.year}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Acquisition Date</span>
                    <span className="font-medium">
                      {unit.acquisition_date ? format(new Date(unit.acquisition_date), "MMM d, yyyy") : "—"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Color</span>
                    <span className="font-medium">{unit.color || "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tank Capacity</span>
                    <span className="font-medium">
                      {unit.tank_capacity_liters ? `${unit.tank_capacity_liters}L` : "—"}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Mileage & Efficiency */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Gauge className="w-4 h-4" />
                    Mileage & Efficiency
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Mileage at Acquisition</span>
                    <span className="font-medium">
                      {metrics?.mileageAtAcquisition?.toLocaleString() || "—"} mi
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Current Mileage</span>
                    <span className="font-medium">
                      {metrics?.currentMileage?.toLocaleString() || "—"} km
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Distance Driven</span>
                    <span className="font-medium">
                      {metrics?.totalMilesDriven?.toLocaleString() || 0} km
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Cost per km</span>
                    <span className="font-medium">${metrics?.costPerMile?.toFixed(2) || "0.00"} CAD</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Revenue per Mile</span>
                    <span className="font-medium text-green-600">${metrics?.revenuePerMile?.toFixed(2) || "0.00"}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Rental Stats */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Rental Statistics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Rentals</span>
                    <span className="font-medium">{metrics?.rentalCount || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Rental Days</span>
                    <span className="font-medium">{metrics?.totalRentalDays || 0} days</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Avg Rental Duration</span>
                    <span className="font-medium">{metrics?.avgRentalDuration?.toFixed(1) || 0} days</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Profit Margin</span>
                    <span className={`font-medium ${(metrics?.profitMargin || 0) >= 0 ? "text-green-600" : "text-destructive"}`}>
                      {metrics?.profitMargin?.toFixed(1) || 0}%
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Cost Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Cost Breakdown</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Acquisition</span>
                    <span className="font-medium">{formatCurrency(metrics?.acquisitionCost || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Damage Costs</span>
                    <span className="font-medium text-destructive">{formatCurrency(metrics?.totalDamageCost || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Maintenance</span>
                    <span className="font-medium text-amber-600">{formatCurrency(metrics?.totalMaintenanceCost || 0)}</span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span className="font-medium">Total Expenses</span>
                    <span className="font-medium">{formatCurrency(metrics?.totalExpenses || 0)}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="timeline" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Revenue & Cost Timeline</CardTitle>
                <CardDescription>All financial events for this vehicle</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {timelineLoading ? (
                  <div className="p-4"><Skeleton className="h-40" /></div>
                ) : !timeline?.length ? (
                  <div className="py-8 text-center text-muted-foreground">
                    No events recorded yet
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {timeline.map((event) => (
                        <TableRow key={event.id}>
                          <TableCell className="text-sm">
                            {format(new Date(event.date), "MMM d, yyyy")}
                          </TableCell>
                          <TableCell>
                            <Badge variant={event.type === "revenue" ? "default" : "outline"}>
                              {event.type}
                            </Badge>
                          </TableCell>
                          <TableCell className="max-w-xs truncate">{event.description}</TableCell>
                          <TableCell className={`text-right font-medium ${event.isPositive ? "text-green-600" : "text-destructive"}`}>
                            {event.isPositive ? "+" : "-"}{formatCurrency(event.amount)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="maintenance" className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Maintenance Records</h3>
              <Button onClick={() => setMaintenanceDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Maintenance
              </Button>
            </div>

            <Card>
              <CardContent className="p-0">
                {!maintenanceLogs?.length ? (
                  <div className="py-8 text-center text-muted-foreground">
                    <Wrench className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No maintenance records yet</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Vendor</TableHead>
                        <TableHead className="text-right">Cost</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {maintenanceLogs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell className="text-sm">
                            {format(new Date(log.service_date), "MMM d, yyyy")}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{log.maintenance_type.replace(/_/g, " ")}</Badge>
                          </TableCell>
                          <TableCell className="max-w-xs truncate">{log.description || "—"}</TableCell>
                          <TableCell>{log.vendor_name || "—"}</TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(log.cost)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="rental-history" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Rental History</CardTitle>
                <CardDescription>All bookings assigned to this vehicle unit</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {rentalHistoryLoading ? (
                  <div className="p-4"><Skeleton className="h-40" /></div>
                ) : !rentalHistory?.length ? (
                  <div className="py-8 text-center text-muted-foreground">
                    <ClipboardList className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No rental history yet</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Code</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Dates</TableHead>
                        <TableHead>Duration</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Revenue</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rentalHistory.map((booking) => (
                        <TableRow key={booking.id}>
                          <TableCell className="font-mono text-xs">{booking.booking_code}</TableCell>
                          <TableCell>
                            <div>
                              <p className="text-sm font-medium">{booking.customer_name}</p>
                              <p className="text-xs text-muted-foreground">{booking.customer_email}</p>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">
                            {format(new Date(booking.start_at), "MMM d")} — {format(new Date(booking.end_at), "MMM d, yyyy")}
                          </TableCell>
                          <TableCell>{booking.total_days} days</TableCell>
                          <TableCell>
                            <Badge variant={booking.status === "completed" ? "default" : booking.status === "active" ? "secondary" : "outline"}>
                              {booking.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(booking.total_amount)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <MaintenanceLogDialog
        open={maintenanceDialogOpen}
        onOpenChange={setMaintenanceDialogOpen}
        vehicleUnitId={unitId}
      />

      <VehicleUnitEditDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        unit={unit}
      />
    </AdminShell>
  );
}
