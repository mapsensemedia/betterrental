import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { 
  type ReturnState, 
  type ReturnStepId, 
  canTransitionTo, 
  getNextState,
  isStateAtLeast,
} from "@/lib/return-steps";

interface TransitionOptions {
  bookingId: string;
  targetState: ReturnState;
  isException?: boolean;
  exceptionReason?: string;
}

interface CompleteStepOptions {
  bookingId: string;
  stepId: ReturnStepId;
  currentState: ReturnState;
  isException?: boolean;
  exceptionReason?: string;
}

export function useReturnStateTransition() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ bookingId, targetState, isException, exceptionReason }: TransitionOptions) => {
      if (!user) throw new Error("Not authenticated");

      // Get current state from database (server-side validation)
      const { data: booking, error: fetchError } = await supabase
        .from("bookings")
        .select("return_state, status")
        .eq("id", bookingId)
        .single();

      if (fetchError) throw fetchError;
      
      const currentState = (booking.return_state || "not_started") as ReturnState;

      // CRITICAL: Server-side validation - only allow valid transitions
      if (!canTransitionTo(currentState, targetState)) {
        throw new Error(`Invalid transition: cannot go from "${currentState}" to "${targetState}". Complete previous steps first.`);
      }

      // Build update object
      const updateData: Record<string, unknown> = {
        return_state: targetState,
      };

      // Set timestamp and user for specific states
      switch (targetState) {
        case "initiated":
          updateData.return_started_at = new Date().toISOString();
          break;
        case "intake_done":
          updateData.return_intake_completed_at = new Date().toISOString();
          updateData.return_intake_completed_by = user.id;
          break;
        case "evidence_done":
          updateData.return_evidence_completed_at = new Date().toISOString();
          updateData.return_evidence_completed_by = user.id;
          break;
        case "issues_reviewed":
          updateData.return_issues_reviewed_at = new Date().toISOString();
          updateData.return_issues_reviewed_by = user.id;
          if (isException !== undefined) {
            updateData.return_is_exception = isException;
          }
          if (exceptionReason) {
            updateData.return_exception_reason = exceptionReason;
          }
          break;
        case "closeout_done":
          updateData.status = "completed";
          updateData.actual_return_at = new Date().toISOString();
          break;
      }

      const { error } = await supabase
        .from("bookings")
        .update(updateData)
        .eq("id", bookingId);

      if (error) throw error;

      return { newState: targetState };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["booking", variables.bookingId] });
      queryClient.invalidateQueries({ queryKey: ["admin-bookings"] });
      queryClient.invalidateQueries({ queryKey: ["active-rentals"] });
      queryClient.invalidateQueries({ queryKey: ["returns"] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update return state");
    },
  });
}

export function useCompleteReturnStep() {
  const transition = useReturnStateTransition();

  return useMutation({
    mutationFn: async ({ bookingId, stepId, currentState, isException, exceptionReason }: CompleteStepOptions) => {
      const targetState = getNextState(stepId);
      if (!targetState) {
        throw new Error(`Unknown step: ${stepId}`);
      }

      // Check if already at or past this state
      if (isStateAtLeast(currentState, targetState)) {
        return { alreadyComplete: true, newState: currentState };
      }

      await transition.mutateAsync({ bookingId, targetState, isException, exceptionReason });
      return { alreadyComplete: false, newState: targetState };
    },
    onSuccess: (result, variables) => {
      if (!result.alreadyComplete) {
        const stepNames: Record<ReturnStepId, string> = {
          intake: "Return intake",
          evidence: "Evidence capture",
          issues: "Issues review",
          closeout: "Return closeout",
          deposit: "Deposit processing",
        };
        toast.success(`${stepNames[variables.stepId]} complete`);
      }
    },
  });
}

// Hook to initialize return (first transition)
export function useInitiateReturn() {
  const transition = useReturnStateTransition();

  return useMutation({
    mutationFn: async (bookingId: string) => {
      return transition.mutateAsync({ bookingId, targetState: "initiated" });
    },
    onSuccess: () => {
      toast.success("Return process initiated");
    },
  });
}
