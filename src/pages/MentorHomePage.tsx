import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Heart, Wind, MessageCircle, Lock, Sparkles, ArrowRight } from "lucide-react";

const entryPaths = [
  {
    id: "understand",
    icon: Heart,
    label: "Understand how I feel",
    description: "Explore and name what's present",
    color: "bg-blush text-blush-dark",
    path: "/app/mentor/understand",
  },
  {
    id: "regulate",
    icon: Wind,
    label: "Regulate my emotions",
    description: "Calm your nervous system now",
    color: "bg-sage-light text-sage-dark",
    path: "/app/mentor/regulate",
  },
  {
    id: "prepare",
    icon: MessageCircle,
    label: "Prepare for a hard conversation",
    description: "Get emotionally ready",
    color: "bg-lavender text-lavender-dark",
    path: "/app/mentor/prepare",
  },
];

const MentorHomePage = () => {
  const navigate = useNavigate();

  return (
    <div className="px-5 pt-8 pb-4 max-w-lg mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h1 className="font-display text-2xl md:text-3xl">
          What would you like to explore right now?
        </h1>
      </motion.div>

      {/* Entry path cards */}
      <div className="mt-6 space-y-3">
        {entryPaths.map(({ id, icon: Icon, label, description, color, path }, i) => (
          <motion.button
            key={id}
            onClick={() => navigate(path)}
            className="w-full flex items-center gap-4 p-4 rounded-2xl bg-card shadow-card text-left transition-transform active:scale-[0.98]"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.08, duration: 0.4 }}
          >
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
              <Icon className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-[15px] text-foreground">{label}</p>
              <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
            </div>
            <ArrowRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          </motion.button>
        ))}
      </div>

      {/* Daily Insight card */}
      <motion.div
        className="mt-6 p-5 rounded-2xl bg-warm-gold-light border border-warm-gold/30 shadow-soft"
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.5, duration: 0.4 }}
      >
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="text-xs font-semibold uppercase tracking-wide text-primary">
            Daily Insight
          </span>
        </div>
        <p className="text-sm text-foreground leading-relaxed">
          As you check in and reflect, IntoMeISee will begin to notice patterns in your emotional journey.
        </p>
        <div className="mt-3 flex gap-2">
          <button className="px-3 py-1.5 text-xs font-medium rounded-lg bg-primary/10 text-primary transition-colors hover:bg-primary/20">
            Reflect on this
          </button>
          <button className="px-3 py-1.5 text-xs font-medium rounded-lg bg-primary/10 text-primary transition-colors hover:bg-primary/20">
            Try a practice
          </button>
        </div>
      </motion.div>

      {/* Trust message */}
      <motion.div
        className="mt-6 flex items-center justify-center gap-2 text-xs text-trust"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
      >
        <Lock className="w-3.5 h-3.5" />
        <span>Your reflections are encrypted and private</span>
      </motion.div>
    </div>
  );
};

export default MentorHomePage;
