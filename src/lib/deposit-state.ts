export type DepositLifecycleState = "none" | "authorized" | "captured" | "released";

interface DepositStateInput {
  transactionId?: string | null;
  depositStatus?: string | null;
  worldlineAuthStatus?: string | null;
  paymentStatus?: string | null;
}

const AUTHORIZED_STATES = new Set(["authorized", "hold_created"]);
const CAPTURED_STATES = new Set(["captured", "completed", "partially_captured"]);
const RELEASED_STATES = new Set(["released", "voided", "refunded", "cancelled"]);

function normalizeDepositStatus(status?: string | null): DepositLifecycleState | null {
  const normalized = status?.toLowerCase().trim();

  if (!normalized) return null;
  if (AUTHORIZED_STATES.has(normalized)) return "authorized";
  if (CAPTURED_STATES.has(normalized)) return "captured";
  if (RELEASED_STATES.has(normalized)) return "released";

  return null;
}

export function getDepositLifecycleState({
  transactionId,
  depositStatus,
  worldlineAuthStatus,
  paymentStatus,
}: DepositStateInput): DepositLifecycleState {
  if (!transactionId) return "none";

  return (
    normalizeDepositStatus(depositStatus) ??
    normalizeDepositStatus(worldlineAuthStatus) ??
    normalizeDepositStatus(paymentStatus) ??
    "none"
  );
}

export function isDepositActionComplete(state: DepositLifecycleState): boolean {
  return state === "captured" || state === "released";
}

export function getDepositStatusLabel(state: DepositLifecycleState): string {
  switch (state) {
    case "authorized":
      return "Authorized";
    case "captured":
      return "Captured";
    case "released":
      return "Released";
    default:
      return "No hold";
  }
}
