import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FileCheck, Upload, Clock } from 'lucide-react';

interface VerificationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookingCode: string;
  onUploadNow: () => void;
}

export function VerificationModal({
  open,
  onOpenChange,
  bookingCode,
  onUploadNow,
}: VerificationModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <FileCheck className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle className="text-center">
            Booking Confirmed
          </DialogTitle>
          <DialogDescription className="text-center">
            Your booking <span className="font-mono font-semibold">{bookingCode}</span> is confirmed.
            Please upload your driver's license (front & back) to continue.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-4">
          <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
            <Upload className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <p className="font-medium text-sm">Required</p>
              <ul className="text-sm text-muted-foreground mt-1 space-y-1">
                <li>• Driver's License (Front)</li>
                <li>• Driver's License (Back)</li>
              </ul>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
            <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="font-medium text-sm">Why we need this</p>
              <p className="text-sm text-muted-foreground">
                This is required to verify eligibility and prepare your pickup.
              </p>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button onClick={onUploadNow} className="w-full">
            <Upload className="h-4 w-4 mr-2" />
            Upload Driver's License
          </Button>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="w-full"
          >
            I’ll upload before pickup
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
