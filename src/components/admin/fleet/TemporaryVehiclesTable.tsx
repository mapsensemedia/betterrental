/**
 * Temporary Vehicles Tab
 * Short-term loaner / partner vehicles. Same vehicle_units table with is_temporary=true.
 */
import { useMemo, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, Pencil, Trash2, RotateCcw, ChevronDown, CalendarClock } from "lucide-react";
import {
  useVehicleUnits,
  useCreateVehicleUnit,
  useUpdateVehicleUnit,
  useDeleteVehicleUnit,
  useSetVehicleUnitStatus,
  type VehicleUnit,
} from "@/hooks/use-vehicle-units";
import { useLocations } from "@/hooks/use-locations";
import { useEffectiveLocationId } from "@/hooks/use-staff-location";
import { useFleetCategories } from "@/hooks/use-fleet-categories";
import { toast } from "@/hooks/use-toast";
import { VehicleUnitEditDialog } from "./VehicleUnitEditDialog";

const STATUS: Record<string, { label: string; dot: string }> = {
  available: { label: "Available", dot: "bg-green-500" },
  on_rent: { label: "On Rent", dot: "bg-blue-500" },
  maintenance: { label: "Maintenance", dot: "bg-yellow-500" },
  damage: { label: "Damage", dot: "bg-red-500" },
  retired: { label: "Returned", dot: "bg-muted-foreground" },
};

function endingBadge(endDate: string | null | undefined) {
  if (!endDate) return null;
  const end = new Date(endDate + "T00:00:00");
  const days = Math.ceil((end.getTime() - Date.now()) / 86400000);
  if (days < 0) return <Badge variant="destructive" className="text-[10px]">Overdue</Badge>;
  if (days <= 3) return <Badge className="bg-yellow-500 text-white text-[10px]">{days}d left</Badge>;
  return null;
}

