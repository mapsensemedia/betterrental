import { useState, useRef, useEffect } from "react";
import { format } from "date-fns";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Plus,
  DollarSign,
  Calendar,
  Fuel,
  Wrench,
  Receipt,
  TrendingUp,
  Edit2,
  Trash2,
  Car,
  Gauge,
  Upload,
  FileImage,
  X,
  ExternalLink,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { VehicleUnit } from "@/hooks/use-vehicle-units";
import {
  useVehicleExpenses,
  useExpenseSummary,
  useCreateVehicleExpense,
  useUpdateVehicleExpense,
  useDeleteVehicleExpense,
  EXPENSE_TYPES,
  VehicleExpense,
} from "@/hooks/use-vehicle-expenses";
import { useAuth } from "@/hooks/use-auth";
import { useReceiptUpload } from "@/hooks/use-receipt-upload";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface VehicleUnitDetailProps {
  unit: VehicleUnit;
  open: boolean;
  onClose: () => void;
}

export function VehicleUnitDetail({ unit, open, onClose }: VehicleUnitDetailProps) {
  const { user } = useAuth();
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [isEditExpenseOpen, setIsEditExpenseOpen] = useState(false);
  const [isDeleteExpenseOpen, setIsDeleteExpenseOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<VehicleExpense | null>(null);
  const [activeTab, setActiveTab] = useState("expenses");

  const { data: expenses, isLoading: expensesLoading } = useVehicleExpenses({
    vehicleUnitId: unit.id,
  });
  const { data: summary } = useExpenseSummary(unit.id);

  // Fetch damage reports linked to this unit
  const { data: damageReports, isLoading: damagesLoading } = useQuery({
    queryKey: ["unit-damages", unit.id, unit.vehicle_id],
    queryFn: async () => {
      // Get damages linked directly to this unit OR to the vehicle
      const { data, error } = await supabase
        .from("damage_reports")
        .select(`
          id, description, location_on_vehicle, severity, status,
          estimated_cost, created_at, resolved_at, resolution_notes,
          booking:bookings(booking_code)
        `)
        .or(`vehicle_unit_id.eq.${unit.id},vehicle_id.eq.${unit.vehicle_id}`)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  const createExpense = useCreateVehicleExpense();
  const updateExpense = useUpdateVehicleExpense();
  const deleteExpense = useDeleteVehicleExpense();

  // Receipt upload
  const { uploadReceipt, getSignedUrl, deleteReceipt, isUploading, progress } = useReceiptUpload();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [viewingReceipt, setViewingReceipt] = useState<string | null>(null);

  // Form state
  const [expenseForm, setExpenseForm] = useState({
    expense_type: "",
    amount: "",
    description: "",
    expense_date: format(new Date(), "yyyy-MM-dd"),
    vendor: "",
    mileage_at_expense: "",
    receipt_url: "",
  });

  const resetExpenseForm = () => {
    setExpenseForm({
      expense_type: "",
      amount: "",
      description: "",
      expense_date: format(new Date(), "yyyy-MM-dd"),
      vendor: "",
      mileage_at_expense: "",
      receipt_url: "",
    });
    setReceiptFile(null);
    setReceiptPreview(null);
  };

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setReceiptFile(file);
      // Create preview for images
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = (event) => {
          setReceiptPreview(event.target?.result as string);
        };
        reader.readAsDataURL(file);
      } else {
        setReceiptPreview(null);
      }
    }
  };

  // View receipt
  const handleViewReceipt = async (receiptUrl: string) => {
    const signedUrl = await getSignedUrl(receiptUrl);
    if (signedUrl) {
      setViewingReceipt(signedUrl);
    }
  };

  const handleAddExpense = () => {
    resetExpenseForm();
    setIsAddExpenseOpen(true);
  };

  const handleEditExpense = (expense: VehicleExpense) => {
    setSelectedExpense(expense);
    setExpenseForm({
      expense_type: expense.expense_type,
      amount: String(expense.amount),
      description: expense.description || "",
      expense_date: expense.expense_date,
      vendor: expense.vendor || "",
      mileage_at_expense: expense.mileage_at_expense
        ? String(expense.mileage_at_expense)
        : "",
      receipt_url: expense.receipt_url || "",
    });
    setReceiptFile(null);
    setReceiptPreview(null);
    setIsEditExpenseOpen(true);
  };

  const handleSubmitAddExpense = async () => {
    let receiptUrl: string | null = null;

    // Upload receipt if a file is selected
    if (receiptFile) {
      const uploadResult = await uploadReceipt(receiptFile, unit.id);
      if (uploadResult) {
        receiptUrl = uploadResult.path;
      }
    }

    await createExpense.mutateAsync({
      vehicle_unit_id: unit.id,
      expense_type: expenseForm.expense_type,
      amount: Number(expenseForm.amount),
      description: expenseForm.description || null,
      expense_date: expenseForm.expense_date,
      vendor: expenseForm.vendor || null,
      receipt_url: receiptUrl,
      mileage_at_expense: expenseForm.mileage_at_expense
        ? Number(expenseForm.mileage_at_expense)
        : null,
      created_by: user?.id || null,
    });
    setIsAddExpenseOpen(false);
    resetExpenseForm();
  };

  const handleSubmitEditExpense = async () => {
    if (!selectedExpense) return;

    let receiptUrl: string | null = expenseForm.receipt_url || null;

    // Upload new receipt if a file is selected
    if (receiptFile) {
      // Delete old receipt if exists
      if (selectedExpense.receipt_url) {
        await deleteReceipt(selectedExpense.receipt_url);
      }
      const uploadResult = await uploadReceipt(receiptFile, unit.id, selectedExpense.id);
      if (uploadResult) {
        receiptUrl = uploadResult.path;
      }
    }

    await updateExpense.mutateAsync({
      id: selectedExpense.id,
      expense_type: expenseForm.expense_type,
      amount: Number(expenseForm.amount),
      description: expenseForm.description || null,
      expense_date: expenseForm.expense_date,
      vendor: expenseForm.vendor || null,
      receipt_url: receiptUrl,
      mileage_at_expense: expenseForm.mileage_at_expense
        ? Number(expenseForm.mileage_at_expense)
        : null,
    });
    setIsEditExpenseOpen(false);
    setSelectedExpense(null);
    resetExpenseForm();
  };

  const handleDeleteExpense = async () => {
    if (!selectedExpense) return;
    await deleteExpense.mutateAsync(selectedExpense.id);
    setIsDeleteExpenseOpen(false);
    setSelectedExpense(null);
  };

  const totalCost = Number(unit.acquisition_cost) + (summary?.total || 0);

  // Get icon for expense type
  const getExpenseIcon = (type: string) => {
    switch (type) {
      case "gas":
        return <Fuel className="w-4 h-4" />;
      case "maintenance":
      case "repair":
      case "servicing":
        return <Wrench className="w-4 h-4" />;
      default:
        return <Receipt className="w-4 h-4" />;
    }
  };

  return (
    <>
      <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader className="pb-4 border-b">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <Car className="w-5 h-5 text-primary" />
              </div>
              <div>
                <SheetTitle className="text-lg">
                  {unit.vehicle?.make} {unit.vehicle?.model}
                </SheetTitle>
                <p className="text-sm font-mono text-muted-foreground">
                  {unit.vin}
                </p>
              </div>
              <Badge variant={unit.status === "active" ? "default" : "secondary"} className="ml-auto">
                {unit.status}
              </Badge>
            </div>
          </SheetHeader>

          <div className="mt-6 space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-3">
              <Card>
                <CardContent className="p-3">
                  <p className="text-xs text-muted-foreground mb-1">Acquisition</p>
                  <p className="text-lg font-bold">
                    ${Number(unit.acquisition_cost).toLocaleString()}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3">
                  <p className="text-xs text-muted-foreground mb-1">Expenses</p>
                  <p className="text-lg font-bold text-orange-600">
                    ${(summary?.total || 0).toLocaleString()}
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="p-3">
                  <p className="text-xs text-muted-foreground mb-1">Total Cost</p>
                  <p className="text-lg font-bold text-primary">
                    ${totalCost.toLocaleString()}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Vehicle Info */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Vehicle Details</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">License Plate</p>
                  <p className="font-medium">{unit.license_plate || "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Color</p>
                  <p className="font-medium">{unit.color || "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Acquisition Date</p>
                  <p className="font-medium">
                    {unit.acquisition_date
                      ? format(new Date(unit.acquisition_date), "MMM d, yyyy")
                      : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Category</p>
                  <p className="font-medium">{unit.vehicle?.category || "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Starting Odometer</p>
                  <p className="font-medium">
                    {unit.mileage_at_acquisition
                      ? `${unit.mileage_at_acquisition.toLocaleString()} km`
                      : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Current Odometer</p>
                  <p className="font-medium">
                    {unit.current_mileage
                      ? `${unit.current_mileage.toLocaleString()} km`
                      : "—"}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Expenses by Type */}
            {summary && Object.keys(summary.byType).length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Expenses by Category</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {Object.entries(summary.byType)
                    .sort(([, a], [, b]) => b - a)
                    .map(([type, amount]) => {
                      const label = EXPENSE_TYPES.find((t) => t.value === type)?.label || type;
                      const percentage = (amount / summary.total) * 100;
                      return (
                        <div key={type} className="flex items-center gap-3">
                          <div className="w-24 text-sm text-muted-foreground truncate">
                            {label}
                          </div>
                          <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary rounded-full"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                          <div className="w-20 text-right text-sm font-medium">
                            ${amount.toLocaleString()}
                          </div>
                        </div>
                      );
                    })}
                </CardContent>
              </Card>
            )}

            {/* Expenses List */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium">Expense History</h3>
                <Button size="sm" onClick={handleAddExpense}>
                  <Plus className="w-4 h-4 mr-1" />
                  Add Expense
                </Button>
              </div>

              {expensesLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-14 w-full" />
                  ))}
                </div>
              ) : !expenses?.length ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <Receipt className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                    <p className="text-muted-foreground">No expenses recorded yet</p>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Type</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                          <TableHead></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {expenses.map((expense) => (
                          <TableRow key={expense.id}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {getExpenseIcon(expense.expense_type)}
                                <span className="capitalize">
                                  {EXPENSE_TYPES.find((t) => t.value === expense.expense_type)?.label ||
                                    expense.expense_type}
                                </span>
                                {expense.receipt_url && (
                                  <Badge variant="outline" className="ml-1 text-xs">
                                    <FileImage className="w-3 h-3 mr-1" />
                                    Receipt
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div>
                                <p className="truncate max-w-[150px]">
                                  {expense.description || "—"}
                                </p>
                                {expense.vendor && (
                                  <p className="text-xs text-muted-foreground">
                                    {expense.vendor}
                                  </p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              {format(new Date(expense.expense_date), "MMM d, yyyy")}
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              ${Number(expense.amount).toLocaleString()}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                {expense.receipt_url && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => handleViewReceipt(expense.receipt_url!)}
                                    title="View Receipt"
                                  >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                  </Button>
                                )}
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => handleEditExpense(expense)}
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive hover:text-destructive"
                                  onClick={() => {
                                    setSelectedExpense(expense);
                                    setIsDeleteExpenseOpen(true);
                                  }}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
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

            {/* Damage History */}
            <div>
              <h3 className="font-medium mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Damage History
              </h3>

              {damagesLoading ? (
                <div className="space-y-2">
                  {[1, 2].map((i) => (
                    <Skeleton key={i} className="h-14 w-full" />
                  ))}
                </div>
              ) : !damageReports?.length ? (
                <Card>
                  <CardContent className="p-6 text-center">
                    <AlertTriangle className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">No damage reports</p>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Severity</TableHead>
                          <TableHead>Location</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Est. Cost</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {damageReports.map((damage) => (
                          <TableRow key={damage.id}>
                            <TableCell>
                              <div>
                                <p className="text-sm">
                                  {format(new Date(damage.created_at), "MMM d, yyyy")}
                                </p>
                                {damage.booking && (
                                  <p className="text-xs text-muted-foreground font-mono">
                                    {damage.booking.booking_code}
                                  </p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  damage.severity === "severe"
                                    ? "destructive"
                                    : damage.severity === "moderate"
                                    ? "default"
                                    : "secondary"
                                }
                              >
                                {damage.severity}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <p className="text-sm truncate max-w-[120px]" title={damage.location_on_vehicle}>
                                {damage.location_on_vehicle}
                              </p>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  damage.status === "resolved" || damage.status === "closed"
                                    ? "secondary"
                                    : "outline"
                                }
                              >
                                {damage.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              {damage.estimated_cost ? (
                                <span className="font-medium text-destructive">
                                  ${Number(damage.estimated_cost).toLocaleString()}
                                </span>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Notes */}
            {unit.notes && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {unit.notes}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Add/Edit Expense Dialog */}
      <Dialog
        open={isAddExpenseOpen || isEditExpenseOpen}
        onOpenChange={(open) => {
          if (!open) {
            setIsAddExpenseOpen(false);
            setIsEditExpenseOpen(false);
            setSelectedExpense(null);
            resetExpenseForm();
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {isAddExpenseOpen ? "Add Expense" : "Edit Expense"}
            </DialogTitle>
            <DialogDescription>
              Record an expense for this vehicle.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Expense Type *</Label>
                <Select
                  value={expenseForm.expense_type}
                  onValueChange={(v) =>
                    setExpenseForm({ ...expenseForm, expense_type: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {EXPENSE_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Amount *</Label>
                <Input
                  type="number"
                  value={expenseForm.amount}
                  onChange={(e) =>
                    setExpenseForm({ ...expenseForm, amount: e.target.value })
                  }
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Date *</Label>
                <Input
                  type="date"
                  value={expenseForm.expense_date}
                  onChange={(e) =>
                    setExpenseForm({ ...expenseForm, expense_date: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Vendor</Label>
                <Input
                  value={expenseForm.vendor}
                  onChange={(e) =>
                    setExpenseForm({ ...expenseForm, vendor: e.target.value })
                  }
                  placeholder="e.g., AutoZone"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Odometer at Expense (km)</Label>
              <Input
                type="number"
                value={expenseForm.mileage_at_expense}
                onChange={(e) =>
                  setExpenseForm({ ...expenseForm, mileage_at_expense: e.target.value })
                }
                placeholder="Current odometer reading (km)"
                min="0"
              />
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={expenseForm.description}
                onChange={(e) =>
                  setExpenseForm({ ...expenseForm, description: e.target.value })
                }
                placeholder="Details about this expense..."
                rows={3}
              />
            </div>

            {/* Receipt Upload */}
            <div className="space-y-2">
              <Label>Receipt (Image or PDF)</Label>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/jpeg,image/png,image/webp,application/pdf"
                className="hidden"
              />
              
              {/* Show existing receipt if editing */}
              {isEditExpenseOpen && expenseForm.receipt_url && !receiptFile && (
                <div className="flex items-center gap-2 p-2 bg-secondary rounded-md">
                  <FileImage className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm flex-1">Existing receipt attached</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleViewReceipt(expenseForm.receipt_url)}
                  >
                    View
                  </Button>
                </div>
              )}

              {/* Show preview or upload button */}
              {receiptFile ? (
                <div className="border rounded-lg p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <FileImage className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm flex-1 truncate">{receiptFile.name}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => {
                        setReceiptFile(null);
                        setReceiptPreview(null);
                        if (fileInputRef.current) {
                          fileInputRef.current.value = "";
                        }
                      }}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  {receiptPreview && (
                    <img
                      src={receiptPreview}
                      alt="Receipt preview"
                      className="max-h-32 rounded-md object-contain"
                    />
                  )}
                </div>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {isEditExpenseOpen && expenseForm.receipt_url
                    ? "Replace Receipt"
                    : "Upload Receipt"}
                </Button>
              )}

              {isUploading && (
                <Progress value={progress} className="w-full" />
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsAddExpenseOpen(false);
                setIsEditExpenseOpen(false);
                setSelectedExpense(null);
                resetExpenseForm();
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={isAddExpenseOpen ? handleSubmitAddExpense : handleSubmitEditExpense}
              disabled={
                !expenseForm.expense_type ||
                !expenseForm.amount ||
                isUploading ||
                createExpense.isPending ||
                updateExpense.isPending
              }
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : isAddExpenseOpen ? (
                "Add Expense"
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Receipt Viewer Dialog */}
      <Dialog open={!!viewingReceipt} onOpenChange={() => setViewingReceipt(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Receipt</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center max-h-[70vh] overflow-auto">
            {viewingReceipt && (
              viewingReceipt.includes(".pdf") ? (
                <div className="text-center">
                  <p className="text-muted-foreground mb-4">PDF Receipt</p>
                  <Button onClick={() => window.open(viewingReceipt, "_blank")}>
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Open PDF
                  </Button>
                </div>
              ) : (
                <img
                  src={viewingReceipt}
                  alt="Receipt"
                  className="max-w-full max-h-[65vh] object-contain rounded-lg"
                />
              )
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Expense Confirmation */}
      <AlertDialog open={isDeleteExpenseOpen} onOpenChange={setIsDeleteExpenseOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Expense</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this expense? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteExpense}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
