import { useState } from "react";
import { motion } from "framer-motion";
import { User, Volume2, Bell, Shield, MessageSquare, ChevronRight, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { signOut, isGuestMode, disableGuestMode } from "@/services/authService";
import { analytics } from "@/services/analyticsService";

const sections = [
  {
    title: "Preferences",
    items: [
      { icon: User, label: "Account", path: "#" },
      { icon: Volume2, label: "Voice Preferences", path: "#" },
      { icon: Bell, label: "Notifications", path: "#" },
    ],
  },
  {
    title: "Support",
    items: [
      { icon: Shield, label: "Privacy & Security", path: "/privacy" },
      { icon: MessageSquare, label: "Feedback & Support", path: "#feedback" },
    ],
  },
];

const SettingsPage = () => {
  const navigate = useNavigate();
  const [feedbackText, setFeedbackText] = useState("");
  const [showFeedback, setShowFeedback] = useState(false);
  const guest = isGuestMode();

  const handleSignOut = async () => {
    try {
      if (guest) {
        disableGuestMode();
      } else {
        await signOut();
      }
      navigate("/");
    } catch {
      toast.error("Failed to sign out");
    }
  };

  const handleFeedback = () => {
    if (!feedbackText.trim()) return;
    analytics.track("feedback_submitted");
    toast.success("Thank you for your feedback!");
    setFeedbackText("");
    setShowFeedback(false);
  };

  return (
    <div className="px-5 pt-8 pb-4 max-w-lg mx-auto">
      <h1 className="font-display text-2xl mb-6">Settings</h1>

      {guest && (
        <motion.div
          className="mb-6 p-4 rounded-2xl bg-accent/50 border border-border"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <p className="text-sm text-foreground font-medium mb-1">Guest Mode</p>
          <p className="text-xs text-muted-foreground">Sign up to save your journal, progress, and preferences.</p>
          <button
            onClick={() => navigate("/")}
            className="mt-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-medium"
          >
            Create Account
          </button>
        </motion.div>
      )}

      {sections.map(({ title, items }, si) => (
        <motion.div
          key={title}
          className="mb-6"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: si * 0.1, duration: 0.4 }}
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 px-1">
            {title}
          </p>
          <div className="bg-card rounded-2xl shadow-soft overflow-hidden divide-y divide-border">
            {items.map(({ icon: Icon, label, path }) => (
              <button
                key={label}
                onClick={() => {
                  if (path === "#feedback") {
                    setShowFeedback(!showFeedback);
                  } else {
                    navigate(path);
                  }
                }}
                className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-muted/50 transition-colors"
              >
                <Icon className="w-5 h-5 text-muted-foreground" />
                <span className="flex-1 text-sm font-medium">{label}</span>
                <ChevronRight className="w-4 h-4 text-muted-foreground/50" />
              </button>
            ))}
          </div>
        </motion.div>
      ))}

      {showFeedback && (
        <motion.div
          className="mb-6 p-4 rounded-2xl bg-card border border-border shadow-soft"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
        >
          <textarea
            value={feedbackText}
            onChange={e => setFeedbackText(e.target.value)}
            placeholder="Tell us what you think..."
            rows={3}
            className="w-full resize-none rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <button
            onClick={handleFeedback}
            disabled={!feedbackText.trim()}
            className="mt-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium disabled:opacity-40"
          >
            Submit Feedback
          </button>
        </motion.div>
      )}

      <motion.button
        onClick={handleSignOut}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl text-destructive text-sm font-medium hover:bg-destructive/5 transition-colors"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        <LogOut className="w-4 h-4" />
        {guest ? "Exit Guest Mode" : "Sign Out"}
      </motion.button>
    </div>
  );
};

export default SettingsPage;
