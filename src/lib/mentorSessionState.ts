export type MentorStep =
  | "awaiting_emotion"
  | "awaiting_body_location"
  | "awaiting_intensity"
  | "ready_for_exercise_offer"
  | "awaiting_exercise_choice"
  | "post_practice_check"
  | "completed";

export interface MentorSessionState {
  entry_path: "understand" | "regulate" | "prepare";
  current_step: MentorStep;
  emotion: string | null;
  body_location: string | null;
  pre_intensity: number | null;
  exercise_options_shown: string[] | null;
  selected_exercise: string | null;
  attempt_number: number;
  post_intensity: number | null;
}

export function createInitialState(entryPath: string): MentorSessionState {
  return {
    entry_path: (entryPath as any) || "understand",
    current_step: "awaiting_emotion",
    emotion: null,
    body_location: null,
    pre_intensity: null,
    exercise_options_shown: null,
    selected_exercise: null,
    attempt_number: 1,
    post_intensity: null,
  };
}

// Emotion → exercise mapping (client copy for UI)
const EMOTION_EXERCISE_MAP: Record<string, string[]> = {
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

export function findExercisesForEmotion(emotion: string): string[] {
  const lower = emotion.toLowerCase();
  if (EMOTION_EXERCISE_MAP[lower]) return EMOTION_EXERCISE_MAP[lower];
  for (const [key, exercises] of Object.entries(EMOTION_EXERCISE_MAP)) {
    if (lower.includes(key) || key.includes(lower)) return exercises;
  }
  if (lower.includes("tense") || lower.includes("activat")) return EMOTION_EXERCISE_MAP["tense"];
  if (lower.includes("heavy") || lower.includes("low") || lower.includes("tired")) return EMOTION_EXERCISE_MAP["heavy"];
  return ["Box Breathing", "Body Scan Meditation", "Self Compassion Meditation"];
}

/**
 * Analyze user message and advance session state deterministically.
 * Returns the updated state — the AI does NOT control progression.
 */
export function advanceState(
  state: MentorSessionState,
  userMessage: string
): MentorSessionState {
  const next = { ...state };
  const msg = userMessage.toLowerCase().trim();

  switch (state.current_step) {
    case "awaiting_emotion": {
      // User has shared emotion/activation state
      next.emotion = userMessage.trim();
      next.current_step = "awaiting_body_location";
      break;
    }

    case "awaiting_body_location": {
      // User has shared body location
      next.body_location = userMessage.trim();
      if (state.entry_path === "regulate") {
        // Regulate: skip intensity, go straight to exercises
        next.current_step = "ready_for_exercise_offer";
        next.exercise_options_shown = findExercisesForEmotion(next.emotion || "");
      } else {
        next.current_step = "awaiting_intensity";
      }
      break;
    }

    case "awaiting_intensity": {
      // Try to parse a number
      const numMatch = msg.match(/\b(\d{1,2})\b/);
      if (numMatch) {
        next.pre_intensity = parseInt(numMatch[1], 10);
      }
      next.current_step = "ready_for_exercise_offer";
      next.exercise_options_shown = findExercisesForEmotion(next.emotion || "");
      break;
    }

    case "ready_for_exercise_offer": {
      // This step means the AI should be offering exercises, not expecting user input
      // But if user sends a message here, just stay (AI will offer exercises)
      break;
    }

    case "awaiting_exercise_choice": {
      // User picked an exercise
      const exercises = next.exercise_options_shown || [];
      // Try to match by number
      const numMatch = msg.match(/\b([1-3])\b/);
      if (numMatch) {
        const idx = parseInt(numMatch[1], 10) - 1;
        if (exercises[idx]) next.selected_exercise = exercises[idx];
      }
      // Try to match by name
      if (!next.selected_exercise) {
        for (const ex of exercises) {
          if (msg.includes(ex.toLowerCase().slice(0, 10))) {
            next.selected_exercise = ex;
            break;
          }
        }
      }
      if (!next.selected_exercise && exercises.length > 0) {
        next.selected_exercise = exercises[0]; // default to first
      }
      next.current_step = "post_practice_check";
      break;
    }

    case "post_practice_check": {
      // Parse post-practice intensity
      const numMatch = msg.match(/\b(\d{1,2})\b/);
      if (numMatch) next.post_intensity = parseInt(numMatch[1], 10);

      const better = msg.includes("better") || msg.includes("much better");
      const same = msg.includes("same");
      const worse = msg.includes("worse");

      if (better || (next.post_intensity != null && next.pre_intensity != null && next.post_intensity < next.pre_intensity)) {
        next.current_step = "completed";
      } else if ((same || worse) && next.attempt_number < 3) {
        next.attempt_number += 1;
        next.selected_exercise = null;
        next.current_step = "awaiting_exercise_choice";
      } else {
        next.current_step = "completed";
      }
      break;
    }

    case "completed":
      break;
  }

  return next;
}

/**
 * After AI responds, if the step was ready_for_exercise_offer,
 * advance to awaiting_exercise_choice (exercises have been shown).
 */
export function postAIAdvance(state: MentorSessionState): MentorSessionState {
  if (state.current_step === "ready_for_exercise_offer") {
    return { ...state, current_step: "awaiting_exercise_choice" };
  }
  return state;
}
