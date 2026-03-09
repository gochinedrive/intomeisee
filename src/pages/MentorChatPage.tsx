import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Send, Mic } from "lucide-react";

type Message = {
  id: string;
  role: "mentor" | "user";
  content: string;
};

const entryGreetings: Record<string, string> = {
  understand: "I'm glad you're here. Take a moment, and tell me — what's present for you right now? There's no right answer. Just share whatever comes up.",
  regulate: "Let's help you feel a bit more settled. What emotion or sensation is most present for you right now? Or if you'd prefer, just tell me: are you feeling activated and tense, or heavy and low?",
  prepare: "Preparing for a hard conversation takes courage. What kind of conversation would you like support with?\n\n• Setting a boundary\n• Responding to criticism\n• Asking for a need\n• Apologizing\n• Expressing hurt\n• Repairing conflict",
};

const entryTitles: Record<string, string> = {
  understand: "Understand how I feel",
  regulate: "Regulate my emotions",
  prepare: "Hard conversation",
};

const MentorChatPage = () => {
  const { entryPath } = useParams<{ entryPath: string }>();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "greeting",
      role: "mentor",
      content: entryGreetings[entryPath || "understand"] || entryGreetings.understand,
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const handleSend = () => {
    if (!input.trim()) return;
    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");

    // Simulate mentor response (will be replaced with real AI)
    setIsTyping(true);
    setTimeout(() => {
      const mentorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "mentor",
        content: "Thank you for sharing that with me. I can hear that this is weighing on you. Where do you feel this in your body right now?",
      };
      setMessages((prev) => [...prev, mentorMsg]);
      setIsTyping(false);
    }, 1500);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-screen bg-mentor-bg">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-card/90 backdrop-blur-md border-b border-border sticky top-0 z-10">
        <button onClick={() => navigate("/app")} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <div>
          <p className="font-semibold text-sm">{entryTitles[entryPath || "understand"]}</p>
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
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                  msg.role === "mentor"
                    ? "bg-mentor-bubble text-foreground rounded-tl-md"
                    : "bg-user-bubble text-foreground rounded-tr-md"
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
            <div className="px-4 py-3 rounded-2xl rounded-tl-md bg-mentor-bubble">
              <div className="flex gap-1.5">
                {[0, 1, 2].map((i) => (
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
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Share what's on your mind..."
              rows={1}
              className="w-full resize-none rounded-xl border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground/60"
              style={{ maxHeight: "120px" }}
            />
          </div>
          <button
            onClick={handleSend}
            disabled={!input.trim()}
            className="p-2.5 rounded-xl gradient-warm text-primary-foreground disabled:opacity-40 transition-all active:scale-95"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default MentorChatPage;
