import { findExercisesForEmotion, getNextExercises } from "./exerciseMapping";

export type MentorStep =
  | "awaiting_emotion"
  | "awaiting_body_location"
  | "awaiting_intensity"
  | "awaiting_trigger"
  | "awaiting_mirror_confirmation"
  | "awaiting_emotion_label"
  | "ready_for_exercise_offer"
  | "awaiting_exercise_choice"
  | "post_practice_check"
  | "awaiting_user_directed_support"
  | "integration_acknowledge"
  | "integration_reconstruct"
  | "integration_psychoeducation"
  | "integration_meaning"
  | "integration_body_check"
  | "integration_journal_invite"
  | "return_to_options"
  | "safety_override"
  | "completed";

export interface MentorSessionState {
  entry_path: "understand" | "regulate" | "prepare";
  current_step: MentorStep;
  emotion: string | null;
  body_location: string | null;
  pre_intensity: number | null;
  trigger_text: string | null;
  exercise_options_shown: string[] | null;
  selected_exercise: string | null;
  attempt_number: number;
  post_intensity: number | null;
  mirror_used: boolean;
  mirror_confirmed: boolean | null;
  emotion_label_suggested: string | null;
  emotion_label_confirmed: boolean | null;
  safety_override_state: string | null;
  improvement_choice: string | null;
  session_count: number;
  psychoeducation_shown: boolean;
}

export function createInitialState(entryPath: string): MentorSessionState {
  return {
    entry_path: (entryPath as MentorSessionState["entry_path"]) || "understand",
    current_step: "awaiting_emotion",
    emotion: null,
    body_location: null,
    pre_intensity: null,
    trigger_text: null,
    exercise_options_shown: null,
    selected_exercise: null,
    attempt_number: 1,
    post_intensity: null,
    mirror_used: false,
    mirror_confirmed: null,
    emotion_label_suggested: null,
    emotion_label_confirmed: null,
    safety_override_state: null,
    improvement_choice: null,
    session_count: 0,
    psychoeducation_shown: false,
  };
}

/**
 * Deterministic state advancement. The AI does NOT control progression.
 */
