import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export type PaymentMethod = 'cash' | 'card_terminal' | 'e_transfer' | 'card' | 'other';
export type PaymentType = 'rental' | 'deposit' | 'additional';

export interface PaymentRecord {
  id: string;
  bookingId: string;
  amount: number;
  paymentType: PaymentType;
  paymentMethod: PaymentMethod | null;
  status: 'pending' | 'completed' | 'refunded' | 'failed';
  transactionId: string | null;
  createdAt: string;
}

export interface PaymentSummary {
  totalDue: number;
  totalPaid: number;
  depositRequired: number;
  depositHeld: number;
  balance: number;
  paymentStatus: 'unpaid' | 'partial' | 'paid';
  depositStatus: 'not_required' | 'pending' | 'held' | 'released';
  allComplete: boolean;
  payments: PaymentRecord[];
}

// Fetch complete payment/deposit status for a booking
export function usePaymentDepositStatus(bookingId: string | null) {
  return useQuery({
    queryKey: ['payment-deposit-status', bookingId],
    queryFn: async () => {
      if (!bookingId) return null;

      // Get booking details for totals
      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .select('total_amount, deposit_amount')
        .eq('id', bookingId)
        .single();

      if (bookingError) throw bookingError;

      // Get all payments for this booking
      const { data: payments, error: paymentsError } = await supabase
        .from('payments')
        .select('*')
        .eq('booking_id', bookingId)
        .order('created_at', { ascending: true });

      if (paymentsError) throw paymentsError;

      const totalDue = Number(booking.total_amount) || 0;
      const depositRequired = Number(booking.deposit_amount) || 0;

      // Calculate totals from completed payments
      const rentalPayments = (payments || []).filter(p => 
        p.payment_type === 'rental' && p.status === 'completed'
      );
      const depositPayments = (payments || []).filter(p => 
        p.payment_type === 'deposit' && p.status === 'completed'
      );

      const totalPaid = rentalPayments.reduce((sum, p) => sum + Number(p.amount), 0);
      const depositHeld = depositPayments.reduce((sum, p) => sum + Number(p.amount), 0);

      const balance = totalDue - totalPaid;
      
      // Determine statuses
      let paymentStatus: 'unpaid' | 'partial' | 'paid' = 'unpaid';
      if (totalPaid >= totalDue) {
        paymentStatus = 'paid';
      } else if (totalPaid > 0) {
        paymentStatus = 'partial';
      }

      let depositStatus: 'not_required' | 'pending' | 'held' | 'released' = 'not_required';
      if (depositRequired > 0) {
        if (depositHeld >= depositRequired) {
          depositStatus = 'held';
        } else {
          depositStatus = 'pending';
        }
      }

      // Check if any deposit was released (refunded)
      const releasedDeposits = (payments || []).filter(p => 
        p.payment_type === 'deposit' && p.status === 'refunded'
      );
      if (releasedDeposits.length > 0 && depositHeld === 0) {
        depositStatus = 'released';
      }

      const allComplete = paymentStatus === 'paid' && 
        (depositStatus === 'not_required' || depositStatus === 'held');

      const formattedPayments: PaymentRecord[] = (payments || []).map(p => ({
        id: p.id,
        bookingId: p.booking_id,
        amount: Number(p.amount),
        paymentType: p.payment_type as PaymentType,
        paymentMethod: p.payment_method as PaymentMethod | null,
        status: p.status as 'pending' | 'completed' | 'refunded' | 'failed',
        transactionId: p.transaction_id,
        createdAt: p.created_at,
      }));

      return {
        totalDue,
        totalPaid,
        depositRequired,
        depositHeld,
        balance,
        paymentStatus,
        depositStatus,
        allComplete,
        payments: formattedPayments,
      } as PaymentSummary;
    },
    enabled: !!bookingId,
    staleTime: 15000, // 15 seconds - operational data tier
    gcTime: 60000,    // Keep cached for 1 minute
  });
}

interface RecordPaymentParams {
  bookingId: string;
  amount: number;
  paymentType: PaymentType;
  method: PaymentMethod;
  reference?: string;
  notes?: string;
}

