/**
 * Staff Management (Super Admin only)
 *
 * Lists staff, creates accounts with an admin-chosen password, edits their
 * details/role/branch/status, and deletes accounts.
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
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Plus, MapPin, ShieldCheck, UserCog, Mail, Eye, EyeOff, RefreshCw, Pencil, Trash2 } from "lucide-react";
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

type Role = "manager" | "super_admin";

function generatePassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  let out = "";
  const bytes = new Uint32Array(12);
  crypto.getRandomValues(bytes);
  for (let i = 0; i < 12; i++) out += chars[bytes[i] % chars.length];
  return `C2C${out}`;
}

function isSuperRole(roles: string[]) {
  return roles.includes("super_admin") || roles.includes("admin");
}

async function callManageStaff<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke("manage-staff", { body });
  if (error) throw new Error(error.message);
  if (data && typeof data === "object" && "error" in data) {
    throw new Error(String((data as { error: string }).error));
  }
  return data as T;
}

function PasswordField({
  id, value, onChange, label, placeholder,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  label: string;
  placeholder?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Input
            id={id}
            type={show ? "text" : "password"}
            value={value}
            placeholder={placeholder}
            autoComplete="new-password"
            onChange={(e) => onChange(e.target.value)}
            className="pr-9"
          />
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label={show ? "Hide password" : "Show password"}
          >
            {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => { onChange(generatePassword()); setShow(true); }}
        >
          <RefreshCw className="w-4 h-4 mr-1" />
          Generate
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">Minimum 8 characters. Share it with the staff member.</p>
    </div>
  );
}

export default function StaffPage() {
  const queryClient = useQueryClient();
  const { isSuperAdmin, isLoading: scopeLoading } = useStaffLocation();

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [employeeCode, setEmployeeCode] = useState("");
  const [newLocationId, setNewLocationId] = useState<string>("");
  const [newRole, setNewRole] = useState<Role>("manager");
  const [newPassword, setNewPassword] = useState("");

  const [editTarget, setEditTarget] = useState<StaffRow | null>(null);
  const [editName, setEditName] = useState("");
  const [editCode, setEditCode] = useState("");
  const [editRole, setEditRole] = useState<Role>("manager");
  const [editLocationId, setEditLocationId] = useState<string>(UNASSIGNED);
  const [editActive, setEditActive] = useState(true);
  const [editPassword, setEditPassword] = useState("");

  const [deleteTarget, setDeleteTarget] = useState<StaffRow | null>(null);

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

  const openEdit = (s: StaffRow) => {
    setEditTarget(s);
    setEditName(s.display_name ?? "");
    setEditCode(s.employee_code ?? "");
    setEditRole(isSuperRole(s.roles) ? "super_admin" : "manager");
    setEditLocationId(s.location_id ?? UNASSIGNED);
    setEditActive(s.is_active);
    setEditPassword("");
  };

  const createStaff = useMutation({
    mutationFn: () =>
      callManageStaff<{ reusedExistingAccount: boolean; passwordSet: boolean }>({
        action: "create",
        email,
        displayName: displayName || null,
        employeeCode: employeeCode || null,
        locationId: newRole === "manager" ? newLocationId : null,
        role: newRole,
        password: newPassword || null,
      }),
    onSuccess: (res) => {
      toast({
        title: res.reusedExistingAccount ? "Existing account linked" : "Staff account created",
        description: res.passwordSet
          ? "The account is ready — share the password you entered with the staff member."
          : "A password setup email has been sent to the address.",
      });
      setIsAddOpen(false);
      setEmail("");
      setDisplayName("");
      setEmployeeCode("");
      setNewLocationId("");
      setNewPassword("");
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

  const updateStaff = useMutation({
    mutationFn: () =>
      callManageStaff<{ passwordSet: boolean }>({
        action: "update",
        staffId: editTarget!.id,
        displayName: editName || null,
        employeeCode: editCode || null,
        role: editRole,
        locationId: editRole === "manager"
          ? (editLocationId === UNASSIGNED ? null : editLocationId)
          : null,
        isActive: editActive,
        password: editPassword || null,
      }),
    onSuccess: (res) => {
      toast({
        title: "Staff updated",
        description: res.passwordSet ? "New password set — share it with the staff member." : undefined,
      });
      setEditTarget(null);
      invalidate();
    },
    onError: (err: Error) =>
      toast({ title: "Could not update staff", description: err.message, variant: "destructive" }),
  });

  const deleteStaff = useMutation({
    mutationFn: (staffId: string) =>
      callManageStaff<{ warning?: string }>({ action: "delete", staffId }),
    onSuccess: (res) => {
      toast({
        title: "Staff deleted",
        description: res?.warning ?? "The account can no longer sign in.",
        variant: res?.warning ? "destructive" : undefined,
      });
      setDeleteTarget(null);
      invalidate();
    },
    onError: (err: Error) =>
      toast({ title: "Could not delete staff", description: err.message, variant: "destructive" }),
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
                      const isSuper = isSuperRole(s.roles);
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
                            <Select
                              value={s.is_active ? "active" : "inactive"}
                              onValueChange={(v) =>
                                setActive.mutate({ staffId: s.id, isActive: v === "active" })
                              }
                            >
                              <SelectTrigger className="w-[130px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="active">Active</SelectItem>
                                <SelectItem value="inactive">Inactive</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="text-right whitespace-nowrap">
                            <Button variant="ghost" size="sm" onClick={() => openEdit(s)}>
                              <Pencil className="w-4 h-4 mr-1" />
                              Edit
                            </Button>
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
                              className="text-destructive hover:text-destructive"
                              onClick={() => setDeleteTarget(s)}
                            >
                              <Trash2 className="w-4 h-4 mr-1" />
                              Delete
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

      {/* Add staff */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add staff</DialogTitle>
            <DialogDescription>
              Set a password here to hand out credentials directly. Leave it blank to send a setup
              email instead (only works for real mailboxes).
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
              <Select value={newRole} onValueChange={(v) => setNewRole(v as Role)}>
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
            <PasswordField
              id="staff-password"
              label="Password"
              value={newPassword}
              onChange={setNewPassword}
              placeholder="Leave blank to email a setup link"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
            <Button
              onClick={() => createStaff.mutate()}
              disabled={
                createStaff.isPending ||
                !email ||
                (newRole === "manager" && !newLocationId) ||
                (!!newPassword && newPassword.length < 8)
              }
            >
              {createStaff.isPending ? "Creating…" : "Create staff"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit staff */}
      <Dialog open={!!editTarget} onOpenChange={(open) => !open && setEditTarget(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit staff</DialogTitle>
            <DialogDescription>{editTarget?.email ?? ""}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Full name</Label>
              <Input id="edit-name" value={editName} onChange={(e) => setEditName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-code">Employee code</Label>
              <Input id="edit-code" value={editCode} onChange={(e) => setEditCode(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={editRole} onValueChange={(v) => setEditRole(v as Role)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manager">Manager (one branch)</SelectItem>
                  <SelectItem value="super_admin">Super Admin (all branches)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {editRole === "manager" && (
              <div className="space-y-2">
                <Label>Branch</Label>
                <Select value={editLocationId} onValueChange={setEditLocationId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select branch" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={UNASSIGNED}>Unassigned</SelectItem>
                    {locations.map((l) => (
                      <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={editActive ? "active" : "inactive"}
                onValueChange={(v) => setEditActive(v === "active")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <PasswordField
              id="edit-password"
              label="Set new password (optional)"
              value={editPassword}
              onChange={setEditPassword}
              placeholder="Leave blank to keep current password"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTarget(null)}>Cancel</Button>
            <Button
              onClick={() => updateStaff.mutate()}
              disabled={
                updateStaff.isPending ||
                (!!editPassword && editPassword.length < 8)
              }
            >
              {updateStaff.isPending ? "Saving…" : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete staff */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this staff member?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.display_name || deleteTarget?.email} will be removed and can no longer
              sign in. Past records that mention them (processed-by, activity history) stay intact.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(e) => {
                e.preventDefault();
                if (deleteTarget) deleteStaff.mutate(deleteTarget.id);
              }}
            >
              {deleteStaff.isPending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminShell>
  );
}
