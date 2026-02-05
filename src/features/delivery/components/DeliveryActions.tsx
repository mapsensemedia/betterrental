import { Button } from "@/components/ui/button";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Loader2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { 
  STATUS_CONFIG, 
  canTransitionTo, 
  getNextStatus,
  type DeliveryStatus 
} from "../constants/delivery-status";
import { useQuickStatusUpdate } from "../hooks/use-delivery-actions";
import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";

// ─────────────────────────────────────────────────────────────────────────────
// DELIVERY ACTION BUTTONS
// ─────────────────────────────────────────────────────────────────────────────

interface DeliveryActionsProps {
  bookingId: string;
  currentStatus: DeliveryStatus | null | undefined;
  className?: string;
  onComplete?: () => void;
}

export function DeliveryActions({ 
  bookingId, 
  currentStatus, 
  className,
  onComplete,
}: DeliveryActionsProps) {
  const status = currentStatus || 'unassigned';
  const config = STATUS_CONFIG[status];
  const nextStatus = getNextStatus(status);
  const { isUpdating, markPickedUp, markEnRoute, markArrived, markDelivered, reportIssue } = 
    useQuickStatusUpdate(bookingId);

  // Can't show actions for terminal states
  const terminalStates: DeliveryStatus[] = ['delivered', 'cancelled', 'issue'];
  const isTerminalState = terminalStates.includes(status);
  if (!nextStatus || isTerminalState) {
    return null;
  }

  const nextConfig = STATUS_CONFIG[nextStatus];
  const requiresConfirmation = nextConfig?.confirmationRequired || nextStatus === 'delivered';

  const handleAction = () => {
    switch (nextStatus) {
      case 'picked_up':
        markPickedUp();
        break;
      case 'en_route':
        markEnRoute();
        break;
      case 'arrived':
        markArrived();
        break;
      case 'delivered':
        markDelivered();
        onComplete?.();
        break;
    }
  };

  const actionLabel = config.actionLabel || nextConfig?.actionLabel || `Mark as ${nextConfig?.label}`;
  const NextIcon = nextConfig?.icon;

  return (
    <div className={cn("flex gap-2", className)}>
      {requiresConfirmation ? (
        <ConfirmActionButton
          label={actionLabel}
          description={`Are you sure you want to mark this delivery as "${nextConfig?.label}"? This action cannot be undone.`}
          onConfirm={handleAction}
          isLoading={isUpdating}
          icon={NextIcon}
        />
      ) : (
        <Button
          onClick={handleAction}
          disabled={isUpdating}
          className="flex-1"
          size="lg"
        >
          {isUpdating ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : NextIcon ? (
            <NextIcon className="h-4 w-4 mr-2" />
          ) : null}
          {actionLabel}
        </Button>
      )}

      {/* Report Issue button */}
      {!terminalStates.includes(status) && (
        <ReportIssueButton
          onReport={(notes) => reportIssue(notes)}
          isLoading={isUpdating}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CONFIRM ACTION BUTTON
// ─────────────────────────────────────────────────────────────────────────────

interface ConfirmActionButtonProps {
  label: string;
  description: string;
  onConfirm: () => void;
  isLoading?: boolean;
  icon?: React.ComponentType<{ className?: string }>;
  variant?: 'default' | 'destructive';
}

function ConfirmActionButton({
  label,
  description,
  onConfirm,
  isLoading,
  icon: Icon,
  variant = 'default',
}: ConfirmActionButtonProps) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant={variant}
          disabled={isLoading}
          className="flex-1"
          size="lg"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : Icon ? (
            <Icon className="h-4 w-4 mr-2" />
          ) : null}
          {label}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirm Action</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>
            Confirm
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// REPORT ISSUE BUTTON
// ─────────────────────────────────────────────────────────────────────────────

interface ReportIssueButtonProps {
  onReport: (notes: string) => void;
  isLoading?: boolean;
}

function ReportIssueButton({ onReport, isLoading }: ReportIssueButtonProps) {
  const [notes, setNotes] = useState("");
  const [open, setOpen] = useState(false);

  const handleSubmit = () => {
    if (notes.trim()) {
      onReport(notes);
      setOpen(false);
      setNotes("");
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="lg" disabled={isLoading}>
          <AlertTriangle className="h-4 w-4 mr-2" />
          Issue
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Report an Issue</AlertDialogTitle>
          <AlertDialogDescription>
            Describe the issue you encountered. This will notify the operations team.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Describe the issue..."
          className="min-h-[100px]"
        />
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction 
            onClick={handleSubmit}
            disabled={!notes.trim()}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Report Issue
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CLAIM BUTTON
// ─────────────────────────────────────────────────────────────────────────────

interface ClaimButtonProps {
  bookingId: string;
  onClaim: () => void;
  isLoading?: boolean;
  className?: string;
}

export function ClaimButton({ 
  bookingId, 
  onClaim, 
  isLoading,
  className 
}: ClaimButtonProps) {
  return (
    <Button
      onClick={onClaim}
      disabled={isLoading}
      className={className}
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
      ) : null}
      {isLoading ? "Claiming..." : "Claim Delivery"}
    </Button>
  );
}
