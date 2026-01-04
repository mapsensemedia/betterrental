import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { FileCheck, ChevronRight, User, Eye } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";

interface VerificationRequest {
  id: string;
  documentType: string;
  status: string;
  createdAt: string;
  bookingId: string | null;
  userId: string;
  profile?: {
    fullName: string | null;
    email: string | null;
  };
}

export function PendingVerificationsCard() {
  const { data: verifications = [], isLoading } = useQuery({
    queryKey: ["pending-verifications-summary"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("verification_requests")
        .select("id, document_type, status, created_at, booking_id, user_id")
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(5);
      
      if (error) throw error;
      if (!data || data.length === 0) return [];

      // Fetch profiles
      const userIds = [...new Set(data.map(v => v.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", userIds);
      
      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      return data.map(v => ({
        id: v.id,
        documentType: v.document_type,
        status: v.status,
        createdAt: v.created_at,
        bookingId: v.booking_id,
        userId: v.user_id,
        profile: profileMap.get(v.user_id) ? {
          fullName: profileMap.get(v.user_id)?.full_name || null,
          email: profileMap.get(v.user_id)?.email || null,
        } : undefined,
      })) as VerificationRequest[];
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (verifications.length === 0) {
    return null;
  }

  return (
    <Card className="border-purple-500/30 bg-purple-500/5">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <FileCheck className="w-4 h-4 text-purple-500" />
            Pending Verifications
            <Badge className="bg-purple-500 ml-2">{verifications.length}</Badge>
          </CardTitle>
        </div>
        <CardDescription>
          Driver's licenses and IDs awaiting review
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {verifications.map((verification) => (
          <div
            key={verification.id}
            className="flex items-center justify-between py-2 px-3 rounded-lg bg-background border"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <User className="w-4 h-4 text-purple-500" />
              </div>
              <div>
                <p className="text-sm font-medium">
                  {verification.profile?.fullName || verification.profile?.email || "Unknown User"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {verification.documentType} • {formatDistanceToNow(new Date(verification.createdAt), { addSuffix: true })}
                </p>
              </div>
            </div>
            {verification.bookingId && (
              <Link to={`/admin/bookings/${verification.bookingId}/ops`}>
                <Button variant="ghost" size="sm">
                  <Eye className="w-4 h-4" />
                </Button>
              </Link>
            )}
          </div>
        ))}
        
        {verifications.length > 0 && (
          <Link 
            to="/admin/alerts?type=verification_pending"
            className="flex items-center justify-center gap-2 py-2 text-sm text-purple-600 hover:text-purple-700 transition-colors"
          >
            View all verifications
            <ChevronRight className="w-4 h-4" />
          </Link>
        )}
      </CardContent>
    </Card>
  );
}
