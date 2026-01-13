import { useState } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  FileText,
  Download,
  Calendar,
  Car,
  DollarSign,
  FileSpreadsheet,
} from "lucide-react";
import { useVehicles } from "@/hooks/use-vehicles";
import { useVehicleUnits, VehicleUnit } from "@/hooks/use-vehicle-units";
import { useVehicleExpenses, EXPENSE_TYPES, VehicleExpense } from "@/hooks/use-vehicle-expenses";

interface FleetReportsPanelProps {
  open: boolean;
  onClose: () => void;
}

export function FleetReportsPanel({ open, onClose }: FleetReportsPanelProps) {
  const [reportType, setReportType] = useState<"all" | "vehicle" | "category" | "time">("all");
  const [vehicleFilter, setVehicleFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [startDate, setStartDate] = useState(
    format(new Date(new Date().getFullYear(), 0, 1), "yyyy-MM-dd")
  );
  const [endDate, setEndDate] = useState(format(new Date(), "yyyy-MM-dd"));

  const { data: vehicles } = useVehicles();
  const { data: units } = useVehicleUnits({});
  const { data: allExpenses, isLoading } = useVehicleExpenses({
    startDate,
    endDate,
  });

  // Get filtered data based on report type
  const getFilteredExpenses = (): VehicleExpense[] => {
    if (!allExpenses || !units) return [];

    let filtered = [...allExpenses];

    if (reportType === "vehicle" && vehicleFilter !== "all") {
      filtered = filtered.filter((e) => e.vehicle_unit_id === vehicleFilter);
    }

    if (reportType === "category" && categoryFilter !== "all") {
      const categoryUnitIds = units
        .filter((u) => u.vehicle_id === categoryFilter)
        .map((u) => u.id);
      filtered = filtered.filter((e) => categoryUnitIds.includes(e.vehicle_unit_id));
    }

    return filtered;
  };

  const filteredExpenses = getFilteredExpenses();

  // Calculate summary
  const totalExpenses = filteredExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const expensesByType: Record<string, number> = {};
  filteredExpenses.forEach((e) => {
    expensesByType[e.expense_type] = (expensesByType[e.expense_type] || 0) + Number(e.amount);
  });

  // Get unit details for expenses
  const getUnitForExpense = (unitId: string): VehicleUnit | undefined => {
    return units?.find((u) => u.id === unitId);
  };

  // Export to CSV
  const exportToCSV = () => {
    const headers = [
      "Date",
      "VIN",
      "License Plate",
      "Category",
      "Expense Type",
      "Description",
      "Vendor",
      "Amount",
      "Mileage",
    ];

    const rows = filteredExpenses.map((expense) => {
      const unit = getUnitForExpense(expense.vehicle_unit_id);
      return [
        expense.expense_date,
        unit?.vin || "",
        unit?.license_plate || "",
        unit?.vehicle ? `${unit.vehicle.make} ${unit.vehicle.model}` : "",
        EXPENSE_TYPES.find((t) => t.value === expense.expense_type)?.label || expense.expense_type,
        expense.description || "",
        expense.vendor || "",
        Number(expense.amount).toFixed(2),
        expense.mileage_at_expense || "",
      ];
    });

    const csvContent = [
      headers.join(","),
      ...rows.map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `fleet-report-${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();
  };

  // Export to PDF (simple HTML-based approach)
  const exportToPDF = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const tableRows = filteredExpenses.map((expense) => {
      const unit = getUnitForExpense(expense.vehicle_unit_id);
      return `
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${expense.expense_date}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; font-family: monospace;">${unit?.vin || "-"}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${unit?.vehicle ? `${unit.vehicle.make} ${unit.vehicle.model}` : "-"}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${EXPENSE_TYPES.find((t) => t.value === expense.expense_type)?.label || expense.expense_type}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${expense.description || "-"}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right;">$${Number(expense.amount).toLocaleString()}</td>
        </tr>
      `;
    }).join("");

    const byTypeRows = Object.entries(expensesByType)
      .sort(([, a], [, b]) => b - a)
      .map(([type, amount]) => `
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${EXPENSE_TYPES.find((t) => t.value === type)?.label || type}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right;">$${amount.toLocaleString()}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right;">${((amount / totalExpenses) * 100).toFixed(1)}%</td>
        </tr>
      `).join("");

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Fleet Cost Report</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 40px; color: #1a1a1a; }
          h1 { font-size: 24px; margin-bottom: 8px; }
          h2 { font-size: 18px; margin-top: 32px; margin-bottom: 12px; color: #4b5563; }
          .subtitle { color: #6b7280; margin-bottom: 24px; }
          .summary { display: flex; gap: 24px; margin-bottom: 32px; }
          .summary-card { background: #f9fafb; padding: 16px; border-radius: 8px; }
          .summary-label { font-size: 12px; color: #6b7280; margin-bottom: 4px; }
          .summary-value { font-size: 24px; font-weight: 600; }
          table { width: 100%; border-collapse: collapse; margin-top: 16px; }
          th { text-align: left; padding: 8px; border-bottom: 2px solid #e5e7eb; font-weight: 600; font-size: 12px; text-transform: uppercase; color: #6b7280; }
          @media print { body { padding: 20px; } }
        </style>
      </head>
      <body>
        <h1>Fleet Cost Report</h1>
        <p class="subtitle">Period: ${format(new Date(startDate), "MMM d, yyyy")} - ${format(new Date(endDate), "MMM d, yyyy")}</p>
        
        <div class="summary">
          <div class="summary-card">
            <div class="summary-label">Total Expenses</div>
            <div class="summary-value">$${totalExpenses.toLocaleString()}</div>
          </div>
          <div class="summary-card">
            <div class="summary-label">Expense Count</div>
            <div class="summary-value">${filteredExpenses.length}</div>
          </div>
        </div>
        
        <h2>Expenses by Category</h2>
        <table>
          <thead>
            <tr>
              <th>Category</th>
              <th style="text-align: right;">Amount</th>
              <th style="text-align: right;">Percentage</th>
            </tr>
          </thead>
          <tbody>
            ${byTypeRows}
          </tbody>
        </table>
        
        <h2>Expense Details</h2>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>VIN</th>
              <th>Vehicle</th>
              <th>Type</th>
              <th>Description</th>
              <th style="text-align: right;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
        
        <p style="margin-top: 40px; font-size: 12px; color: #9ca3af;">
          Generated on ${format(new Date(), "MMMM d, yyyy 'at' h:mm a")}
        </p>
        
        <script>window.onload = () => window.print();</script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-3xl overflow-y-auto">
        <SheetHeader className="pb-4 border-b">
          <SheetTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Fleet Cost Reports
          </SheetTitle>
          <SheetDescription>
            Generate and export detailed expense reports for your fleet
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Report Filters */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Report Filters</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>End Date</Label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Report Type</Label>
                <Select value={reportType} onValueChange={(v: typeof reportType) => setReportType(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Vehicles</SelectItem>
                    <SelectItem value="vehicle">By Specific Vehicle</SelectItem>
                    <SelectItem value="category">By Category</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {reportType === "vehicle" && (
                <div className="space-y-2">
                  <Label>Select Vehicle</Label>
                  <Select value={vehicleFilter} onValueChange={setVehicleFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a vehicle" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Vehicles</SelectItem>
                      {units?.map((unit) => (
                        <SelectItem key={unit.id} value={unit.id}>
                          {unit.vin} - {unit.vehicle?.make} {unit.vehicle?.model}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {reportType === "category" && (
                <div className="space-y-2">
                  <Label>Select Category</Label>
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {vehicles?.map((v) => (
                        <SelectItem key={v.id} value={v.id}>
                          {v.make} {v.model}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Summary */}
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                    <DollarSign className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Expenses</p>
                    <p className="text-2xl font-bold">${totalExpenses.toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                    <FileText className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Expense Count</p>
                    <p className="text-2xl font-bold">{filteredExpenses.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Export Buttons */}
          <div className="flex gap-3">
            <Button onClick={exportToCSV} className="flex-1">
              <FileSpreadsheet className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
            <Button onClick={exportToPDF} variant="outline" className="flex-1">
              <Download className="w-4 h-4 mr-2" />
              Export PDF
            </Button>
          </div>

          {/* Expenses by Type */}
          {Object.keys(expensesByType).length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Breakdown by Category</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {Object.entries(expensesByType)
                  .sort(([, a], [, b]) => b - a)
                  .map(([type, amount]) => {
                    const percentage = (amount / totalExpenses) * 100;
                    return (
                      <div key={type} className="flex items-center gap-3">
                        <div className="w-24 text-sm text-muted-foreground truncate">
                          {EXPENSE_TYPES.find((t) => t.value === type)?.label || type}
                        </div>
                        <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full transition-all"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <div className="w-20 text-right text-sm font-medium">
                          ${amount.toLocaleString()}
                        </div>
                        <div className="w-12 text-right text-xs text-muted-foreground">
                          {percentage.toFixed(1)}%
                        </div>
                      </div>
                    );
                  })}
              </CardContent>
            </Card>
          )}

          {/* Expense Table Preview */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Expense Details Preview</CardTitle>
              <CardDescription>Showing first 20 expenses</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-6 space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : filteredExpenses.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  No expenses found for the selected filters
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Vehicle</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredExpenses.slice(0, 20).map((expense) => {
                      const unit = getUnitForExpense(expense.vehicle_unit_id);
                      return (
                        <TableRow key={expense.id}>
                          <TableCell>
                            {format(new Date(expense.expense_date), "MMM d, yyyy")}
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-mono text-xs">{unit?.vin?.slice(-8) || "-"}</p>
                              <p className="text-xs text-muted-foreground">
                                {unit?.vehicle?.make} {unit?.vehicle?.model}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {EXPENSE_TYPES.find((t) => t.value === expense.expense_type)?.label ||
                                expense.expense_type}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            ${Number(expense.amount).toLocaleString()}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </SheetContent>
    </Sheet>
  );
}
