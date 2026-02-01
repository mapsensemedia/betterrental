/**
 * Fleet Management - Category + VIN Pool System
 * Single source of truth for fleet inventory
 */
import { useState } from "react";
import { AdminShell } from "@/components/layout/AdminShell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  useFleetCategories,
  useCategoryVins,
  useDeleteFleetCategory,
  useUpdateVinStatus,
  useDeleteVin,
  type FleetCategory,
  type VinUnit,
} from "@/hooks/use-fleet-categories";
import { CategoryFormDialog } from "@/components/admin/fleet/CategoryFormDialog";
import { VinFormDialog } from "@/components/admin/fleet/VinFormDialog";
import {
  Plus,
  Edit2,
  Trash2,
  Car,
  FolderOpen,
  RefreshCw,
  ChevronRight,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Wrench,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof CheckCircle2 }> = {
  available: { label: "Available", color: "bg-green-500", icon: CheckCircle2 },
  on_rent: { label: "On Rent", color: "bg-blue-500", icon: Clock },
  maintenance: { label: "Maintenance", color: "bg-yellow-500", icon: Wrench },
  damage: { label: "Damage", color: "bg-red-500", icon: AlertTriangle },
};

export default function FleetManagement() {
  const queryClient = useQueryClient();
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Dialogs
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<FleetCategory | null>(null);
  const [vinDialogOpen, setVinDialogOpen] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; type: 'category' | 'vin'; id: string; name: string }>({
    open: false,
    type: 'category',
    id: '',
    name: '',
  });

  const { data: categories, isLoading } = useFleetCategories();
  const { data: categoryVins } = useCategoryVins(selectedCategoryId);
  const deleteCategory = useDeleteFleetCategory();
  const updateVinStatus = useUpdateVinStatus();
  const deleteVin = useDeleteVin();

  const selectedCategory = categories?.find(c => c.id === selectedCategoryId);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ["fleet-categories"] });
    await queryClient.invalidateQueries({ queryKey: ["category-vins"] });
    setIsRefreshing(false);
  };

  const handleDeleteConfirm = async () => {
    if (deleteDialog.type === 'category') {
      await deleteCategory.mutateAsync(deleteDialog.id);
      if (selectedCategoryId === deleteDialog.id) {
        setSelectedCategoryId(null);
      }
    } else {
      await deleteVin.mutateAsync(deleteDialog.id);
    }
    setDeleteDialog({ open: false, type: 'category', id: '', name: '' });
  };

  const handleStatusChange = async (vinId: string, newStatus: string) => {
    await updateVinStatus.mutateAsync({ id: vinId, status: newStatus as VinUnit['status'] });
  };

  if (isLoading) {
    return (
      <AdminShell>
        <div className="space-y-4">
          <Skeleton className="h-10 w-60" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Skeleton className="h-96" />
            <Skeleton className="h-96 lg:col-span-2" />
          </div>
        </div>
      </AdminShell>
    );
  }

  return (
    <AdminShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Fleet Management</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Manage categories and VIN pool inventory
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={handleRefresh} disabled={isRefreshing}>
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
            </Button>
            <Button onClick={() => { setEditingCategory(null); setCategoryDialogOpen(true); }}>
              <Plus className="w-4 h-4 mr-2" />
              Add Category
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Categories List */}
          <div className="space-y-4">
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
                  {categories.map((category) => (
                    <Card
                      key={category.id}
                      className={`cursor-pointer transition-all hover:shadow-md ${
                        selectedCategoryId === category.id ? "ring-2 ring-primary" : ""
                      }`}
                      onClick={() => setSelectedCategoryId(category.id)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          {category.image_url && (
                            <img 
                              src={category.image_url} 
                              alt={category.name}
                              className="w-12 h-12 rounded object-cover"
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-sm truncate">{category.name}</h3>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              ${category.daily_rate}/day
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <Badge variant={category.available_count! > 0 ? "default" : "secondary"}>
                              {category.available_count}/{category.total_count}
                            </Badge>
                            <p className="text-xs text-muted-foreground mt-1">available</p>
                          </div>
                        </div>
                        
                        {/* Actions */}
                        <div className="flex items-center gap-1 mt-3 pt-3 border-t">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs flex-1"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedCategoryId(category.id);
                              setVinDialogOpen(true);
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
                              setEditingCategory(category);
                              setCategoryDialogOpen(true);
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
                                type: 'category',
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

          {/* VIN Pool Panel */}
          <div className="lg:col-span-2">
            {!selectedCategoryId ? (
              <Card className="h-full">
                <CardContent className="flex flex-col items-center justify-center h-full min-h-[400px]">
                  <ChevronRight className="w-12 h-12 text-muted-foreground mb-4" />
                  <h3 className="font-medium mb-2">Select a Category</h3>
                  <p className="text-sm text-muted-foreground text-center max-w-xs">
                    Choose a category to view and manage its VIN pool.
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
                        {categoryVins?.length || 0} vehicle{(categoryVins?.length || 0) !== 1 ? "s" : ""} in VIN pool
                      </CardDescription>
                    </div>
                    <Button size="sm" onClick={() => setVinDialogOpen(true)}>
                      <Plus className="w-4 h-4 mr-2" />
                      Add VIN
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  {!categoryVins?.length ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <Car className="w-10 h-10 text-muted-foreground mb-3" />
                      <p className="text-sm text-muted-foreground mb-4">
                        No vehicles in this category yet.
                      </p>
                      <Button variant="outline" size="sm" onClick={() => setVinDialogOpen(true)}>
                        <Plus className="w-4 h-4 mr-2" />
                        Add First Vehicle
                      </Button>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>VIN</TableHead>
                          <TableHead>Plate</TableHead>
                          <TableHead>Year/Make/Model</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Location</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {categoryVins.map((vin) => {
                          const statusConfig = STATUS_CONFIG[vin.status] || STATUS_CONFIG.available;
                          const StatusIcon = statusConfig.icon;
                          
                          return (
                            <TableRow key={vin.id}>
                              <TableCell className="font-mono text-sm">{vin.vin}</TableCell>
                              <TableCell className="font-medium">{vin.license_plate || "—"}</TableCell>
                              <TableCell className="text-muted-foreground">
                                {vin.year && vin.make && vin.model 
                                  ? `${vin.year} ${vin.make} ${vin.model}`
                                  : "—"}
                              </TableCell>
                              <TableCell>
                                <Select
                                  value={vin.status}
                                  onValueChange={(value) => handleStatusChange(vin.id, value)}
                                >
                                  <SelectTrigger className="w-[130px] h-8">
                                    <div className="flex items-center gap-2">
                                      <div className={`w-2 h-2 rounded-full ${statusConfig.color}`} />
                                      <span className="text-xs">{statusConfig.label}</span>
                                    </div>
                                  </SelectTrigger>
                                  <SelectContent>
                                    {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                                      <SelectItem key={key} value={key}>
                                        <div className="flex items-center gap-2">
                                          <div className={`w-2 h-2 rounded-full ${config.color}`} />
                                          {config.label}
                                        </div>
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </TableCell>
                              <TableCell className="text-sm">{vin.location_name || "—"}</TableCell>
                              <TableCell className="text-right">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-destructive"
                                  onClick={() => setDeleteDialog({
                                    open: true,
                                    type: 'vin',
                                    id: vin.id,
                                    name: vin.vin,
                                  })}
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Dialogs */}
      <CategoryFormDialog
        open={categoryDialogOpen}
        onOpenChange={setCategoryDialogOpen}
        category={editingCategory}
      />

      <VinFormDialog
        open={vinDialogOpen}
        onOpenChange={setVinDialogOpen}
        categoryId={selectedCategoryId || ""}
        categoryName={selectedCategory?.name || ""}
      />

      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ ...deleteDialog, open })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete {deleteDialog.type === 'category' ? 'Category' : 'Vehicle'}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteDialog.type === 'category' 
                ? `This will delete the category "${deleteDialog.name}" and unassign all vehicles from it.`
                : `This will permanently remove vehicle with VIN "${deleteDialog.name}" from the system.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminShell>
  );
}
