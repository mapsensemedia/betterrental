/**
 * Checkout and payment policies
 * Legal text and authorization requirements
 */

export const CREDIT_CARD_AUTHORIZATION_POLICY = {
  title: "Credit Card Authorization",
  content: `At the time of rental, you MUST produce the same credit card you used to pay online and valid driver's license in your name. Once proof of this card has been provided, we can accept any other valid credit card in your name at the time of rent for taxes, fees, and incidentals.

Authorization amounts vary by destination country.

For US and Canada rentals, we may place an authorized amount of up to USD 200.00 (US Rentals), CAD 350 (Canada rentals) plus estimated charges on a customer's card, given certain conditions that will be outlined at time of rental.

These funds will not be available for your use. Debit cards are not a valid form of payment for prepaid rates.`,
  shortVersion: `A valid credit card (not debit) is required at pickup. An authorization hold of up to CAD $350 plus estimated charges will be placed on your card.`,
};

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
    "The same credit card used for online payment (if applicable)",
  ],
};

export const AUTHORIZATION_AMOUNTS = {
  us: { amount: 200, currency: "USD" },
  canada: { amount: 350, currency: "CAD" },
};
