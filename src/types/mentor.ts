export type MentorStep =
  | "awaiting_emotion"
  | "awaiting_body_location"
  | "awaiting_intensity"
  | "awaiting_trigger_context"
  | "awaiting_mirror_confirmation"
  | "awaiting_emotion_label_confirmation"
  | "ready_for_exercise_offer"
  | "awaiting_exercise_choice"
  | "exercise_launch_pending"
  | "exercise_in_progress"
  | "exercise_completed_return"
  | "post_practice_check"
  | "awaiting_user_directed_support"
  | "integration_acknowledgement"
  | "integration_sequence_reflection"
  | "integration_sequence_confirmation"
  | "integration_amygdala_explanation"
  | "integration_meaning_question"
  | "integration_body_check"
  | "integration_journal_invite"
  | "integration_return_to_home"
  | "safety_override"
  | "completed";

export type EntryPath = "understand" | "regulate" | "prepare";

export interface MentorSessionState {
  session_id: string | null;
  user_id: string | null;
  entry_path: EntryPath;
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
  status: "active" | "completed";
  pattern_reflection: string | null;
}

export interface ChatMessage {
  id: string;
  role: "mentor" | "user";
  content: string;
  actions?: ChatAction[];
  step_at_time?: string;
}

export interface ChatAction {
  label: string;
  action: string;
  icon?: string;
}

export interface MentorApiResponse {
  assistantText: string;
  responseType: string;
  exerciseOptions?: string[];
  snapshotNeeded?: boolean;
  safetyOverride?: boolean;
}
