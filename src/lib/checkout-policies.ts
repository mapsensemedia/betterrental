/**
 * Checkout and payment policies
 * Legal text and requirements
 */

export const CANCELLATION_POLICY = {
  title: "Cancellation Policy",
  content: `Free cancellation is available anytime prior to the scheduled pickup time. Cancellations made after the pickup time (no-show) will be subject to a flat fee of CAD $19.99. A valid credit card must be presented at the time of rental to complete the reservation.`,
  noShowFee: 19.99,
  cancellationFee: 19.99,
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
