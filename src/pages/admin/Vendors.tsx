/**
 * Vendor Directory Page
 * Central vendor management with contacts, service history, and ratings
 */
import { useState } from "react";
import { AdminShell } from "@/components/layout/AdminShell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Plus, Search, Star, Phone, Mail, MapPin, Building2,
  Edit2, Trash2, History, Filter,
} from "lucide-react";
import { format } from "date-fns";
import { useAuth } from "@/hooks/use-auth";
import {
  useVendors, useCreateVendor, useUpdateVendor, useDeleteVendor,
  useVendorServiceHistory, VENDOR_TYPES, Vendor,
} from "@/hooks/use-vendors";

export default function VendorsPage() {
  const { user } = useAuth();
  const [typeFilter, setTypeFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editVendor, setEditVendor] = useState<Vendor | null>(null);
  const [deleteVendor, setDeleteVendor] = useState<Vendor | null>(null);
  const [detailVendor, setDetailVendor] = useState<Vendor | null>(null);

  const { data: vendors, isLoading } = useVendors({ type: typeFilter, active: true });
  const createVendor = useCreateVendor();
  const updateVendorMut = useUpdateVendor();
  const deleteVendorMut = useDeleteVendor();

  const filtered = (vendors || []).filter((v) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      v.name.toLowerCase().includes(q) ||
      v.contact_name?.toLowerCase().includes(q) ||
      v.city?.toLowerCase().includes(q)
    );
  });

  const [form, setForm] = useState({
    name: "", vendor_type: "general", contact_name: "", contact_email: "",
    contact_phone: "", address: "", city: "", notes: "", rating: "",
  });

  const resetForm = () => setForm({
    name: "", vendor_type: "general", contact_name: "", contact_email: "",
    contact_phone: "", address: "", city: "", notes: "", rating: "",
  });

  const openAdd = () => { resetForm(); setIsAddOpen(true); };
  const openEdit = (v: Vendor) => {
    setForm({
      name: v.name, vendor_type: v.vendor_type,
      contact_name: v.contact_name || "", contact_email: v.contact_email || "",
      contact_phone: v.contact_phone || "", address: v.address || "",
      city: v.city || "", notes: v.notes || "",
      rating: v.rating != null ? String(v.rating) : "",
    });
    setEditVendor(v);
  };

  const handleSave = async () => {
    const payload = {
      name: form.name,
      vendor_type: form.vendor_type,
      contact_name: form.contact_name || null,
      contact_email: form.contact_email || null,
      contact_phone: form.contact_phone || null,
      address: form.address || null,
      city: form.city || null,
      notes: form.notes || null,
      rating: form.rating ? Number(form.rating) : null,
      is_active: true,
      created_by: user?.id || null,
    };

    if (editVendor) {
      await updateVendorMut.mutateAsync({ id: editVendor.id, ...payload });
      setEditVendor(null);
    } else {
      await createVendor.mutateAsync(payload as any);
      setIsAddOpen(false);
    }
    resetForm();
  };

  const handleDelete = async () => {
    if (!deleteVendor) return;
    await deleteVendorMut.mutateAsync(deleteVendor.id);
    setDeleteVendor(null);
  };

  const renderStars = (rating: number | null) => {
    if (rating == null) return <span className="text-muted-foreground text-xs">No rating</span>;
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((s) => (
          <Star
            key={s}
            className={`w-3.5 h-3.5 ${s <= rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`}
          />
        ))}
        <span className="text-xs ml-1 text-muted-foreground">{rating}</span>
      </div>
    );
  };

  const VendorForm = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Vendor Name *</Label>
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Vendor name" />
        </div>
        <div className="space-y-2">
          <Label>Type</Label>
          <Select value={form.vendor_type} onValueChange={(v) => setForm({ ...form, vendor_type: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {VENDOR_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Contact Name</Label>
          <Input value={form.contact_name} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>Phone</Label>
          <Input value={form.contact_phone} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Email</Label>
          <Input type="email" value={form.contact_email} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>Rating (0-5)</Label>
          <Input type="number" min="0" max="5" step="0.5" value={form.rating} onChange={(e) => setForm({ ...form, rating: e.target.value })} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Address</Label>
          <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>City</Label>
          <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Notes</Label>
        <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} />
      </div>
    </div>
  );

  return (
    <AdminShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Vendor Directory</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Centralized vendor management — contacts, service history & ratings
            </p>
          </div>
          <Button onClick={openAdd}>
            <Plus className="w-4 h-4 mr-2" />
            Add Vendor
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search vendors..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[150px]">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {VENDOR_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Vendor Table */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-14" />)}
          </div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Building2 className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">No vendors found</p>
              <Button variant="outline" className="mt-3" onClick={openAdd}>Add your first vendor</Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Rating</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((v) => (
                    <TableRow key={v.id} className="cursor-pointer" onClick={() => setDetailVendor(v)}>
                      <TableCell>
                        <p className="font-medium">{v.name}</p>
                        {v.contact_name && <p className="text-xs text-muted-foreground">{v.contact_name}</p>}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">{v.vendor_type}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-0.5">
                          {v.contact_phone && (
                            <div className="flex items-center gap-1 text-xs">
                              <Phone className="w-3 h-3" />{v.contact_phone}
                            </div>
                          )}
                          {v.contact_email && (
                            <div className="flex items-center gap-1 text-xs">
                              <Mail className="w-3 h-3" />{v.contact_email}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {v.city && (
                          <div className="flex items-center gap-1 text-sm">
                            <MapPin className="w-3 h-3" />{v.city}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>{renderStars(v.rating ? Number(v.rating) : null)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" onClick={() => openEdit(v)}>
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => setDeleteVendor(v)}>
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Add Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Add Vendor</DialogTitle></DialogHeader>
          <VendorForm />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={!form.name || createVendor.isPending}>
              {createVendor.isPending ? "Adding..." : "Add Vendor"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editVendor} onOpenChange={(o) => !o && setEditVendor(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Edit Vendor</DialogTitle></DialogHeader>
          <VendorForm />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditVendor(null)}>Cancel</Button>
            <Button onClick={handleSave} disabled={!form.name || updateVendorMut.isPending}>
              {updateVendorMut.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteVendor} onOpenChange={(o) => !o && setDeleteVendor(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Vendor</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteVendor?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Detail Sheet */}
      <VendorDetailSheet vendor={detailVendor} onClose={() => setDetailVendor(null)} />
    </AdminShell>
  );
}

function VendorDetailSheet({ vendor, onClose }: { vendor: Vendor | null; onClose: () => void }) {
  const { data: history, isLoading } = useVendorServiceHistory(vendor?.name || null);

  if (!vendor) return null;

  return (
    <Sheet open={!!vendor} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="pb-4 border-b">
          <SheetTitle>{vendor.name}</SheetTitle>
          <SheetDescription>
            <Badge variant="outline" className="capitalize">{vendor.vendor_type}</Badge>
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Contact Info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Contact Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {vendor.contact_name && (
                <div className="flex items-center gap-2"><Building2 className="w-4 h-4 text-muted-foreground" />{vendor.contact_name}</div>
              )}
              {vendor.contact_phone && (
                <div className="flex items-center gap-2"><Phone className="w-4 h-4 text-muted-foreground" />{vendor.contact_phone}</div>
              )}
              {vendor.contact_email && (
                <div className="flex items-center gap-2"><Mail className="w-4 h-4 text-muted-foreground" />{vendor.contact_email}</div>
              )}
              {vendor.address && (
                <div className="flex items-center gap-2"><MapPin className="w-4 h-4 text-muted-foreground" />{vendor.address}{vendor.city ? `, ${vendor.city}` : ""}</div>
              )}
              {vendor.notes && (
                <p className="text-muted-foreground mt-2 border-t pt-2">{vendor.notes}</p>
              )}
            </CardContent>
          </Card>

          {/* Service History */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <History className="w-4 h-4" />
                Service History
              </CardTitle>
              <CardDescription>
                Jobs completed by this vendor across the system
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-10" />)}</div>
              ) : !history?.length ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No service history found
                </p>
              ) : (
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  {history.map((h) => (
                    <div key={`${h.source}-${h.id}`} className="flex items-start justify-between border-b pb-2 last:border-0">
                      <div>
                        <p className="text-sm">{h.description}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Badge variant="outline" className="text-xs capitalize">{h.source}</Badge>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(h.date), "MMM d, yyyy")}
                          </span>
                        </div>
                      </div>
                      <span className="font-medium text-sm">${h.cost.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </SheetContent>
    </Sheet>
  );
}
