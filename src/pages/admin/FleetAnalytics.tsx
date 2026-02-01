/**
 * Fleet Analytics & Vehicle Costing Module
 * Admin-only dashboard for utilization, costs, and profitability
 */
import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { AdminShell } from "@/components/layout/AdminShell";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { FleetOverviewTab } from "@/components/admin/fleet/FleetOverviewTab";
import { UtilizationTab } from "@/components/admin/fleet/UtilizationTab";
import { CostTrackingTab } from "@/components/admin/fleet/CostTrackingTab";
import { PerformanceComparisonTab } from "@/components/admin/fleet/PerformanceComparisonTab";
import { CompetitorPricingTab } from "@/components/admin/fleet/CompetitorPricingTab";
import { CategoryManagementTab } from "@/components/admin/fleet/CategoryManagementTab";
import { ByVehicleTab } from "@/components/admin/fleet/ByVehicleTab";
import { ByCategoryTab } from "@/components/admin/fleet/ByCategoryTab";
import { FleetRevenueVsCostChart, FleetProfitTrendChart } from "@/components/admin/fleet/FleetCharts";
import { 
  BarChart3, 
  TrendingUp, 
  DollarSign, 
  GitCompare, 
  Building2,
  RefreshCw,
  Download,
  FolderOpen,
  Car,
  PieChart,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export default function FleetAnalytics() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "overview";
  const [isRefreshing, setIsRefreshing] = useState(false);
  const queryClient = useQueryClient();

  const setActiveTab = (tab: string) => {
    setSearchParams({ tab });
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ["fleet-analytics"] });
    await queryClient.invalidateQueries({ queryKey: ["vehicle-units"] });
    await queryClient.invalidateQueries({ queryKey: ["fleet-cost-analysis"] });
    await queryClient.invalidateQueries({ queryKey: ["vehicle-categories"] });
    setIsRefreshing(false);
    toast.success("Fleet data refreshed");
  };

  return (
    <AdminShell>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Fleet Analytics</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Vehicle utilization, costs, and profitability tracking
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon" onClick={handleRefresh} disabled={isRefreshing}>
                  <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Refresh data</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon">
                  <Download className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Export report</TooltipContent>
            </Tooltip>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <div className="overflow-x-auto">
            <TabsList className="w-full justify-start flex-nowrap inline-flex">
              <TabsTrigger value="overview" className="gap-1.5">
                <BarChart3 className="w-3.5 h-3.5" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="by-vehicle" className="gap-1.5">
                <Car className="w-3.5 h-3.5" />
                By Vehicle
              </TabsTrigger>
              <TabsTrigger value="by-category" className="gap-1.5">
                <PieChart className="w-3.5 h-3.5" />
                By Category
              </TabsTrigger>
              <TabsTrigger value="categories" className="gap-1.5">
                <FolderOpen className="w-3.5 h-3.5" />
                Categories
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
          </div>

          <TabsContent value="overview" className="space-y-6">
            <FleetOverviewTab />
            <div className="grid md:grid-cols-2 gap-6">
              <FleetRevenueVsCostChart />
              <FleetProfitTrendChart />
            </div>
          </TabsContent>
          <TabsContent value="by-vehicle">
            <ByVehicleTab />
          </TabsContent>
          <TabsContent value="by-category">
            <ByCategoryTab />
          </TabsContent>
          <TabsContent value="categories">
            <CategoryManagementTab />
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
