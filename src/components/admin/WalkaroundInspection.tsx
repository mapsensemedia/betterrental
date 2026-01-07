import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  DialogDescription,
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
import {
  ClipboardCheck,
  CheckCircle,
  AlertTriangle,
  Plus,
  Trash2,
  Loader2,
  Car,
  Fuel,
  Gauge,
  Eye,
  PenLine,
  Camera,
} from "lucide-react";
import {
  useWalkaroundInspection,
  useStartWalkaround,
  useUpdateWalkaround,
  useCompleteWalkaround,
  useAdminCompleteWalkaround,
  type ScratchDent,
} from "@/hooks/use-walkaround";
import { useBookingConditionPhotos, PHOTO_LABELS, type PhotoType } from "@/hooks/use-condition-photos";
import { SignedStorageImage } from "@/components/shared/SignedStorageImage";
import { format } from "date-fns";

interface WalkaroundInspectionProps {
  bookingId: string;
}

const INTERIOR_CONDITIONS = [
  { value: "excellent", label: "Excellent", color: "bg-green-500" },
  { value: "good", label: "Good", color: "bg-blue-500" },
  { value: "acceptable", label: "Acceptable", color: "bg-yellow-500" },
  { value: "needs_attention", label: "Needs Attention", color: "bg-red-500" },
];

const VEHICLE_LOCATIONS = [
  "Front Bumper",
  "Rear Bumper",
  "Front Left Fender",
  "Front Right Fender",
  "Rear Left Fender",
  "Rear Right Fender",
  "Left Door - Front",
  "Left Door - Rear",
  "Right Door - Front",
  "Right Door - Rear",
  "Hood",
  "Roof",
  "Trunk",
  "Left Mirror",
  "Right Mirror",
  "Windshield",
  "Rear Window",
  "Left Wheels",
  "Right Wheels",
];

