/**
 * UserRolesPanel - Admin panel to manage user roles
 */
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { Users, Plus, Trash2, Shield, Search } from "lucide-react";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

const ROLE_LABELS: Record<AppRole, { label: string; color: string }> = {
  admin: { label: "Admin", color: "bg-red-500/10 text-red-600 border-red-500/30" },
  staff: { label: "Staff", color: "bg-blue-500/10 text-blue-600 border-blue-500/30" },
  cleaner: { label: "Cleaner", color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30" },
  finance: { label: "Finance", color: "bg-amber-500/10 text-amber-600 border-amber-500/30" },
  support: { label: "Support", color: "bg-purple-500/10 text-purple-600 border-purple-500/30" },
  driver: { label: "Driver", color: "bg-cyan-500/10 text-cyan-600 border-cyan-500/30" },
};

interface UserRoleRow {
  id: string;
  userId: string;
  role: AppRole;
  email: string | null;
  fullName: string | null;
}

function useUserRolesList() {
  return useQuery({
    queryKey: ["admin-user-roles"],
    queryFn: async () => {
      const { data: roles, error } = await supabase
        .from("user_roles")
        .select("id, user_id, role")
        .order("role");

      if (error) throw error;

      // Fetch profiles for each user
      const userIds = [...new Set((roles || []).map(r => r.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", userIds);

      const profileMap = new Map((profiles || []).map(p => [p.id, p]));

      return (roles || []).map(r => ({
        id: r.id,
        userId: r.user_id,
        role: r.role as AppRole,
        email: profileMap.get(r.user_id)?.email || null,
        fullName: profileMap.get(r.user_id)?.full_name || null,
      })) as UserRoleRow[];
    },
  });
}

function useAddUserRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ email, role }: { email: string; role: AppRole }) => {
      // Find user by email in profiles
      const { data: profile, error: profileErr } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", email.toLowerCase().trim())
        .maybeSingle();

      if (profileErr || !profile) throw new Error("User not found with this email");

      // Check if role already exists
      const { data: existing } = await supabase
        .from("user_roles")
        .select("id")
        .eq("user_id", profile.id)
        .eq("role", role)
        .maybeSingle();

      if (existing) throw new Error("User already has this role");

      const { error } = await supabase
        .from("user_roles")
        .insert({ user_id: profile.id, role });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-user-roles"] });
      toast.success("Role assigned successfully");
    },
    onError: (err) => {
      toast.error((err as Error).message || "Failed to assign role");
    },
  });
}

function useRemoveUserRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (roleId: string) => {
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("id", roleId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-user-roles"] });
      toast.success("Role removed");
    },
    onError: () => {
      toast.error("Failed to remove role");
    },
  });
}

export function UserRolesPanel() {
  const { data: roles = [], isLoading } = useUserRolesList();
  const addRole = useAddUserRole();
  const removeRole = useRemoveUserRole();
  const [email, setEmail] = useState("");
  const [selectedRole, setSelectedRole] = useState<AppRole>("staff");
  const [search, setSearch] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; roleId: string | null; name: string }>({
    open: false, roleId: null, name: "",
  });

  const filteredRoles = roles.filter(r => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      r.email?.toLowerCase().includes(q) ||
      r.fullName?.toLowerCase().includes(q) ||
      r.role.toLowerCase().includes(q)
    );
  });

  const handleAdd = () => {
    if (!email.trim()) return;
    addRole.mutate({ email: email.trim(), role: selectedRole }, {
      onSuccess: () => setEmail(""),
    });
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="w-4 h-4" />
            User Roles Management
          </CardTitle>
          <CardDescription>
            Assign and manage roles for team members
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Add new role */}
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <Label className="text-xs">User Email</Label>
              <Input
                placeholder="user@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1"
                onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              />
            </div>
            <div className="w-32">
              <Label className="text-xs">Role</Label>
              <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as AppRole)}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ROLE_LABELS).map(([key, val]) => (
                    <SelectItem key={key} value={key}>{val.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleAdd} disabled={!email.trim() || addRole.isPending} className="shrink-0">
              <Plus className="w-4 h-4 mr-1" />
              Add
            </Button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, or role..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Roles table */}
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">User</TableHead>
                  <TableHead className="text-xs">Email</TableHead>
                  <TableHead className="text-xs">Role</TableHead>
                  <TableHead className="text-xs w-16"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-6 text-muted-foreground text-sm">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : filteredRoles.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-6 text-muted-foreground text-sm">
                      {search ? "No matching roles" : "No roles assigned yet"}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRoles.map(role => (
                    <TableRow key={role.id}>
                      <TableCell className="text-sm font-medium">
                        {role.fullName || "—"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {role.email || "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-xs ${ROLE_LABELS[role.role]?.color || ""}`}>
                          {ROLE_LABELS[role.role]?.label || role.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                          onClick={() => setDeleteConfirm({
                            open: true,
                            roleId: role.id,
                            name: `${role.fullName || role.email} (${role.role})`,
                          })}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={deleteConfirm.open} onOpenChange={(open) => setDeleteConfirm(prev => ({ ...prev, open }))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Role</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove the role for {deleteConfirm.name}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteConfirm.roleId) {
                  removeRole.mutate(deleteConfirm.roleId);
                }
                setDeleteConfirm({ open: false, roleId: null, name: "" });
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
