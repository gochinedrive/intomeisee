import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, Send, Mic, BookOpen, ChevronRight, Play } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { MentorStep, MentorSessionState, ChatMessage, ChatAction } from "@/types/mentor";
import {
  createInitialState,
  advanceState,
  postAIAdvance,
  isSimilar,
  AUTO_ADVANCE_STEPS,
  BUTTON_REQUIRED_STEPS,
  STEP_FALLBACKS,
} from "@/lib/mentorSessionState";
import { SAFETY_RESPONSE } from "@/lib/safety";
import { callMentor, type MentorResponse } from "@/services/mentorService";
import { analytics } from "@/services/analyticsService";

const entryGreetings: Record<string, string> = {
  understand:
    "I'm glad you're here. Take a moment, and tell me — what emotion feels strongest for you right now? There's no right answer. Just share whatever comes up.",
  regulate:
    "Let's help you feel a bit more settled. What emotion or sensation is most present for you right now? Or if you'd prefer, just tell me: are you feeling activated and tense, or heavy and low?",
  prepare:
    "Preparing for a hard conversation takes courage. What kind of conversation would you like support with?\n\n• Setting a boundary\n• Responding to criticism\n• Asking for a need\n• Apologizing\n• Expressing hurt\n• Repairing conflict",
};

const entryTitles: Record<string, string> = {
  understand: "Understand how I feel",
  regulate: "Regulate my emotions",
  prepare: "Hard conversation",
};

const STEP_ANALYTICS: Partial<Record<MentorStep, string>> = {
  awaiting_emotion: "emotion_selected",
  awaiting_body_location: "body_location_selected",
  awaiting_intensity: "intensity_recorded",
  awaiting_trigger_context: "trigger_entered",
  awaiting_mirror_confirmation: "mirror_confirmed",
  awaiting_emotion_label_confirmation: "emotion_label_confirmed",
  awaiting_exercise_choice: "exercise_selected",
  integration_acknowledgement: "integration_phase_started",
  integration_journal_invite: "journal_prompt_shown",
};

function getActionsForStep(step: MentorStep, state: MentorSessionState): ChatAction[] | undefined {
  switch (step) {
    case "integration_journal_invite":
      return [
        { label: "Write in journal", action: "journal", icon: "book" },
        { label: "Maybe later", action: "skip_journal" },
      ];
    case "integration_return_to_home":
      return [
        { label: "Understand how I feel", action: "understand" },
        { label: "Regulate my emotions", action: "regulate" },
        { label: "Prepare for a hard conversation", action: "prepare" },
      ];
    case "ready_for_exercise_offer":
    case "awaiting_exercise_choice": {
      const exercises = state.exercise_options_shown || [];
      return exercises.map((ex, i) => ({
        label: `${i + 1}. ${ex}`,
        action: `exercise_${i}`,
        icon: "play",
      }));
    }
    default:
      return undefined;
  }
}

function responseHasNextAction(text: string, step: MentorStep): boolean {
  if (AUTO_ADVANCE_STEPS.includes(step)) return true;
  if (BUTTON_REQUIRED_STEPS.includes(step)) return true;
  if (text.includes("?")) return true;
  if (["completed", "safety_override"].includes(step)) return true;
  return false;
}

// ---------- DB persistence helpers ----------

async function getAuthUserId(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user?.id || null;
}

