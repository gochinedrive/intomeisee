/**
 * Single source of truth: Emotion → Exercise mapping.
 * Used by both client state machine and edge function.
 */

export const EMOTION_EXERCISE_MAP: Record<string, string[]> = {
  anger: ["Release Tension Breathing", "Body Shaking", "Anger Release Practice"],
  frustration: ["Shoulder Release", "Release Tension Breathing", "Somatic Tracking"],
  anxiety: ["Calm Nervous System Breathing", "5 Senses Grounding", "Calming Meditation"],
  fear: ["Box Breathing", "Feet Awareness", "Body Scan Meditation"],
  overwhelm: ["Extended Exhale Breathing", "5 Senses Grounding", "Body Scan Meditation"],
  sadness: ["Heart Connection Breathing", "Emotional Acceptance Meditation", "Body Scan Meditation"],
  hurt: ["Heart Connection Breathing", "Emotional Acceptance Meditation", "Self Compassion Meditation"],
  shame: ["Self Compassion Meditation", "Humming Regulation", "Extended Exhale Breathing"],
  guilt: ["Self Compassion Meditation", "Body Scan Meditation", "Humming Regulation"],
  loneliness: ["Heart Connection Breathing", "Self Compassion Meditation", "Humming Regulation"],
  rejection: ["Self Compassion Meditation", "Emotional Acceptance Meditation", "Humming Regulation"],
  jealousy: ["Somatic Tracking", "Extended Exhale Breathing", "Self Compassion Meditation"],
  resentment: ["Anger Release Practice", "Release Tension Breathing", "Somatic Tracking"],
  insecurity: ["Self Compassion Meditation", "Calm Nervous System Breathing", "Body Scan Meditation"],
  confusion: ["Body Scan Meditation", "Box Breathing", "Feet Awareness"],
  numbness: ["Temperature Reset", "Body Shaking", "5 Senses Grounding"],
  embarrassment: ["Self Compassion Meditation", "Humming Regulation", "Calm Nervous System Breathing"],
  powerlessness: ["Somatic Tracking", "Release Tension Breathing", "Self Compassion Meditation"],
  grief: ["Heart Connection Breathing", "Emotional Acceptance Meditation", "Body Scan Meditation"],
  disappointment: ["Emotional Acceptance Meditation", "Body Scan Meditation", "Heart Connection Breathing"],
  stressed: ["Extended Exhale Breathing", "5 Senses Grounding", "Body Scan Meditation"],
  tense: ["Release Tension Breathing", "Body Shaking", "Shoulder Release"],
  activated: ["Box Breathing", "Feet Awareness", "Body Scan Meditation"],
  heavy: ["Heart Connection Breathing", "Self Compassion Meditation", "Body Scan Meditation"],
  low: ["Heart Connection Breathing", "Self Compassion Meditation", "Humming Regulation"],
};

const DEFAULT_EXERCISES = ["Box Breathing", "Body Scan Meditation", "Self Compassion Meditation"];

export function findExercisesForEmotion(emotion: string): string[] {
  const lower = emotion.toLowerCase();
  if (EMOTION_EXERCISE_MAP[lower]) return EMOTION_EXERCISE_MAP[lower];
  for (const [key, exercises] of Object.entries(EMOTION_EXERCISE_MAP)) {
    if (lower.includes(key) || key.includes(lower)) return exercises;
  }
  if (lower.includes("tense") || lower.includes("activat")) return EMOTION_EXERCISE_MAP["tense"];
  if (lower.includes("heavy") || lower.includes("low") || lower.includes("tired")) return EMOTION_EXERCISE_MAP["heavy"];
  return DEFAULT_EXERCISES;
}

/**
 * Get the next set of exercises for a retry attempt (different from what was already shown).
 */
export function getNextExercises(emotion: string, alreadyShown: string[]): string[] {
  const all = findExercisesForEmotion(emotion);
  const remaining = all.filter(e => !alreadyShown.includes(e));
  if (remaining.length >= 3) return remaining.slice(0, 3);
  // Fill with defaults not already shown
  const defaults = DEFAULT_EXERCISES.filter(e => !alreadyShown.includes(e) && !remaining.includes(e));
  return [...remaining, ...defaults].slice(0, 3);
}
