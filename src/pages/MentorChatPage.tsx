import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, Send, Mic, BookOpen, ChevronRight, Play } from "lucide-react";
import { toast } from "sonner";
import {
  MentorSessionState,
  MentorStep,
  createInitialState,
  advanceState,
  postAIAdvance,
  isSimilar,
  AUTO_ADVANCE_STEPS,
  BUTTON_REQUIRED_STEPS,
  STEP_FALLBACKS,
} from "@/lib/mentorSessionState";
import { SAFETY_RESPONSE } from "@/lib/safety";
import { callMentor, MentorResponse } from "@/services/mentorService";
import { analytics } from "@/services/analyticsService";

type Message = {
  id: string;
  role: "mentor" | "user";
  content: string;
  actions?: ChatAction[];
};

type ChatAction = {
  label: string;
  action: string;
  icon?: string;
};

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

// Analytics event mapping per step
const STEP_ANALYTICS: Partial<Record<MentorStep, string>> = {
  awaiting_emotion: "emotion_selected",
  awaiting_body_location: "body_location_selected",
  awaiting_intensity: "intensity_recorded",
  awaiting_trigger: "trigger_entered",
  awaiting_mirror_confirmation: "mirror_confirmed",
  awaiting_emotion_label: "emotion_label_confirmed",
  awaiting_exercise_choice: "exercise_selected",
  integration_acknowledge: "integration_phase_started",
  integration_journal_invite: "journal_prompt_shown",
};

/**
 * Build action buttons for the current step.
 */