async function createSessionInDB(state: MentorSessionState, userId: string): Promise<string> {
  const { data, error } = await supabase
    .from("mentor_sessions")
    .insert({
      user_id: userId,
      entry_path: state.entry_path,
      current_step: state.current_step,
      attempt_number: state.attempt_number,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

async function updateSessionInDB(sessionId: string, state: MentorSessionState) {
  await supabase
    .from("mentor_sessions")
    .update({
      current_step: state.current_step,
      emotion: state.emotion,
      body_location: state.body_location,
      pre_intensity: state.pre_intensity,
      trigger_text: state.trigger_text,
      exercise_options_shown: state.exercise_options_shown,
      selected_exercise: state.selected_exercise,
      attempt_number: state.attempt_number,
      post_intensity: state.post_intensity,
      mirror_used: state.mirror_used,
      mirror_confirmed: state.mirror_confirmed,
      emotion_label_suggested: state.emotion_label_suggested,
      emotion_label_confirmed: state.emotion_label_confirmed,
      safety_override_state: state.safety_override_state,
      improvement_choice: state.improvement_choice,
    })
    .eq("id", sessionId);
}

async function loadSessionFromDB(sessionId: string): Promise<MentorSessionState | null> {
  const { data, error } = await supabase
    .from("mentor_sessions")
    .select("*")
    .eq("id", sessionId)
    .single();
  if (error || !data) return null;
  return {
    session_id: data.id,
    user_id: data.user_id,
    entry_path: data.entry_path as MentorSessionState["entry_path"],
    current_step: data.current_step as MentorStep,
    emotion: data.emotion,
    body_location: data.body_location,
    pre_intensity: data.pre_intensity,
    trigger_text: (data as any).trigger_text || null,
    exercise_options_shown: data.exercise_options_shown,
    selected_exercise: data.selected_exercise,
    attempt_number: data.attempt_number,
    post_intensity: data.post_intensity,
    mirror_used: data.mirror_used,
    mirror_confirmed: data.mirror_confirmed,
    emotion_label_suggested: data.emotion_label_suggested,
    emotion_label_confirmed: data.emotion_label_confirmed,
    safety_override_state: data.safety_override_state,
    improvement_choice: data.improvement_choice,
    status: data.completed_at ? "completed" : "active",
    pattern_reflection: null,
  };
}

async function loadMessagesFromDB(sessionId: string): Promise<ChatMessage[]> {
  const { data, error } = await supabase
    .from("mentor_messages")
    .select("*")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });
  if (error || !data) return [];
  return data.map((m) => ({
    id: m.id,
    role: m.role === "assistant" ? "mentor" : "user",
    content: m.content,
    step_at_time: m.step_at_time || undefined,
  }));
}

async function saveMessageToDB(
  sessionId: string,
  userId: string,
  role: "user" | "assistant",
  content: string,
  step: string
) {
  await supabase.from("mentor_messages").insert({
    session_id: sessionId,
    user_id: userId,
    role,
    content,
    step_at_time: step,
  });
}

// ---------- Guest persistence helpers ----------

const GUEST_SESSION_KEY = "intomeisee_guest_session";
const GUEST_MESSAGES_KEY = "intomeisee_guest_messages";

function generateGuestSessionId(): string {
  return "guest_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8);
}

function saveGuestSession(state: MentorSessionState, msgs: ChatMessage[]) {
  try {
    sessionStorage.setItem(GUEST_SESSION_KEY, JSON.stringify(state));
    sessionStorage.setItem(GUEST_MESSAGES_KEY, JSON.stringify(msgs));
  } catch (e) {
    console.warn("Failed to save guest session:", e);
  }
}

function loadGuestSession(): { state: MentorSessionState; messages: ChatMessage[] } | null {
  try {
    const stateStr = sessionStorage.getItem(GUEST_SESSION_KEY);
    const msgsStr = sessionStorage.getItem(GUEST_MESSAGES_KEY);
    if (!stateStr || !msgsStr) return null;
    return { state: JSON.parse(stateStr), messages: JSON.parse(msgsStr) };
  } catch {
    return null;
  }
}

function clearGuestSession() {
  sessionStorage.removeItem(GUEST_SESSION_KEY);
  sessionStorage.removeItem(GUEST_MESSAGES_KEY);
}

// ---------- Component ----------

const MentorChatPage = () => {
  const { entryPath } = useParams<{ entryPath: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const path = entryPath || "understand";

  const [sessionState, setSessionState] = useState<MentorSessionState>(createInitialState(path));
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const prevPathRef = useRef(path);
  const bottomRef = useRef<HTMLDivElement>(null);
  const autoAdvanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // Initialize session: resume from DB or create new
  // Re-runs when entryPath or sessionId changes (e.g. switching flows)
  const urlSessionId = searchParams.get("sessionId");
  useEffect(() => {
    let cancelled = false;

    // Detect if this is a flow switch (entryPath changed, not an exercise return)
    const isFlowSwitch = prevPathRef.current !== path;
    prevPathRef.current = path;

    if (isFlowSwitch) {
      // Reset all local state immediately for the new flow
      console.log("[MentorChat] Flow switch detected:", path);
      setInitialized(false);
      setMessages([]);
      setInput("");
      setIsLoading(false);
      clearGuestSession();
    }

    const init = async () => {
      const sessionId = urlSessionId;
      const exerciseCompleted = searchParams.get("exerciseCompleted") === "true";
      const userId = await getAuthUserId();

      console.log("[MentorChat] Init running", { path, sessionId, isFlowSwitch, exerciseCompleted, isAuth: !!userId });

      // If this is a flow switch, ignore any stale sessionId from the previous flow
      if (isFlowSwitch && sessionId) {
        // Clear the old sessionId from URL — we'll create a new session
        setSearchParams({}, { replace: true });
      }

      // Resume existing session ONLY if not a flow switch
      if (sessionId && !isFlowSwitch) {
        console.log("[MentorChat] Resuming session:", sessionId);
        const loaded = await loadSessionFromDB(sessionId);
        const loadedMsgs = await loadMessagesFromDB(sessionId);

        if (!cancelled && loaded) {
          if (exerciseCompleted) {
            loaded.current_step = "post_practice_check";
            if (userId) await updateSessionInDB(sessionId, loaded);
          }

          setSessionState(loaded);
          
          if (loadedMsgs.length > 0) {
            setMessages(loadedMsgs);
            if (exerciseCompleted) {
              const returnMsg: ChatMessage = {
                id: Date.now().toString(),
                role: "mentor",
                content: "Welcome back. How does the emotion feel now? You can say much better, slightly better, about the same, or worse — or give a number 1-10.",
              };
              setMessages(prev => [...prev, returnMsg]);
              if (userId) {
                await saveMessageToDB(sessionId, userId, "assistant", returnMsg.content, "post_practice_check");
              }
            }
          } else {
            const greeting: ChatMessage = {
              id: "greeting",
              role: "mentor",
              content: entryGreetings[loaded.entry_path] || entryGreetings.understand,
            };
            setMessages([greeting]);
          }

          if (exerciseCompleted) {
            setSearchParams({ sessionId }, { replace: true });
          }
          setInitialized(true);
          return;
        }
      }

      // Create new session
      console.log("[MentorChat] Creating new session for:", path);
      const greeting: ChatMessage = {
        id: "greeting",
        role: "mentor",
        content: entryGreetings[path] || entryGreetings.understand,
      };

      if (userId) {
        try {
          const newState = createInitialState(path);
          const newSessionId = await createSessionInDB(newState, userId);
          newState.session_id = newSessionId;
          newState.user_id = userId;
          await saveMessageToDB(newSessionId, userId, "assistant", greeting.content, "awaiting_emotion");
          if (!cancelled) {
            console.log("[MentorChat] New DB session created:", newSessionId);
            setSessionState(newState);
            setMessages([greeting]);
            setSearchParams({ sessionId: newSessionId }, { replace: true });
          }
        } catch (e) {
          console.error("Failed to create session in DB:", e);
          if (!cancelled) {
            setSessionState(createInitialState(path));
            setMessages([greeting]);
          }
        }
      } else {
        // Guest mode — check for saved guest session (only if not a flow switch)
        const guestData = !isFlowSwitch ? loadGuestSession() : null;
        if (!cancelled && guestData && guestData.state.entry_path === path) {
          console.log("[MentorChat] Restoring guest session");
          const restored = guestData.state;
          const restoredMsgs = guestData.messages;

          if (exerciseCompleted) {
            restored.current_step = "post_practice_check";
            const returnMsg: ChatMessage = {
              id: Date.now().toString(),
              role: "mentor",
              content: "Welcome back. How does the emotion feel now? You can say much better, slightly better, about the same, or worse — or give a number 1-10.",
            };
            restoredMsgs.push(returnMsg);
          }

          setSessionState(restored);
          setMessages(restoredMsgs);
          if (exerciseCompleted) {
            const guestSid = restored.session_id || "";
            setSearchParams(guestSid ? { sessionId: guestSid } : {}, { replace: true });
          }
        } else if (!cancelled) {
          console.log("[MentorChat] New guest session for:", path);
          const newState = createInitialState(path);
          newState.session_id = generateGuestSessionId();
          clearGuestSession();
          setSessionState(newState);
          setMessages([greeting]);
          saveGuestSession(newState, [greeting]);
        }
      }
      if (!cancelled) setInitialized(true);
    };

    init();
    analytics.track("ei_mentor_opened", { entry_path: path });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, urlSessionId]);

  // Guest auto-save: persist to sessionStorage whenever state or messages change
  useEffect(() => {
    if (!initialized) return;
    // Only save for guest users (no user_id means guest)
    if (!sessionState.user_id && messages.length > 0) {
      saveGuestSession(sessionState, messages);
    }
  }, [sessionState, messages, initialized]);

  // Auto-advance for integration steps that don't require user input
  useEffect(() => {
    if (!initialized) return;
    if (AUTO_ADVANCE_STEPS.includes(sessionState.current_step) && !isLoading) {
      autoAdvanceTimerRef.current = setTimeout(() => {
        const nextState = advanceState(sessionState, "__auto__");
        setSessionState(nextState);
        persistStateAndGetResponse(messages, nextState);
      }, 2500);
    }
    return () => {
      if (autoAdvanceTimerRef.current) clearTimeout(autoAdvanceTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionState.current_step, isLoading, initialized]);

  const persistStateAndGetResponse = useCallback(
    async (allMessages: ChatMessage[], currentState: MentorSessionState) => {
      // Persist state to DB (authenticated) or localStorage (guest)
      if (currentState.session_id && currentState.user_id) {
        updateSessionInDB(currentState.session_id, currentState).catch(console.error);
      } else {
        saveGuestSession(currentState, allMessages);
      }
      await getMentorResponse(allMessages, currentState);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [path]
  );

  const getMentorResponse = useCallback(
    async (allMessages: ChatMessage[], currentState: MentorSessionState) => {
      setIsLoading(true);

      // Safety override — don't call AI
      if (currentState.current_step === "safety_override") {
        const safetyMsg: ChatMessage = {
          id: Date.now().toString(),
          role: "mentor",
          content: SAFETY_RESPONSE,
        };
        setMessages(prev => [...prev, safetyMsg]);
        if (currentState.session_id && currentState.user_id) {
          saveMessageToDB(currentState.session_id, currentState.user_id, "assistant", SAFETY_RESPONSE, "safety_override").catch(console.error);
        }
        setIsLoading(false);
        return;
      }

      const apiMessages = allMessages.map(m => ({
        role: (m.role === "mentor" ? "assistant" : "user") as "user" | "assistant",
        content: m.content,
      }));

      try {
        const response: MentorResponse = await callMentor(apiMessages, currentState, path);

        if (response.safetyOverride) {
          const safetyMsg: ChatMessage = { id: Date.now().toString(), role: "mentor", content: SAFETY_RESPONSE };
          setMessages(prev => [...prev, safetyMsg]);
          setSessionState(prev => ({ ...prev, current_step: "safety_override", safety_override_state: "triggered" }));
          setIsLoading(false);
          return;
        }

        let text = response.assistantText;

        // Duplicate-question guard
        const prevMentorMessages = allMessages.filter(m => m.role === "mentor");
        const lastMentorMsg = prevMentorMessages[prevMentorMessages.length - 1];
        if (lastMentorMsg && isSimilar(text, lastMentorMsg.content)) {
          console.warn("Duplicate question detected, using fallback");
          text = STEP_FALLBACKS[currentState.current_step] || text;
        }

        // Transition completeness guard
        if (!responseHasNextAction(text, currentState.current_step)) {
          const fallback = STEP_FALLBACKS[currentState.current_step];
          if (fallback) text = text + "\n\n" + fallback;
        }

        const actions = getActionsForStep(currentState.current_step, currentState);

        const mentorMsg: ChatMessage = {
          id: Date.now().toString(),
          role: "mentor",
          content: text,
          actions,
          step_at_time: currentState.current_step,
        };
        setMessages(prev => [...prev, mentorMsg]);

        // Save to DB
        if (currentState.session_id && currentState.user_id) {
          saveMessageToDB(currentState.session_id, currentState.user_id, "assistant", text, currentState.current_step).catch(console.error);
        }

        if (response.exerciseOptions && response.exerciseOptions.length > 0) {
          analytics.track("exercise_recommendations_shown", {
            entry_path: path,
            attempt_number: currentState.attempt_number,
          });
        }

        const nextState = postAIAdvance(currentState);
        setSessionState(nextState);
      } catch (e) {
        console.error("Mentor error:", e);
        toast.error(e instanceof Error ? e.message : "Connection error. Please try again.");
      } finally {
        setIsLoading(false);
      }
    },
    [path]
  );

  const handleActionClick = useCallback((action: string) => {
    if (action === "journal") {
      analytics.track("journal_prompt_shown", { entry_path: path });
      const newState = advanceState(sessionState, "journal");
      setSessionState(newState);
      if (newState.session_id && newState.user_id) {
        updateSessionInDB(newState.session_id, newState).catch(console.error);
      }
      navigate("/app/journal?fromMentor=true");
      return;
    }
    if (action === "skip_journal") {
      const newState = advanceState(sessionState, "maybe later");
      setSessionState(newState);
      const userMsg: ChatMessage = { id: Date.now().toString(), role: "user", content: "Maybe later" };
      const newMessages = [...messages, userMsg];
      setMessages(newMessages);
      if (newState.session_id && newState.user_id) {
        saveMessageToDB(newState.session_id, newState.user_id, "user", "Maybe later", sessionState.current_step).catch(console.error);
      }
      persistStateAndGetResponse(newMessages, newState);
      return;
    }
    if (["understand", "regulate", "prepare"].includes(action)) {
      analytics.track("mentor_navigation_returned", { entry_path: action });
      navigate(`/app/mentor/${action}`);
      return;
    }
    // Exercise selection
    if (action.startsWith("exercise_")) {
      const idx = parseInt(action.replace("exercise_", ""), 10);
      const exercises = sessionState.exercise_options_shown || [];
      const selected = exercises[idx];
      if (!selected) return;

      analytics.track("exercise_selected", { exercise_name: selected, entry_path: path });

      const newState: MentorSessionState = {
        ...sessionState,
        selected_exercise: selected,
        current_step: "exercise_in_progress",
      };
      setSessionState(newState);

      // Save user selection message
      const userMsg: ChatMessage = { id: Date.now().toString(), role: "user", content: selected };
      setMessages(prev => [...prev, userMsg]);

      if (newState.session_id && newState.user_id) {
        saveMessageToDB(newState.session_id, newState.user_id, "user", selected, "awaiting_exercise_choice").catch(console.error);
        updateSessionInDB(newState.session_id, newState).catch(console.error);
      } else {
        // Guest mode: save full state + messages to sessionStorage before navigating away
        const allMsgs = [...messages, userMsg];
        saveGuestSession(newState, allMsgs);
      }

      // Navigate to exercise player with sessionId
      navigate(`/app/exercise?exercise=${encodeURIComponent(selected)}&sessionId=${newState.session_id || ""}&entryPath=${path}`);
      return;
    }
  }, [sessionState, messages, navigate, path, persistStateAndGetResponse]);

  const handleSend = useCallback(() => {
    if (!input.trim() || isLoading) return;
    if (BUTTON_REQUIRED_STEPS.includes(sessionState.current_step)) return;

    const userText = input.trim();
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: userText,
      step_at_time: sessionState.current_step,
    };

    const analyticsEvent = STEP_ANALYTICS[sessionState.current_step];
    if (analyticsEvent) {
      analytics.track(analyticsEvent as any, { entry_path: path });
    }

    const newState = advanceState(sessionState, userText);
    setSessionState(newState);

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");

    // Save user message to DB
    if (sessionState.session_id && sessionState.user_id) {
      saveMessageToDB(sessionState.session_id, sessionState.user_id, "user", userText, sessionState.current_step).catch(console.error);
    }

    // If exercise launch from text input
    if (newState.current_step === "exercise_launch_pending" && newState.selected_exercise) {
      navigate(`/app/exercise?exercise=${encodeURIComponent(newState.selected_exercise)}&sessionId=${newState.session_id || ""}&entryPath=${path}`);
      return;
    }

    persistStateAndGetResponse(newMessages, newState);
  }, [input, isLoading, sessionState, messages, persistStateAndGetResponse, path, navigate]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const isTerminal = sessionState.current_step === "completed" || sessionState.current_step === "safety_override";
  const inputDisabled = isTerminal || BUTTON_REQUIRED_STEPS.includes(sessionState.current_step);

  if (!initialized) {
    return (
      <div className="flex flex-col h-screen bg-background items-center justify-center">
        <div className="flex gap-1.5">
          {[0, 1, 2].map(i => (
            <motion.div
              key={i}
              className="w-2.5 h-2.5 rounded-full bg-primary/40"
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
            />
          ))}
        </div>
        <p className="text-sm text-muted-foreground mt-3">Loading session...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-card/90 backdrop-blur-md border-b border-border sticky top-0 z-10">
        <button
          onClick={() => navigate("/app")}
          className="p-1.5 rounded-lg hover:bg-muted transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <div>
          <p className="font-semibold text-sm text-foreground">{entryTitles[path]}</p>
          <p className="text-xs text-muted-foreground">EI Mentor</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        <AnimatePresence initial={false}>
          {messages.map(msg => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}
            >
              <div
                className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                  msg.role === "mentor"
                    ? "bg-secondary text-secondary-foreground rounded-tl-md"
                    : "bg-primary text-primary-foreground rounded-tr-md"
                }`}
              >
                {msg.content}
              </div>

              {msg.actions && msg.actions.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2 max-w-[85%]">
                  {msg.actions.map((act) => (
                    <button
                      key={act.action}
                      onClick={() => handleActionClick(act.action)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-accent text-accent-foreground hover:bg-accent/80 transition-colors"
                    >
                      {act.icon === "book" && <BookOpen className="w-3.5 h-3.5" />}
                      {act.icon === "play" && <Play className="w-3.5 h-3.5" />}
                      {act.label}
                      {["understand", "regulate", "prepare"].includes(act.action) && (
                        <ChevronRight className="w-3 h-3" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {isLoading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
            <div className="px-4 py-3 rounded-2xl rounded-tl-md bg-secondary">
              <div className="flex gap-1.5">
                {[0, 1, 2].map(i => (
                  <motion.div
                    key={i}
                    className="w-2 h-2 rounded-full bg-muted-foreground/40"
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 pb-4 pt-2 bg-card/90 backdrop-blur-md border-t border-border safe-bottom">
        <div className="flex items-end gap-2 max-w-lg mx-auto">
          <button className="p-2.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
            <Mic className="w-5 h-5" />
          </button>
          <div className="flex-1 relative">
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                inputDisabled
                  ? BUTTON_REQUIRED_STEPS.includes(sessionState.current_step)
                    ? "Choose an option above"
                    : "Session complete"
                  : "Share what's on your mind..."
              }
              rows={1}
              disabled={inputDisabled}
              className="w-full resize-none rounded-xl border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground/60 disabled:opacity-50"
              style={{ maxHeight: "120px" }}
            />
          </div>
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading || inputDisabled}
            className="p-2.5 rounded-xl bg-primary text-primary-foreground disabled:opacity-40 transition-all active:scale-95"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default MentorChatPage;
