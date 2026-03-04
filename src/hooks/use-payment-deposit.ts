/**
 * Payment Deposit Status Hook
 * 
 * Provides read-only payment status for a booking.
 * Reads separate rental (wl_transaction_id) and deposit (wl_deposit_transaction_id) fields.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  getDepositLifecycleState,
  getDepositStatusLabel,
  isDepositActionComplete,
  type DepositLifecycleState,
} from '@/lib/deposit-state';

export interface PaymentRecord {
  id: string;
  bookingId: string;
  amount: number;
  paymentType: 'rental' | 'deposit' | 'additional';
  paymentMethod: string | null;
  status: 'pending' | 'completed' | 'refunded' | 'failed' | 'authorized' | 'voided';
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
  depositLifecycleState: DepositLifecycleState;
  depositStatusLabel: string;
  hasAnyDeposit: boolean;
  hasActiveHold: boolean;
  canCaptureDeposit: boolean;
  canReleaseDeposit: boolean;
  depositActionComplete: boolean;
  allComplete: boolean;
  payments: PaymentRecord[];
  // Rental fields
  wlTransactionId: string | null;
  wlAuthStatus: string | null;
  // Deposit fields (separate from rental)
  wlDepositTransactionId: string | null;
  wlDepositAuthStatus: string | null;
  depositDbStatus: string | null;
  bookingStatus: string | null;
}

export function usePaymentDepositStatus(bookingId: string | null) {
  return useQuery({
    queryKey: ['payment-deposit-status', bookingId],
    queryFn: async () => {
      if (!bookingId) return null;

      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .select('total_amount, deposit_amount, deposit_status, wl_transaction_id, wl_auth_status, wl_deposit_transaction_id, wl_deposit_auth_status, status')
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
        status: p.status as PaymentRecord['status'],
        transactionId: p.transaction_id,
        createdAt: p.created_at,
      }));

      const latestDepositPayment = [...formattedPayments]
        .reverse()
        .find(payment => payment.paymentType === 'deposit');

      const depositLifecycleState = getDepositLifecycleState({
        transactionId: booking.wl_deposit_transaction_id || latestDepositPayment?.transactionId || null,
        depositStatus: booking.deposit_status || null,
        worldlineAuthStatus: (booking as any).wl_deposit_auth_status || null,
        paymentStatus: latestDepositPayment?.status || null,
      });

      const hasAnyDeposit = !!booking.wl_deposit_transaction_id || !!latestDepositPayment;
      const hasActiveHold = depositLifecycleState === 'authorized';
      const depositActionComplete = isDepositActionComplete(depositLifecycleState);
      const depositStatus =
        depositRequired <= 0
          ? 'not_required'
          : hasActiveHold
            ? 'held'
            : depositActionComplete
              ? 'released'
              : 'pending';

      return {
        totalDue,
        totalPaid: netPaid,
        depositRequired,
        depositHeld: hasActiveHold ? depositRequired : 0,
        balance: Math.max(0, balance),
        paymentStatus,
        depositStatus,
        depositLifecycleState,
        depositStatusLabel: getDepositStatusLabel(depositLifecycleState),
        hasAnyDeposit,
        hasActiveHold,
        canCaptureDeposit: hasActiveHold,
        canReleaseDeposit: hasActiveHold,
        depositActionComplete,
        allComplete,
        payments: formattedPayments,
        wlTransactionId: booking.wl_transaction_id || null,
        wlAuthStatus: booking.wl_auth_status || null,
        wlDepositTransactionId: (booking as any).wl_deposit_transaction_id || null,
        wlDepositAuthStatus: (booking as any).wl_deposit_auth_status || null,
        depositDbStatus: booking.deposit_status || null,
        bookingStatus: booking.status || null,
      } as PaymentSummary;
    },
    enabled: !!bookingId,
    staleTime: 15000,
    gcTime: 60000,
  });
}
