import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { TrendingUp, Flame, Heart, Activity } from "lucide-react";
import { getProgressStats } from "@/services/progressService";

const ProgressPage = () => {
  const [stats, setStats] = useState({ totalSessions: 0, totalPractices: 0, streakDays: 0 });

  useEffect(() => {
    getProgressStats().then(setStats).catch(() => {});
  }, []);

  const statCards = [
    { icon: Flame, label: "Streak", value: `${stats.streakDays} days`, color: "text-primary" },
    { icon: Heart, label: "Check-ins", value: `${stats.totalSessions}`, color: "text-blush-dark" },
    { icon: Activity, label: "Practices", value: `${stats.totalPractices}`, color: "text-sage-dark" },
  ];

  return (
    <div className="px-5 pt-8 pb-4 max-w-lg mx-auto">
      <h1 className="font-display text-2xl mb-6">Progress</h1>

      <div className="grid grid-cols-3 gap-3 mb-8">
        {statCards.map(({ icon: Icon, label, value, color }, i) => (
          <motion.div
            key={label}
            className="flex flex-col items-center p-4 rounded-2xl bg-card shadow-soft"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08, duration: 0.4 }}
          >
            <Icon className={`w-6 h-6 ${color} mb-2`} />
            <span className="text-lg font-bold">{value}</span>
            <span className="text-xs text-muted-foreground">{label}</span>
          </motion.div>
        ))}
      </div>

      <motion.div
        className="flex flex-col items-center text-center py-12"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        <div className="w-16 h-16 rounded-2xl bg-lavender flex items-center justify-center mb-4">
          <TrendingUp className="w-8 h-8 text-lavender-dark" />
        </div>
        <h2 className="font-display text-xl mb-2">Your journey begins here</h2>
        <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
          As you check in with your EI Mentor, your emotional patterns, most helpful practices, and growth will appear here.
        </p>
      </motion.div>
    </div>
  );
};

export default ProgressPage;
