// ─── Slot / walk durations ────────────────────────────────────────────────────
export const SLOT_DURATIONS = [30, 45, 60] as const;
export type SlotDuration = typeof SLOT_DURATIONS[number];

// ─── Matching defaults ────────────────────────────────────────────────────────
export const DEFAULT_MATCH_RADIUS_KM   = 10;
export const DEFAULT_MATCH_LIMIT       = 10;
export const RATING_WEIGHT             = 0.4;   // 40% of composite match score
export const DISTANCE_WEIGHT           = 0.6;   // 60% of composite match score

// ─── Cancellation policy ──────────────────────────────────────────────────────
export const CANCEL_REOPEN_THRESHOLD_HRS = 2;   // < 2hr = slot permanently closed

// ─── Walk session constraints ─────────────────────────────────────────────────
export const START_WALK_WINDOW_MINS    = 15;    // nurse can start ± 15 min of schedule
export const METRICS_HEARTBEAT_SEC     = 60;    // expected client update interval

// ─── Emergency contacts ───────────────────────────────────────────────────────
export const MAX_EMERGENCY_CONTACTS    = 3;

// ─── Admin pagination ─────────────────────────────────────────────────────────
export const DEFAULT_PAGE_SIZE         = 20;
export const MAX_PAGE_SIZE             = 100;

// ─── Event names ─────────────────────────────────────────────────────────────
// Centralised so consumers reference the constant, not a string literal.
// Any future rename is a one-file change.
export const EVENTS = {
  WALK_STARTED:          'walk.started',
  WALK_COMPLETED:        'walk.completed',
  WALK_CANCELLED:        'walk.cancelled',
  BOOKING_CONFIRMED:     'booking.confirmed',
  BOOKING_CANCELLED:     'booking.cancelled',
  NURSE_APPROVED:        'nurse.approved',
  NURSE_REJECTED:        'nurse.rejected',
  USER_DEACTIVATED:      'user.deactivated',
} as const;

export type EventName = typeof EVENTS[keyof typeof EVENTS];

// ─── walk.completed event payload contract ────────────────────────────────────
// Locked here so Sprint 3 (ratings/payments) consumers are guaranteed these fields.
export interface WalkCompletedPayload {
  sessionId:          string;
  bookingId:          string;
  nurseId:            string;
  elderlyId:          string;
  actualDurationMins: number;
  distanceMeters:     number;
  stepsCount:         number;
  caloriesBurned:     number;
  completedAt:        Date;
}
