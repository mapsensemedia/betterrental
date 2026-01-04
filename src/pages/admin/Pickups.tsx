import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, isToday, isTomorrow, parseISO } from "date-fns";
import { 
  KeyRound, 
  Search, 
  Filter, 
  CheckCircle, 
  Clock,
  Car,
  User,
  MapPin,
  Phone,
  Calendar,
  Loader2,
  AlertCircle
} from "lucide-react";
import { AdminShell } from "@/components/layout/AdminShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface Booking {
  id: string;
  booking_code: string;
  status: string;
  start_at: string;
  end_at: string;
  daily_rate: number;
  total_amount: number;
  notes: string | null;
  user_id: string;
  vehicle?: {
    make: string;
    model: string;
    year: number;
    image_url: string | null;
  };
  location?: {
    name: string;
    address: string;
  };
  profile?: {
    full_name: string | null;
    email: string | null;
    phone: string | null;
  };
}

export default function AdminPickups() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState<string>("today");
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [pickupNotes, setPickupNotes] = useState("");

  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ["admin-pickups", dateFilter],
    queryFn: async () => {
      const now = new Date();
      let startDate = now;
      let endDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      if (dateFilter === "tomorrow") {
        startDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        endDate = new Date(now.getTime() + 48 * 60 * 60 * 1000);
      } else if (dateFilter === "week") {
        endDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      } else if (dateFilter === "all") {
        startDate = new Date(0);
        endDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
      }

      const { data, error } = await supabase
        .from("bookings")
        .select(`
          *,
          vehicle:vehicles(make, model, year, image_url),
          location:locations(name, address)
        `)
        .in("status", ["confirmed", "pending"])
        .gte("start_at", startDate.toISOString())
        .lt("start_at", endDate.toISOString())
        .order("start_at", { ascending: true });

      if (error) throw error;
      
      // Fetch profiles separately
      const userIds = [...new Set(data.map(b => b.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, email, phone")
        .in("id", userIds);
      
      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
      
      return data.map(booking => ({
        ...booking,
        profile: profileMap.get(booking.user_id) || null,
      })) as Booking[];
    },
  });

  const confirmPickupMutation = useMutation({
    mutationFn: async ({ bookingId, notes }: { bookingId: string; notes: string }) => {
      const { error } = await supabase
        .from("bookings")
        .update({
          status: "active",
          notes: notes || null,
        })
        .eq("id", bookingId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-pickups"] });
      toast({ title: "Pickup confirmed", description: "Booking is now active" });
      setSelectedBooking(null);
      setPickupNotes("");
    },
    onError: (error: any) => {
      toast({ title: "Confirmation failed", description: error.message, variant: "destructive" });
    },
  });

  const filteredBookings = bookings.filter((booking) => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      booking.booking_code?.toLowerCase().includes(searchLower) ||
      booking.profile?.full_name?.toLowerCase().includes(searchLower) ||
      booking.profile?.email?.toLowerCase().includes(searchLower) ||
      booking.vehicle?.make?.toLowerCase().includes(searchLower) ||
      booking.vehicle?.model?.toLowerCase().includes(searchLower)
    );
  });

  const getDateLabel = (dateStr: string) => {
    const date = parseISO(dateStr);
    if (isToday(date)) return "Today";
    if (isTomorrow(date)) return "Tomorrow";
    return format(date, "MMM d");
  };

  const handleConfirmPickup = () => {
    if (!selectedBooking) return;
    confirmPickupMutation.mutate({ bookingId: selectedBooking.id, notes: pickupNotes });
  };

  // Group bookings by date
  const groupedBookings = filteredBookings.reduce((acc, booking) => {
    const dateKey = format(parseISO(booking.start_at), "yyyy-MM-dd");
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(booking);
    return acc;
  }, {} as Record<string, Booking[]>);

  return (
    <AdminShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="heading-2 flex items-center gap-3">
              <KeyRound className="w-8 h-8 text-primary" />
              Pickup Confirmations
            </h1>
            <p className="text-muted-foreground mt-1">
              Confirm vehicle pickups and hand over keys
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-lg px-4 py-2">
              {bookings.length} Scheduled
            </Badge>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by code, name, or vehicle..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={dateFilter} onValueChange={setDateFilter}>
            <SelectTrigger className="w-[160px]">
              <Calendar className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Date" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="tomorrow">Tomorrow</SelectItem>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="all">All Upcoming</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Bookings by Date */}
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-xl" />
            ))}
          </div>
        ) : Object.keys(groupedBookings).length === 0 ? (
          <div className="text-center py-16 bg-muted/30 rounded-2xl">
            <KeyRound className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No pickups scheduled</p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedBookings).map(([dateKey, dateBookings]) => (
              <div key={dateKey}>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-primary" />
                  {getDateLabel(dateBookings[0].start_at)} - {format(parseISO(dateKey), "EEEE, MMMM d")}
                </h3>
                <div className="grid gap-4">
                  {dateBookings.map((booking) => (
                    <Card key={booking.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex flex-col md:flex-row md:items-center gap-4">
                          {/* Vehicle Image */}
                          <div className="w-24 h-16 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                            {booking.vehicle?.image_url ? (
                              <img
                                src={booking.vehicle.image_url}
                                alt={`${booking.vehicle.make} ${booking.vehicle.model}`}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Car className="w-8 h-8 text-muted-foreground" />
                              </div>
                            )}
                          </div>

                          {/* Booking Details */}
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="font-mono">
                                {booking.booking_code}
                              </Badge>
                              <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20">
                                <Clock className="w-3 h-3 mr-1" />
                                {format(parseISO(booking.start_at), "h:mm a")}
                              </Badge>
                            </div>
                            <p className="font-medium">
                              {booking.vehicle?.year} {booking.vehicle?.make} {booking.vehicle?.model}
                            </p>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <User className="w-4 h-4" />
                                {booking.profile?.full_name || "Unknown"}
                              </span>
                              <span className="flex items-center gap-1">
                                <MapPin className="w-4 h-4" />
                                {booking.location?.name}
                              </span>
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              onClick={() => navigate(`/admin/bookings/${booking.id}/ops?returnTo=/admin/pickups`)}
                            >
                              Open Ops
                            </Button>
                            <Button
                              onClick={() => {
                                setSelectedBooking(booking);
                                setPickupNotes(booking.notes || "");
                              }}
                            >
                              <CheckCircle className="w-4 h-4 mr-2" />
                              Confirm
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pickup Confirmation Dialog */}
        <Dialog open={!!selectedBooking} onOpenChange={() => setSelectedBooking(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <KeyRound className="w-5 h-5" />
                Confirm Pickup
              </DialogTitle>
            </DialogHeader>
            {selectedBooking && (
              <div className="space-y-4">
                <div className="p-4 bg-muted rounded-xl space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Booking Code</span>
                    <Badge variant="outline" className="font-mono">{selectedBooking.booking_code}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Vehicle</span>
                    <span className="font-medium">
                      {selectedBooking.vehicle?.year} {selectedBooking.vehicle?.make} {selectedBooking.vehicle?.model}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Customer</span>
                    <span className="font-medium">{selectedBooking.profile?.full_name}</span>
                  </div>
                  {selectedBooking.profile?.phone && (
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Phone</span>
                      <a href={`tel:${selectedBooking.profile.phone}`} className="flex items-center gap-1 text-primary">
                        <Phone className="w-4 h-4" />
                        {selectedBooking.profile.phone}
                      </a>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Pickup Time</span>
                    <span>{format(parseISO(selectedBooking.start_at), "h:mm a")}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Return Date</span>
                    <span>{format(parseISO(selectedBooking.end_at), "MMM d, yyyy")}</span>
                  </div>
                </div>

                <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                  <div className="flex gap-3">
                    <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                    <div className="text-sm">
                      <p className="font-medium text-amber-600">Pre-pickup Checklist</p>
                      <ul className="text-amber-700 mt-1 space-y-1">
                        <li>• Verify customer ID matches booking</li>
                        <li>• Check driver's license is valid</li>
                        <li>• Complete vehicle walk-around inspection</li>
                        <li>• Collect security deposit if required</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground mb-2">Pickup Notes (optional)</p>
                  <Textarea
                    placeholder="Add any notes about the pickup..."
                    value={pickupNotes}
                    onChange={(e) => setPickupNotes(e.target.value)}
                  />
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setSelectedBooking(null)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleConfirmPickup}
                    disabled={confirmPickupMutation.isPending}
                  >
                    {confirmPickupMutation.isPending ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <CheckCircle className="w-4 h-4 mr-2" />
                    )}
                    Confirm Pickup
                  </Button>
                </DialogFooter>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AdminShell>
  );
}