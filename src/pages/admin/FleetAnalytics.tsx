/**
 * Fleet Analytics & Vehicle Costing Module
 * Admin-only dashboard for utilization, costs, and profitability
 */
import { useState } from "react";
import { AdminShell } from "@/components/layout/AdminShell";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FleetOverviewTab } from "@/components/admin/fleet/FleetOverviewTab";
import { UtilizationTab } from "@/components/admin/fleet/UtilizationTab";
import { CostTrackingTab } from "@/components/admin/fleet/CostTrackingTab";
import { PerformanceComparisonTab } from "@/components/admin/fleet/PerformanceComparisonTab";
import { CompetitorPricingTab } from "@/components/admin/fleet/CompetitorPricingTab";
import { 
  BarChart3, 
  TrendingUp, 
  DollarSign, 
  GitCompare, 
  Building2 
} from "lucide-react";

export default function FleetAnalytics() {
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <AdminShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Fleet Analytics</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Vehicle utilization, costs, and profitability tracking
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="w-full justify-start overflow-x-auto flex-nowrap">
            <TabsTrigger value="overview" className="gap-1.5">
              <BarChart3 className="w-3.5 h-3.5" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="utilization" className="gap-1.5">
              <TrendingUp className="w-3.5 h-3.5" />
              Utilization
            </TabsTrigger>
            <TabsTrigger value="costs" className="gap-1.5">
              <DollarSign className="w-3.5 h-3.5" />
              Cost Tracking
            </TabsTrigger>
            <TabsTrigger value="comparison" className="gap-1.5">
              <GitCompare className="w-3.5 h-3.5" />
              Comparison
            </TabsTrigger>
            <TabsTrigger value="competitors" className="gap-1.5">
              <Building2 className="w-3.5 h-3.5" />
              Competitors
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <FleetOverviewTab />
          </TabsContent>
          <TabsContent value="utilization">
            <UtilizationTab />
          </TabsContent>
          <TabsContent value="costs">
            <CostTrackingTab />
          </TabsContent>
          <TabsContent value="comparison">
            <PerformanceComparisonTab />
          </TabsContent>
          <TabsContent value="competitors">
            <CompetitorPricingTab />
          </TabsContent>
        </Tabs>
      </div>
    </AdminShell>
  );
}
