import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { AdminShell } from "@/components/layout/AdminShell";
import { useReturns } from "@/hooks/use-returns";
import { useLocations } from "@/hooks/use-locations";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Car,
  Clock,
  Camera,
  Fuel,
  RefreshCw,
  MapPin,
  ShieldAlert,
  DollarSign,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  Wallet,
} from "lucide-react";
import { DeliveryBadge } from "@/components/admin/DeliveryDetailsCard";

type DateFilter = "today" | "next24h" | "week" | "all";
type StatusFilter = "all" | "pending" | "in_progress" | "completed" | "overdue";

// Get return progress percentage and step label
function getReturnProgress(returnState: string | null): { percent: number; step: string; color: string } {
  switch (returnState) {
    case "not_started":
    case null:
      return { percent: 0, step: "Not Started", color: "bg-muted-foreground" };
    case "initiated":
      return { percent: 10, step: "Initiated", color: "bg-blue-500" };
    case "intake_done":
      return { percent: 30, step: "Intake Done", color: "bg-blue-500" };
    case "evidence_done":
      return { percent: 50, step: "Evidence Done", color: "bg-amber-500" };
    case "issues_reviewed":
      return { percent: 70, step: "Issues Reviewed", color: "bg-amber-500" };
    case "closeout_done":
      return { percent: 90, step: "Closeout Done", color: "bg-emerald-500" };
    case "deposit_processed":
      return { percent: 100, step: "Complete", color: "bg-emerald-500" };
    default:
      return { percent: 0, step: "Unknown", color: "bg-muted-foreground" };
  }
}