export function WalkaroundInspection({ bookingId }: WalkaroundInspectionProps) {
  const { data: inspection, isLoading } = useWalkaroundInspection(bookingId);
  const { data: photos } = useBookingConditionPhotos(bookingId);
  const startWalkaround = useStartWalkaround();
  const updateWalkaround = useUpdateWalkaround();
  const completeWalkaround = useCompleteWalkaround();
  const adminCompleteWalkaround = useAdminCompleteWalkaround();

  const [showPhotoDialog, setShowPhotoDialog] = useState(false);
  const [showAddDamageDialog, setShowAddDamageDialog] = useState(false);
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [showAdminOverrideDialog, setShowAdminOverrideDialog] = useState(false);

  // Form state for editing
  const [exteriorNotes, setExteriorNotes] = useState("");
  const [interiorNotes, setInteriorNotes] = useState("");
  const [interiorCondition, setInteriorCondition] = useState<string>("");
  const [odometerReading, setOdometerReading] = useState("");
  const [fuelLevel, setFuelLevel] = useState("");
  const [scratches, setScratches] = useState<ScratchDent[]>([]);

  // New damage form
  const [newDamageLocation, setNewDamageLocation] = useState("");
  const [newDamageDescription, setNewDamageDescription] = useState("");
  const [newDamageSeverity, setNewDamageSeverity] = useState<"minor" | "moderate" | "major">("minor");

  // Initialize form when inspection loads
  useState(() => {
    if (inspection) {
      setExteriorNotes(inspection.exterior_notes || "");
      setInteriorNotes(inspection.interior_notes || "");
      setInteriorCondition(inspection.interior_condition || "");
      setOdometerReading(inspection.odometer_reading?.toString() || "");
      setFuelLevel(inspection.fuel_level?.toString() || "");
      setScratches(inspection.scratches_dents || []);
    }
  });

  const handleStart = () => {
    startWalkaround.mutate({
      bookingId,
      odometerReading: odometerReading ? parseInt(odometerReading) : undefined,
      fuelLevel: fuelLevel ? parseInt(fuelLevel) : undefined,
    });
  };

  const handleSave = () => {
    if (!inspection) return;
    updateWalkaround.mutate({
      inspectionId: inspection.id,
      exteriorNotes,
      scratchesDents: scratches,
      interiorNotes,
      interiorCondition: interiorCondition as any,
      odometerReading: odometerReading ? parseInt(odometerReading) : undefined,
      fuelLevel: fuelLevel ? parseInt(fuelLevel) : undefined,
    });
  };

  const handleAddDamage = () => {
    if (!newDamageLocation || !newDamageDescription) return;
    const newDamage: ScratchDent = {
      id: crypto.randomUUID(),
      location: newDamageLocation,
      description: newDamageDescription,
      severity: newDamageSeverity,
    };
    setScratches([...scratches, newDamage]);
    setNewDamageLocation("");
    setNewDamageDescription("");
    setNewDamageSeverity("minor");
    setShowAddDamageDialog(false);
  };

  const handleRemoveDamage = (id: string) => {
    setScratches(scratches.filter((s) => s.id !== id));
  };

  const handleComplete = () => {
    if (!inspection) return;
    completeWalkaround.mutate(inspection.id, {
      onSuccess: () => setShowCompleteDialog(false),
    });
  };

  const handleAdminOverride = () => {
    if (!inspection) return;
    adminCompleteWalkaround.mutate(inspection.id, {
      onSuccess: () => setShowAdminOverrideDialog(false),
    });
  };

  const pickupPhotos = photos?.pickup || [];

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-6 flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  // Not started state
  if (!inspection) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <ClipboardCheck className="h-4 w-4" />
            Vehicle Walkaround
          </CardTitle>
          <CardDescription>
            Joint inspection with customer before handover
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground">
            <p>
              Start a walkaround inspection to document the vehicle's condition with the customer
              present. This is required before vehicle handover.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start-odometer">Odometer Reading</Label>
              <Input
                id="start-odometer"
                type="number"
                placeholder="e.g., 45000"
                value={odometerReading}
                onChange={(e) => setOdometerReading(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="start-fuel">Fuel Level (%)</Label>
              <Input
                id="start-fuel"
                type="number"
                min="0"
                max="100"
                placeholder="e.g., 75"
                value={fuelLevel}
                onChange={(e) => setFuelLevel(e.target.value)}
              />
            </div>
          </div>

          <Button
            onClick={handleStart}
            disabled={startWalkaround.isPending}
            className="w-full gap-2"
          >
            {startWalkaround.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Starting...
              </>
            ) : (
              <>
                <ClipboardCheck className="h-4 w-4" />
                Start Walkaround Inspection
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    );
  }

  const isComplete = inspection.inspection_complete;
  const canComplete = inspection.customer_acknowledged && !isComplete;

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <ClipboardCheck className="h-4 w-4" />
                Vehicle Walkaround
              </CardTitle>
              <CardDescription>
                Started {format(new Date(inspection.conducted_at), "PPp")}
              </CardDescription>
            </div>
            {isComplete ? (
              <Badge className="bg-green-500">
                <CheckCircle className="h-3 w-3 mr-1" />
                Complete
              </Badge>
            ) : inspection.customer_acknowledged ? (
              <Badge variant="secondary">
                <PenLine className="h-3 w-3 mr-1" />
                Customer Acknowledged
              </Badge>
            ) : (
              <Badge variant="outline">
                <AlertTriangle className="h-3 w-3 mr-1" />
                In Progress
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Pre-inspection Photos Reference */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Pre-Inspection Reference</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPhotoDialog(true)}
              className="gap-1"
            >
              <Camera className="h-3.5 w-3.5" />
              View Photos ({pickupPhotos.length})
            </Button>
          </div>

          <Separator />

          {/* Readings */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <Gauge className="h-3.5 w-3.5" />
                Odometer
              </Label>
              <Input
                type="number"
                value={odometerReading || inspection.odometer_reading?.toString() || ""}
                onChange={(e) => setOdometerReading(e.target.value)}
                disabled={isComplete}
                placeholder="Miles"
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <Fuel className="h-3.5 w-3.5" />
                Fuel Level
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={fuelLevel || inspection.fuel_level?.toString() || ""}
                  onChange={(e) => setFuelLevel(e.target.value)}
                  disabled={isComplete}
                  placeholder="%"
                />
                <span className="text-sm text-muted-foreground">%</span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Exterior Condition */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Exterior Condition</Label>
              {!isComplete && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddDamageDialog(true)}
                  className="gap-1"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Damage
                </Button>
              )}
            </div>

            {scratches.length > 0 ? (
              <div className="space-y-2">
                {scratches.map((scratch) => (
                  <div
                    key={scratch.id}
                    className="flex items-center justify-between bg-muted/50 rounded-lg p-3 text-sm"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{scratch.location}</span>
                        <Badge
                          variant={
                            scratch.severity === "major"
                              ? "destructive"
                              : scratch.severity === "moderate"
                              ? "secondary"
                              : "outline"
                          }
                          className="text-xs"
                        >
                          {scratch.severity}
                        </Badge>
                      </div>
                      <p className="text-muted-foreground">{scratch.description}</p>
                    </div>
                    {!isComplete && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleRemoveDamage(scratch.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No existing damage noted</p>
            )}

            <Textarea
              placeholder="Additional exterior notes..."
              value={exteriorNotes || inspection.exterior_notes || ""}
              onChange={(e) => setExteriorNotes(e.target.value)}
              disabled={isComplete}
              rows={2}
            />
          </div>

          <Separator />

          {/* Interior Condition */}
          <div className="space-y-3">
            <Label>Interior Condition</Label>
            <Select
              value={interiorCondition || inspection.interior_condition || ""}
              onValueChange={setInteriorCondition}
              disabled={isComplete}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select condition" />
              </SelectTrigger>
              <SelectContent>
                {INTERIOR_CONDITIONS.map((cond) => (
                  <SelectItem key={cond.value} value={cond.value}>
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${cond.color}`} />
                      {cond.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Textarea
              placeholder="Interior condition notes..."
              value={interiorNotes || inspection.interior_notes || ""}
              onChange={(e) => setInteriorNotes(e.target.value)}
              disabled={isComplete}
              rows={2}
            />
          </div>

          {/* Customer Acknowledgement Status */}
          {inspection.customer_acknowledged && (
            <>
              <Separator />
              <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3">
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <div>
                    <p className="font-medium text-green-700">Customer Acknowledged</p>
                    <p className="text-muted-foreground">
                      Signed by {inspection.customer_signature} on{" "}
                      {format(new Date(inspection.customer_acknowledged_at!), "PPp")}
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Actions */}
          {!isComplete && (
            <div className="flex flex-col gap-2 pt-2">
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleSave}
                  disabled={updateWalkaround.isPending}
                  className="flex-1"
                >
                  {updateWalkaround.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Save Progress"
                  )}
                </Button>
                <Button
                  onClick={() => setShowCompleteDialog(true)}
                  disabled={!canComplete}
                  className="flex-1 gap-1"
                >
                  <CheckCircle className="h-4 w-4" />
                  Complete Walkaround
                </Button>
              </div>
              
              {/* Admin override option when customer hasn't acknowledged */}
              {!inspection.customer_acknowledged && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAdminOverrideDialog(true)}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Skip customer acknowledgement (admin override)
                </Button>
              )}
            </div>
          )}

          {!inspection.customer_acknowledged && !isComplete && (
            <p className="text-xs text-muted-foreground text-center">
              Customer acknowledgement pending
            </p>
          )}
        </CardContent>
      </Card>

      {/* Pre-inspection Photos Dialog */}
      <Dialog open={showPhotoDialog} onOpenChange={setShowPhotoDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Pre-Inspection Photos</DialogTitle>
            <DialogDescription>
              Reference photos taken before handover
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            {pickupPhotos.length > 0 ? (
              <div className="grid grid-cols-2 gap-4 p-1">
                {pickupPhotos.map((photo) => (
                  <div key={photo.id} className="space-y-2">
                    <div className="aspect-video rounded-lg overflow-hidden bg-muted">
                      <SignedStorageImage
                        bucket="condition-photos"
                        path={photo.photo_url}
                        alt={PHOTO_LABELS[photo.photo_type as PhotoType] || photo.photo_type}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <p className="text-sm font-medium text-center">
                      {PHOTO_LABELS[photo.photo_type as PhotoType] || photo.photo_type}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Camera className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No pre-inspection photos available</p>
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Add Damage Dialog */}
      <Dialog open={showAddDamageDialog} onOpenChange={setShowAddDamageDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Existing Damage</DialogTitle>
            <DialogDescription>
              Record any pre-existing scratches or dents
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Location on Vehicle</Label>
              <Select value={newDamageLocation} onValueChange={setNewDamageLocation}>
                <SelectTrigger>
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent>
                  {VEHICLE_LOCATIONS.map((loc) => (
                    <SelectItem key={loc} value={loc}>
                      {loc}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Severity</Label>
              <Select
                value={newDamageSeverity}
                onValueChange={(v) => setNewDamageSeverity(v as any)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="minor">Minor (light scratch)</SelectItem>
                  <SelectItem value="moderate">Moderate (visible dent)</SelectItem>
                  <SelectItem value="major">Major (significant damage)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                placeholder="Describe the damage..."
                value={newDamageDescription}
                onChange={(e) => setNewDamageDescription(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDamageDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddDamage} disabled={!newDamageLocation || !newDamageDescription}>
              Add Damage
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Complete Confirmation Dialog */}
      <AlertDialog open={showCompleteDialog} onOpenChange={setShowCompleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Complete Walkaround Inspection</AlertDialogTitle>
            <AlertDialogDescription>
              This will finalize the walkaround inspection. Make sure all damage has been recorded
              and the customer has acknowledged the vehicle condition. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleComplete} disabled={completeWalkaround.isPending}>
              {completeWalkaround.isPending ? "Completing..." : "Complete Inspection"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Admin Override Confirmation Dialog */}
      <AlertDialog open={showAdminOverrideDialog} onOpenChange={setShowAdminOverrideDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Skip Customer Acknowledgement</AlertDialogTitle>
            <AlertDialogDescription>
              This will complete the walkaround WITHOUT customer acknowledgement. 
              Use this only when the customer is present but unable to use the digital acknowledgement system. 
              This action will be logged.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleAdminOverride} 
              disabled={adminCompleteWalkaround.isPending}
              className="bg-amber-600 hover:bg-amber-700"
            >
              {adminCompleteWalkaround.isPending ? "Processing..." : "Complete (Admin Override)"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
