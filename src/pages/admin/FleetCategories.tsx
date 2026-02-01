/**
 * Category-Based Fleet Management Page
 * Replaces complex inventory with simple category → VIN structure
 */
import { useState } from "react";
import { AdminShell } from "@/components/layout/AdminShell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  useCategoriesWithCounts,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
  VehicleCategory,
} from "@/hooks/use-vehicle-categories";
import { useVehicleUnits } from "@/hooks/use-vehicle-units";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { VehicleUnit } from "@/hooks/use-vehicle-units";
import {
  Plus,
  Edit2,
  Trash2,
  Car,
  FolderOpen,
  RefreshCw,
  DollarSign,
  Eye,
  ChevronRight,
} from "lucide-react";

export default function FleetCategories() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Category dialog state
  const [categoryDialog, setCategoryDialog] = useState<{
    open: boolean;
    mode: "create" | "edit";
    id?: string;
    name: string;
    description: string;
    dailyRate: number;
    imageUrl: string;
  }>({
    open: false,
    mode: "create",
    name: "",
    description: "",
    dailyRate: 100,
    imageUrl: "",
  });
  
  // VIN dialog state
  const [vinDialog, setVinDialog] = useState<{
    open: boolean;
    categoryId: string;
    categoryName: string;
    vin: string;
    licensePlate: string;
    acquisitionCost: string;
    currentMileage: string;
  }>({
    open: false,
    categoryId: "",
    categoryName: "",
    vin: "",
    licensePlate: "",
    acquisitionCost: "",
    currentMileage: "",
  });
  
  // Delete confirmation
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    type: "category" | "vin";
    id: string;
    name: string;
  }>({ open: false, type: "category", id: "", name: "" });

  const { data: categories, isLoading: loadingCategories } = useCategoriesWithCounts();
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const deleteCategory = useDeleteCategory();

  // Get units for selected category
  const { data: allUnits } = useVehicleUnits();
  const categoryUnits = allUnits?.filter((u: VehicleUnit) => u.category_id === selectedCategoryId) || [];

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ["vehicle-categories"] });
    await queryClient.invalidateQueries({ queryKey: ["vehicle-units"] });
    setIsRefreshing(false);
  };

  const handleSaveCategory = async () => {
    if (!categoryDialog.name.trim()) {
      toast.error("Category name is required");
      return;
    }

    if (categoryDialog.mode === "create") {
      await createCategory.mutateAsync({
        name: categoryDialog.name,
        description: categoryDialog.description,
      });
    } else if (categoryDialog.id) {
      await updateCategory.mutateAsync({
        id: categoryDialog.id,
        name: categoryDialog.name,
        description: categoryDialog.description,
      });
    }

    setCategoryDialog({
      open: false,
      mode: "create",
      name: "",
      description: "",
      dailyRate: 100,
      imageUrl: "",
    });
  };

  const handleAddVin = async () => {
    if (!vinDialog.vin.trim()) {
      toast.error("VIN is required");
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // First, create or find a vehicle entry for this VIN
      // We'll use a generic vehicle entry linked to the category
      const category = categories?.find((c: any) => c.id === vinDialog.categoryId);
      
      // Check if unit with this VIN already exists
      const { data: existingUnit } = await supabase
        .from("vehicle_units")
        .select("id")
        .eq("vin", vinDialog.vin.toUpperCase())
        .maybeSingle();

      if (existingUnit) {
        toast.error("A vehicle with this VIN already exists");
        return;
      }

      // Find or create a vehicle entry for this category
      let vehicleId: string;
      const categoryName = category?.name || "Unknown";
      
      const { data: existingVehicle } = await supabase
        .from("vehicles")
        .select("id")
        .eq("category", categoryName)
        .limit(1)
        .maybeSingle();

      if (existingVehicle) {
        vehicleId = existingVehicle.id;
      } else {
        // Create a vehicle entry for this category
        const { data: newVehicle, error: vehicleError } = await supabase
          .from("vehicles")
          .insert({
            make: categoryName.split(" ")[0] || "Various",
            model: categoryName,
            year: new Date().getFullYear(),
            daily_rate: 100,
            category: categoryName,
            is_available: true,
          })
          .select()
          .single();

        if (vehicleError) throw vehicleError;
        vehicleId = newVehicle.id;
      }

      // Create the vehicle unit
      const { error } = await supabase.from("vehicle_units").insert({
        vehicle_id: vehicleId,
        vin: vinDialog.vin.toUpperCase(),
        license_plate: vinDialog.licensePlate || null,
        acquisition_cost: vinDialog.acquisitionCost ? parseFloat(vinDialog.acquisitionCost) : null,
        current_mileage: vinDialog.currentMileage ? parseInt(vinDialog.currentMileage) : null,
        category_id: vinDialog.categoryId,
        status: "active",
      });

      if (error) throw error;

      toast.success("Vehicle added successfully");
      queryClient.invalidateQueries({ queryKey: ["vehicle-units"] });
      queryClient.invalidateQueries({ queryKey: ["vehicle-categories"] });
      
      setVinDialog({
        open: false,
        categoryId: "",
        categoryName: "",
        vin: "",
        licensePlate: "",
        acquisitionCost: "",
        currentMileage: "",
      });
    } catch (error: any) {
      toast.error(`Failed to add vehicle: ${error.message}`);
    }
  };

  const handleDeleteConfirm = async () => {
    if (deleteDialog.type === "category") {
      await deleteCategory.mutateAsync(deleteDialog.id);
    } else {
      // Delete VIN
      const { error } = await supabase
        .from("vehicle_units")
        .delete()
        .eq("id", deleteDialog.id);
      
      if (error) {
        toast.error(`Failed to delete: ${error.message}`);
      } else {
        toast.success("Vehicle removed");
        queryClient.invalidateQueries({ queryKey: ["vehicle-units"] });
        queryClient.invalidateQueries({ queryKey: ["vehicle-categories"] });
      }
    }
    setDeleteDialog({ open: false, type: "category", id: "", name: "" });
  };

  const formatCurrency = (value: number | null) =>
    value != null
      ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value)
      : "—";

  if (loadingCategories) {
    return (
      <AdminShell>
        <div className="space-y-4">
          <Skeleton className="h-10 w-60" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-40" />
            ))}
          </div>
        </div>
      </AdminShell>
    );
  }

  const selectedCategory = categories?.find((c: any) => c.id === selectedCategoryId);

  return (
    <AdminShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Fleet Categories</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Manage vehicle categories and assign VINs
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon" onClick={handleRefresh} disabled={isRefreshing}>
                  <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Refresh</TooltipContent>
            </Tooltip>
            <Button onClick={() => setCategoryDialog({ open: true, mode: "create", name: "", description: "", dailyRate: 100, imageUrl: "" })}>
              <Plus className="w-4 h-4 mr-2" />
              Add Category
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Categories List */}
          <div className="lg:col-span-1 space-y-4">
            <h2 className="font-semibold text-lg flex items-center gap-2">
              <FolderOpen className="w-5 h-5" />
              Categories ({categories?.length || 0})
            </h2>
            
            {!categories?.length ? (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-8">
                  <FolderOpen className="w-10 h-10 text-muted-foreground mb-3" />
                  <p className="text-sm text-muted-foreground text-center">
                    No categories yet. Create one to start managing your fleet.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <ScrollArea className="h-[calc(100vh-280px)]">
                <div className="space-y-2 pr-4">
                  {(categories as any[]).map((category) => (
                    <Card
                      key={category.id}
                      className={`cursor-pointer transition-all hover:shadow-md ${
                        selectedCategoryId === category.id ? "ring-2 ring-primary" : ""
                      }`}
                      onClick={() => setSelectedCategoryId(category.id)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-sm truncate">{category.name}</h3>
                            {category.description && (
                              <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                                {category.description}
                              </p>
                            )}
                          </div>
                          <Badge variant="secondary" className="ml-2 shrink-0">
                            <Car className="w-3 h-3 mr-1" />
                            {category.vehicle_count || 0}
                          </Badge>
                        </div>
                        
                        {/* Quick actions */}
                        <div className="flex items-center gap-1 mt-3 pt-3 border-t">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={(e) => {
                              e.stopPropagation();
                              setVinDialog({
                                open: true,
                                categoryId: category.id,
                                categoryName: category.name,
                                vin: "",
                                licensePlate: "",
                                acquisitionCost: "",
                                currentMileage: "",
                              });
                            }}
                          >
                            <Plus className="w-3 h-3 mr-1" />
                            Add VIN
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={(e) => {
                              e.stopPropagation();
                              setCategoryDialog({
                                open: true,
                                mode: "edit",
                                id: category.id,
                                name: category.name,
                                description: category.description || "",
                                dailyRate: 100,
                                imageUrl: "",
                              });
                            }}
                          >
                            <Edit2 className="w-3 h-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteDialog({
                                open: true,
                                type: "category",
                                id: category.id,
                                name: category.name,
                              });
                            }}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>

          {/* Vehicle Units Panel */}
          <div className="lg:col-span-2">
            {!selectedCategoryId ? (
              <Card className="h-full">
                <CardContent className="flex flex-col items-center justify-center h-full min-h-[400px]">
                  <ChevronRight className="w-12 h-12 text-muted-foreground mb-4" />
                  <h3 className="font-medium mb-2">Select a Category</h3>
                  <p className="text-sm text-muted-foreground text-center max-w-xs">
                    Choose a category from the left to view and manage its vehicles.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">{selectedCategory?.name}</CardTitle>
                      <CardDescription>
                        {categoryUnits.length} vehicle{categoryUnits.length !== 1 ? "s" : ""} in this category
                      </CardDescription>
                    </div>
                    <Button
                      size="sm"
                      onClick={() =>
                        setVinDialog({
                          open: true,
                          categoryId: selectedCategoryId,
                          categoryName: selectedCategory?.name || "",
                          vin: "",
                          licensePlate: "",
                          acquisitionCost: "",
                          currentMileage: "",
                        })
                      }
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Vehicle
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  {categoryUnits.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <Car className="w-10 h-10 text-muted-foreground mb-3" />
                      <p className="text-sm text-muted-foreground">
                        No vehicles in this category yet.
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-4"
                        onClick={() =>
                          setVinDialog({
                            open: true,
                            categoryId: selectedCategoryId,
                            categoryName: selectedCategory?.name || "",
                            vin: "",
                            licensePlate: "",
                            acquisitionCost: "",
                            currentMileage: "",
                          })
                        }
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add First Vehicle
                      </Button>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>VIN</TableHead>
                            <TableHead>Plate</TableHead>
                            <TableHead className="text-right">Acquisition Cost</TableHead>
                            <TableHead className="text-right">Mileage</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="w-[80px]"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {categoryUnits.map((unit: VehicleUnit) => (
                            <TableRow key={unit.id}>
                              <TableCell>
                                <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                                  {unit.vin}
                                </code>
                              </TableCell>
                              <TableCell>{unit.license_plate || "—"}</TableCell>
                              <TableCell className="text-right">
                                {formatCurrency(unit.acquisition_cost)}
                              </TableCell>
                              <TableCell className="text-right">
                                {unit.current_mileage?.toLocaleString() || "—"} mi
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant={unit.status === "active" ? "default" : "secondary"}
                                >
                                  {unit.status || "active"}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1">
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7"
                                        onClick={() => navigate(`/admin/fleet/vehicle/${unit.id}`)}
                                      >
                                        <Eye className="w-3.5 h-3.5" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>View Details</TooltipContent>
                                  </Tooltip>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7 text-destructive"
                                        onClick={() =>
                                          setDeleteDialog({
                                            open: true,
                                            type: "vin",
                                            id: unit.id,
                                            name: unit.vin,
                                          })
                                        }
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Remove</TooltipContent>
                                  </Tooltip>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Category Dialog */}
      <Dialog open={categoryDialog.open} onOpenChange={(open) => !open && setCategoryDialog({ ...categoryDialog, open: false })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {categoryDialog.mode === "create" ? "Add Category" : "Edit Category"}
            </DialogTitle>
            <DialogDescription>
              Categories represent vehicle types shown to customers (e.g., "Toyota Camry or Similar")
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="category-name">Category Name</Label>
              <Input
                id="category-name"
                placeholder="e.g., Mid Size Car - Corolla or Similar"
                value={categoryDialog.name}
                onChange={(e) => setCategoryDialog({ ...categoryDialog, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category-description">Description</Label>
              <Textarea
                id="category-description"
                placeholder="Brief description of this vehicle category..."
                value={categoryDialog.description}
                onChange={(e) => setCategoryDialog({ ...categoryDialog, description: e.target.value })}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCategoryDialog({ ...categoryDialog, open: false })}>
              Cancel
            </Button>
            <Button onClick={handleSaveCategory} disabled={createCategory.isPending || updateCategory.isPending}>
              {categoryDialog.mode === "create" ? "Create" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add VIN Dialog */}
      <Dialog open={vinDialog.open} onOpenChange={(open) => !open && setVinDialog({ ...vinDialog, open: false })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Vehicle to {vinDialog.categoryName}</DialogTitle>
            <DialogDescription>
              Enter the VIN and acquisition details. This information is only visible to admins.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="vin">VIN (Vehicle Identification Number)</Label>
              <Input
                id="vin"
                placeholder="e.g., 1HGCG5655WA123456"
                value={vinDialog.vin}
                onChange={(e) => setVinDialog({ ...vinDialog, vin: e.target.value.toUpperCase() })}
                className="font-mono"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="plate">License Plate (Optional)</Label>
              <Input
                id="plate"
                placeholder="e.g., ABC-1234"
                value={vinDialog.licensePlate}
                onChange={(e) => setVinDialog({ ...vinDialog, licensePlate: e.target.value.toUpperCase() })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cost">Acquisition Cost</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="cost"
                    type="number"
                    placeholder="25000"
                    value={vinDialog.acquisitionCost}
                    onChange={(e) => setVinDialog({ ...vinDialog, acquisitionCost: e.target.value })}
                    className="pl-9"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="mileage">Current Mileage</Label>
                <Input
                  id="mileage"
                  type="number"
                  placeholder="15000"
                  value={vinDialog.currentMileage}
                  onChange={(e) => setVinDialog({ ...vinDialog, currentMileage: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVinDialog({ ...vinDialog, open: false })}>
              Cancel
            </Button>
            <Button onClick={handleAddVin}>Add Vehicle</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => !open && setDeleteDialog({ ...deleteDialog, open: false })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete {deleteDialog.type === "category" ? "Category" : "Vehicle"}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteDialog.type === "category"
                ? `This will remove "${deleteDialog.name}" and unassign all vehicles from this category.`
                : `This will remove the vehicle with VIN "${deleteDialog.name}" from your fleet.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminShell>
  );
}
