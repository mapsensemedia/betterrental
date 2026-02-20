/**
 * Checkout and payment policies
 * Legal text and requirements
 */

export const CANCELLATION_POLICY = {
  title: "Cancellation Policy",
  content: `Free cancellation is available anytime prior to the scheduled pickup time. Late cancellations (after pickup time) or no-shows will be charged one full day rental rate based on the booked vehicle category. A valid credit card must be presented at the time of rental to complete the reservation.`,
  // Toggle is_active to re-enable fixed fee later
  // Fee is now dynamic: 1 × daily_rate of the booked vehicle category
};

export const PICKUP_REQUIREMENTS = {
  title: "Pickup Requirements",
  items: [
    "A current, valid driver's license in the renter's name",
    "A valid credit or charge card (debit cards not accepted for prepaid rates)",
  ],
};

export const DAMAGE_LIABILITY_POLICY = {
  title: "Damage Liability",
  content: `The customer is legally bound to pay for any damages to the rented vehicle, provided it is proven that such damages were caused by the customer during the rental period. Any outstanding charges for damages, fuel refills, traffic violations, or other fees will be invoiced separately and must be paid promptly.`,
  shortVersion: `You are legally responsible for any damages caused during your rental period. Outstanding charges will be invoiced separately.`,
};
