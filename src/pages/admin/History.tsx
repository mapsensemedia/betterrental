/**
 * History Page - Previous Bookings and Returns with all details
 */
import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { AdminShell } from "@/components/layout/AdminShell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SignedStorageImage } from "@/components/shared/SignedStorageImage";
import { PhotoLightbox } from "@/components/shared/PhotoLightbox";
import {
  BookOpen,
  RotateCcw,
  Search,
  Calendar,
  User,
  Car,
  MapPin,
  DollarSign,
  Camera,
  Eye,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  Phone,
  Mail,
  Image as ImageIcon,
} from "lucide-react";
import { useAdminBookings } from "@/hooks/use-bookings";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

// Fetch condition photos for a booking
function useBookingPhotos(bookingId: string | null) {
  return useQuery({
    queryKey: ["booking-photos", bookingId],
    queryFn: async () => {
      if (!bookingId) return { preArrival: [], returnPhotos: [] };
      const { data, error } = await supabase
        .from("condition_photos")
        .select("*")
        .eq("booking_id", bookingId)
        .order("captured_at", { ascending: true });
      if (error) throw error;
      const preArrival = (data || []).filter((p) => p.phase === "pre_rental" || p.phase === "pickup");
      const returnPhotos = (data || []).filter((p) => p.phase === "return" || p.phase === "post_rental");
      return { preArrival, returnPhotos };
    },
    enabled: !!bookingId,
  });
}

// Fetch customer profile
function useCustomerProfile(userId: string | null) {
  return useQuery({
    queryKey: ["customer-profile", userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });
}

// Photo gallery component with lightbox support
function PhotoGallery({ 
  photos, 
  title, 
  onPhotoClick,
}: { 
  photos: any[]; 
  title: string; 
  onPhotoClick?: (index: number) => void;
}) {
  if (photos.length === 0) {
    return (
      <div className="text-center py-6 text-muted-foreground">
        <ImageIcon className="w-10 h-10 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No {title.toLowerCase()} available</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      {photos.map((photo, index) => (
        <button
          key={photo.id}
          onClick={() => onPhotoClick?.(index)}
          className="relative group text-left cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary rounded-lg"
        >
          <SignedStorageImage
            bucket="condition-photos"
            path={photo.photo_url}
            alt={photo.photo_type}
            className="w-full h-32 object-cover rounded-lg border group-hover:opacity-90 transition-opacity"
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors rounded-lg flex items-center justify-center">
            <Eye className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs p-1.5 rounded-b-lg">
            <p className="truncate">{photo.photo_type?.replace(/_/g, " ")}</p>
            <p className="text-white/70 text-[10px]">
              {photo.captured_at ? format(new Date(photo.captured_at), "MMM d, h:mm a") : "N/A"}
            </p>
          </div>
        </button>
      ))}
    </div>
  );
}