// Record a payment or deposit (requires confirmation action)
export function useRecordPaymentDeposit() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      bookingId,
      amount,
      paymentType,
      method,
      reference,
    }: RecordPaymentParams) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get booking for user_id
      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .select('user_id')
        .eq('id', bookingId)
        .single();

      if (bookingError) throw bookingError;

      // Create payment record with 'completed' status (confirmed action)
      const { data: payment, error } = await supabase
        .from('payments')
        .insert({
          booking_id: bookingId,
          user_id: booking.user_id,
          amount,
          payment_type: paymentType,
          payment_method: method,
          status: 'completed',
          transaction_id: reference || `${method}_${Date.now()}`,
        })
        .select()
        .single();

      if (error) throw error;

      // Log to audit
      await supabase.from('audit_logs').insert({
        action: paymentType === 'deposit' ? 'deposit_held' : 'payment_recorded',
        entity_type: 'payment',
        entity_id: payment.id,
        user_id: user.id,
        new_data: {
          booking_id: bookingId,
          amount,
          payment_type: paymentType,
          method,
          reference,
        },
      });

      // Check if all payments are complete and send notification
      const { data: allPayments } = await supabase
        .from('payments')
        .select('amount, payment_type, status')
        .eq('booking_id', bookingId)
        .eq('status', 'completed');

      const { data: bookingDetails } = await supabase
        .from('bookings')
        .select('total_amount, deposit_amount')
        .eq('id', bookingId)
        .single();

      if (bookingDetails && allPayments) {
        const totalPaid = allPayments
          .filter(p => p.payment_type === 'rental')
          .reduce((sum, p) => sum + Number(p.amount), 0);
        const depositHeld = allPayments
          .filter(p => p.payment_type === 'deposit')
          .reduce((sum, p) => sum + Number(p.amount), 0);

        const totalDue = Number(bookingDetails.total_amount);
        const depositRequired = Number(bookingDetails.deposit_amount) || 0;

        // If all complete, send notification
        if (totalPaid >= totalDue && (depositRequired === 0 || depositHeld >= depositRequired)) {
          try {
            await supabase.functions.invoke('send-payment-confirmation', {
              body: { bookingId },
            });
          } catch (notifError) {
            console.warn('Failed to send payment confirmation:', notifError);
          }
        }
      }

      return payment;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['payment-deposit-status', variables.bookingId] });
      queryClient.invalidateQueries({ queryKey: ['booking', variables.bookingId] });
      queryClient.invalidateQueries({ queryKey: ['admin-bookings'] });
      
      toast({
        title: variables.paymentType === 'deposit' ? 'Deposit held' : 'Payment recorded',
        description: `$${variables.amount.toFixed(2)} confirmed`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to record payment',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

// Send payment request link to customer
export function useSendPaymentRequest() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      bookingId,
      amount,
      channel,
    }: {
      bookingId: string;
      amount: number;
      channel: 'email' | 'sms' | 'both';
    }) => {
      const { data, error } = await supabase.functions.invoke('send-payment-request', {
        body: { bookingId, amount, channel },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      toast({
        title: 'Payment request sent',
        description: `Request for $${variables.amount.toFixed(2)} sent to customer`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to send payment request',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

// Release (refund) a deposit
export function useReleaseDeposit() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      bookingId,
      paymentId,
      reason,
    }: {
      bookingId: string;
      paymentId: string;
      reason?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Update payment status to refunded
      const { error } = await supabase
        .from('payments')
        .update({ status: 'refunded' })
        .eq('id', paymentId);

      if (error) throw error;

      // Log to audit
      await supabase.from('audit_logs').insert({
        action: 'deposit_released',
        entity_type: 'payment',
        entity_id: paymentId,
        user_id: user.id,
        new_data: { booking_id: bookingId, reason },
      });

      return { success: true };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['payment-deposit-status', variables.bookingId] });
      queryClient.invalidateQueries({ queryKey: ['booking', variables.bookingId] });
      
      toast({
        title: 'Deposit released',
        description: 'Deposit has been marked as refunded',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to release deposit',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
