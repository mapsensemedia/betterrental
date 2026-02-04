import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CheckCircle2, XCircle, Eye, Loader2, ClipboardCheck, Gauge, Fuel, Plus, Trash2 } from "lucide-react";
import { useWalkaroundInspection, useStartWalkaround, useUpdateWalkaround, useCompleteWalkaround, type ScratchDent } from "@/hooks/use-walkaround";
import { useBookingConditionPhotos } from "@/hooks/use-condition-photos";
import { format } from "date-fns";

interface StepWalkaroundProps {
  bookingId: string;
  completion: {
    inspectionComplete: boolean;
  };
}

const INTERIOR_CONDITIONS = [
  { value: "excellent", label: "Excellent" },
  { value: "good", label: "Good" },
  { value: "acceptable", label: "Acceptable" },
  { value: "needs_attention", label: "Needs Attention" },
];

const VEHICLE_LOCATIONS = [
  "Front Bumper", "Rear Bumper", "Front Left Fender", "Front Right Fender",
  "Rear Left Fender", "Rear Right Fender", "Left Door - Front", "Left Door - Rear",
  "Right Door - Front", "Right Door - Rear", "Hood", "Roof", "Trunk",
  "Left Mirror", "Right Mirror", "Windshield", "Rear Window", "Left Wheels", "Right Wheels",
];

export function StepWalkaround({ bookingId, completion }: StepWalkaroundProps) {
  const { data: inspection, isLoading } = useWalkaroundInspection(bookingId);
  const { data: photos } = useBookingConditionPhotos(bookingId);
  const startWalkaround = useStartWalkaround();
  const updateWalkaround = useUpdateWalkaround();
  const completeWalkaround = useCompleteWalkaround();

  const [odometerReading, setOdometerReading] = useState("");
  const [fuelLevel, setFuelLevel] = useState("");
  const [exteriorNotes, setExteriorNotes] = useState("");
  const [interiorNotes, setInteriorNotes] = useState("");
  const [interiorCondition, setInteriorCondition] = useState("");
  const [scratches, setScratches] = useState<ScratchDent[]>([]);
  const [showAddDamage, setShowAddDamage] = useState(false);
  const [newDamageLocation, setNewDamageLocation] = useState("");
  const [newDamageDescription, setNewDamageDescription] = useState("");
  const [newDamageSeverity, setNewDamageSeverity] = useState<"minor" | "moderate" | "major">("minor");

  // Initialize form when inspection loads
  useState(() => {
    if (inspection) {
      setOdometerReading(inspection.odometer_reading?.toString() || "");
      setFuelLevel(inspection.fuel_level?.toString() || "");
      setExteriorNotes(inspection.exterior_notes || "");
      setInteriorNotes(inspection.interior_notes || "");
      setInteriorCondition(inspection.interior_condition || "");
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
    setShowAddDamage(false);
  };

  const handleRemoveDamage = (id: string) => {
    setScratches(scratches.filter(s => s.id !== id));
  };

  // UPDATED: Staff-only completion - no customer signature needed
  const handleComplete = () => {
    if (!inspection) return;
    completeWalkaround.mutate(inspection.id);
  };

  const pickupPhotos = photos?.pickup || [];
  const isComplete = inspection?.inspection_complete;

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
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-muted-foreground" />
              <CardTitle className="text-base">Vehicle Walkaround</CardTitle>
            </div>
            <Badge variant="outline">Staff Only</Badge>
          </div>
          <CardDescription>
            Staff-only inspection checklist. No customer signature required.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground">
            <p>
              Complete the vehicle walkaround inspection. This is a staff-only checklist
              to document the vehicle condition before handover.
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

  return (
    <div className="space-y-4">
      {/* Main Inspection Card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-muted-foreground" />
              <CardTitle className="text-base">Vehicle Walkaround</CardTitle>
            </div>
            <StatusIndicator complete={isComplete || false} />
          </div>
          <CardDescription>
            Staff-only inspection. Started {format(new Date(inspection.conducted_at), "PPp")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
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
                placeholder="km"
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
                  onClick={() => setShowAddDamage(true)}
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

            {showAddDamage && (
              <div className="p-3 border rounded-lg space-y-3">
                <Select value={newDamageLocation} onValueChange={setNewDamageLocation}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select location" />
                  </SelectTrigger>
                  <SelectContent>
                    {VEHICLE_LOCATIONS.map(loc => (
                      <SelectItem key={loc} value={loc}>{loc}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  placeholder="Description"
                  value={newDamageDescription}
                  onChange={(e) => setNewDamageDescription(e.target.value)}
                />
                <Select value={newDamageSeverity} onValueChange={(v) => setNewDamageSeverity(v as any)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="minor">Minor</SelectItem>
                    <SelectItem value="moderate">Moderate</SelectItem>
                    <SelectItem value="major">Major</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleAddDamage}>Add</Button>
                  <Button size="sm" variant="outline" onClick={() => setShowAddDamage(false)}>Cancel</Button>
                </div>
              </div>
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
                    {cond.label}
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

          {/* Actions */}
          {!isComplete && (
            <div className="flex gap-2 pt-2">
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
                onClick={handleComplete}
                disabled={completeWalkaround.isPending}
                className="flex-1 gap-1"
              >
                <CheckCircle2 className="h-4 w-4" />
                Mark Complete
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatusIndicator({ complete }: { complete: boolean }) {
  if (complete) {
    return (
      <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
        <CheckCircle2 className="w-3 h-3 mr-1" />
        Complete
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-muted-foreground">
      <XCircle className="w-3 h-3 mr-1" />
      In Progress
    </Badge>
  );
}
