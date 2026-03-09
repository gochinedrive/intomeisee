/**
 * Analytics service — tracks structured metadata only, never raw emotional text.
 */

type AnalyticsEvent =
  | "ei_mentor_opened"
  | "entry_path_selected"
  | "emotion_selected"
  | "body_location_selected"
  | "intensity_recorded"
  | "exercise_recommendations_shown"
  | "exercise_selected"
  | "practice_completed"
  | "intensity_change"
  | "journal_entry_created"
  | "feedback_submitted"
  | "bug_reported";

interface EventProperties {
  entry_path?: string;
  emotion_category?: string; // category only, not raw text
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
