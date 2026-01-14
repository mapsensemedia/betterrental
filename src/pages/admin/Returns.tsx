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

type DateFilter = "today" | "next24h" | "week";

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

  const { data: returns, isLoading, refetch } = useReturns(
    dateFilter,
    locationFilter !== "all" ? locationFilter : undefined
  );
  const { data: locations } = useLocations();

  const handleOpenReturnConsole = (bookingId: string) => {
    navigate(`/admin/returns/${bookingId}`);
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

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-4">
              <Select value={dateFilter} onValueChange={(v) => setDateFilter(v as DateFilter)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="next24h">Next 24 Hours</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
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
        ) : returns?.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <div className="text-center text-muted-foreground">
                <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="font-medium">No returns scheduled</p>
                <p className="text-sm">No returns for the selected time period</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {returns?.map((booking) => (
              <Card 
                key={booking.id} 
                className={`cursor-pointer hover:border-primary/50 transition-colors ${
                  booking.hasDamageReport 
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
            ))}
          </div>
        )}

        {/* Stats */}
        {returns && returns.length > 0 && (
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>{returns.length} return{returns.length !== 1 ? "s" : ""} due</span>
            <span>
              {returns.filter(r => r.canSettle).length} ready to settle,{" "}
              {returns.filter(r => !r.canSettle).length} need review
            </span>
          </div>
        )}
      </div>
    </AdminShell>
  );
}