// Booking detail dialog with lightbox
function BookingDetailDialog({ booking }: { booking: any }) {
  const { data: photos, isLoading: photosLoading } = useBookingPhotos(booking.id);
  const { data: customer } = useCustomerProfile(booking.user_id);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxPhotos, setLightboxPhotos] = useState<any[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const openLightbox = (photoSet: any[], index: number) => {
    setLightboxPhotos(photoSet);
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  return (
    <>
      <Dialog>
        <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <Eye className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="w-5 h-5" />
            Booking {booking.booking_code}
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[70vh]">
          <div className="space-y-6 pr-4">
            {/* Customer Info */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Customer Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">{customer?.full_name || booking.profile?.full_name || "N/A"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">{customer?.email || booking.profile?.email || "N/A"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">{customer?.phone || booking.profile?.phone || "N/A"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-muted-foreground" />
                    <Badge variant={customer?.driver_license_status === "verified" ? "default" : "secondary"}>
                      License: {customer?.driver_license_status || "Unknown"}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Booking Details */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Car className="w-4 h-4" />
                  Booking Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Vehicle</p>
                    <p className="font-medium">
                      {booking.vehicle?.year} {booking.vehicle?.make} {booking.vehicle?.model}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Location</p>
                    <p className="font-medium">{booking.location?.name || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Pickup</p>
                    <p className="font-medium">{booking.start_at ? format(new Date(booking.start_at), "MMM d, yyyy h:mm a") : "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Return</p>
                    <p className="font-medium">{booking.end_at ? format(new Date(booking.end_at), "MMM d, yyyy h:mm a") : "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Total</p>
                    <p className="font-medium text-green-600">${booking.total_amount?.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Status</p>
                    <Badge variant={booking.status === "completed" ? "default" : "secondary"}>
                      {booking.status}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Pre-Arrival Photos */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Camera className="w-4 h-4" />
                  Pre-Arrival Photos
                </CardTitle>
              </CardHeader>
              <CardContent>
                {photosLoading ? (
                  <div className="grid grid-cols-3 gap-3">
                    {[1, 2, 3].map((i) => <Skeleton key={i} className="h-32 rounded-lg" />)}
                  </div>
                ) : (
                  <PhotoGallery 
                    photos={photos?.preArrival || []} 
                    title="Pre-arrival photos"
                    onPhotoClick={(idx) => openLightbox(photos?.preArrival || [], idx)}
                  />
                )}
              </CardContent>
            </Card>

            {/* Return Photos */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <RotateCcw className="w-4 h-4" />
                  Return Photos
                </CardTitle>
              </CardHeader>
              <CardContent>
                {photosLoading ? (
                  <div className="grid grid-cols-3 gap-3">
                    {[1, 2, 3].map((i) => <Skeleton key={i} className="h-32 rounded-lg" />)}
                  </div>
                ) : (
                  <PhotoGallery 
                    photos={photos?.returnPhotos || []} 
                    title="Return photos"
                    onPhotoClick={(idx) => openLightbox(photos?.returnPhotos || [], idx)}
                  />
                )}
              </CardContent>
            </Card>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
    
    <PhotoLightbox
      photos={lightboxPhotos}
      initialIndex={lightboxIndex}
      isOpen={lightboxOpen}
      onClose={() => setLightboxOpen(false)}
      title={`Booking ${booking.booking_code} Photos`}
    />
    </>
  );
}

// Status badge helper
function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; icon: any }> = {
    completed: { variant: "default", icon: CheckCircle },
    cancelled: { variant: "destructive", icon: XCircle },
    active: { variant: "secondary", icon: Clock },
    pending: { variant: "outline", icon: Clock },
    confirmed: { variant: "secondary", icon: CheckCircle },
  };
  const config = variants[status] || { variant: "outline" as const, icon: Clock };
  const Icon = config.icon;

  return (
    <Badge variant={config.variant} className="gap-1">
      <Icon className="w-3 h-3" />
      {status}
    </Badge>
  );
}

export default function AdminHistory() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"bookings" | "returns">("bookings");

  // Fetch completed and cancelled bookings
  const { data: allBookings = [], isLoading } = useAdminBookings({ status: undefined });

  // Filter bookings based on tab
  const filteredData = useMemo(() => {
    let data = allBookings;

    // For bookings tab: show completed/cancelled
    // For returns tab: show only completed with actualReturnAt
    if (activeTab === "bookings") {
      data = data.filter((b) => b.status === "completed" || b.status === "cancelled");
    } else {
      data = data.filter((b) => b.status === "completed" && b.actualReturnAt);
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      data = data.filter((b) => 
        b.bookingCode?.toLowerCase().includes(query) ||
        b.profile?.fullName?.toLowerCase().includes(query) ||
        b.profile?.email?.toLowerCase().includes(query) ||
        b.vehicle?.make?.toLowerCase().includes(query) ||
        b.vehicle?.model?.toLowerCase().includes(query)
      );
    }

    // Sort by date descending - handle null dates safely
    return data.sort((a, b) => {
      const dateA = a.endAt ? new Date(a.endAt).getTime() : 0;
      const dateB = b.endAt ? new Date(b.endAt).getTime() : 0;
      return dateB - dateA;
    });
  }, [allBookings, activeTab, searchQuery]);

  return (
    <AdminShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">History</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Previous bookings and returns with complete details
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by code, customer, or vehicle..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <TabsList className="bg-muted/50">
            <TabsTrigger value="bookings" className="gap-2">
              <BookOpen className="w-4 h-4" />
              Previous Bookings
            </TabsTrigger>
            <TabsTrigger value="returns" className="gap-2">
              <RotateCcw className="w-4 h-4" />
              Completed Returns
            </TabsTrigger>
          </TabsList>

          <TabsContent value="bookings" className="mt-4">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Booking</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Vehicle</TableHead>
                      <TableHead>Dates</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      Array.from({ length: 5 }).map((_, idx) => (
                        <TableRow key={idx}>
                          <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                          <TableCell><Skeleton className="h-8 w-8" /></TableCell>
                        </TableRow>
                      ))
                    ) : filteredData.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-12">
                          <BookOpen className="w-10 h-10 mx-auto mb-2 text-muted-foreground opacity-50" />
                          <p className="text-muted-foreground">No previous bookings found</p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredData.map((booking) => (
                        <TableRow key={booking.id} className="cursor-pointer hover:bg-muted/50">
                          <TableCell>
                            <span className="font-mono font-medium">{booking.bookingCode}</span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Avatar className="w-7 h-7">
                                <AvatarFallback className="text-xs">
                                  {booking.profile?.fullName?.[0] || "?"}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <p className="text-sm font-medium truncate">
                                  {booking.profile?.fullName || "Unknown"}
                                </p>
                                <p className="text-xs text-muted-foreground truncate">
                                  {booking.profile?.email}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <p className="text-sm">
                              {booking.vehicle?.year} {booking.vehicle?.make} {booking.vehicle?.model}
                            </p>
                          </TableCell>
                          <TableCell>
                            <div className="text-xs">
                              <p>{booking.startAt ? format(new Date(booking.startAt), "MMM d") : "N/A"}</p>
                              <p className="text-muted-foreground">
                                to {booking.endAt ? format(new Date(booking.endAt), "MMM d, yyyy") : "N/A"}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="font-medium">${booking.totalAmount?.toFixed(2)}</span>
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={booking.status} />
                          </TableCell>
                          <TableCell>
                            <BookingDetailDialog booking={booking} />
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
            {filteredData.length > 0 && (
              <p className="text-xs text-muted-foreground text-center mt-3">
                Showing {filteredData.length} bookings
              </p>
            )}
          </TabsContent>

          <TabsContent value="returns" className="mt-4">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Booking</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Vehicle</TableHead>
                      <TableHead>Returned</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      Array.from({ length: 5 }).map((_, idx) => (
                        <TableRow key={idx}>
                          <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                          <TableCell><Skeleton className="h-8 w-8" /></TableCell>
                        </TableRow>
                      ))
                    ) : filteredData.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-12">
                          <RotateCcw className="w-10 h-10 mx-auto mb-2 text-muted-foreground opacity-50" />
                          <p className="text-muted-foreground">No completed returns found</p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredData.map((booking) => (
                        <TableRow key={booking.id} className="cursor-pointer hover:bg-muted/50">
                          <TableCell>
                            <span className="font-mono font-medium">{booking.bookingCode}</span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Avatar className="w-7 h-7">
                                <AvatarFallback className="text-xs">
                                  {booking.profile?.fullName?.[0] || "?"}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-sm">{booking.profile?.fullName || "Unknown"}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <p className="text-sm">
                              {booking.vehicle?.year} {booking.vehicle?.make} {booking.vehicle?.model}
                            </p>
                          </TableCell>
                          <TableCell>
                            <p className="text-sm">
                              {booking.actualReturnAt
                                ? format(new Date(booking.actualReturnAt), "MMM d, yyyy h:mm a")
                                : booking.endAt
                                  ? format(new Date(booking.endAt), "MMM d, yyyy")
                                  : "N/A"}
                            </p>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm">{booking.location?.name || "N/A"}</span>
                          </TableCell>
                          <TableCell>
                            <span className="font-medium">${booking.totalAmount?.toFixed(2)}</span>
                          </TableCell>
                          <TableCell>
                            <BookingDetailDialog booking={booking} />
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
            {filteredData.length > 0 && (
              <p className="text-xs text-muted-foreground text-center mt-3">
                Showing {filteredData.length} returns
              </p>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AdminShell>
  );
}
