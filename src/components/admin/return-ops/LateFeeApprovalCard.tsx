/**
 * LateFeeApprovalCard
 * 
 * Displays auto-calculated late fee in the Closeout step.
 * Staff must approve or edit the fee (with mandatory reason) before completing the return.
 */

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Clock, 
  DollarSign, 
  CheckCircle2, 
  Edit2, 
  AlertTriangle,
  Loader2,
  Info,
} from "lucide-react";
import { LATE_RETURN_GRACE_MINUTES, LATE_RETURN_HOURLY_RATE } from "@/lib/pricing";

interface LateFeeApprovalCardProps {
  /** Auto-calculated late fee from the Issues step */
  calculatedFee: number;
  /** Minutes late (for display) */
  minutesLate: number;
  /** Whether staff has approved the fee */
  isApproved: boolean;
  /** Callback when staff approves or edits the fee */
  onApprove: (approvedFee: number, reason?: string) => Promise<void>;
  /** Whether the approval mutation is pending */
  isApproving: boolean;
  /** Existing override info (if previously overridden) */
  existingOverride?: {
    amount: number;
    reason: string | null;
  } | null;
  /** Whether booking already has a persisted late fee */
  persistedFee: number;
}

export function LateFeeApprovalCard({
  calculatedFee,
  minutesLate,
  isApproved,
  onApprove,
  isApproving,
  existingOverride,
  persistedFee,
}: LateFeeApprovalCardProps) {
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editAmount, setEditAmount] = useState("");
  const [editReason, setEditReason] = useState("");

  const hoursLate = Math.floor(minutesLate / 60);
  const minsLate = minutesLate % 60;
  const isLate = minutesLate > LATE_RETURN_GRACE_MINUTES;
  const inGrace = minutesLate > 0 && minutesLate <= LATE_RETURN_GRACE_MINUTES;

  // Effective fee: override > persisted > calculated
  const effectiveFee = existingOverride != null 
    ? existingOverride.amount 
    : persistedFee > 0 
      ? persistedFee 
      : calculatedFee;

  // No late return — nothing to show
  if (minutesLate <= 0) {
    return (
      <Card className="border-emerald-500/30 bg-emerald-50/30 dark:bg-emerald-950/10">
        <CardContent className="py-4">
          <div className="flex items-center gap-2 text-emerald-600">
            <CheckCircle2 className="h-5 w-5" />
            <span className="font-medium text-sm">On-time return — no late fee</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Within grace period
  if (inGrace) {
    return (
      <Card className="border-blue-500/30 bg-blue-50/30 dark:bg-blue-950/10">
        <CardContent className="py-4">
          <div className="flex items-center gap-2 text-blue-600">
            <Info className="h-5 w-5" />
            <div>
              <span className="font-medium text-sm">
                {minutesLate}m past due — within {LATE_RETURN_GRACE_MINUTES}-min grace period
              </span>
              <p className="text-xs text-blue-500 mt-0.5">No fee applies</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const handleOpenEdit = () => {
    setEditAmount(effectiveFee.toFixed(2));
    setEditReason(existingOverride?.reason || "");
    setEditDialogOpen(true);
  };

  const handleApproveAsIs = async () => {
    await onApprove(calculatedFee);
  };

  const handleSaveEdit = async () => {
    const amount = parseFloat(editAmount);
    if (isNaN(amount) || amount < 0) return;
    if (amount !== calculatedFee && editReason.trim().length < 10) return;
    
    await onApprove(amount, amount !== calculatedFee ? editReason.trim() : undefined);
    setEditDialogOpen(false);
  };

  const isEditValid = () => {
    const amount = parseFloat(editAmount);
    if (isNaN(amount) || amount < 0) return false;
    // If amount differs from calculated, require reason
    if (amount !== calculatedFee && editReason.trim().length < 10) return false;
    return true;
  };

  return (
    <>
      <Card className={isApproved 
        ? "border-emerald-500/30" 
        : "border-amber-500/30 bg-amber-50/30 dark:bg-amber-950/10"
      }>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Late Return Fee
            </CardTitle>
            {isApproved ? (
              <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Approved
              </Badge>
            ) : (
              <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Needs Approval
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Late return details */}
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Late by</span>
              <span className="font-medium text-destructive">
                {hoursLate > 0 ? `${hoursLate}h ` : ""}{minsLate}m
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Rate</span>
              <span>${LATE_RETURN_HOURLY_RATE} CAD/hr (after {LATE_RETURN_GRACE_MINUTES}-min grace)</span>
            </div>
            <div className="flex justify-between text-sm pt-2 border-t">
              <span className="flex items-center gap-1 font-medium">
                <DollarSign className="h-3.5 w-3.5" />
                {existingOverride != null ? "Adjusted Fee" : "Calculated Fee"}
              </span>
              <span className="font-bold text-destructive text-base">
                ${effectiveFee.toFixed(2)} CAD
              </span>
            </div>
          </div>

          {/* Override info */}
          {existingOverride != null && existingOverride.amount !== calculatedFee && (
            <Alert className="bg-muted/50">
              <Info className="h-4 w-4" />
              <AlertDescription className="text-xs">
                <strong>Original calculated fee:</strong> ${calculatedFee.toFixed(2)} CAD
                {existingOverride.reason && (
                  <>
                    <br />
                    <strong>Reason for adjustment:</strong> {existingOverride.reason}
                  </>
                )}
              </AlertDescription>
            </Alert>
          )}

          {/* Action buttons */}
          {!isApproved && (
            <div className="flex gap-2 pt-1">
              <Button
                onClick={handleApproveAsIs}
                disabled={isApproving}
                className="flex-1"
                size="sm"
              >
                {isApproving ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 mr-1" />
                )}
                Approve ${calculatedFee.toFixed(2)}
              </Button>
              <Button
                variant="outline"
                onClick={handleOpenEdit}
                disabled={isApproving}
                size="sm"
              >
                <Edit2 className="h-4 w-4 mr-1" />
                Edit Fee
              </Button>
            </div>
          )}

          {isApproved && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleOpenEdit}
              className="w-full text-muted-foreground"
            >
              <Edit2 className="h-3.5 w-3.5 mr-1" />
              Edit approved fee
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Late Return Fee</DialogTitle>
            <DialogDescription>
              Adjust the late fee amount. Auto-calculated: ${calculatedFee.toFixed(2)} CAD 
              ({hoursLate > 0 ? `${hoursLate}h ` : ""}{minsLate}m late).
              {" "}A reason is required when changing from the calculated amount.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Fee Amount (CAD)</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={editAmount}
                  onChange={(e) => setEditAmount(e.target.value)}
                  className="pl-9"
                  placeholder="0.00"
                />
              </div>
              {parseFloat(editAmount) === 0 && (
                <p className="text-xs text-amber-600">
                  Setting fee to $0 will fully waive the late fee. A reason is required.
                </p>
              )}
            </div>

            {parseFloat(editAmount) !== calculatedFee && (
              <div className="space-y-2">
                <Label>
                  Reason for adjustment <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  value={editReason}
                  onChange={(e) => setEditReason(e.target.value)}
                  placeholder="Explain why the late fee is being adjusted (min 10 characters)..."
                  className="min-h-[80px]"
                />
                {editReason.trim().length > 0 && editReason.trim().length < 10 && (
                  <p className="text-xs text-destructive">
                    Minimum 10 characters required ({editReason.trim().length}/10)
                  </p>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveEdit}
              disabled={!isEditValid() || isApproving}
            >
              {isApproving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  Saving...
                </>
              ) : (
                "Approve & Save"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
