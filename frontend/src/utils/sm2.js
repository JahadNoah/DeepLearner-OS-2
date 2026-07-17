// SM-2 spaced-repetition scheduler (SuperMemo 2 / Anki-style).
//
// Rating → quality map (4 buttons after a card is flipped):
//   Again = 2   Hard = 3   Good = 4   Easy = 5
//
// Given a card's current SM-2 state, returns the next state:
//   { easeFactor, interval (days), repetitions, nextReview (Date) }
// A card is "due" when nextReview <= now. New cards start due immediately.

export const RATING = { AGAIN: 2, HARD: 3, GOOD: 4, EASY: 5 };

const DAY_MS = 24 * 60 * 60 * 1000;

export function sm2(card, quality) {
  let easeFactor = typeof card?.easeFactor === "number" ? card.easeFactor : 2.5;
  let interval = typeof card?.interval === "number" ? card.interval : 0;
  let repetitions = typeof card?.repetitions === "number" ? card.repetitions : 0;

  if (quality < 3) {
    // Failed recall → relearn from the start.
    repetitions = 0;
    interval = 1;
  } else {
    if (repetitions === 0) interval = 1;
    else if (repetitions === 1) interval = 6;
    else interval = Math.round(interval * easeFactor);
    repetitions += 1;
  }

  // Ease-factor adjustment (clamped to a 1.3 floor, per SM-2).
  easeFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  if (easeFactor < 1.3) easeFactor = 1.3;

  return {
    easeFactor,
    interval,
    repetitions,
    nextReview: new Date(Date.now() + interval * DAY_MS),
  };
}

// Whole days until a card is next due (0 = today), for "next review in N days" copy.
export function daysUntil(nextReview) {
  if (!nextReview) return 0;
  const d = typeof nextReview.toDate === "function" ? nextReview.toDate() : new Date(nextReview);
  return Math.max(0, Math.ceil((d.getTime() - Date.now()) / DAY_MS));
}