export function TemporaryVehiclesTable() {
  const [showRetired, setShowRetired] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [editUnit, setEditUnit] = useState<VehicleUnit | null>(null);
  const [deleteUnit, setDeleteUnit] = useState<VehicleUnit | null>(null);
  const [returnUnit, setReturnUnit] = useState<VehicleUnit | null>(null);
  const [dateUnit, setDateUnit] = useState<VehicleUnit | null>(null);
  const [newEndDate, setNewEndDate] = useState("");

  const { locationId: scopeLocationId, isReady: isScopeReady, isUnassignedManager } =
    useEffectiveLocationId();
  const { data: allUnits, isLoading } = useVehicleUnits(
    { isTemporary: true, locationId: scopeLocationId ?? undefined },
    { enabled: isScopeReady && !isUnassignedManager },
  );
  const { data: locations } = useLocations();
  const deleteMutation = useDeleteVehicleUnit();
  const updateMutation = useUpdateVehicleUnit();
  const setStatusMutation = useSetVehicleUnitStatus();

  const units = useMemo(
    () => (allUnits ?? []).filter((u) => (showRetired ? true : u.status !== "retired")),
    [allUnits, showRetired]
  );

  const confirmReturn = async () => {
    if (!returnUnit) return;
    try {
      await setStatusMutation.mutateAsync({
        id: returnUnit.id,
        status: "retired",
        guardBookings: true,
        stampDisposalDate: true,
        successTitle: "Marked returned to source",
      });
    } finally {
      setReturnUnit(null);
    }
  };

  const saveEndDate = async () => {
    if (!dateUnit) return;
    try {
      await updateMutation.mutateAsync({
        id: dateUnit.id,
        temp_end_date: newEndDate || null,
      } as any);
      toast({ title: "Return date updated" });
    } finally {
      setDateUnit(null);
    }
  };


  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <h3 className="text-sm font-semibold">Temporary fleet</h3>
            <p className="text-xs text-muted-foreground">
              Loaner / partner vehicles used on short-term basis. Listed separately from owned fleet.
            </p>
          </div>
          <div className="flex-1" />
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={showRetired} onCheckedChange={(v) => setShowRetired(!!v)} />
            Show returned
          </label>
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add temporary vehicle
          </Button>
        </div>

        <div className="border border-border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vehicle</TableHead>
                <TableHead>Plate</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Ends</TableHead>
                <TableHead className="text-right">Daily cost</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="sticky right-0 bg-muted/50 text-right w-[150px] border-l border-border">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 8 }).map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : units.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-10 text-center text-sm text-muted-foreground">
                    No temporary vehicles. Add one to get started.
                  </TableCell>
                </TableRow>
              ) : (
                units.map((u) => {
                  const cfg = STATUS[u.status] ?? { label: u.status, dot: "bg-muted-foreground" };
                  const name = u.vehicle
                    ? `${u.vehicle.year ?? ""} ${u.vehicle.make ?? ""} ${u.vehicle.model ?? ""}`.trim()
                    : "—";
                  return (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">{name || "—"}</TableCell>
                      <TableCell className="font-mono text-sm">{u.license_plate || "—"}</TableCell>
                      <TableCell className="text-sm">{u.temp_source || "—"}</TableCell>
                      <TableCell className="text-sm">{u.location_name || "—"}</TableCell>
                      <TableCell className="text-sm">
                        <div className="flex items-center gap-2">
                          {u.temp_end_date ? new Date(u.temp_end_date).toLocaleDateString() : "—"}
                          {endingBadge(u.temp_end_date)}
                        </div>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {u.temp_daily_cost != null ? `$${Number(u.temp_daily_cost).toFixed(2)}` : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="gap-1.5 font-normal">
                          <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                          {cfg.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="sticky right-0 bg-card border-l border-border">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="outline" size="sm" className="h-8" onClick={() => setEditUnit(u)}>
                            <Pencil className="w-3.5 h-3.5 mr-1.5" /> Edit
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="outline" size="sm" className="h-8 px-2">
                                More <ChevronDown className="w-3.5 h-3.5 ml-1" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-52">
                              {u.status !== "retired" && (
                                <>
                                  <DropdownMenuItem onClick={() => setReturnUnit(u)}>
                                    <RotateCcw className="w-4 h-4 mr-2" /> Mark as returned
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setNewEndDate(u.temp_end_date || "");
                                      setDateUnit(u);
                                    }}
                                  >
                                    <CalendarClock className="w-4 h-4 mr-2" /> Change return date
                                  </DropdownMenuItem>
                                </>
                              )}
                              {u.status === "retired" && (
                                <DropdownMenuItem
                                  onClick={() =>
                                    setStatusMutation.mutate({
                                      id: u.id,
                                      status: "available",
                                      successTitle: "Temporary vehicle reactivated",
                                    })
                                  }
                                >
                                  <RotateCcw className="w-4 h-4 mr-2" /> Reactivate
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => setDeleteUnit(u)}
                              >
                                <Trash2 className="w-4 h-4 mr-2" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      <AddTemporaryVehicleDialog open={addOpen} onOpenChange={setAddOpen} />

      <VehicleUnitEditDialog
        open={!!editUnit}
        onOpenChange={(o) => !o && setEditUnit(null)}
        unit={editUnit}
      />

      <AlertDialog open={!!deleteUnit} onOpenChange={(o) => !o && setDeleteUnit(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this temporary vehicle?</AlertDialogTitle>
            <AlertDialogDescription>
              VIN <span className="font-mono">{deleteUnit?.vin}</span> will be removed.
              If it has historical bookings, it will be archived (status = retired) instead.
              Active or upcoming bookings will block this action.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!deleteUnit) return;
                try { await deleteMutation.mutateAsync(deleteUnit.id); } finally { setDeleteUnit(null); }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

/* ------------------------ Add dialog ------------------------ */

function AddTemporaryVehicleDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const { data: locations } = useLocations();
  const { data: categories } = useFleetCategories();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    source: "",
    make: "",
    model: "",
    year: new Date().getFullYear().toString(),
    license_plate: "",
    vin: "",
    category_id: "",
    location_id: "",
    start_date: new Date().toISOString().slice(0, 10),
    end_date: "",
    daily_cost: "",
    current_mileage: "",
    notes: "",
  });

  const reset = () => setForm({
    source: "", make: "", model: "", year: new Date().getFullYear().toString(),
    license_plate: "", vin: "", category_id: "", location_id: "",
    start_date: new Date().toISOString().slice(0, 10), end_date: "",
    daily_cost: "", current_mileage: "", notes: "",
  });

  const submit = async () => {
    if (!form.source.trim() || !form.license_plate.trim() || !form.location_id) {
      toast({ title: "Missing required fields", description: "Source, plate, and location are required.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      // 1. Create a backing vehicle row (required by vehicle_units.vehicle_id FK)
      const categoryName = categories?.find((c) => c.id === form.category_id)?.name || "Temporary";
      const { data: vehicle, error: vErr } = await supabase
        .from("vehicles")
        .insert({
          make: form.make || form.source,
          model: form.model || "Temporary",
          year: Number(form.year) || new Date().getFullYear(),
          daily_rate: 0,
          category: categoryName,
          is_available: true,
        })
        .select()
        .single();
      if (vErr) throw vErr;

      const vin = form.vin.trim().toUpperCase() || `TMP-${Math.random().toString(36).slice(2, 10).toUpperCase()}`;

      const { error } = await supabase.from("vehicle_units").insert({
        vehicle_id: vehicle.id,
        vin,
        license_plate: form.license_plate.toUpperCase(),
        category_id: form.category_id || null,
        location_id: form.location_id,
        status: "available",
        current_mileage: form.current_mileage ? Number(form.current_mileage) : null,
        notes: form.notes || null,
        is_temporary: true,
        temp_source: form.source,
        temp_start_date: form.start_date || null,
        temp_end_date: form.end_date || null,
        temp_daily_cost: form.daily_cost ? Number(form.daily_cost) : null,
      } as any);
      if (error) throw error;

      toast({ title: "Temporary vehicle added" });
      reset();
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: "Failed to add", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Add temporary vehicle</DialogTitle>
          <DialogDescription>
            Track a short-term loaner or partner vehicle. Cost is informational only — it does not affect
            customer-facing pricing.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <Label>Source / vendor *</Label>
            <Input value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} placeholder="Enterprise, Owner: Raj, …" />
          </div>
          <div>
            <Label>Year</Label>
            <Input type="number" value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} />
          </div>
          <div>
            <Label>Make</Label>
            <Input value={form.make} onChange={(e) => setForm({ ...form, make: e.target.value })} />
          </div>
          <div className="col-span-2">
            <Label>Model</Label>
            <Input value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} />
          </div>
          <div>
            <Label>License plate *</Label>
            <Input value={form.license_plate} onChange={(e) => setForm({ ...form, license_plate: e.target.value })} />
          </div>
          <div>
            <Label>VIN (optional)</Label>
            <Input value={form.vin} onChange={(e) => setForm({ ...form, vin: e.target.value })} placeholder="Auto-generated if blank" />
          </div>
          <div>
            <Label>Category</Label>
            <Select value={form.category_id} onValueChange={(v) => setForm({ ...form, category_id: v })}>
              <SelectTrigger><SelectValue placeholder="Pick category" /></SelectTrigger>
              <SelectContent>
                {categories?.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Location *</Label>
            <Select value={form.location_id} onValueChange={(v) => setForm({ ...form, location_id: v })}>
              <SelectTrigger><SelectValue placeholder="Pick location" /></SelectTrigger>
              <SelectContent>
                {locations?.map((l) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Start date</Label>
            <Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
          </div>
          <div>
            <Label>End date</Label>
            <Input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
          </div>
          <div>
            <Label>Daily cost to us</Label>
            <Input type="number" step="0.01" value={form.daily_cost} onChange={(e) => setForm({ ...form, daily_cost: e.target.value })} />
          </div>
          <div>
            <Label>Current kilometers</Label>
            <Input type="number" value={form.current_mileage} onChange={(e) => setForm({ ...form, current_mileage: e.target.value })} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button onClick={submit} disabled={saving}>{saving ? "Adding…" : "Add vehicle"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
