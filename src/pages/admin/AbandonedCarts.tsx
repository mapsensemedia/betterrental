import { useState } from "react";
import { format, formatDistanceToNow } from "date-fns";
import {
  ShoppingCart,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Car,
  CheckCircle,
  MessageSquare,
  Trash2,
  ExternalLink,
  Clock,
  User,
} from "lucide-react";
import { AdminShell } from "@/components/layout/AdminShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import { Skeleton } from "@/components/ui/skeleton";
import { useAbandonedCarts, useUpdateAbandonedCart, useDeleteAbandonedCart, AbandonedCart } from "@/hooks/use-abandoned-carts";
import { cn } from "@/lib/utils";

export default function AbandonedCartsPage() {
  const [showConverted, setShowConverted] = useState(false);
  const { data: carts, isLoading } = useAbandonedCarts({ showConverted });
  const updateCart = useUpdateAbandonedCart();
  const deleteCart = useDeleteAbandonedCart();

  const [selectedCart, setSelectedCart] = useState<AbandonedCart | null>(null);
  const [contactNotes, setContactNotes] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const handleMarkContacted = () => {
    if (!selectedCart) return;
    updateCart.mutate({
      cartId: selectedCart.id,
      contactNotes,
    });
    setSelectedCart(null);
    setContactNotes("");
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteCart.mutate(deleteTarget);
    setDeleteTarget(null);
  };

  // Group carts by time
  const groupedCarts = (carts || []).reduce((acc, cart) => {
    const date = new Date(cart.abandoned_at);
    const now = new Date();
    const diffHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    let group: string;
    if (diffHours < 24) {
      group = "Last 24 hours";
    } else if (diffHours < 72) {
      group = "Last 3 days";
    } else if (diffHours < 168) {
      group = "Last 7 days";
    } else {
      group = "Older";
    }
    
    if (!acc[group]) acc[group] = [];
    acc[group].push(cart);
    return acc;
  }, {} as Record<string, AbandonedCart[]>);

  const groupOrder = ["Last 24 hours", "Last 3 days", "Last 7 days", "Older"];

  return (
    <AdminShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <ShoppingCart className="w-6 h-6" />
              Abandoned Carts
            </h1>
            <p className="text-muted-foreground mt-1">
              Track and follow up with customers who didn't complete their booking
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox 
              id="showConverted" 
              checked={showConverted}
              onCheckedChange={(checked) => setShowConverted(checked as boolean)}
            />
            <Label htmlFor="showConverted" className="text-sm cursor-pointer">
              Show converted
            </Label>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{carts?.length || 0}</div>
              <p className="text-sm text-muted-foreground">Total abandoned</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">
                {carts?.filter(c => c.email || c.phone).length || 0}
              </div>
              <p className="text-sm text-muted-foreground">With contact info</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">
                {carts?.filter(c => c.contacted_at).length || 0}
              </div>
              <p className="text-sm text-muted-foreground">Contacted</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">
                CA${(carts?.reduce((sum, c) => sum + (c.total_amount || 0), 0) || 0).toLocaleString()}
              </div>
              <p className="text-sm text-muted-foreground">Potential revenue</p>
            </CardContent>
          </Card>
        </div>

        {/* Cart List */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        ) : carts?.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <ShoppingCart className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-medium mb-2">No abandoned carts</h3>
              <p className="text-sm text-muted-foreground">
                Carts will appear here when customers leave the checkout without completing
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {groupOrder.map((group) => {
              const groupCarts = groupedCarts[group];
              if (!groupCarts?.length) return null;
              
              return (
                <div key={group}>
                  <h3 className="font-medium text-muted-foreground mb-3">{group}</h3>
                  <div className="space-y-3">
                    {groupCarts.map((cart) => (
                      <Card 
                        key={cart.id}
                        className={cn(
                          "transition-colors",
                          cart.converted_at && "opacity-60 bg-muted/30"
                        )}
                      >
                        <CardContent className="p-4">
                          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                            {/* Customer Info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-2">
                                {cart.first_name || cart.last_name ? (
                                  <span className="font-medium">
                                    {cart.first_name} {cart.last_name}
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground italic">No name</span>
                                )}
                                {cart.contacted_at && (
                                  <Badge variant="secondary" className="text-xs">
                                    <CheckCircle className="w-3 h-3 mr-1" />
                                    Contacted
                                  </Badge>
                                )}
                                {cart.converted_at && (
                                  <Badge variant="default" className="text-xs">
                                    Converted
                                  </Badge>
                                )}
                              </div>
                              
                              <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                                {cart.email && (
                                  <a 
                                    href={`mailto:${cart.email}`} 
                                    className="flex items-center gap-1 hover:text-foreground"
                                  >
                                    <Mail className="w-3.5 h-3.5" />
                                    {cart.email}
                                  </a>
                                )}
                                {cart.phone && (
                                  <a 
                                    href={`tel:${cart.phone}`}
                                    className="flex items-center gap-1 hover:text-foreground"
                                  >
                                    <Phone className="w-3.5 h-3.5" />
                                    {cart.phone}
                                  </a>
                                )}
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3.5 h-3.5" />
                                  {formatDistanceToNow(new Date(cart.abandoned_at), { addSuffix: true })}
                                </span>
                              </div>
                            </div>

                            {/* Vehicle Info */}
                            {cart.vehicle && (
                              <div className="flex items-center gap-3 p-2 bg-muted/50 rounded-lg">
                                <Car className="w-5 h-5 text-muted-foreground shrink-0" />
                                <div className="min-w-0">
                                  <p className="font-medium text-sm truncate">
                                    {cart.vehicle.year} {cart.vehicle.make} {cart.vehicle.model}
                                  </p>
                                  {cart.pickup_date && cart.return_date && (
                                    <p className="text-xs text-muted-foreground">
                                      {format(new Date(cart.pickup_date), "MMM d")} - {format(new Date(cart.return_date), "MMM d")}
                                    </p>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Value */}
                            {cart.total_amount && (
                              <div className="text-right">
                                <p className="font-semibold">CA${cart.total_amount.toFixed(2)}</p>
                                <p className="text-xs text-muted-foreground">Cart value</p>
                              </div>
                            )}

                            {/* Actions */}
                            <div className="flex items-center gap-2">
                              {!cart.contacted_at && !cart.converted_at && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setSelectedCart(cart);
                                    setContactNotes(cart.contact_notes || "");
                                  }}
                                >
                                  <MessageSquare className="w-4 h-4 mr-1" />
                                  Mark contacted
                                </Button>
                              )}
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => setDeleteTarget(cart.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>

                          {/* Notes if contacted */}
                          {cart.contact_notes && (
                            <div className="mt-3 pt-3 border-t text-sm text-muted-foreground">
                              <strong>Notes:</strong> {cart.contact_notes}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Contact Dialog */}
      <Dialog open={!!selectedCart} onOpenChange={(open) => !open && setSelectedCart(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark as Contacted</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Contact Notes (optional)</Label>
              <Textarea
                value={contactNotes}
                onChange={(e) => setContactNotes(e.target.value)}
                placeholder="Add notes about your outreach..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedCart(null)}>
              Cancel
            </Button>
            <Button onClick={handleMarkContacted} disabled={updateCart.isPending}>
              {updateCart.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete abandoned cart?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this cart record. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminShell>
  );
}
