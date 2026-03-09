import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function buildSystemPrompt(state: any, entryPath: string): string {
  const captured: string[] = [];
  const missing: string[] = [];

  if (state.emotion) captured.push(`emotion/state: "${state.emotion}"`);
  else missing.push("emotion or activation state");

  if (state.body_location) captured.push(`body location: "${state.body_location}"`);
  else if (state.current_step !== "awaiting_emotion") missing.push("body location");

  if (state.pre_intensity != null) captured.push(`intensity: ${state.pre_intensity}/10`);

  const exercises = state.exercise_options_shown
    ? `Exercise options to present: ${state.exercise_options_shown.join(", ")}`
    : "";

  const stepInstructions: Record<string, string> = {
    awaiting_emotion: `Ask the user what emotion or activation state they're experiencing. Be warm and curious. If "regulate" path, offer quick options like "activated and tense" or "heavy and low".`,
    awaiting_body_location: `The user shared emotion "${state.emotion}". Validate briefly. Ask ONE question: "Where do you feel this in your body?" Do NOT repeat the emotion question.`,
    awaiting_intensity: `User shared emotion "${state.emotion}" and body location "${state.body_location}". Acknowledge briefly. Ask: "On a scale of 1 to 10, how intense does this feel right now?"`,
    ready_for_exercise_offer: `Present exactly 3 exercises: ${exercises}. Say "Based on what you're experiencing, here are three practices:" then list them numbered 1-3. Ask which they'd like to try.`,
    awaiting_exercise_choice: `Exercises were offered: ${(state.exercise_options_shown || []).join(", ")}. Wait for user to choose. If unsure, gently encourage picking one.`,
    post_practice_check: `User completed "${state.selected_exercise}". Ask: "How intense does the emotion feel now?" Offer scale 1-10 and options: Much better, Slightly better, About the same, Worse.`,
    awaiting_user_directed_support: `After ${state.attempt_number} attempts, ask: "What do you feel might help you most right now?" Support safe suggestions. If harmful, trigger safety.`,
    safety_override: `Respond with empathy. Acknowledge pain. Encourage crisis support (988 Lifeline, Crisis Text Line 741741). Do NOT continue normal flow.`,
    completed: `Warm closing. Acknowledge their effort. Brief reflection on progress.`,
  };

  const currentInstruction = stepInstructions[state.current_step] || stepInstructions.awaiting_emotion;

  return `You are the EI Mentor for IntoMeISee — an emotionally intelligent, warm, compassionate guide.

PERSONALITY: Warm, calm, compassionate, curious, wise, non-judgmental. Like a loving coach.

CRITICAL RULES:
- Never diagnose or provide therapy/medical advice
- Never tell user what they must do
- Never shame or pressure
- Never fabricate memory or facts
- If self-harm mentioned, respond with empathy and crisis support only

ENTRY PATH: "${entryPath}"
${entryPath === "understand" ? "Allow 1-2 reflective exchanges before exercises." : ""}
${entryPath === "regulate" ? "Move quickly to exercises after emotion + body location." : ""}

SESSION STATE:
- current_step: ${state.current_step}
- Captured: ${captured.length > 0 ? captured.join("; ") : "none"}
- Needed: ${missing.length > 0 ? missing.join("; ") : "none"}
- Attempt: ${state.attempt_number || 1}

INSTRUCTION FOR THIS TURN:
${currentInstruction}

CRITICAL: Do NOT ask for already-captured information. Follow the step instruction precisely. Keep responses 2-4 sentences max plus exercise list if applicable.

You MUST respond with valid JSON only. No markdown, no extra text. Use this exact structure:
{
  "assistantText": "your response text here",
  "responseType": "reflection|question|exercise_offer|check_in|safety|closing",
  "exerciseOptions": ["exercise1", "exercise2", "exercise3"] or null,
  "snapshotNeeded": false,
  "safetyOverride": false
}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, sessionState, entryPath } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const state = sessionState || {};
    const systemPrompt = buildSystemPrompt(state, entryPath || "understand");

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
          response_format: { type: "json_object" },
        }),
      }
    );

    if (!response.ok) {
      const status = response.status;
      if (status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limited. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (status === 402) {
        return new Response(
          JSON.stringify({ error: "Usage limit reached." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const t = await response.text();
      console.error("AI error:", status, t);
      return new Response(
        JSON.stringify({ error: "AI service error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await response.json();
    const rawContent = aiData.choices?.[0]?.message?.content || "{}";
    
    let parsed;
    try {
      parsed = JSON.parse(rawContent);
    } catch {
      // Fallback if AI doesn't return valid JSON
      parsed = {
        assistantText: rawContent,
        responseType: "reflection",
        exerciseOptions: null,
        snapshotNeeded: false,
        safetyOverride: false,
      };
    }

    // Ensure structure
    const result = {
      assistantText: parsed.assistantText || parsed.text || rawContent,
      responseType: parsed.responseType || "reflection",
      exerciseOptions: parsed.exerciseOptions || null,
      snapshotNeeded: parsed.snapshotNeeded || false,
      safetyOverride: parsed.safetyOverride || false,
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("mentor-chat error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
