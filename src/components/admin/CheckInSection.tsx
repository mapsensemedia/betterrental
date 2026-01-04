import { useState, useMemo } from "react";
import { format, parseISO } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  User,
  CreditCard,
  Calendar,
  Loader2,
  ShieldCheck,
  ArrowRight,
} from "lucide-react";
import {
  useCheckInRecord,
  useCreateOrUpdateCheckIn,
  useCompleteCheckIn,
  calculateTimingStatus,
  calculateAge,
  isLicenseExpired,
  type CheckInValidation,
  type TimingStatus,
  type CheckInStatus,
} from "@/hooks/use-checkin";

interface CheckInSectionProps {
  bookingId: string;
  bookingStartAt: string;
  customerName: string | null;
  hasLicenseUploaded: boolean;
  licenseVerified: boolean;
}

const MIN_DRIVER_AGE = 21;

export function CheckInSection({
  bookingId,
  bookingStartAt,
  customerName,
  hasLicenseUploaded,
  licenseVerified,
}: CheckInSectionProps) {
  const { data: checkInRecord, isLoading } = useCheckInRecord(bookingId);
  const updateCheckIn = useCreateOrUpdateCheckIn();
  const completeCheckIn = useCompleteCheckIn();

  // Local form state
  const [identityVerified, setIdentityVerified] = useState(false);
  const [identityNotes, setIdentityNotes] = useState("");
  const [licenseNameMatches, setLicenseNameMatches] = useState(false);
  const [licenseValid, setLicenseValid] = useState(false);
  const [licenseExpiryDate, setLicenseExpiryDate] = useState("");
  const [licenseNotes, setLicenseNotes] = useState("");
  const [ageVerified, setAgeVerified] = useState(false);
  const [customerDob, setCustomerDob] = useState("");
  const [ageNotes, setAgeNotes] = useState("");

  // Sync from record when loaded
  useState(() => {
    if (checkInRecord) {
      setIdentityVerified(checkInRecord.identityVerified);
      setIdentityNotes(checkInRecord.identityNotes || "");
      setLicenseNameMatches(checkInRecord.licenseNameMatches);
      setLicenseValid(checkInRecord.licenseValid);
      setLicenseExpiryDate(checkInRecord.licenseExpiryDate || "");
      setLicenseNotes(checkInRecord.licenseNotes || "");
      setAgeVerified(checkInRecord.ageVerified);
      setCustomerDob(checkInRecord.customerDob || "");
      setAgeNotes(checkInRecord.ageNotes || "");
    }
  });

  // Calculate timing
  const timing = useMemo(() => calculateTimingStatus(bookingStartAt), [bookingStartAt]);

  // Calculate age if DOB provided
  const age = customerDob ? calculateAge(customerDob) : null;
  const ageIsValid = age !== null && age >= MIN_DRIVER_AGE;

  // License expiry check
  const licenseIsExpired = licenseExpiryDate ? isLicenseExpired(licenseExpiryDate) : false;

  // Build validations
  const validations: CheckInValidation[] = useMemo(() => [
    {
      field: "identity",
      label: "Government Photo ID",
      passed: identityVerified,
      required: true,
      notes: identityNotes || undefined,
    },
    {
      field: "license_uploaded",
      label: "Driver's License Uploaded",
      passed: hasLicenseUploaded,
      required: true,
    },
    {
      field: "license_reviewed",
      label: "License Reviewed by Staff",
      passed: licenseVerified,
      required: true,
    },
    {
      field: "license_name",
      label: "Name Matches Booking",
      passed: licenseNameMatches,
      required: true,
    },
    {
      field: "license_valid",
      label: "License Not Expired",
      passed: licenseValid && !licenseIsExpired,
      required: true,
    },
    {
      field: "age",
      label: `Age Requirement (${MIN_DRIVER_AGE}+)`,
      passed: ageVerified && ageIsValid,
      required: true,
      notes: age !== null ? `Customer age: ${age}` : undefined,
    },
    {
      field: "timing",
      label: "Within Booking Window",
      passed: timing.status === "on_time" || timing.status === "early",
      required: false, // Late arrivals allowed but flagged
      notes: timing.status === "late" ? `${timing.minutesDiff} minutes late` : undefined,
    },
  ], [
    identityVerified,
    identityNotes,
    hasLicenseUploaded,
    licenseVerified,
    licenseNameMatches,
    licenseValid,
    licenseIsExpired,
    ageVerified,
    ageIsValid,
    age,
    timing,
  ]);

  const requiredPassed = validations.filter(v => v.required).every(v => v.passed);
  const anyRequiredFailed = validations.some(v => v.required && !v.passed);

  const handleSave = () => {
    updateCheckIn.mutate({
      bookingId,
      data: {
        identityVerified,
        identityNotes,
        licenseNameMatches,
        licenseValid,
        licenseExpiryDate: licenseExpiryDate || undefined,
        licenseNotes,
        ageVerified,
        customerDob: customerDob || undefined,
        ageNotes,
        arrivalTime: new Date().toISOString(),
        timingStatus: timing.status,
      },
    });
  };

  const handleComplete = () => {
    completeCheckIn.mutate({ bookingId, validations });
  };

  const getStatusBadge = (status: CheckInStatus) => {
    switch (status) {
      case "passed":
        return <Badge className="bg-green-500">Passed</Badge>;
      case "needs_review":
        return <Badge variant="destructive">Needs Review</Badge>;
      case "blocked":
        return <Badge variant="destructive">Blocked</Badge>;
      default:
        return <Badge variant="secondary">Pending</Badge>;
    }
  };

  const getTimingBadge = (status: TimingStatus) => {
    switch (status) {
      case "on_time":
        return <Badge className="bg-green-500">On Time</Badge>;
      case "early":
        return <Badge className="bg-blue-500">Early</Badge>;
      case "late":
        return <Badge variant="destructive">Late</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  // If already completed
  if (checkInRecord?.checkInStatus === "passed") {
    return (
      <Card className="border-green-500/30 bg-green-500/5">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-green-500" />
            Check-In Complete
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Status</span>
            {getStatusBadge(checkInRecord.checkInStatus)}
          </div>
          {checkInRecord.checkedInAt && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Checked in at</span>
              <span className="text-sm">{format(parseISO(checkInRecord.checkedInAt), "PPp")}</span>
            </div>
          )}

          {/* Next Steps Panel */}
          <Separator />
          <div>
            <p className="text-sm font-medium mb-3">Next Required Steps:</p>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium text-primary">1</div>
                <span>Payment / Deposit</span>
                <ArrowRight className="h-3 w-3 text-muted-foreground ml-auto" />
              </div>
              <div className="flex items-center gap-2 text-sm">
                <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-medium">2</div>
                <span className="text-muted-foreground">Rental Agreement</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-medium">3</div>
                <span className="text-muted-foreground">Vehicle Walkaround</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // If blocked/needs review
  if (
    checkInRecord?.checkInStatus === "needs_review" ||
    checkInRecord?.checkInStatus === "blocked"
  ) {
    return (
      <Card className="border-destructive/30 bg-destructive/5">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Check-In Blocked
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Cannot proceed</AlertTitle>
            <AlertDescription>
              {checkInRecord.blockedReason || "One or more required checks failed."}
            </AlertDescription>
          </Alert>
          <Button variant="outline" onClick={() => {
            // Reset to allow re-check
            updateCheckIn.mutate({
              bookingId,
              data: { checkInStatus: "pending", blockedReason: "" },
            });
          }}>
            Re-attempt Check-In
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <User className="h-5 w-5" />
            Customer Check-In
          </CardTitle>
          {getTimingBadge(timing.status)}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Timing info */}
        <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
          <Clock className="h-5 w-5 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium">Scheduled pickup: {format(parseISO(bookingStartAt), "PPp")}</p>
            <p className="text-xs text-muted-foreground">
              {timing.status === "on_time" && "Customer is within the pickup window"}
              {timing.status === "early" && `Customer arrived ${timing.minutesDiff} minutes early`}
              {timing.status === "late" && `Customer is ${timing.minutesDiff} minutes late`}
            </p>
          </div>
        </div>

        {/* Validation Checklist */}
        <div className="space-y-4">
          <p className="text-sm font-medium">Verification Checklist</p>

          {/* Identity Verification */}
          <div className="space-y-2 p-3 rounded-lg border">
            <div className="flex items-center gap-3">
              <Checkbox
                id="identity"
                checked={identityVerified}
                onCheckedChange={(c) => setIdentityVerified(c === true)}
              />
              <Label htmlFor="identity" className="flex-1 cursor-pointer">
                Government Photo ID Verified
              </Label>
              {identityVerified ? (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              ) : (
                <XCircle className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
            <Input
              placeholder="Notes (optional)"
              value={identityNotes}
              onChange={(e) => setIdentityNotes(e.target.value)}
              className="text-sm"
            />
          </div>

          {/* License Checks */}
          <div className="space-y-3 p-3 rounded-lg border">
            <div className="flex items-center gap-2 mb-2">
              <CreditCard className="h-4 w-4" />
              <span className="text-sm font-medium">Driver's License</span>
            </div>

            <div className="flex items-center gap-3">
              <Checkbox
                id="license_uploaded"
                checked={hasLicenseUploaded}
                disabled
              />
              <Label htmlFor="license_uploaded" className="flex-1 text-sm">
                License uploaded by customer
              </Label>
              {hasLicenseUploaded ? (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              ) : (
                <XCircle className="h-4 w-4 text-destructive" />
              )}
            </div>

            <div className="flex items-center gap-3">
              <Checkbox
                id="license_reviewed"
                checked={licenseVerified}
                disabled
              />
              <Label htmlFor="license_reviewed" className="flex-1 text-sm">
                Reviewed by staff
              </Label>
              {licenseVerified ? (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              ) : (
                <XCircle className="h-4 w-4 text-muted-foreground" />
              )}
            </div>

            <div className="flex items-center gap-3">
              <Checkbox
                id="license_name"
                checked={licenseNameMatches}
                onCheckedChange={(c) => setLicenseNameMatches(c === true)}
              />
              <Label htmlFor="license_name" className="flex-1 text-sm">
                Name matches booking ({customerName || "Unknown"})
              </Label>
              {licenseNameMatches ? (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              ) : (
                <XCircle className="h-4 w-4 text-muted-foreground" />
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">License Expiry Date</Label>
                <Input
                  type="date"
                  value={licenseExpiryDate}
                  onChange={(e) => {
                    setLicenseExpiryDate(e.target.value);
                    setLicenseValid(e.target.value ? !isLicenseExpired(e.target.value) : false);
                  }}
                  className="text-sm"
                />
              </div>
              <div className="flex items-end">
                {licenseExpiryDate && (
                  licenseIsExpired ? (
                    <Badge variant="destructive">Expired</Badge>
                  ) : (
                    <Badge className="bg-green-500">Valid</Badge>
                  )
                )}
              </div>
            </div>
          </div>

          {/* Age Verification */}
          <div className="space-y-3 p-3 rounded-lg border">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="h-4 w-4" />
              <span className="text-sm font-medium">Age Verification (min {MIN_DRIVER_AGE})</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Date of Birth</Label>
                <Input
                  type="date"
                  value={customerDob}
                  onChange={(e) => {
                    setCustomerDob(e.target.value);
                    if (e.target.value) {
                      const calculatedAge = calculateAge(e.target.value);
                      setAgeVerified(calculatedAge >= MIN_DRIVER_AGE);
                    }
                  }}
                  className="text-sm"
                />
              </div>
              <div className="flex items-end gap-2">
                {age !== null && (
                  <>
                    <span className="text-sm">Age: {age}</span>
                    {ageIsValid ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-destructive" />
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="p-3 rounded-lg bg-muted/50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Validation Summary</span>
            <span className="text-sm">
              {validations.filter(v => v.passed).length}/{validations.length} passed
            </span>
          </div>
          <div className="flex flex-wrap gap-1">
            {validations.map((v) => (
              <Badge
                key={v.field}
                variant={v.passed ? "default" : v.required ? "destructive" : "secondary"}
                className={v.passed ? "bg-green-500" : ""}
              >
                {v.passed ? <CheckCircle2 className="h-3 w-3 mr-1" /> : <XCircle className="h-3 w-3 mr-1" />}
                {v.label}
              </Badge>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleSave}
            disabled={updateCheckIn.isPending}
          >
            {updateCheckIn.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save Progress
          </Button>
          <Button
            onClick={handleComplete}
            disabled={completeCheckIn.isPending || anyRequiredFailed}
            className={requiredPassed ? "bg-green-600 hover:bg-green-700" : ""}
          >
            {completeCheckIn.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {requiredPassed ? "Complete Check-In" : "Review Required"}
          </Button>
        </div>

        {anyRequiredFailed && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Some required checks have not passed. Review and complete all required items before check-in.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
