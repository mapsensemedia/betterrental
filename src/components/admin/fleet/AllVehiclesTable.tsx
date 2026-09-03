/**
 * All Vehicles Master Table
 * Flat list of every permanent unit (is_temporary = false).
 */
import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Plus,
  Pencil,
  Trash2,
  Download,
  Search,
  ChevronDown,
  Archive,
  RotateCcw,
  CheckCircle2,
  Wrench,
  AlertTriangle,
  CreditCard,
} from "lucide-react";
import {
  useVehicleUnits,
  useDeleteVehicleUnit,
  useSetVehicleUnitStatus,
  type VehicleUnit,
} from "@/hooks/use-vehicle-units";
import { useLocations } from "@/hooks/use-locations";
import { useEffectiveLocationId } from "@/hooks/use-staff-location";
import { useFleetCategories } from "@/hooks/use-fleet-categories";
import { VehicleUnitEditDialog } from "./VehicleUnitEditDialog";
import { PlateDialog } from "./PlateDialog";
import { VinFormDialog } from "./VinFormDialog";

const STATUS: Record<string, { label: string; dot: string }> = {
  available: { label: "Available", dot: "bg-green-500" },
  on_rent: { label: "On Rent", dot: "bg-blue-500" },
  maintenance: { label: "Maintenance", dot: "bg-yellow-500" },
  damage: { label: "Damage", dot: "bg-red-500" },
  retired: { label: "Retired", dot: "bg-muted-foreground" },
  sold: { label: "Sold", dot: "bg-muted-foreground" },
  active: { label: "Active", dot: "bg-green-500" },
  pending: { label: "Pending", dot: "bg-yellow-500" },
};

/** Statuses staff can set directly from the row menu. */
const QUICK_STATUSES: { value: string; label: string; icon: typeof CheckCircle2 }[] = [
  { value: "available", label: "Available", icon: CheckCircle2 },
  { value: "maintenance", label: "Maintenance", icon: Wrench },
  { value: "damage", label: "Damage", icon: AlertTriangle },
];

const FILTER_STATUSES = ["available", "on_rent", "maintenance", "damage", "retired", "sold"];

interface Props {
  isTemporary?: boolean;
}

