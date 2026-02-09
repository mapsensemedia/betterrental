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
              Vehicle categories — utilization, costs, and profitability tracking
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
          <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
            <TabsList className="w-max min-w-full sm:w-full justify-start flex-nowrap inline-flex gap-1">
              <TabsTrigger value="overview" className="gap-1.5 text-xs sm:text-sm px-2 sm:px-3">
                <BarChart3 className="w-3.5 h-3.5 hidden sm:inline" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="by-vehicle" className="gap-1.5 text-xs sm:text-sm px-2 sm:px-3">
                <Car className="w-3.5 h-3.5 hidden sm:inline" />
                By Vehicle
              </TabsTrigger>
              <TabsTrigger value="by-category" className="gap-1.5 text-xs sm:text-sm px-2 sm:px-3">
                <PieChart className="w-3.5 h-3.5 hidden sm:inline" />
                By Category
              </TabsTrigger>
              <TabsTrigger value="categories" className="gap-1.5 text-xs sm:text-sm px-2 sm:px-3">
                <FolderOpen className="w-3.5 h-3.5 hidden sm:inline" />
                Categories
              </TabsTrigger>
              <TabsTrigger value="utilization" className="gap-1.5 text-xs sm:text-sm px-2 sm:px-3">
                <TrendingUp className="w-3.5 h-3.5 hidden sm:inline" />
                Utilization
              </TabsTrigger>
              <TabsTrigger value="costs" className="gap-1.5 text-xs sm:text-sm px-2 sm:px-3">
                <DollarSign className="w-3.5 h-3.5 hidden sm:inline" />
                Costs
              </TabsTrigger>
              <TabsTrigger value="comparison" className="gap-1.5 text-xs sm:text-sm px-2 sm:px-3">
                <GitCompare className="w-3.5 h-3.5 hidden sm:inline" />
                Comparison
              </TabsTrigger>
              <TabsTrigger value="competitors" className="gap-1.5 text-xs sm:text-sm px-2 sm:px-3">
                <Building2 className="w-3.5 h-3.5 hidden sm:inline" />
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
