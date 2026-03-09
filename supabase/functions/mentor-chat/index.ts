import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function buildSystemPrompt(state: any, entryPath: string): string {
  const captured: string[] = [];
  const missing: string[] = [];

  if (state.emotion) captured.push(`emotion: "${state.emotion}"`);
  else missing.push("emotion");

  if (state.body_location) captured.push(`body location: "${state.body_location}"`);
  else if (!["awaiting_emotion"].includes(state.current_step)) missing.push("body location");

  if (state.pre_intensity != null) captured.push(`intensity: ${state.pre_intensity}/10`);

  if (state.trigger_text) captured.push(`trigger: "${state.trigger_text}"`);

  if (state.mirror_confirmed != null) captured.push(`mirror confirmed: ${state.mirror_confirmed}`);

  if (state.emotion_label_confirmed != null) captured.push(`emotion label confirmed: ${state.emotion_label_confirmed}`);

  if (state.post_intensity != null) captured.push(`post intensity: ${state.post_intensity}/10`);

  const exercises = state.exercise_options_shown
    ? `Exercise options: ${state.exercise_options_shown.join(", ")}`
    : "";

  const stepInstructions: Record<string, string> = {
    awaiting_emotion: `Ask what emotion feels strongest right now. Be warm and curious. If "regulate" path, offer quick options like "activated and tense" or "heavy and low". End with a question.`,
    awaiting_body_location: `The user shared emotion "${state.emotion}". Validate briefly (1 sentence). Ask ONE question: "Where do you feel this in your body?" Do NOT repeat the emotion question. MUST end with a question.`,
    awaiting_intensity: `Acknowledge emotion "${state.emotion}" in body "${state.body_location}" briefly. Ask: "On a scale of 1 to 10, how strong does this emotion feel right now?" MUST end with this question.`,
    awaiting_trigger: `Briefly acknowledge the intensity. Ask: "What happened just before you felt this emotion?" MUST end with this question.`,
    awaiting_mirror_confirmation: `Reflect back what the user shared. Say: "What I'm hearing is that you felt ${state.emotion} mostly in your ${state.body_location}, about ${state.pre_intensity || "moderate"} intensity, after ${state.trigger_text || "what you described"}. Did I understand that correctly?" MUST end with a yes/no question.`,
    awaiting_emotion_label: `The user confirmed your understanding. Gently explore the emotion label. Say something like: "Sometimes ${state.emotion} can also carry feelings like hurt or feeling dismissed. Does it feel closer to ${state.emotion}, or something else?" MUST end with a question.`,
    ready_for_exercise_offer: `Present exactly 3 exercises: ${exercises}. Say "Based on what you're experiencing, here are three practices:" then list them numbered 1-3 with brief descriptions. The user will choose via buttons. Keep it brief.`,
    awaiting_exercise_choice: `Exercises were offered: ${(state.exercise_options_shown || []).join(", ")}. Gently encourage the user to pick one from the options shown. MUST end with a question.`,
    post_practice_check: `User completed "${state.selected_exercise}". Ask: "How does the emotion feel now?" Offer: much better, slightly better, about the same, worse, or a number 1-10. MUST end with a question.`,
    awaiting_user_directed_support: `After ${state.attempt_number} attempts, ask: "What do you feel might help you most right now?" Support safe suggestions. MUST end with a question.`,
    integration_acknowledge: `Acknowledge the user's effort warmly. Say something like: "You paused and worked with the feeling instead of reacting automatically. That takes real awareness." Keep it brief and genuine. This is a statement, no question needed.`,
    integration_reconstruct: `Reconstruct the emotional sequence: "You described feeling ${state.emotion} in your ${state.body_location} after ${state.trigger_text || "what happened"}. After the practice, the intensity shifted from ${state.pre_intensity || "?"} to ${state.post_intensity || "?"}." End with: "Does that capture the journey?"`,
    integration_reconstruct_confirm: `The user confirmed the reconstruction. Briefly acknowledge. This is a transition statement. Keep it to one sentence.`,
    integration_psychoeducation: `Share brief psychoeducation: "When something feels threatening or unfair, a small part of the brain called the amygdala reacts quickly — preparing the body to protect itself. This can show up as fight (pushing back), flight (wanting to escape), freeze (feeling stuck), or fawn (appeasing). The sensations you noticed in your ${state.body_location || "body"} were part of that protective response. The practice you did helps signal to the nervous system that it's safe to settle again." Keep it conversational, not clinical. This is a statement.`,
    integration_meaning: `Ask gently: "What do you think this feeling might have been trying to tell you?" Do NOT interpret for the user. MUST end with a question.`,
    integration_body_check: `Ask: "How does your body feel now compared to before?" Be curious about the shift. MUST end with a question.`,
    integration_journal_invite: `Suggest journaling warmly: "Moments like this can be helpful to capture while they're fresh. Over time, journaling can reveal patterns in what triggers certain emotions and what helps regulate them." The user will see buttons for "Write in journal" and "Maybe later". Do NOT add your own buttons.`,
    return_to_options: `Warm closing. Say: "I hope you carry this lighter feeling into the rest of your day." Then say: "What would you like to explore next?" The user will see navigation buttons. Do NOT list the options yourself.`,
    safety_override: `Respond with deep empathy. Acknowledge pain. Provide: 988 Suicide & Crisis Lifeline (call/text 988), Crisis Text Line (text HOME to 741741), Samaritans (116 123). Do NOT continue normal flow.`,
    completed: `Warm closing. Acknowledge their effort. Brief reflection on progress.`,
  };

  const currentInstruction = stepInstructions[state.current_step] || stepInstructions.awaiting_emotion;

  let patternNote = "";
  if (state.pattern_reflection) {
    patternNote = `\nPATTERN INSIGHT (share naturally, max one sentence): ${state.pattern_reflection}`;
  }

  return `You are the EI Mentor for IntoMeISee — an emotionally intelligent, warm, compassionate guide.

PERSONALITY: Warm, calm, compassionate, curious, wise, non-judgmental. Like a loving coach.

CRITICAL RULES:
- Never diagnose or provide therapy/medical advice
- Never tell user what they must do
- Never shame or pressure
- Never fabricate memory or facts
- If self-harm mentioned, respond with empathy and crisis support only
- NEVER ask for information already captured
- Follow the step instruction PRECISELY
- EVERY response that requires user input MUST end with a clear question mark
- Do NOT add button/option lists — the UI handles those

ENTRY PATH: "${entryPath}"
${entryPath === "understand" ? "Follow the full Flow A sequence with trigger, mirror, label, and integration." : ""}
${entryPath === "regulate" ? "Move quickly to exercises after emotion + body location." : ""}

SESSION STATE:
- current_step: ${state.current_step}
- Captured: ${captured.length > 0 ? captured.join("; ") : "none"}
- Needed: ${missing.length > 0 ? missing.join("; ") : "none"}
- Attempt: ${state.attempt_number || 1}
${patternNote}

INSTRUCTION FOR THIS TURN:
${currentInstruction}

Keep responses 2-4 sentences max.

You MUST respond with valid JSON only. No markdown, no extra text. Use this exact structure:
{
  "assistantText": "your response text here",
  "responseType": "reflection|question|exercise_offer|check_in|safety|closing|psychoeducation|mirror|journal_invite",
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
      parsed = {
        assistantText: rawContent,
        responseType: "reflection",
        exerciseOptions: null,
        snapshotNeeded: false,
        safetyOverride: false,
      };
    }

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
