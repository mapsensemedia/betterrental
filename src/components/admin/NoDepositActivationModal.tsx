/**
 * NoDepositActivationModal
 *
 * Red confirmation modal shown when staff attempts to activate a rental that
 * has either no rental payment row or no deposit hold on file. Requires an
 * explicit "Activate anyway" click before the activation proceeds.
 */
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
import { ShieldAlert } from "lucide-react";
import type { PreActivationStatus } from "@/hooks/use-pre-activation-check";

interface NoDepositActivationModalProps {
  open: boolean;
  status: PreActivationStatus | null;
  onCancel: () => void;
  onConfirm: () => void;
  busy?: boolean;
}

export function NoDepositActivationModal({
  open,
  status,
  onCancel,
  onConfirm,
  busy,
}: NoDepositActivationModalProps) {
  const missing: string[] = [];
  if (status?.missingRental) missing.push("rental payment");
  if (status?.missingDeposit) missing.push("$350 deposit hold");

  return (
    <AlertDialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <ShieldAlert className="h-5 w-5" />
            No deposit hold on file
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <span className="block">
              This booking is missing: <strong>{missing.join(" and ")}</strong>.
            </span>
            <span className="block">
              The customer's card will not be on file for damages or incidentals.
              Are you sure you want to activate this rental?
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={busy}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Activate anyway
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
