/**
 * Staff Management (Super Admin only)
 *
 * Lists staff, creates manager accounts, and assigns or changes their branch.
 * Exactly two business roles exist: `super_admin` (all branches) and
 * `manager` (locked to one branch).
 */
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AdminShell } from "@/components/layout/AdminShell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Plus, MapPin, ShieldCheck, UserCog, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useStaffLocation } from "@/hooks/use-staff-location";

interface StaffRow {
  id: string;
  user_id: string;
  location_id: string | null;
  display_name: string | null;
  employee_code: string | null;
  is_active: boolean;
  email: string | null;
  roles: string[];
}

interface LocationRow {
  id: string;
  name: string;
}

const UNASSIGNED = "__none__";

async function callManageStaff<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke("manage-staff", { body });
  if (error) throw new Error(error.message);
  if (data && typeof data === "object" && "error" in data) {
    throw new Error(String((data as { error: string }).error));
  }
  return data as T;
}

export default function StaffPage() {
  const queryClient = useQueryClient();
  const { isSuperAdmin, isLoading: scopeLoading } = useStaffLocation();

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [employeeCode, setEmployeeCode] = useState("");
  const [newLocationId, setNewLocationId] = useState<string>("");
  const [newRole, setNewRole] = useState<"manager" | "super_admin">("manager");

  const { data, isLoading } = useQuery({
    queryKey: ["staff-management"],
    queryFn: () => callManageStaff<{ staff: StaffRow[]; locations: LocationRow[] }>({ action: "list" }),
    enabled: isSuperAdmin,
  });

  const staff = data?.staff ?? [];
  const locations = data?.locations ?? [];

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["staff-management"] });
    queryClient.invalidateQueries({ queryKey: ["staff-assignment"] });
  };

  const createStaff = useMutation({
    mutationFn: () =>
      callManageStaff<{ reusedExistingAccount: boolean }>({
        action: "create",
        email,
        displayName: displayName || null,
        employeeCode: employeeCode || null,
        locationId: newRole === "manager" ? newLocationId : null,
        role: newRole,
      }),
    onSuccess: (res) => {
      toast({
        title: res.reusedExistingAccount ? "Existing account linked" : "Staff account created",
        description: "A password setup email has been sent to the address.",
      });
      setIsAddOpen(false);
      setEmail("");
      setDisplayName("");
      setEmployeeCode("");
      setNewLocationId("");
      invalidate();
    },
    onError: (err: Error) =>
      toast({ title: "Could not create staff", description: err.message, variant: "destructive" }),
  });

  const setLocation = useMutation({
    mutationFn: (vars: { staffId: string; locationId: string | null }) =>
      callManageStaff({ action: "set_location", ...vars }),
    onSuccess: () => {
      toast({ title: "Branch updated" });
      invalidate();
    },
    onError: (err: Error) =>
      toast({ title: "Could not update branch", description: err.message, variant: "destructive" }),
  });

  const setActive = useMutation({
    mutationFn: (vars: { staffId: string; isActive: boolean }) =>
      callManageStaff({ action: "set_active", ...vars }),
    onSuccess: () => {
      toast({ title: "Staff status updated" });
      invalidate();
    },
    onError: (err: Error) =>
      toast({ title: "Could not update status", description: err.message, variant: "destructive" }),
  });

  const sendSetupLink = useMutation({
    mutationFn: (targetEmail: string) =>
      callManageStaff({ action: "send_setup_link", email: targetEmail }),
    onSuccess: () => toast({ title: "Password setup email sent" }),
    onError: (err: Error) =>
      toast({ title: "Could not send email", description: err.message, variant: "destructive" }),
  });

  if (!scopeLoading && !isSuperAdmin) {
    return (
      <AdminShell>
        <Card>
          <CardHeader>
            <CardTitle>Restricted</CardTitle>
            <CardDescription>Only Super Admins can manage staff accounts.</CardDescription>
          </CardHeader>
        </Card>
      </AdminShell>
    );
  }

  return (
    <AdminShell>
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Staff</h1>
            <p className="text-sm text-muted-foreground">
              Managers see only their assigned branch. Super Admins see every branch.
            </p>
          </div>
          <Button onClick={() => setIsAddOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add staff
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Staff accounts</CardTitle>
            <CardDescription>{staff.length} account{staff.length === 1 ? "" : "s"}</CardDescription>
          </CardHeader>
          <CardContent className="p-0 sm:p-0">
            {isLoading ? (
              <div className="p-6 space-y-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Branch</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {staff.map((s) => {
                      const isSuper = s.roles.includes("super_admin") || s.roles.includes("admin");
                      return (
                        <TableRow key={s.id}>
                          <TableCell className="font-medium">
                            {s.display_name || "—"}
                            {s.employee_code && (
                              <span className="ml-2 text-xs text-muted-foreground">{s.employee_code}</span>
                            )}
                          </TableCell>
                          <TableCell className="text-sm">{s.email || "—"}</TableCell>
                          <TableCell>
                            <Badge variant={isSuper ? "default" : "secondary"} className="gap-1">
                              {isSuper ? <ShieldCheck className="w-3 h-3" /> : <UserCog className="w-3 h-3" />}
                              {isSuper ? "Super Admin" : "Manager"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {isSuper ? (
                              <span className="text-sm text-muted-foreground">All branches</span>
                            ) : (
                              <Select
                                value={s.location_id ?? UNASSIGNED}
                                onValueChange={(v) =>
                                  setLocation.mutate({
                                    staffId: s.id,
                                    locationId: v === UNASSIGNED ? null : v,
                                  })
                                }
                              >
                                <SelectTrigger className="w-[190px]">
                                  <MapPin className="w-4 h-4 mr-2" />
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value={UNASSIGNED}>Unassigned</SelectItem>
                                  {locations.map((l) => (
                                    <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant={s.is_active ? "outline" : "destructive"}>
                              {s.is_active ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right whitespace-nowrap">
                            {s.email && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => sendSetupLink.mutate(s.email!)}
                              >
                                <Mail className="w-4 h-4 mr-1" />
                                Reset
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setActive.mutate({ staffId: s.id, isActive: !s.is_active })}
                            >
                              {s.is_active ? "Deactivate" : "Activate"}
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {staff.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-10">
                          No staff accounts yet.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add staff</DialogTitle>
            <DialogDescription>
              The account is created without a password — the person receives a setup email.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="staff-email">Email</Label>
              <Input
                id="staff-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@c2crental.ca"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="staff-name">Full name</Label>
              <Input id="staff-name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="staff-code">Employee code (optional)</Label>
              <Input id="staff-code" value={employeeCode} onChange={(e) => setEmployeeCode(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={newRole} onValueChange={(v) => setNewRole(v as "manager" | "super_admin")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manager">Manager (one branch)</SelectItem>
                  <SelectItem value="super_admin">Super Admin (all branches)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {newRole === "manager" && (
              <div className="space-y-2">
                <Label>Branch</Label>
                <Select value={newLocationId} onValueChange={setNewLocationId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select branch" />
                  </SelectTrigger>
                  <SelectContent>
                    {locations.map((l) => (
                      <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
            <Button
              onClick={() => createStaff.mutate()}
              disabled={
                createStaff.isPending ||
                !email ||
                (newRole === "manager" && !newLocationId)
              }
            >
              {createStaff.isPending ? "Creating…" : "Create staff"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminShell>
  );
}
