export const INITIAL_POLL_DELAY_MS = 2000;
const MAX_POLL_DELAY_MS = 10_000;
const BACKOFF_FACTOR = 1.5;
const MAX_JITTER_MS = 500;

/** 2s initial, x1.5 backoff, 10s cap, plus jitter — matches Higgsfield's recommended polling strategy. */
export function nextPollDelayMs(previousDelayMs: number): number {
  const scaled = Math.min(previousDelayMs * BACKOFF_FACTOR, MAX_POLL_DELAY_MS);
  return Math.round(scaled + Math.random() * MAX_JITTER_MS);
}
