import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Camera, Search, Filter, Eye, ChevronDown, Car, Calendar, User } from "lucide-react";
import { AdminShell } from "@/components/layout/AdminShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";

interface ConditionPhoto {
  id: string;
  booking_id: string;
  photo_url: string;
  photo_type: string;
  phase: string;
  notes: string | null;
  captured_at: string;
  captured_by: string;
  booking?: {
    booking_code: string;
    vehicle?: {
      make: string;
      model: string;
      year: number;
    };
  };
}

export default function AdminConditionPhotos() {
  const [searchTerm, setSearchTerm] = useState("");
  const [phaseFilter, setPhaseFilter] = useState<string>("all");
  const [selectedPhoto, setSelectedPhoto] = useState<ConditionPhoto | null>(null);

  const { data: photos = [], isLoading } = useQuery({
    queryKey: ["admin-condition-photos", phaseFilter],
    queryFn: async () => {
      let query = supabase
        .from("condition_photos")
        .select(`
          *,
          booking:bookings(
            booking_code,
            vehicle:vehicles(make, model, year)
          )
        `)
        .order("captured_at", { ascending: false })
        .limit(100);

      if (phaseFilter !== "all") {
        query = query.eq("phase", phaseFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as ConditionPhoto[];
    },
  });

  const filteredPhotos = photos.filter((photo) => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      photo.booking?.booking_code?.toLowerCase().includes(searchLower) ||
      photo.photo_type?.toLowerCase().includes(searchLower) ||
      photo.booking?.vehicle?.make?.toLowerCase().includes(searchLower) ||
      photo.booking?.vehicle?.model?.toLowerCase().includes(searchLower)
    );
  });

  const getPhaseColor = (phase: string) => {
    switch (phase) {
      case "pickup":
        return "bg-blue-500/10 text-blue-600 border-blue-500/20";
      case "return":
        return "bg-green-500/10 text-green-600 border-green-500/20";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  return (
    <AdminShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="heading-2 flex items-center gap-3">
              <Camera className="w-8 h-8 text-primary" />
              Condition Photos
            </h1>
            <p className="text-muted-foreground mt-1">
              View vehicle condition photos from pickups and returns
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by booking code or vehicle..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={phaseFilter} onValueChange={setPhaseFilter}>
            <SelectTrigger className="w-[160px]">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Phase" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Phases</SelectItem>
              <SelectItem value="pickup">Pickup</SelectItem>
              <SelectItem value="return">Return</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Photo Grid */}
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <Skeleton key={i} className="aspect-square rounded-xl" />
            ))}
          </div>
        ) : filteredPhotos.length === 0 ? (
          <div className="text-center py-16 bg-muted/30 rounded-2xl">
            <Camera className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No condition photos found</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filteredPhotos.map((photo) => (
              <div
                key={photo.id}
                onClick={() => setSelectedPhoto(photo)}
                className="group relative aspect-square rounded-xl overflow-hidden cursor-pointer border border-border hover:border-primary/50 transition-all"
              >
                <img
                  src={photo.photo_url}
                  alt={photo.photo_type}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="absolute bottom-0 left-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  <p className="text-white text-sm font-medium truncate">
                    {photo.booking?.vehicle?.make} {photo.booking?.vehicle?.model}
                  </p>
                  <p className="text-white/70 text-xs">{photo.photo_type}</p>
                </div>
                <Badge
                  className={`absolute top-2 right-2 ${getPhaseColor(photo.phase)}`}
                >
                  {photo.phase}
                </Badge>
              </div>
            ))}
          </div>
        )}

        {/* Photo Detail Dialog */}
        <Dialog open={!!selectedPhoto} onOpenChange={() => setSelectedPhoto(null)}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Camera className="w-5 h-5" />
                Condition Photo Details
              </DialogTitle>
            </DialogHeader>
            {selectedPhoto && (
              <div className="space-y-4">
                <img
                  src={selectedPhoto.photo_url}
                  alt={selectedPhoto.photo_type}
                  className="w-full rounded-xl"
                />
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Car className="w-4 h-4" />
                      <span>Vehicle</span>
                    </div>
                    <p className="font-medium">
                      {selectedPhoto.booking?.vehicle?.year}{" "}
                      {selectedPhoto.booking?.vehicle?.make}{" "}
                      {selectedPhoto.booking?.vehicle?.model}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      <span>Captured</span>
                    </div>
                    <p className="font-medium">
                      {format(new Date(selectedPhoto.captured_at), "MMM d, yyyy h:mm a")}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Photo Type</p>
                    <p className="font-medium capitalize">{selectedPhoto.photo_type}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Phase</p>
                    <Badge className={getPhaseColor(selectedPhoto.phase)}>
                      {selectedPhoto.phase}
                    </Badge>
                  </div>
                </div>
                {selectedPhoto.notes && (
                  <div className="p-4 bg-muted rounded-xl">
                    <p className="text-sm text-muted-foreground mb-1">Notes</p>
                    <p>{selectedPhoto.notes}</p>
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>Booking Code:</span>
                  <Badge variant="outline" className="font-mono">
                    {selectedPhoto.booking?.booking_code}
                  </Badge>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AdminShell>
  );
}