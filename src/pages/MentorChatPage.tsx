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
} from "@/lib/mentorSessionState";

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

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mentor-chat`;

function isSimilar(a: string, b: string): boolean {
  const normalize = (s: string) =>
    s.toLowerCase().replace(/[^a-z0-9 ]/g, "").trim();
  const na = normalize(a);
  const nb = normalize(b);
  if (na === nb) return true;
  // Check if >80% of words overlap
  const wordsA = new Set(na.split(/\s+/));
  const wordsB = new Set(nb.split(/\s+/));
  const overlap = [...wordsA].filter((w) => wordsB.has(w)).length;
  const total = Math.max(wordsA.size, wordsB.size);
  return total > 0 && overlap / total > 0.8;
}

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
  const [isTyping, setIsTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const streamMentorResponse = useCallback(
    async (
      allMessages: Message[],
      currentState: MentorSessionState
    ) => {
      setIsTyping(true);

      // Convert to API format
      const apiMessages = allMessages.map((m) => ({
        role: m.role === "mentor" ? "assistant" : "user",
        content: m.content,
      }));

      try {
        const resp = await fetch(CHAT_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            messages: apiMessages,
            sessionState: currentState,
            entryPath: path,
          }),
        });

        if (!resp.ok) {
          const errData = await resp.json().catch(() => ({}));
          toast.error(errData.error || "Something went wrong. Please try again.");
          setIsTyping(false);
          return;
        }

        if (!resp.body) {
          setIsTyping(false);
          return;
        }

        const reader = resp.body.getReader();
        const decoder = new TextDecoder();
        let textBuffer = "";
        let assistantSoFar = "";
        const mentorId = Date.now().toString();
        let streamDone = false;

        while (!streamDone) {
          const { done, value } = await reader.read();
          if (done) break;
          textBuffer += decoder.decode(value, { stream: true });

          let newlineIndex: number;
          while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
            let line = textBuffer.slice(0, newlineIndex);
            textBuffer = textBuffer.slice(newlineIndex + 1);

            if (line.endsWith("\r")) line = line.slice(0, -1);
            if (line.startsWith(":") || line.trim() === "") continue;
            if (!line.startsWith("data: ")) continue;

            const jsonStr = line.slice(6).trim();
            if (jsonStr === "[DONE]") {
              streamDone = true;
              break;
            }

            try {
              const parsed = JSON.parse(jsonStr);
              const content = parsed.choices?.[0]?.delta?.content as
                | string
                | undefined;
              if (content) {
                assistantSoFar += content;
                setMessages((prev) => {
                  const last = prev[prev.length - 1];
                  if (last?.id === mentorId) {
                    return prev.map((m) =>
                      m.id === mentorId
                        ? { ...m, content: assistantSoFar }
                        : m
                    );
                  }
                  return [
                    ...prev,
                    { id: mentorId, role: "mentor", content: assistantSoFar },
                  ];
                });
              }
            } catch {
              textBuffer = line + "\n" + textBuffer;
              break;
            }
          }
        }

        // Flush remaining buffer
        if (textBuffer.trim()) {
          for (let raw of textBuffer.split("\n")) {
            if (!raw) continue;
            if (raw.endsWith("\r")) raw = raw.slice(0, -1);
            if (raw.startsWith(":") || raw.trim() === "") continue;
            if (!raw.startsWith("data: ")) continue;
            const jsonStr = raw.slice(6).trim();
            if (jsonStr === "[DONE]") continue;
            try {
              const parsed = JSON.parse(jsonStr);
              const content = parsed.choices?.[0]?.delta?.content as string | undefined;
              if (content) {
                assistantSoFar += content;
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === mentorId ? { ...m, content: assistantSoFar } : m
                  )
                );
              }
            } catch {}
          }
        }

        // Duplicate-question guard: compare with previous mentor message
        const prevMentorMessages = allMessages.filter((m) => m.role === "mentor");
        const lastMentorMsg = prevMentorMessages[prevMentorMessages.length - 1];
        if (lastMentorMsg && isSimilar(assistantSoFar, lastMentorMsg.content)) {
          console.warn("Duplicate question detected, forcing state advancement");
          // Remove the duplicate and force next state
          setMessages((prev) => prev.filter((m) => m.id !== mentorId));
          const forcedState = { ...currentState };
          // Force advance past the current step
          if (forcedState.current_step === "awaiting_body_location") {
            forcedState.current_step = "ready_for_exercise_offer";
            forcedState.body_location = forcedState.body_location || "unspecified";
          } else if (forcedState.current_step === "awaiting_emotion") {
            forcedState.current_step = "awaiting_body_location";
            forcedState.emotion = forcedState.emotion || "unspecified";
          }
          setSessionState(forcedState);
          // Retry with forced state
          await streamMentorResponse(allMessages, forcedState);
          return;
        }

        // After AI responds, advance state (e.g., exercise_offer → awaiting_choice)
        const nextState = postAIAdvance(currentState);
        setSessionState(nextState);
      } catch (e) {
        console.error("Stream error:", e);
        toast.error("Connection error. Please try again.");
      } finally {
        setIsTyping(false);
      }
    },
    [path]
  );

  const handleSend = useCallback(() => {
    if (!input.trim() || isTyping) return;
    const userText = input.trim();
    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: userText,
    };

    // Advance state BEFORE calling AI
    const newState = advanceState(sessionState, userText);
    setSessionState(newState);

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");

    // Stream AI response with updated state
    streamMentorResponse(newMessages, newState);
  }, [input, isTyping, sessionState, messages, streamMentorResponse]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

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
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className={`flex ${
                msg.role === "user" ? "justify-end" : "justify-start"
              }`}
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

        {isTyping && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex justify-start"
          >
            <div className="px-4 py-3 rounded-2xl rounded-tl-md bg-secondary">
              <div className="flex gap-1.5">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    className="w-2 h-2 rounded-full bg-muted-foreground/40"
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{
                      duration: 1,
                      repeat: Infinity,
                      delay: i * 0.2,
                    }}
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
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Share what's on your mind..."
              rows={1}
              className="w-full resize-none rounded-xl border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground/60"
              style={{ maxHeight: "120px" }}
            />
          </div>
          <button
            onClick={handleSend}
            disabled={!input.trim() || isTyping}
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
