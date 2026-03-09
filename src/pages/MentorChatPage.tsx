import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Send, Mic } from "lucide-react";
import { toast } from "sonner";
import {
  MentorSessionState,
  createInitialState,
  advanceState,
  postAIAdvance,
  isSimilar,
} from "@/lib/mentorSessionState";
import { SAFETY_RESPONSE } from "@/lib/safety";
import { callMentor, MentorResponse } from "@/services/mentorService";
import { analytics } from "@/services/analyticsService";

type Message = {
  id: string;
  role: "mentor" | "user";
  content: string;
};

const entryGreetings: Record<string, string> = {
  understand:
    "I'm glad you're here. Take a moment, and tell me — what's present for you right now? There's no right answer. Just share whatever comes up.",
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

// Deterministic fallback responses when duplicate detected
const FALLBACK_RESPONSES: Record<string, string> = {
  awaiting_body_location: "Thank you for sharing that. Where do you notice this feeling in your body?",
  awaiting_intensity: "I hear you. On a scale of 1 to 10, how intense does this feel right now?",
  ready_for_exercise_offer: "Let me suggest some practices that might help.",
  post_practice_check: "How does the emotion feel now? You can say much better, slightly better, about the same, or worse — or give a number 1-10.",
  awaiting_user_directed_support: "We've tried a few approaches. What do you feel might help you most right now?",
  completed: "Thank you for spending this time with yourself. That takes real courage. 💛",
};

const MentorChatPage = () => {
  const { entryPath } = useParams<{ entryPath: string }>();
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
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  useEffect(() => {
    analytics.track("ei_mentor_opened", { entry_path: path });
  }, [path]);

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
          text = FALLBACK_RESPONSES[currentState.current_step] || text;
        }

        const mentorMsg: Message = {
          id: Date.now().toString(),
          role: "mentor",
          content: text,
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

  const handleSend = useCallback(() => {
    if (!input.trim() || isLoading) return;
    const userText = input.trim();
    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: userText,
    };

    // Track analytics for specific steps
    const step = sessionState.current_step;
    if (step === "awaiting_emotion") {
      analytics.track("emotion_selected", { entry_path: path });
    } else if (step === "awaiting_body_location") {
      analytics.track("body_location_selected", { entry_path: path });
    } else if (step === "awaiting_intensity") {
      analytics.track("intensity_recorded", { entry_path: path });
    } else if (step === "awaiting_exercise_choice") {
      analytics.track("exercise_selected", { entry_path: path });
    }

    // Advance state BEFORE calling AI
    const newState = advanceState(sessionState, userText);
    setSessionState(newState);

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");

    // Get structured AI response with updated state
    getMentorResponse(newMessages, newState);
  }, [input, isLoading, sessionState, messages, getMentorResponse, path]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const isCompleted = sessionState.current_step === "completed" || sessionState.current_step === "safety_override";

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
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
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
              placeholder={isCompleted ? "Session complete" : "Share what's on your mind..."}
              rows={1}
              disabled={isCompleted}
              className="w-full resize-none rounded-xl border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground/60 disabled:opacity-50"
              style={{ maxHeight: "120px" }}
            />
          </div>
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading || isCompleted}
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
