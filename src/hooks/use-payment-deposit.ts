/**
 * Payment Deposit Status Hook
 * 
 * Provides read-only payment status for a booking.
 * Simplified: no deposit hold logic - just tracks payments.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface PaymentRecord {
  id: string;
  bookingId: string;
  amount: number;
  paymentType: 'rental' | 'deposit' | 'additional';
  paymentMethod: string | null;
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

export function usePaymentDepositStatus(bookingId: string | null) {
  return useQuery({
    queryKey: ['payment-deposit-status', bookingId],
    queryFn: async () => {
      if (!bookingId) return null;

      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .select('total_amount, deposit_amount')
        .eq('id', bookingId)
        .single();

      if (bookingError) throw bookingError;

      const { data: payments, error: paymentsError } = await supabase
        .from('payments')
        .select('*')
        .eq('booking_id', bookingId)
        .order('created_at', { ascending: true });

      if (paymentsError) throw paymentsError;

      const totalDue = Number(booking.total_amount) || 0;
      const depositRequired = Number(booking.deposit_amount) || 0;

      // Calculate totals from completed payments
      const completedPayments = (payments || []).filter(p => p.status === 'completed');
      const totalPaid = completedPayments
        .filter(p => p.payment_type !== 'refund')
        .reduce((sum, p) => sum + Number(p.amount), 0);
      const totalRefunded = completedPayments
        .filter(p => p.payment_type === 'refund')
        .reduce((sum, p) => sum + Math.abs(Number(p.amount)), 0);
      
      const netPaid = totalPaid - totalRefunded;
      const balance = totalDue - netPaid;
      
      let paymentStatus: 'unpaid' | 'partial' | 'paid' = 'unpaid';
      if (netPaid >= totalDue) {
        paymentStatus = 'paid';
      } else if (netPaid > 0) {
        paymentStatus = 'partial';
      }

      const allComplete = paymentStatus === 'paid';

      const formattedPayments: PaymentRecord[] = (payments || []).map(p => ({
        id: p.id,
        bookingId: p.booking_id,
        amount: Number(p.amount),
        paymentType: p.payment_type as 'rental' | 'deposit' | 'additional',
        paymentMethod: p.payment_method,
        status: p.status as 'pending' | 'completed' | 'refunded' | 'failed',
        transactionId: p.transaction_id,
        createdAt: p.created_at,
      }));

      return {
        totalDue,
        totalPaid: netPaid,
        depositRequired,
        depositHeld: 0,
        balance: Math.max(0, balance),
        paymentStatus,
        depositStatus: 'not_required' as const,
        allComplete,
        payments: formattedPayments,
      } as PaymentSummary;
    },
    enabled: !!bookingId,
    staleTime: 15000,
    gcTime: 60000,
  });
}
