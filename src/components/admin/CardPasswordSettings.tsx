/**
 * CardPasswordSettings - Admin panel to set/update the password for viewing card details
 */
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, Eye, EyeOff, CheckCircle } from "lucide-react";
import { toast } from "sonner";

export function CardPasswordSettings() {
  const queryClient = useQueryClient();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const { data: currentSetting } = useQuery({
    queryKey: ["card-view-password-setting"],
    queryFn: async () => {
      const { data } = await supabase
        .from("system_settings" as any)
        .select("value")
        .eq("key", "card_view_password")
        .maybeSingle();
      return (data as any)?.value || "admin123";
    },
  });

  const updatePassword = useMutation({
    mutationFn: async (password: string) => {
      const { error } = await supabase
        .from("system_settings" as any)
        .upsert({ key: "card_view_password", value: password } as any, {
          onConflict: "key",
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["card-view-password-setting"] });
      toast.success("Card view password updated");
      setNewPassword("");
      setConfirmPassword("");
    },
    onError: () => {
      toast.error("Failed to update password");
    },
  });

  const handleSave = () => {
    if (newPassword.length < 4) {
      toast.error("Password must be at least 4 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords don't match");
      return;
    }
    updatePassword.mutate(newPassword);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Lock className="w-4 h-4" />
          Card Details View Password
        </CardTitle>
        <CardDescription>
          Set a password that staff must enter to view full credit card details on booking summaries
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-3 bg-muted/50 rounded-lg text-sm text-muted-foreground">
          Current password is set. Staff need this password to reveal cardholder name and full card reference in the booking summary.
        </div>

        <div className="space-y-3">
          <div>
            <Label className="text-sm">New Password</Label>
            <div className="relative mt-1">
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="Enter new password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          <div>
            <Label className="text-sm">Confirm Password</Label>
            <Input
              type="password"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="mt-1"
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
            />
          </div>

          <Button
            onClick={handleSave}
            disabled={!newPassword || !confirmPassword || updatePassword.isPending}
            className="gap-2"
          >
            <CheckCircle className="w-4 h-4" />
            {updatePassword.isPending ? "Saving..." : "Update Password"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
