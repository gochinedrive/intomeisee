/**
 * Analytics service — tracks structured metadata only, never raw emotional text.
 */

type AnalyticsEvent =
  | "ei_mentor_opened"
  | "entry_path_selected"
  | "emotional_checkin_started"
  | "emotion_selected"
  | "body_location_selected"
  | "intensity_recorded"
  | "trigger_entered"
  | "mirror_confirmed"
  | "emotion_label_confirmed"
  | "exercise_recommendations_shown"
  | "exercise_selected"
  | "practice_completed"
  | "intensity_change"
  | "intensity_change_recorded"
  | "integration_phase_started"
  | "journal_prompt_shown"
  | "journal_entry_created"
  | "feedback_submitted"
  | "bug_reported"
  | "mentor_navigation_returned";

interface EventProperties {
  entry_path?: string;
  emotion_category?: string;
  body_region?: string;
  intensity?: number;
  exercise_name?: string;
  pre_intensity?: number;
  post_intensity?: number;
  entry_type?: string;
  attempt_number?: number;
  outcome?: string;
  [key: string]: string | number | boolean | undefined;
}

class AnalyticsService {
  private enabled = true;

  track(event: AnalyticsEvent, properties?: EventProperties) {
    if (!this.enabled) return;
    // Log locally for now — PostHog integration will replace this
    console.log(`[Analytics] ${event}`, properties || {});
  }

  disable() {
    this.enabled = false;
  }

  enable() {
    this.enabled = true;
  }
}

export const analytics = new AnalyticsService();