export function AllVehiclesTable({ isTemporary = false }: Props) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("q") || "");
  const { locationId: scopeLocationId, isReady: isScopeReady, isUnassignedManager } =
    useEffectiveLocationId();
  // The global branch scope wins over the local location filter.
  const locationId = scopeLocationId ?? (searchParams.get("loc") || "all");
  const status = searchParams.get("status") || "all";
  const categoryId = searchParams.get("cat") || "all";

  const [editUnit, setEditUnit] = useState<VehicleUnit | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [deleteUnit, setDeleteUnit] = useState<VehicleUnit | null>(null);
  const [retireUnit, setRetireUnit] = useState<VehicleUnit | null>(null);
  const [showRetired, setShowRetired] = useState(false);
  const [plateUnit, setPlateUnit] = useState<VehicleUnit | null>(null);

  const { data: allUnits, isLoading } = useVehicleUnits({
    isTemporary,
    locationId: locationId !== "all" ? locationId : undefined,
    status: status !== "all" ? status : undefined,
    categoryId: categoryId !== "all" ? categoryId : undefined,
    search: search.trim() || undefined,
  }, { enabled: isScopeReady && !isUnassignedManager });
  const { data: locations } = useLocations();
  const { data: categories } = useFleetCategories();
  const deleteMutation = useDeleteVehicleUnit();
  const setStatusMutation = useSetVehicleUnitStatus();

  // Retired / sold units are archive material — hidden unless asked for.
  const units = useMemo(() => {
    if (showRetired || status === "retired" || status === "sold") return allUnits ?? [];
    return (allUnits ?? []).filter((u) => u.status !== "retired" && u.status !== "sold");
  }, [allUnits, showRetired, status]);

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    if (!value || value === "all") next.delete(key);
    else next.set(key, value);
    setSearchParams(next, { replace: true });
  };

  const exportCsv = () => {
    if (!units?.length) return;
    const rows = [
      ["Vehicle", "License Plate", "VIN", "Location", "Kilometers", "Status"],
      ...units.map((u) => [
        u.vehicle ? `${u.vehicle.year ?? ""} ${u.vehicle.make ?? ""} ${u.vehicle.model ?? ""}`.trim() : "",
        u.license_plate ?? "",
        u.vin,
        u.location_name ?? "",
        u.current_mileage?.toString() ?? "",
        STATUS[u.status]?.label ?? u.status,
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${isTemporary ? "temporary-" : ""}vehicles-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDelete = async () => {
    if (!deleteUnit) return;
    try {
      await deleteMutation.mutateAsync(deleteUnit.id);
    } finally {
      setDeleteUnit(null);
    }
  };

  const totalCount = units?.length ?? 0;

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        {/* Filters Bar */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-full sm:flex-1 sm:min-w-[200px] sm:max-w-sm">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search make, model, year, VIN or plate…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setParam("q", e.target.value);
              }}
              className="pl-8 h-9 w-full"
            />
          </div>

          <Select
            value={locationId}
            onValueChange={(v) => setParam("loc", v)}
            disabled={!!scopeLocationId}
          >
            <SelectTrigger className="w-full sm:w-[150px] h-9">
              <SelectValue placeholder="Location" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All locations</SelectItem>
              {locations?.map((l) => (
                <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={status} onValueChange={(v) => setParam("status", v)}>
            <SelectTrigger className="w-full sm:w-[140px] h-9">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {FILTER_STATUSES.map((key) => (
                <SelectItem key={key} value={key}>{STATUS[key].label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={categoryId} onValueChange={(v) => setParam("cat", v)}>
            <SelectTrigger className="w-full sm:w-[160px] h-9">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {categories?.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <label className="flex items-center gap-2 text-sm whitespace-nowrap">
            <Checkbox checked={showRetired} onCheckedChange={(v) => setShowRetired(!!v)} />
            Show retired
          </label>

          <div className="hidden sm:block sm:flex-1" />

          <div className="flex gap-2 w-full sm:w-auto">
            <Button variant="outline" size="sm" onClick={exportCsv} disabled={!totalCount} className="flex-1 sm:flex-none">
              <Download className="w-4 h-4 mr-2" />
              CSV
            </Button>
            <Button size="sm" onClick={() => setAddOpen(true)} className="flex-1 sm:flex-none">
              <Plus className="w-4 h-4 mr-2" />
              Add vehicle
            </Button>
          </div>
        </div>

        {/* Table */}
        <div className="border border-border rounded-lg overflow-hidden">
          <Table className="min-w-[900px]">
            <TableHeader>
              <TableRow>
                <TableHead>Vehicle</TableHead>
                <TableHead>License Plate</TableHead>
                <TableHead>VIN</TableHead>
                <TableHead>Location</TableHead>
                <TableHead className="text-right">Kilometers</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="sticky right-0 bg-muted/50 text-right w-[150px] border-l border-border">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : totalCount === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-12 text-center text-sm text-muted-foreground">
                    No vehicles match the current filters.
                  </TableCell>
                </TableRow>
              ) : (
                units!.map((u) => {
                  const cfg = STATUS[u.status] ?? { label: u.status, dot: "bg-muted-foreground" };
                  const name = u.vehicle
                    ? `${u.vehicle.year ?? ""} ${u.vehicle.make ?? ""} ${u.vehicle.model ?? ""}`.trim()
                    : "—";
                  return (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">{name || "—"}</TableCell>
                      <TableCell className="font-mono text-sm">{u.license_plate || "—"}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{u.vin}</TableCell>
                      <TableCell className="text-sm">{u.location_name || "—"}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {u.current_mileage != null ? u.current_mileage.toLocaleString() : "—"}
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
                              <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
                                Set status
                              </DropdownMenuLabel>
                              {QUICK_STATUSES.filter((s) => s.value !== u.status).map((s) => (
                                <DropdownMenuItem
                                  key={s.value}
                                  onClick={() =>
                                    setStatusMutation.mutate({
                                      id: u.id,
                                      status: s.value,
                                      successTitle: `Marked ${s.label.toLowerCase()}`,
                                    })
                                  }
                                >
                                  <s.icon className="w-4 h-4 mr-2" /> {s.label}
                                </DropdownMenuItem>
                              ))}
                              <DropdownMenuSeparator />
                              {u.status === "retired" || u.status === "sold" ? (
                                <DropdownMenuItem
                                  onClick={() =>
                                    setStatusMutation.mutate({
                                      id: u.id,
                                      status: "available",
                                      successTitle: "Vehicle reactivated",
                                    })
                                  }
                                >
                                  <RotateCcw className="w-4 h-4 mr-2" /> Reactivate
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem onClick={() => setRetireUnit(u)}>
                                  <Archive className="w-4 h-4 mr-2" /> Retire vehicle
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem onClick={() => setPlateUnit(u)}>
                                <CreditCard className="w-4 h-4 mr-2" />
                                {u.license_plate ? "Change / remove plate" : "Add plate"}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => setDeleteUnit(u)}
                              >
                                <Trash2 className="w-4 h-4 mr-2" /> Delete permanently
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

        <p className="text-xs text-muted-foreground">
          Showing {totalCount} vehicle{totalCount === 1 ? "" : "s"}
          {isTemporary ? " (temporary)" : ""}.
        </p>
      </CardContent>

      {/* Dialogs */}
      <VehicleUnitEditDialog
        open={!!editUnit}
        onOpenChange={(o) => !o && setEditUnit(null)}
        unit={editUnit}
      />

      <PlateDialog
        unit={plateUnit}
        open={!!plateUnit}
        onOpenChange={(o) => !o && setPlateUnit(null)}
      />

      <VinFormDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        categoryId={categoryId !== "all" ? categoryId : ""}
        categoryName={categories?.find((c) => c.id === categoryId)?.name || ""}
      />

      <AlertDialog open={!!deleteUnit} onOpenChange={(o) => !o && setDeleteUnit(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Permanently delete this vehicle?</AlertDialogTitle>
            <AlertDialogDescription>
              VIN <span className="font-mono">{deleteUnit?.vin}</span> will be permanently deleted.
              Its expense, maintenance, and fleet-cost records will be removed. Past bookings and
              their invoices/payments are kept for finance history but will no longer reference
              this VIN. Damage reports filed against this VIN will be deleted. Active or upcoming
              bookings will block this action.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!retireUnit} onOpenChange={(o) => !o && setRetireUnit(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Retire this vehicle?</AlertDialogTitle>
            <AlertDialogDescription>
              VIN <span className="font-mono">{retireUnit?.vin}</span> leaves the active fleet: it
              stops appearing in availability and can no longer be assigned to bookings. All
              history — bookings, invoices, expenses and maintenance — is kept, and you can
              reactivate it any time from the "Show retired" list. Active or upcoming bookings
              block this action.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!retireUnit) return;
                try {
                  await setStatusMutation.mutateAsync({
                    id: retireUnit.id,
                    status: "retired",
                    guardBookings: true,
                    stampDisposalDate: true,
                    successTitle: "Vehicle retired",
                  });
                } finally {
                  setRetireUnit(null);
                }
              }}
            >
              Retire
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
