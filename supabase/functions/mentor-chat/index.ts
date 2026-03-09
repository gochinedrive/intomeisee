import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Emotion → exercise mapping
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

function findExercises(emotion: string): string[] {
  const lower = emotion.toLowerCase();
  // Try exact match first
  if (EMOTION_EXERCISE_MAP[lower]) return EMOTION_EXERCISE_MAP[lower];
  // Try partial match
  for (const [key, exercises] of Object.entries(EMOTION_EXERCISE_MAP)) {
    if (lower.includes(key) || key.includes(lower)) return exercises;
  }
  // Default for activated/tense states
  if (lower.includes("tense") || lower.includes("activat")) {
    return EMOTION_EXERCISE_MAP["tense"];
  }
  if (lower.includes("heavy") || lower.includes("low") || lower.includes("tired")) {
    return EMOTION_EXERCISE_MAP["heavy"];
  }
  return ["Box Breathing", "Body Scan Meditation", "Self Compassion Meditation"];
}

function buildSystemPrompt(sessionState: any, entryPath: string): string {
  const captured: string[] = [];
  const missing: string[] = [];

  if (sessionState.emotion) captured.push(`emotion/state: "${sessionState.emotion}"`);
  else missing.push("emotion or activation state");

  if (sessionState.body_location) captured.push(`body location: "${sessionState.body_location}"`);
  else if (sessionState.current_step !== "awaiting_emotion") missing.push("body location");

  if (sessionState.pre_intensity != null) captured.push(`intensity: ${sessionState.pre_intensity}/10`);

  const exercises = sessionState.exercise_options_shown
    ? `Exercise options already shown: ${sessionState.exercise_options_shown.join(", ")}`
    : "";

  const stepInstructions: Record<string, string> = {
    awaiting_emotion: `Ask the user what emotion or activation state they're experiencing. Be warm and curious. If this is the "regulate" path, you may offer quick options like "activated and tense" or "heavy and low".`,
    awaiting_body_location: `The user has shared their emotion ("${sessionState.emotion}"). Acknowledge and validate it briefly. Then ask ONE somatic question: "Where do you feel this in your body?" Do NOT repeat the emotion question. Do NOT ask what they're feeling again.`,
    awaiting_intensity: `The user has shared emotion ("${sessionState.emotion}") and body location ("${sessionState.body_location}"). Acknowledge the body location briefly. Ask: "On a scale of 1 to 10, how intense does this feel right now?" Do NOT ask about emotion or body location again.`,
    ready_for_exercise_offer: `The user has shared: emotion "${sessionState.emotion}", body location "${sessionState.body_location}", intensity ${sessionState.pre_intensity || "noted"}. Now offer exactly 3 exercises suited to their state. ${exercises || `Recommend these 3: ${findExercises(sessionState.emotion || "").join(", ")}`}. Present them as numbered options. Say something like: "Based on what you're experiencing, here are three practices that might help:" followed by the 3 options. Ask which one they'd like to try.`,
    awaiting_exercise_choice: `You already offered exercises. Wait for the user to choose. If they seem unsure, gently encourage them to pick one. The options were: ${(sessionState.exercise_options_shown || []).join(", ")}`,
    post_practice_check: `The user completed "${sessionState.selected_exercise}". Ask how they feel now. Offer a 1-10 scale and quick options: Much better, Slightly better, About the same, Worse. Be warm.`,
    completed: `The session is wrapping up. Offer a brief, warm closing reflection. Acknowledge their effort.`,
  };

  const currentInstruction = stepInstructions[sessionState.current_step] || stepInstructions.awaiting_emotion;

  return `You are the EI Mentor for IntoMeISee — an emotionally intelligent, warm, compassionate guide.

PERSONALITY: You are warm, calm, compassionate, kind, curious, wise, emotionally intelligent, human, and non-judgmental. You feel like a wise, loving coach.

CRITICAL RULES:
- Never diagnose, never provide therapy or medical advice
- Never tell the user what they must do
- Never shame or pressure
- Never fabricate memory or facts
- If the user mentions self-harm or harming others, respond with empathy and encourage crisis support. Do NOT continue the standard flow.

CONVERSATION STYLE:
- Use the mirror technique: periodically summarize their emotional reality and ask for confirmation
- Use emotion labeling: suggest a more precise emotion and ask for confirmation
- Use somatic awareness: ask about body sensations
- Use self-compassion (Kristin Neff): both tender and fierce

ENTRY PATH: "${entryPath}"
${entryPath === "understand" ? "This is the 'Understand how I feel' flow. Allow 1-2 reflective exchanges before exercises, but do NOT loop endlessly." : ""}
${entryPath === "regulate" ? "This is the 'Regulate my emotions' flow. Move quickly to exercise recommendations after capturing emotion and body location." : ""}

CURRENT SESSION STATE:
- current_step: ${sessionState.current_step}
- Fields already captured: ${captured.length > 0 ? captured.join("; ") : "none yet"}
- Fields still needed: ${missing.length > 0 ? missing.join("; ") : "none — ready to proceed"}
- Attempt number: ${sessionState.attempt_number || 1}

STEP INSTRUCTION FOR THIS TURN:
${currentInstruction}

CRITICAL: Do NOT ask for information that has already been captured. Do NOT repeat previous questions. Follow the step instruction above precisely. Keep responses concise (2-4 sentences max, plus exercise list if applicable).`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, sessionState, entryPath } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const systemPrompt = buildSystemPrompt(sessionState || {}, entryPath || "understand");

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: systemPrompt },
            ...messages,
          ],
          stream: true,
        }),
      }
    );

    if (!response.ok) {
      const status = response.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited. Please try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "Usage limit reached." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI error:", status, t);
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("mentor-chat error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