export function advanceState(
  state: MentorSessionState,
  userMessage: string
): MentorSessionState {
  const next = { ...state };
  const msg = userMessage.toLowerCase().trim();

  // Safety check at every step
  if (detectSafetyKeywords(msg)) {
    next.current_step = "safety_override";
    next.safety_override_state = "triggered";
    return next;
  }

  switch (state.current_step) {
    case "awaiting_emotion": {
      next.emotion = userMessage.trim();
      next.current_step = "awaiting_body_location";
      break;
    }

    case "awaiting_body_location": {
      next.body_location = userMessage.trim();
      if (state.entry_path === "regulate") {
        // Regulate skips intensity/trigger, goes straight to exercises
        next.current_step = "ready_for_exercise_offer";
        next.exercise_options_shown = findExercisesForEmotion(next.emotion || "");
      } else {
        next.current_step = "awaiting_intensity";
      }
      break;
    }

    case "awaiting_intensity": {
      const numMatch = msg.match(/\b(\d{1,2})\b/);
      if (numMatch) {
        next.pre_intensity = parseInt(numMatch[1], 10);
      }
      next.current_step = "awaiting_trigger";
      break;
    }

    case "awaiting_trigger": {
      next.trigger_text = userMessage.trim();
      next.current_step = "awaiting_mirror_confirmation";
      next.mirror_used = true;
      break;
    }

    case "awaiting_mirror_confirmation": {
      const confirmed = msg.includes("yes") || msg.includes("correct") || msg.includes("right") || msg.includes("that's it") || msg.includes("exactly");
      next.mirror_confirmed = confirmed;
      next.current_step = "awaiting_emotion_label";
      break;
    }

    case "awaiting_emotion_label": {
      const confirmed = msg.includes("yes") || msg.includes("that") || msg.includes("closer") || msg.includes("right");
      next.emotion_label_confirmed = confirmed;
      // Update emotion if user provided a different label
      if (!confirmed && userMessage.trim().length > 2) {
        next.emotion = userMessage.trim();
      }
      next.current_step = "ready_for_exercise_offer";
      next.exercise_options_shown = findExercisesForEmotion(next.emotion || "");
      break;
    }

    case "ready_for_exercise_offer": {
      // AI just presented exercises, stay here until postAIAdvance moves to awaiting_exercise_choice
      break;
    }

    case "awaiting_exercise_choice": {
      const exercises = next.exercise_options_shown || [];
      const numMatch = msg.match(/\b([1-3])\b/);
      if (numMatch) {
        const idx = parseInt(numMatch[1], 10) - 1;
        if (exercises[idx]) next.selected_exercise = exercises[idx];
      }
      if (!next.selected_exercise) {
        for (const ex of exercises) {
          if (msg.includes(ex.toLowerCase().slice(0, 10))) {
            next.selected_exercise = ex;
            break;
          }
        }
      }
      if (!next.selected_exercise && exercises.length > 0) {
        next.selected_exercise = exercises[0];
      }
      next.current_step = "post_practice_check";
      break;
    }

    case "post_practice_check": {
      const numMatch = msg.match(/\b(\d{1,2})\b/);
      if (numMatch) next.post_intensity = parseInt(numMatch[1], 10);

      const muchBetter = msg.includes("much better");
      const better = msg.includes("better") || msg.includes("slightly better");
      const same = msg.includes("same");
      const worse = msg.includes("worse");

      if (
        muchBetter ||
        better ||
        (next.post_intensity != null && next.pre_intensity != null && next.post_intensity < next.pre_intensity)
      ) {
        next.improvement_choice = "improved";
        next.current_step = "integration_acknowledge";
      } else if ((same || worse) && next.attempt_number < 3) {
        next.attempt_number += 1;
        next.selected_exercise = null;
        next.exercise_options_shown = getNextExercises(
          next.emotion || "",
          next.exercise_options_shown || []
        );
        next.current_step = "awaiting_exercise_choice";
      } else if ((same || worse) && next.attempt_number >= 3) {
        next.current_step = "awaiting_user_directed_support";
      } else {
        // Ambiguous response — treat as improved
        next.current_step = "integration_acknowledge";
      }
      break;
    }

    case "awaiting_user_directed_support": {
      next.improvement_choice = userMessage.trim();
      if (detectSafetyKeywords(msg)) {
        next.current_step = "safety_override";
        next.safety_override_state = "triggered";
      } else {
        next.current_step = "integration_acknowledge";
      }
      break;
    }

    // Integration phase steps auto-advance on any user response
    case "integration_acknowledge": {
      next.current_step = "integration_reconstruct";
      break;
    }

    case "integration_reconstruct": {
      next.current_step = "integration_psychoeducation";
      break;
    }

    case "integration_psychoeducation": {
      next.psychoeducation_shown = true;
      next.current_step = "integration_meaning";
      break;
    }

    case "integration_meaning": {
      next.current_step = "integration_body_check";
      break;
    }

    case "integration_body_check": {
      next.current_step = "integration_journal_invite";
      break;
    }

    case "integration_journal_invite": {
      next.current_step = "return_to_options";
      break;
    }

    case "return_to_options":
    case "safety_override":
    case "completed":
      break;
  }

  return next;
}

/**
 * After AI responds, advance from ready_for_exercise_offer → awaiting_exercise_choice.
 */
export function postAIAdvance(state: MentorSessionState): MentorSessionState {
  if (state.current_step === "ready_for_exercise_offer") {
    return { ...state, current_step: "awaiting_exercise_choice" };
  }
  return state;
}

function detectSafetyKeywords(msg: string): boolean {
  const keywords = [
    "kill myself", "end my life", "suicide", "self harm", "self-harm",
    "cut myself", "hurt myself", "don't want to live", "want to die",
    "no reason to live", "better off dead", "harm someone",
  ];
  return keywords.some(kw => msg.includes(kw));
}

/**
 * Compute similarity between two strings (word overlap ratio).
 */
export function isSimilar(a: string, b: string): boolean {
  const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]/g, "").trim();
  const na = normalize(a);
  const nb = normalize(b);
  if (na === nb) return true;
  const wordsA = new Set(na.split(/\s+/));
  const wordsB = new Set(nb.split(/\s+/));
  const overlap = [...wordsA].filter(w => wordsB.has(w)).length;
  const total = Math.max(wordsA.size, wordsB.size);
  return total > 0 && overlap / total > 0.8;
}
