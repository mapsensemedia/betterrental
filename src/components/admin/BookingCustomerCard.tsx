/**
 * BookingCustomerCard
 * 
 * Reusable editable customer info card for Ops/Admin booking views.
 * All saves go through the update-booking-customer edge function.
 * Never writes directly to profiles or bookings from the client.
 */
import { useState, useEffect } from "react";
import { displayName, formatPhone } from "@/lib/format-customer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User, Phone, Mail, MapPin, Edit2, Save, X, Loader2, CreditCard } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface CustomerData {
  full_name?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  driver_license_number?: string | null;
}

interface BookingCustomerCardProps {
  bookingId: string;
  userId: string | null;
  /** Customer data from booking.profiles or a profile query */
  customer: CustomerData | null;
  /** If true, show edit button. Default true. */
  editable?: boolean;
  /** Compact mode for sidebar summaries */
  compact?: boolean;
  /** Additional query keys to invalidate on save */
  extraInvalidateKeys?: string[][];
}

export function BookingCustomerCard({
  bookingId,
  userId,
  customer,
  editable = true,
  compact = false,
  extraInvalidateKeys = [],
}: BookingCustomerCardProps) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    full_name: "",
    phone: "",
    email: "",
    address: "",
    driver_license_number: "",
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Sync form from customer data
  useEffect(() => {
    if (customer) {
      setForm({
        full_name: customer.full_name || "",
        phone: customer.phone || "",
        email: customer.email || "",
        address: customer.address || "",
        driver_license_number: customer.driver_license_number || "",
      });
    }
  }, [customer]);

  const saveMutation = useMutation({
    mutationFn: async (data: typeof form) => {
      const { data: result, error } = await supabase.functions.invoke(
        "update-booking-customer",
        {
          body: {
            bookingId,
            customer: {
              full_name: data.full_name || null,
              email: data.email || null,
              phone: data.phone || null,
              address: data.address || null,
              driver_license_number: data.driver_license_number || null,
            },
          },
        }
      );

      if (error) throw error;
      if (result?.error) {
        // Handle specific error codes
        if (result.error === "Forbidden: insufficient role") {
          throw new Error("Access denied (staff only)");
        }
        throw new Error(result.error);
      }
      return result;
    },
    onSuccess: () => {
      toast({ title: "Customer info saved" });
      setEditing(false);
      // Invalidate all relevant queries
      queryClient.invalidateQueries({ queryKey: ["booking", bookingId] });
      if (userId) {
        queryClient.invalidateQueries({ queryKey: ["profile-license", userId] });
        queryClient.invalidateQueries({ queryKey: ["profile", userId] });
      }
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      queryClient.invalidateQueries({ queryKey: ["admin-bookings"] });
      extraInvalidateKeys.forEach((key) =>
        queryClient.invalidateQueries({ queryKey: key })
      );
    },
    onError: (err: any) => {
      // Re-fetch server truth before showing error
      queryClient.refetchQueries({ queryKey: ["booking", bookingId] });
      if (userId) {
        queryClient.refetchQueries({ queryKey: ["profile-license", userId] });
      }
      toast({
        title: "Failed to save customer info",
        description: err?.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  // No linked customer profile
  if (!userId) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-muted-foreground" />
            <CardTitle className="text-base">Customer Information</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No linked customer profile
          </p>
        </CardContent>
      </Card>
    );
  }

  if (compact && !editing) {
    return (
      <div className="space-y-2 text-sm">
        <div className="flex items-center justify-between">
          <p className="font-medium">{displayName(customer?.full_name)}</p>
          {editable && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => setEditing(true)}
            >
              <Edit2 className="w-3 h-3" />
            </Button>
          )}
        </div>
        {customer?.email && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Mail className="h-3.5 w-3.5" />
            <span className="truncate text-xs">{customer.email}</span>
          </div>
        )}
        {customer?.phone && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Phone className="h-3.5 w-3.5" />
            <span className="text-xs">{formatPhone(customer.phone)}</span>
          </div>
        )}
        {editing && renderEditForm()}
      </div>
    );
  }

  function renderEditForm() {
    return (
      <div className="space-y-3">
        <div className="space-y-2">
          <Label className="flex items-center gap-1.5">
            <User className="h-3.5 w-3.5" /> Full Name
          </Label>
          <Input
            value={form.full_name}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, full_name: e.target.value }))
            }
            placeholder="Customer full name"
          />
        </div>
        <div className="space-y-2">
          <Label className="flex items-center gap-1.5">
            <Phone className="h-3.5 w-3.5" /> Phone Number
          </Label>
          <Input
            value={form.phone}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, phone: e.target.value }))
            }
            placeholder="+1 (555) 123-4567"
          />
        </div>
        <div className="space-y-2">
          <Label className="flex items-center gap-1.5">
            <Mail className="h-3.5 w-3.5" /> Contact Email
          </Label>
          <Input
            type="email"
            value={form.email}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, email: e.target.value }))
            }
            placeholder="customer@example.com"
          />
          <p className="text-[10px] text-muted-foreground">
            Contact email only — does not change login credentials
          </p>
        </div>
        <div className="space-y-2">
          <Label className="flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5" /> Home Address
          </Label>
          <Input
            value={form.address}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, address: e.target.value }))
            }
            placeholder="123 Main St, City, State ZIP"
          />
        </div>
        <div className="space-y-2">
          <Label className="flex items-center gap-1.5">
            <CreditCard className="h-3.5 w-3.5" /> Driver License #
          </Label>
          <Input
            value={form.driver_license_number}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                driver_license_number: e.target.value,
              }))
            }
            placeholder="License number"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => {
              setEditing(false);
              // Reset form
              if (customer) {
                setForm({
                  full_name: customer.full_name || "",
                  phone: customer.phone || "",
                  email: customer.email || "",
                  address: customer.address || "",
                  driver_license_number: customer.driver_license_number || "",
                });
              }
            }}
          >
            Cancel
          </Button>
          <Button
            className="flex-1"
            onClick={() => saveMutation.mutate(form)}
            disabled={saveMutation.isPending}
          >
            {saveMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-muted-foreground" />
            <CardTitle className="text-base">Customer Information</CardTitle>
          </div>
          {editable && !editing && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setEditing(true)}
            >
              <Edit2 className="w-4 h-4" />
            </Button>
          )}
          {editing && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setEditing(false)}
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {editing ? (
          renderEditForm()
        ) : (
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">
                {displayName(customer?.full_name)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span>
                {formatPhone(customer?.phone) || "Not provided"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span>{customer?.email || "Not provided"}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span>{customer?.address || "Not provided"}</span>
            </div>
            {customer?.driver_license_number && (
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-muted-foreground" />
                <span className="font-mono text-xs">{customer.driver_license_number}</span>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
