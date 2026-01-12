import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  Flag, 
  Clock,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  MessageSquare,
  Plus,
} from "lucide-react";
import { format, differenceInMinutes } from "date-fns";
import { useCreateAlert } from "@/hooks/use-alerts";
import { toast } from "sonner";

interface StepReturnFlagsProps {
  booking: any;
  completion: {
    reviewed: boolean;
  };
  onMarkReviewed: () => void;
  isMarking: boolean;
}

export function StepReturnFlags({ booking, completion, onMarkReviewed, isMarking }: StepReturnFlagsProps) {
  const [acknowledged, setAcknowledged] = useState(completion.reviewed);
  const [flagDialogOpen, setFlagDialogOpen] = useState(false);
  const [flagMessage, setFlagMessage] = useState("");
  const createAlert = useCreateAlert();
  
  const endDate = new Date(booking.end_at);
  const now = new Date();
  const isLateReturn = now > endDate && booking.status === "active";
  const minutesLate = isLateReturn ? differenceInMinutes(now, endDate) : 0;
  const hoursLate = Math.floor(minutesLate / 60);
  const minsLate = minutesLate % 60;

  const flags = [];
  if (isLateReturn) {
    flags.push({
      id: "late",
      type: "warning",
      title: "Late Return",
      description: `Vehicle returned ${hoursLate > 0 ? `${hoursLate}h ` : ""}${minsLate}m late`,
    });
  }

  const handleFlagIssue = async () => {
    if (!flagMessage.trim()) return;
    
    try {
      await createAlert.mutateAsync({
        alertType: "customer_issue",
        title: `Return issue flagged for ${booking.booking_code}`,
        message: flagMessage,
        bookingId: booking.id,
        vehicleId: booking.vehicle_id,
        userId: booking.user_id,
      });
      toast.success("Issue flagged successfully");
      setFlagDialogOpen(false);
      setFlagMessage("");
    } catch (err) {
      toast.error("Failed to flag issue");
    }
  };

  return (
    <div className="space-y-6">
      {/* Status Card */}
      <Card className={completion.reviewed 
        ? "border-emerald-500/50 bg-emerald-50/50 dark:bg-emerald-950/20" 
        : flags.length > 0 
          ? "border-amber-500/50 bg-amber-50/50 dark:bg-amber-950/20"
          : "border-emerald-500/50 bg-emerald-50/50 dark:bg-emerald-950/20"
      }>
        <CardContent className="py-4">
          <div className={`flex items-center gap-2 ${
            completion.reviewed ? "text-emerald-600" : flags.length > 0 ? "text-amber-600" : "text-emerald-600"
          }`}>
            {completion.reviewed ? (
              <>
                <CheckCircle2 className="h-5 w-5" />
                <span className="font-medium">Flags reviewed</span>
              </>
            ) : flags.length > 0 ? (
              <>
                <AlertTriangle className="h-5 w-5" />
                <span className="font-medium">{flags.length} issue{flags.length !== 1 ? "s" : ""} to review</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="h-5 w-5" />
                <span className="font-medium">No issues detected</span>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Return Timing */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Return Timing
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Due Back</span>
            <span>{format(endDate, "PPp")}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Actual Return</span>
            <span>{format(now, "PPp")}</span>
          </div>
          {isLateReturn && (
            <div className="flex justify-between text-destructive">
              <span>Late By</span>
              <span className="font-medium">
                {hoursLate > 0 ? `${hoursLate}h ` : ""}{minsLate}m
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Flags List */}
      {flags.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Flag className="h-4 w-4" />
              Flagged Issues
            </CardTitle>
            <CardDescription>
              Review and acknowledge all issues before proceeding
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {flags.map((flag) => (
              <div 
                key={flag.id} 
                className="p-4 rounded-lg border border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20"
              >
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-amber-800 dark:text-amber-300">
                      {flag.title}
                    </p>
                    <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
                      {flag.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-8 text-center">
            <CheckCircle2 className="h-12 w-12 mx-auto text-emerald-500 mb-3" />
            <p className="font-medium text-emerald-600">No issues detected</p>
            <p className="text-sm text-muted-foreground mt-1">
              Return is on time with no flagged problems
            </p>
          </CardContent>
        </Card>
      )}

      {/* Flag New Issue Button */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Report an Issue
          </CardTitle>
          <CardDescription>
            Flag any problems found during the return inspection
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            variant="outline" 
            className="w-full"
            onClick={() => setFlagDialogOpen(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Flag New Issue
          </Button>
        </CardContent>
      </Card>

      {/* Flag Issue Dialog */}
      <Dialog open={flagDialogOpen} onOpenChange={setFlagDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Flag an Issue</DialogTitle>
            <DialogDescription>
              Create an alert for this return. This will notify the team.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Describe the issue..."
            value={flagMessage}
            onChange={(e) => setFlagMessage(e.target.value)}
            rows={4}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setFlagDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleFlagIssue}
              disabled={createAlert.isPending || !flagMessage.trim()}
            >
              {createAlert.isPending ? "Flagging..." : "Flag Issue"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Acknowledge & Continue */}
      {!completion.reviewed && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Checkbox 
              id="acknowledge" 
              checked={acknowledged}
              onCheckedChange={(checked) => setAcknowledged(checked === true)}
            />
            <label htmlFor="acknowledge" className="text-sm cursor-pointer">
              I have reviewed all flags and issues for this return
            </label>
          </div>
          
          <Button
            onClick={onMarkReviewed}
            disabled={!acknowledged || isMarking}
            className="w-full"
          >
            {isMarking ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              "Mark Flags as Reviewed"
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
