/**
 * Payment Deposit Status Hook
 * 
 * Provides read-only payment/deposit status for a booking.
 * Payments are now Stripe-only - collected at customer checkout.
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

// Fetch complete payment/deposit status for a booking
export function usePaymentDepositStatus(bookingId: string | null) {
  return useQuery({
    queryKey: ['payment-deposit-status', bookingId],
    queryFn: async () => {
      if (!bookingId) return null;

      // Get booking details for totals
      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .select('total_amount, deposit_amount, deposit_status')
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
      
      // Determine payment status based on Stripe authorization
      // If deposit_status is 'authorized', treat as paid
      const isStripeAuthorized = booking.deposit_status === 'authorized';
      
      let paymentStatus: 'unpaid' | 'partial' | 'paid' = 'unpaid';
      if (isStripeAuthorized || totalPaid >= totalDue) {
        paymentStatus = 'paid';
      } else if (totalPaid > 0) {
        paymentStatus = 'partial';
      }

      // Deposit status based on Stripe hold
      let depositStatus: 'not_required' | 'pending' | 'held' | 'released' = 'not_required';
      if (depositRequired > 0) {
        if (isStripeAuthorized || depositHeld >= depositRequired) {
          depositStatus = 'held';
        } else if (booking.deposit_status === 'released') {
          depositStatus = 'released';
        } else {
          depositStatus = 'pending';
        }
      }

      // All complete when Stripe authorization is active
      const allComplete = isStripeAuthorized || 
        (paymentStatus === 'paid' && (depositStatus === 'not_required' || depositStatus === 'held'));

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
