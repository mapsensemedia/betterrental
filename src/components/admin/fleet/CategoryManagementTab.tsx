/**
 * Category Management Tab
 * View, create, edit, delete categories and assign VINs
 */
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
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
  useCategoriesWithCounts, 
  useDeleteCategory, 
  VehicleCategory 
} from "@/hooks/use-vehicle-categories";
import { CategoryDialog } from "./CategoryDialog";
import { VinAssignmentDialog } from "./VinAssignmentDialog";
import { SeedFleetCategories } from "./SeedFleetCategories";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Car, 
  FolderPlus,
  RefreshCw,
  Database,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

export function CategoryManagementTab() {
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [vinDialogOpen, setVinDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<VehicleCategory | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [seedDialogOpen, setSeedDialogOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { data: categories, isLoading } = useCategoriesWithCounts();
  const deleteMutation = useDeleteCategory();
  const queryClient = useQueryClient();

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ["vehicle-categories"] });
    setIsRefreshing(false);
  };

  const handleEdit = (category: VehicleCategory) => {
    setSelectedCategory(category);
    setCategoryDialogOpen(true);
  };

  const handleAssign = (category: VehicleCategory) => {
    setSelectedCategory(category);
    setVinDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (selectedCategory) {
      await deleteMutation.mutateAsync(selectedCategory.id);
      setDeleteDialogOpen(false);
      setSelectedCategory(null);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-40" />
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Vehicle Categories</h3>
          <p className="text-sm text-muted-foreground">
            Organize your fleet into categories for better analysis
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="icon" onClick={handleRefresh} disabled={isRefreshing}>
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Refresh categories</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" onClick={() => setSeedDialogOpen(true)}>
                <Database className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Seed Data</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Add sample fleet categories</TooltipContent>
          </Tooltip>
          <Button onClick={() => { setSelectedCategory(null); setCategoryDialogOpen(true); }}>
            <Plus className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">New Category</span>
          </Button>
        </div>
      </div>

      {/* Categories Grid */}
      {!categories?.length ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FolderPlus className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No categories yet</h3>
            <p className="text-sm text-muted-foreground text-center mb-4">
              Create categories to organize vehicles by type, location, or purpose.
            </p>
            <Button onClick={() => setCategoryDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create First Category
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {(categories as any[]).map((category) => (
            <Card key={category.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base">{category.name}</CardTitle>
                    {category.description && (
                      <CardDescription className="mt-1 line-clamp-2">
                        {category.description}
                      </CardDescription>
                    )}
                  </div>
                  <Badge variant="secondary">
                    <Car className="w-3 h-3 mr-1" />
                    {category.vehicle_count || 0}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Models list */}
                {category.models?.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {category.models.slice(0, 3).map((model: string, i: number) => (
                      <Badge key={i} variant="outline" className="text-xs">
                        {model}
                      </Badge>
                    ))}
                    {category.models.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{category.models.length - 3} more
                      </Badge>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2 pt-2">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => handleAssign(category)}
                      >
                        <Car className="w-3.5 h-3.5 mr-1" />
                        Assign VINs
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Add or remove vehicles from this category</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(category)}>
                        <Edit2 className="w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Edit category</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => { setSelectedCategory(category); setDeleteDialogOpen(true); }}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Delete category</TooltipContent>
                  </Tooltip>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialogs */}
      <CategoryDialog
        open={categoryDialogOpen}
        onOpenChange={setCategoryDialogOpen}
        category={selectedCategory}
      />

      <VinAssignmentDialog
        open={vinDialogOpen}
        onOpenChange={setVinDialogOpen}
        category={selectedCategory}
      />

      <SeedFleetCategories
        open={seedDialogOpen}
        onOpenChange={setSeedDialogOpen}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Category</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedCategory?.name}"? 
              Vehicles in this category will be unassigned but not deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