export default function AdminReturns() {
  const navigate = useNavigate();
  const [dateFilter, setDateFilter] = useState<DateFilter>("today");
  const [locationFilter, setLocationFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [searchTerm, setSearchTerm] = useState("");

  const { data: returns, isLoading, refetch } = useReturns(
    dateFilter === "all" ? "week" : dateFilter,
    locationFilter !== "all" ? locationFilter : undefined
  );
  const { data: locations } = useLocations();

  const handleOpenReturnConsole = (bookingId: string) => {
    navigate(`/admin/returns/${bookingId}`);
  };

  // Filter returns based on status and search
  const filteredReturns = (returns || []).filter((booking) => {
    // Date filter - if "all" show everything
    if (dateFilter === "all") {
      // No date filtering
    }
    
    // Status filter
    if (statusFilter !== "all") {
      const isOverdue = new Date(booking.endAt) < new Date() && booking.returnState !== "deposit_processed";
      const isCompleted = booking.returnState === "deposit_processed";
      const isInProgress = booking.returnState && booking.returnState !== "not_started" && booking.returnState !== "deposit_processed";
      const isPending = !booking.returnState || booking.returnState === "not_started";
      
      if (statusFilter === "overdue" && !isOverdue) return false;
      if (statusFilter === "completed" && !isCompleted) return false;
      if (statusFilter === "in_progress" && !isInProgress) return false;
      if (statusFilter === "pending" && !isPending) return false;
    }
    
    // Search filter
    if (searchTerm) {
      const query = searchTerm.toLowerCase();
      const matchesCode = booking.bookingCode?.toLowerCase().includes(query);
      const matchesName = booking.profile?.fullName?.toLowerCase().includes(query);
      const matchesEmail = booking.profile?.email?.toLowerCase().includes(query);
      const matchesVehicle = `${booking.vehicle?.make} ${booking.vehicle?.model}`.toLowerCase().includes(query);
      if (!matchesCode && !matchesName && !matchesEmail && !matchesVehicle) return false;
    }
    
    return true;
  });

  // Stats
  const stats = {
    total: returns?.length || 0,
    overdue: (returns || []).filter(r => new Date(r.endAt) < new Date() && r.returnState !== "deposit_processed").length,
    inProgress: (returns || []).filter(r => r.returnState && r.returnState !== "not_started" && r.returnState !== "deposit_processed").length,
    completed: (returns || []).filter(r => r.returnState === "deposit_processed").length,
    pending: (returns || []).filter(r => !r.returnState || r.returnState === "not_started").length,
  };

  const EvidenceBadge = ({ ok, label, icon: Icon }: { ok: boolean; label: string; icon: any }) => (
    <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium ${
      ok ? "bg-emerald-500/10 text-emerald-600" : "bg-destructive/10 text-destructive"
    }`}>
      <Icon className="h-3 w-3" />
      {label}
    </div>
  );

  const ReturnProgressBadge = ({ returnState }: { returnState: string | null }) => {
    const { step, color } = getReturnProgress(returnState);
    return (
      <Badge variant="outline" className={`${color} text-white border-0`}>
        {step}
      </Badge>
    );
  };

  return (
    <AdminShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="heading-2">Returns</h1>
            <p className="text-muted-foreground mt-1">
              Manage vehicle returns and settlement
            </p>
          </div>
          <Button onClick={() => refetch()} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          <Card 
            className={`cursor-pointer transition-all ${statusFilter === "all" ? "ring-2 ring-primary" : ""}`}
            onClick={() => setStatusFilter("all")}
          >
            <CardContent className="p-3">
              <p className="text-xl font-bold">{stats.total}</p>
              <p className="text-xs text-muted-foreground">Total</p>
            </CardContent>
          </Card>
          <Card 
            className={`cursor-pointer transition-all ${statusFilter === "overdue" ? "ring-2 ring-destructive" : ""}`}
            onClick={() => setStatusFilter("overdue")}
          >
            <CardContent className="p-3">
              <p className="text-xl font-bold text-destructive">{stats.overdue}</p>
              <p className="text-xs text-muted-foreground">Overdue</p>
            </CardContent>
          </Card>
          <Card 
            className={`cursor-pointer transition-all ${statusFilter === "in_progress" ? "ring-2 ring-amber-500" : ""}`}
            onClick={() => setStatusFilter("in_progress")}
          >
            <CardContent className="p-3">
              <p className="text-xl font-bold text-amber-500">{stats.inProgress}</p>
              <p className="text-xs text-muted-foreground">In Progress</p>
            </CardContent>
          </Card>
          <Card 
            className={`cursor-pointer transition-all ${statusFilter === "pending" ? "ring-2 ring-blue-500" : ""}`}
            onClick={() => setStatusFilter("pending")}
          >
            <CardContent className="p-3">
              <p className="text-xl font-bold text-blue-500">{stats.pending}</p>
              <p className="text-xs text-muted-foreground">Pending</p>
            </CardContent>
          </Card>
          <Card 
            className={`cursor-pointer transition-all ${statusFilter === "completed" ? "ring-2 ring-emerald-500" : ""}`}
            onClick={() => setStatusFilter("completed")}
          >
            <CardContent className="p-3">
              <p className="text-xl font-bold text-emerald-500">{stats.completed}</p>
              <p className="text-xs text-muted-foreground">Completed</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-4">
              <div className="relative flex-1 min-w-[200px] max-w-sm">
                <input
                  type="text"
                  placeholder="Search by code, name, vehicle..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-3 py-2 pl-9 border rounded-md text-sm"
                />
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              </div>
              
              <Select value={dateFilter} onValueChange={(v) => setDateFilter(v as DateFilter)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="next24h">Next 24 Hours</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="all">All Time</SelectItem>
                </SelectContent>
              </Select>

              <Select value={locationFilter} onValueChange={setLocationFilter}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="All Locations" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Locations</SelectItem>
                  {locations?.map((loc) => (
                    <SelectItem key={loc.id} value={loc.id}>
                      {loc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Returns List */}
        {isLoading ? (
          <Card>
            <CardContent className="py-12">
              <div className="flex items-center justify-center gap-2 text-muted-foreground">
                <RefreshCw className="h-4 w-4 animate-spin" />
                Loading returns...
              </div>
            </CardContent>
          </Card>
        ) : filteredReturns?.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <div className="text-center text-muted-foreground">
                <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="font-medium">No returns found</p>
                <p className="text-sm">No returns match your current filters</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {filteredReturns?.map((booking) => {
              const isOverdue = new Date(booking.endAt) < new Date() && booking.returnState !== "deposit_processed";
              return (
                <Card 
                  key={booking.id} 
                  className={`cursor-pointer hover:border-primary/50 transition-colors ${
                    isOverdue
                      ? "border-destructive/50 bg-destructive/5"
                      : booking.hasDamageReport 
                        ? "border-red-500/50" 
                        : !booking.canSettle 
                          ? "border-amber-500/50" 
                          : ""
                  }`}
                onClick={() => handleOpenReturnConsole(booking.id)}
              >
                <CardContent className="pt-6">
                  <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                    {/* Time & Code */}
                    <div className="flex items-center gap-4 min-w-[200px]">
                      <div className="flex flex-col items-center justify-center w-16 h-16 rounded-lg bg-primary/10">
                        <span className="text-lg font-bold text-primary">
                          {format(new Date(booking.endAt), "HH:mm")}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(booking.endAt), "MMM d")}
                        </span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="font-mono text-sm">
                            {booking.bookingCode}
                          </Badge>
                          <ReturnProgressBadge returnState={booking.returnState} />
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {booking.profile?.fullName || booking.profile?.email || "Unknown"}
                        </p>
                      </div>
                    </div>

                    {/* Vehicle & Location */}
                    <div className="flex-1 flex flex-wrap gap-4">
                      <div className="flex items-center gap-2 min-w-[180px]">
                        <Car className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">
                          {booking.vehicle?.year} {booking.vehicle?.make} {booking.vehicle?.model}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{booking.location?.name}</span>
                        {booking.pickupAddress && (
                          <DeliveryBadge hasDelivery={true} />
                        )}
                      </div>
                      {booking.depositAmount && (
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">${booking.depositAmount} deposit</span>
                        </div>
                      )}
                    </div>

                    {/* Evidence Badges */}
                    <div className="flex flex-wrap gap-2">
                      <EvidenceBadge
                        ok={booking.hasReturnPhotos}
                        label="Photos"
                        icon={Camera}
                      />
                      <EvidenceBadge
                        ok={booking.hasFuelOdometerPhotos}
                        label="Fuel/Odo"
                        icon={Fuel}
                      />
                      {booking.hasDamageReport && (
                        <Badge variant="destructive" className="flex items-center gap-1">
                          <ShieldAlert className="h-3 w-3" />
                          {booking.damageCount} Damage{booking.damageCount > 1 ? "s" : ""}
                        </Badge>
                      )}
                    </div>

                    {/* Process Return Button */}
                    <Button
                      variant={booking.returnState === "deposit_processed" ? "outline" : booking.canSettle ? "default" : "secondary"}
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenReturnConsole(booking.id);
                      }}
                    >
                      {booking.returnState === "deposit_processed" ? (
                        <>
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                          Completed
                        </>
                      ) : booking.returnState && booking.returnState !== "not_started" ? (
                        <>
                          Continue Return
                          <ArrowRight className="h-4 w-4 ml-2" />
                        </>
                      ) : (
                        <>
                          Process Return
                          <ArrowRight className="h-4 w-4 ml-2" />
                        </>
                      )}
                    </Button>
                  </div>

                  {/* Progress Bar */}
                  {booking.returnState && booking.returnState !== "not_started" && booking.returnState !== "deposit_processed" && (
                    <div className="mt-4 pt-4 border-t">
                      <div className="flex items-center gap-3">
                        <Progress 
                          value={getReturnProgress(booking.returnState).percent} 
                          className="flex-1 h-2"
                        />
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {getReturnProgress(booking.returnState).percent}%
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Settlement Guidance - Only show if not started or has issues */}
                  {!booking.canSettle && (!booking.returnState || booking.returnState === "not_started") && (
                    <div className="mt-4 pt-4 border-t">
                      <div className="flex items-center gap-2 text-sm text-amber-600">
                        <AlertTriangle className="h-4 w-4" />
                        <span>
                          Missing: 
                          {!booking.hasReturnPhotos && " return photos"}
                          {!booking.hasFuelOdometerPhotos && " fuel/odometer"}
                          {booking.hasDamageReport && " (damage reported)"}
                        </span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
              );
            })}
          </div>
        )}

        {/* Stats */}
        {filteredReturns && filteredReturns.length > 0 && (
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>{filteredReturns.length} return{filteredReturns.length !== 1 ? "s" : ""} shown</span>
            <span>
              {filteredReturns.filter(r => r.canSettle).length} ready to settle,{" "}
              {filteredReturns.filter(r => !r.canSettle).length} need review
            </span>
          </div>
        )}
      </div>
    </AdminShell>
  );
}
