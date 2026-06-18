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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, MoreVertical, Pencil, Trash2, Download, Search } from "lucide-react";
import {
  useVehicleUnits,
  useDeleteVehicleUnit,
  type VehicleUnit,
} from "@/hooks/use-vehicle-units";
import { useLocations } from "@/hooks/use-locations";
import { useFleetCategories } from "@/hooks/use-fleet-categories";
import { VehicleUnitEditDialog } from "./VehicleUnitEditDialog";
import { VinFormDialog } from "./VinFormDialog";

const STATUS: Record<string, { label: string; dot: string }> = {
  available: { label: "Available", dot: "bg-green-500" },
  on_rent: { label: "On Rent", dot: "bg-blue-500" },
  maintenance: { label: "Maintenance", dot: "bg-yellow-500" },
  damage: { label: "Damage", dot: "bg-red-500" },
  retired: { label: "Retired", dot: "bg-muted-foreground" },
  active: { label: "Active", dot: "bg-green-500" },
  pending: { label: "Pending", dot: "bg-yellow-500" },
};

interface Props {
  isTemporary?: boolean;
}

export function AllVehiclesTable({ isTemporary = false }: Props) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("q") || "");
  const locationId = searchParams.get("loc") || "all";
  const status = searchParams.get("status") || "all";
  const categoryId = searchParams.get("cat") || "all";

  const [editUnit, setEditUnit] = useState<VehicleUnit | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [deleteUnit, setDeleteUnit] = useState<VehicleUnit | null>(null);

  const { data: units, isLoading } = useVehicleUnits({
    isTemporary,
    locationId: locationId !== "all" ? locationId : undefined,
    status: status !== "all" ? status : undefined,
    categoryId: categoryId !== "all" ? categoryId : undefined,
    search: search.trim() || undefined,
  });
  const { data: locations } = useLocations();
  const { data: categories } = useFleetCategories();
  const deleteMutation = useDeleteVehicleUnit();

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
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search VIN or plate…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setParam("q", e.target.value);
              }}
              className="pl-8 h-9"
            />
          </div>

          <Select value={locationId} onValueChange={(v) => setParam("loc", v)}>
            <SelectTrigger className="w-[150px] h-9">
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
            <SelectTrigger className="w-[140px] h-9">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {Object.entries(STATUS).map(([key, cfg]) => (
                <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={categoryId} onValueChange={(v) => setParam("cat", v)}>
            <SelectTrigger className="w-[160px] h-9">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {categories?.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex-1" />

          <Button variant="outline" size="sm" onClick={exportCsv} disabled={!totalCount}>
            <Download className="w-4 h-4 mr-2" />
            CSV
          </Button>
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add vehicle
          </Button>
        </div>

        {/* Table */}
        <div className="border border-border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vehicle</TableHead>
                <TableHead>License Plate</TableHead>
                <TableHead>VIN</TableHead>
                <TableHead>Location</TableHead>
                <TableHead className="text-right">Kilometers</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-10" />
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
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setEditUnit(u)}>
                              <Pencil className="w-4 h-4 mr-2" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => setDeleteUnit(u)}
                            >
                              <Trash2 className="w-4 h-4 mr-2" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
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

      <VinFormDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        categoryId={categoryId !== "all" ? categoryId : ""}
        categoryName={categories?.find((c) => c.id === categoryId)?.name || ""}
      />

      <AlertDialog open={!!deleteUnit} onOpenChange={(o) => !o && setDeleteUnit(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this vehicle?</AlertDialogTitle>
            <AlertDialogDescription>
              VIN <span className="font-mono">{deleteUnit?.vin}</span> will be removed from the active
              fleet. If the vehicle has historical bookings or invoices, it will be archived
              (status = retired) instead of fully deleted, so finance records stay intact.
              Active or upcoming bookings will block this action.
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
    </Card>
  );
}
