import { findExercisesForEmotion, getNextExercises } from "./exerciseMapping";
import type { MentorStep, MentorSessionState, EntryPath } from "@/types/mentor";

export type { MentorStep, MentorSessionState, EntryPath };

export function createInitialState(entryPath: string): MentorSessionState {
  return {
    session_id: null,
    user_id: null,
    entry_path: (entryPath as EntryPath) || "understand",
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
    status: "active",
    pattern_reflection: null,
  };
}

/** Steps that auto-advance after display (no user input). */
export const AUTO_ADVANCE_STEPS: MentorStep[] = [
  "integration_acknowledgement",
  "integration_amygdala_explanation",
];

/** Steps that MUST show action buttons (not free text). */
export const BUTTON_REQUIRED_STEPS: MentorStep[] = [
  "integration_journal_invite",
  "integration_return_to_home",
  "ready_for_exercise_offer",
  "awaiting_exercise_choice",
];

/** Deterministic state advancement. The AI does NOT control progression. */
export function advanceState(
  state: MentorSessionState,
  userMessage: string
): MentorSessionState {
  const next = { ...state };
  const msg = userMessage.toLowerCase().trim();

  if (detectSafetyKeywords(msg)) {
    next.current_step = "safety_override";
    next.safety_override_state = "triggered";
    return next;
  }

  switch (state.current_step) {
    case "awaiting_emotion":
      next.emotion = userMessage.trim();
      next.current_step = "awaiting_body_location";
      break;

    case "awaiting_body_location":
      next.body_location = userMessage.trim();
      if (state.entry_path === "regulate") {
        next.current_step = "ready_for_exercise_offer";
        next.exercise_options_shown = findExercisesForEmotion(next.emotion || "");
      } else {
        next.current_step = "awaiting_intensity";
      }
      break;

    case "awaiting_intensity": {
      const numMatch = msg.match(/\b(\d{1,2})\b/);
      if (numMatch) next.pre_intensity = parseInt(numMatch[1], 10);
      next.current_step = "awaiting_trigger_context";
      break;
    }

    case "awaiting_trigger_context":
      next.trigger_text = userMessage.trim();
      next.current_step = "awaiting_mirror_confirmation";
      next.mirror_used = true;
      break;

    case "awaiting_mirror_confirmation": {
      const yes = msg.includes("yes") || msg.includes("correct") || msg.includes("right") || msg.includes("exactly");
      next.mirror_confirmed = yes;
      next.current_step = "awaiting_emotion_label_confirmation";
      break;
    }

    case "awaiting_emotion_label_confirmation": {
      const confirmed = msg.includes("yes") || msg.includes("that") || msg.includes("closer") || msg.includes("right");
      next.emotion_label_confirmed = confirmed;
      if (!confirmed && userMessage.trim().length > 2) {
        next.emotion = userMessage.trim();
      }
      next.current_step = "ready_for_exercise_offer";
      next.exercise_options_shown = findExercisesForEmotion(next.emotion || "");
      break;
    }

    case "ready_for_exercise_offer":
    case "awaiting_exercise_choice":
      // Handled by button click
      break;

    case "exercise_launch_pending":
    case "exercise_in_progress":
      break;

    case "exercise_completed_return":
      next.current_step = "post_practice_check";
      break;

    case "post_practice_check": {
      const numMatch = msg.match(/\b(\d{1,2})\b/);
      if (numMatch) next.post_intensity = parseInt(numMatch[1], 10);

      const muchBetter = msg.includes("much better");
      const better = msg.includes("better") || msg.includes("slightly");
      const same = msg.includes("same");
      const worse = msg.includes("worse");

      if (
        muchBetter || better ||
        (next.post_intensity != null && next.pre_intensity != null && next.post_intensity < next.pre_intensity)
      ) {
        next.improvement_choice = "improved";
        next.current_step = "integration_acknowledgement";
      } else if ((same || worse) && next.attempt_number < 3) {
        next.attempt_number += 1;
        next.selected_exercise = null;
        next.post_intensity = null;
        next.exercise_options_shown = getNextExercises(next.emotion || "", next.exercise_options_shown || []);
        next.current_step = "awaiting_exercise_choice";
      } else if ((same || worse) && next.attempt_number >= 3) {
        next.current_step = "awaiting_user_directed_support";
      } else {
        next.improvement_choice = "improved";
        next.current_step = "integration_acknowledgement";
      }
      break;
    }

    case "awaiting_user_directed_support":
      next.improvement_choice = userMessage.trim();
      if (detectSafetyKeywords(msg)) {
        next.current_step = "safety_override";
        next.safety_override_state = "triggered";
      } else {
        next.current_step = "integration_acknowledgement";
      }
      break;

    // Integration phase — deterministic substates
    case "integration_acknowledgement":
      next.current_step = "integration_sequence_reflection";
      break;

    case "integration_sequence_reflection":
      next.current_step = "integration_sequence_confirmation";
      break;

    case "integration_sequence_confirmation":
      next.current_step = "integration_amygdala_explanation";
      break;

    case "integration_amygdala_explanation":
      next.current_step = "integration_meaning_question";
      break;

    case "integration_meaning_question":
      next.current_step = "integration_body_check";
      break;

    case "integration_body_check":
      next.current_step = "integration_journal_invite";
      break;

    case "integration_journal_invite":
      next.current_step = "integration_return_to_home";
      break;

    case "integration_return_to_home":
    case "safety_override":
    case "completed":
      break;
  }

  return next;
}

/** After AI responds, advance from ready_for_exercise_offer → awaiting_exercise_choice. */
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

/** Word-overlap similarity check (>80% = duplicate). */
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

/** Deterministic fallback text for each step. */
export const STEP_FALLBACKS: Record<string, string> = {
  awaiting_emotion: "What emotion feels strongest for you right now?",
  awaiting_body_location: "Where do you feel this emotion most in your body?",
  awaiting_intensity: "On a scale of 1 to 10, how strong does this emotion feel right now?",
  awaiting_trigger_context: "What happened just before you felt this emotion?",
  awaiting_mirror_confirmation: "Did I understand that correctly?",
  awaiting_emotion_label_confirmation: "Does that label feel right, or does it feel closer to something else?",
  ready_for_exercise_offer: "Here are some practices that might help. Which would you like to try?",
  awaiting_exercise_choice: "Which exercise would you like to try?",
  post_practice_check: "How does the emotion feel now? You can say much better, slightly better, about the same, or worse — or give a number 1-10.",
  awaiting_user_directed_support: "What do you feel might help you most right now?",
  integration_acknowledgement: "You paused and worked with the feeling instead of reacting automatically. That takes real awareness.",
  integration_sequence_reflection: "Let me reconstruct the journey you just went through.",
  integration_sequence_confirmation: "Does that capture the journey?",
  integration_amygdala_explanation: "When something feels threatening, a part of the brain called the amygdala reacts quickly to protect you. This can show up as fight, flight, freeze, or fawn responses — often felt first as sensations in the body. The practice you did helps signal to the nervous system that it's safe to settle again.",
  integration_meaning_question: "What do you think this feeling might have been trying to tell you?",
  integration_body_check: "How does your body feel now compared to before?",
  integration_journal_invite: "Would you like to capture this moment in your journal while it's fresh?",
  integration_return_to_home: "I hope you carry this lighter feeling with you. What would you like to explore next?",
};
