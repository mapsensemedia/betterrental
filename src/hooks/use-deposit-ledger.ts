import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface DepositLedgerEntry {
  id: string;
  bookingId: string;
  paymentId: string | null;
  action: 'hold' | 'deduct' | 'release';
  amount: number;
  reason: string | null;
  createdBy: string;
  createdAt: string;
  creatorName?: string;
}

export type DepositStatus = 'not_required' | 'due' | 'held' | 'partially_released' | 'released' | 'deducted';

export interface DepositSummary {
  status: DepositStatus;
  required: number;
  held: number;
  released: number;
  deducted: number;
  remaining: number;
  entries: DepositLedgerEntry[];
}

export function useDepositLedger(bookingId: string | null) {
  return useQuery<DepositSummary | null>({
    queryKey: ['deposit-ledger', bookingId],
    queryFn: async () => {
      if (!bookingId) return null;

      // Get booking deposit amount
      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .select('deposit_amount')
        .eq('id', bookingId)
        .single();

      if (bookingError) throw bookingError;

      const required = Number(booking.deposit_amount) || 0;

      // Get ledger entries
      const { data: entries, error: ledgerError } = await supabase
        .from('deposit_ledger')
        .select('*')
        .eq('booking_id', bookingId)
        .order('created_at', { ascending: true });

      if (ledgerError) throw ledgerError;

      // Fetch creator names
      const creatorIds = [...new Set((entries || []).map(e => e.created_by))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', creatorIds);
      
      const profileMap = new Map(profiles?.map(p => [p.id, p.full_name || p.email]) || []);

      const formattedEntries: DepositLedgerEntry[] = (entries || []).map(e => ({
        id: e.id,
        bookingId: e.booking_id,
        paymentId: e.payment_id,
        action: e.action as 'hold' | 'deduct' | 'release',
        amount: Number(e.amount),
        reason: e.reason,
        createdBy: e.created_by,
        createdAt: e.created_at,
        creatorName: profileMap.get(e.created_by) || 'Unknown',
      }));

      // Calculate totals
      let held = 0;
      let released = 0;
      let deducted = 0;

      formattedEntries.forEach(entry => {
        if (entry.action === 'hold') held += entry.amount;
        else if (entry.action === 'release') released += entry.amount;
        else if (entry.action === 'deduct') deducted += entry.amount;
      });

      const remaining = held - released - deducted;

      // Determine status
      let status: DepositStatus = 'not_required';
      if (required > 0) {
        if (held === 0) {
          status = 'due';
        } else if (released + deducted >= held) {
          status = deducted > 0 ? 'deducted' : 'released';
        } else if (released > 0 || deducted > 0) {
          status = 'partially_released';
        } else {
          status = 'held';
        }
      }

      return {
        status,
        required,
        held,
        released,
        deducted,
        remaining,
        entries: formattedEntries,
      };
    },
    enabled: !!bookingId,
  });
}

interface AddLedgerEntryParams {
  bookingId: string;
  action: 'hold' | 'deduct' | 'release';
  amount: number;
  reason?: string;
  paymentId?: string;
}

export function useAddDepositLedgerEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ bookingId, action, amount, reason, paymentId }: AddLedgerEntryParams) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('deposit_ledger')
        .insert({
          booking_id: bookingId,
          payment_id: paymentId || null,
          action,
          amount,
          reason: reason || null,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['deposit-ledger', variables.bookingId] });
      queryClient.invalidateQueries({ queryKey: ['payment-deposit-status', variables.bookingId] });
      
      const actionLabels = {
        hold: 'Deposit held',
        deduct: 'Deposit deducted',
        release: 'Deposit released',
      };
      toast.success(actionLabels[variables.action]);
    },
    onError: (error: Error) => {
      toast.error('Failed to update deposit: ' + error.message);
    },
  });
}
