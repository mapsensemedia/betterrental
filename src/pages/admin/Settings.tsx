import { useState } from "react";
import { AdminShell } from "@/components/layout/AdminShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import { AddOnsPricingPanel } from "@/components/admin/AddOnsPricingPanel";
import { ProtectionPricingPanel } from "@/components/admin/ProtectionPricingPanel";
import { PointsSettingsPanel } from "@/components/admin/PointsSettingsPanel";
import { MembershipManagementPanel } from "@/components/admin/MembershipManagementPanel";
import { 
  Settings, 
  Bell, 
  Mail, 
  MessageSquare, 
  Clock, 
  Shield,
  Building2,
  CheckCircle,
} from "lucide-react";

export default function AdminSettings() {
  const [notifications, setNotifications] = useState({
    emailAlerts: true,
    smsAlerts: false,
    overdueAlerts: true,
    damageAlerts: true,
  });

  const [recoverySettings, setRecoverySettings] = useState({
    enabled: true,
    abandonedThresholdMinutes: 30,
    autoFollowUp: false,
  });

  const handleSave = () => {
    // Settings would be persisted to database in production
    toast({ title: "Settings saved", description: "Your preferences have been updated." });
  };

  return (
    <AdminShell>
      <div className="space-y-6 max-w-3xl">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Settings className="w-6 h-6" />
            Settings
          </h1>
          <p className="text-muted-foreground mt-1">
            Configure system preferences and notifications
          </p>
        </div>

        {/* Notification Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Bell className="w-4 h-4" />
              Notification Preferences
            </CardTitle>
            <CardDescription>
              Configure how you receive alerts and notifications
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  Email Alerts
                </Label>
                <p className="text-xs text-muted-foreground">
                  Receive email notifications for important events
                </p>
              </div>
              <Switch 
                checked={notifications.emailAlerts}
                onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, emailAlerts: checked }))}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-muted-foreground" />
                  SMS Alerts
                </Label>
                <p className="text-xs text-muted-foreground">
                  Receive SMS for urgent alerts
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">Requires Setup</Badge>
                <Switch 
                  checked={notifications.smsAlerts}
                  onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, smsAlerts: checked }))}
                />
              </div>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  Overdue Return Alerts
                </Label>
                <p className="text-xs text-muted-foreground">
                  Get notified when rentals are past their return time
                </p>
              </div>
              <Switch 
                checked={notifications.overdueAlerts}
                onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, overdueAlerts: checked }))}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Shield className="w-4 h-4 text-muted-foreground" />
                  Damage Report Alerts
                </Label>
                <p className="text-xs text-muted-foreground">
                  Immediate notification when damage is reported
                </p>
              </div>
              <Switch 
                checked={notifications.damageAlerts}
                onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, damageAlerts: checked }))}
              />
            </div>
          </CardContent>
        </Card>

        {/* Protection Package Pricing */}
        <ProtectionPricingPanel />

        {/* Add-Ons & Pricing */}
        <AddOnsPricingPanel />

        {/* Loyalty Points */}
        <PointsSettingsPanel />

        {/* Membership Tiers */}
        <MembershipManagementPanel />

        {/* Recovery Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              Cart Recovery Settings
            </CardTitle>
            <CardDescription>
              Configure abandoned cart detection and recovery
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">Enable Cart Recovery</Label>
                <p className="text-xs text-muted-foreground">
                  Track abandoned carts in the Recovery panel
                </p>
              </div>
              <Switch 
                checked={recoverySettings.enabled}
                onCheckedChange={(checked) => setRecoverySettings(prev => ({ ...prev, enabled: checked }))}
              />
            </div>

            <Separator />

            <div className="space-y-2">
              <Label className="text-sm font-medium">Abandonment Threshold (minutes)</Label>
              <p className="text-xs text-muted-foreground">
                Cart is considered abandoned after this inactivity period
              </p>
              <Input 
                type="number" 
                value={recoverySettings.abandonedThresholdMinutes}
                onChange={(e) => setRecoverySettings(prev => ({ 
                  ...prev, 
                  abandonedThresholdMinutes: parseInt(e.target.value) || 30 
                }))}
                min={5}
                max={120}
                className="w-32"
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">Auto Follow-up</Label>
                <p className="text-xs text-muted-foreground">
                  Automatically send recovery emails (coming soon)
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">Coming Soon</Badge>
                <Switch 
                  checked={recoverySettings.autoFollowUp}
                  onCheckedChange={(checked) => setRecoverySettings(prev => ({ ...prev, autoFollowUp: checked }))}
                  disabled
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button onClick={handleSave} className="gap-2">
            <CheckCircle className="w-4 h-4" />
            Save Settings
          </Button>
        </div>
      </div>
    </AdminShell>
  );
}