function getActionsForStep(step: MentorStep, state: MentorSessionState): ChatAction[] | undefined {
  switch (step) {
    case "integration_journal_invite":
      return [
        { label: "Write in journal", action: "journal", icon: "book" },
        { label: "Maybe later", action: "skip_journal" },
      ];
    case "return_to_options":
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

/**
 * Check if the AI response contains a question or is acceptable for the current step.
 * If the step requires a question/buttons and the AI gave a reflective-only response, return false.
 */
function responseHasNextAction(text: string, step: MentorStep): boolean {
  // Auto-advance steps don't need a question
  if (AUTO_ADVANCE_STEPS.includes(step)) return true;
  // Button steps are handled by the UI, text just needs to exist
  if (BUTTON_REQUIRED_STEPS.includes(step)) return true;
  // For question steps, check that the text ends with a question or contains "?"
  if (text.includes("?")) return true;
  // Accept if it's clearly a closing/acknowledgment step
  if (["completed", "safety_override"].includes(step)) return true;
  return false;
}

const MentorChatPage = () => {
  const { entryPath } = useParams<{ entryPath: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const path = entryPath || "understand";

  const [sessionState, setSessionState] = useState<MentorSessionState>(
    createInitialState(path)
  );
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "greeting",
      role: "mentor",
      content: entryGreetings[path] || entryGreetings.understand,
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [exerciseActive, setExerciseActive] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const autoAdvanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  useEffect(() => {
    analytics.track("ei_mentor_opened", { entry_path: path });
  }, [path]);

  // Handle return from exercise player
  useEffect(() => {
    const exerciseCompleted = searchParams.get("exerciseCompleted");
    if (exerciseCompleted === "true") {
      // Clear the param
      setSearchParams({}, { replace: true });
      setExerciseActive(false);

      // Advance state to post_practice_check
      setSessionState(prev => ({
        ...prev,
        current_step: "exercise_completed_return",
      }));

      // Add a return message and trigger post-practice check
      const returnMsg: Message = {
        id: Date.now().toString(),
        role: "mentor",
        content: "Welcome back. How does the emotion feel now? You can say much better, slightly better, about the same, or worse — or give a number 1-10.",
      };
      setMessages(prev => [...prev, returnMsg]);
      setSessionState(prev => ({ ...prev, current_step: "post_practice_check" }));
    }
  }, [searchParams, setSearchParams]);

  // Auto-advance for integration steps that don't require user input
  useEffect(() => {
    if (AUTO_ADVANCE_STEPS.includes(sessionState.current_step) && !isLoading) {
      autoAdvanceTimerRef.current = setTimeout(() => {
        const nextState = advanceState(sessionState, "__auto__");
        setSessionState(nextState);
        getMentorResponse(messages, nextState);
      }, 2000);
    }
    return () => {
      if (autoAdvanceTimerRef.current) clearTimeout(autoAdvanceTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionState.current_step, isLoading]);

  const getMentorResponse = useCallback(
    async (allMessages: Message[], currentState: MentorSessionState) => {
      setIsLoading(true);

      // Safety override — don't call AI
      if (currentState.current_step === "safety_override") {
        const safetyMsg: Message = {
          id: Date.now().toString(),
          role: "mentor",
          content: SAFETY_RESPONSE,
        };
        setMessages(prev => [...prev, safetyMsg]);
        setIsLoading(false);
        return;
      }

      const apiMessages = allMessages.map(m => ({
        role: (m.role === "mentor" ? "assistant" : "user") as "user" | "assistant",
        content: m.content,
      }));

      try {
        const response: MentorResponse = await callMentor(apiMessages, currentState, path);

        // Safety override from AI
        if (response.safetyOverride) {
          const safetyMsg: Message = {
            id: Date.now().toString(),
            role: "mentor",
            content: SAFETY_RESPONSE,
          };
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

        // Transition completeness guard: if the AI output doesn't contain a next action, inject fallback
        if (!responseHasNextAction(text, currentState.current_step)) {
          const fallback = STEP_FALLBACKS[currentState.current_step];
          if (fallback) {
            text = text + "\n\n" + fallback;
          }
        }

        const actions = getActionsForStep(currentState.current_step, currentState);

        const mentorMsg: Message = {
          id: Date.now().toString(),
          role: "mentor",
          content: text,
          actions,
        };
        setMessages(prev => [...prev, mentorMsg]);

        // Track exercise recommendations
        if (response.exerciseOptions && response.exerciseOptions.length > 0) {
          analytics.track("exercise_recommendations_shown", {
            entry_path: path,
            attempt_number: currentState.attempt_number,
          });
        }

        // Post-AI state advance (exercise_offer → awaiting_choice)
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
      // Advance state before navigating
      const newState = advanceState(sessionState, "journal");
      setSessionState(newState);
      navigate("/app/journal");
      return;
    }
    if (action === "skip_journal") {
      const newState = advanceState(sessionState, "maybe later");
      setSessionState(newState);
      const userMsg: Message = { id: Date.now().toString(), role: "user", content: "Maybe later" };
      const newMessages = [...messages, userMsg];
      setMessages(newMessages);
      getMentorResponse(newMessages, newState);
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

      analytics.track("exercise_selected", { exercise: selected, entry_path: path });

      // Update state
      const newState: MentorSessionState = {
        ...sessionState,
        selected_exercise: selected,
        current_step: "exercise_launch_pending",
      };
      setSessionState(newState);
      setExerciseActive(true);

      // Add user message
      const userMsg: Message = { id: Date.now().toString(), role: "user", content: selected };
      setMessages(prev => [...prev, userMsg]);

      // Navigate to exercise player
      const returnTo = `/app/mentor/${path}`;
      navigate(`/app/exercise?exercise=${encodeURIComponent(selected)}&returnTo=${encodeURIComponent(returnTo)}`);
      return;
    }
  }, [sessionState, messages, navigate, path, getMentorResponse]);

  const handleSend = useCallback(() => {
    if (!input.trim() || isLoading || exerciseActive) return;
    const userText = input.trim();
    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: userText,
    };

    // Track analytics for current step
    const step = sessionState.current_step;
    const analyticsEvent = STEP_ANALYTICS[step];
    if (analyticsEvent) {
      analytics.track(analyticsEvent as any, { entry_path: path });
    }

    // Advance state BEFORE calling AI
    const newState = advanceState(sessionState, userText);
    setSessionState(newState);

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");

    // If new step is exercise_launch_pending from text input, launch exercise
    if (newState.current_step === "exercise_launch_pending" && newState.selected_exercise) {
      setExerciseActive(true);
      const returnTo = `/app/mentor/${path}`;
      navigate(`/app/exercise?exercise=${encodeURIComponent(newState.selected_exercise)}&returnTo=${encodeURIComponent(returnTo)}`);
      return;
    }

    // Get structured AI response with updated state
    getMentorResponse(newMessages, newState);
  }, [input, isLoading, exerciseActive, sessionState, messages, getMentorResponse, path, navigate]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const isTerminal = sessionState.current_step === "completed" || sessionState.current_step === "safety_override";
  const inputDisabled = isTerminal || exerciseActive || BUTTON_REQUIRED_STEPS.includes(sessionState.current_step);

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
          <p className="font-semibold text-sm text-foreground">
            {entryTitles[path]}
          </p>
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

              {/* Action buttons */}
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
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex justify-start"
          >
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
              ref={inputRef}
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
