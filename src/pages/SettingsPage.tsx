import { motion } from "framer-motion";
import { User, Volume2, Bell, Shield, MessageSquare, ChevronRight, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";

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
      { icon: MessageSquare, label: "Feedback & Support", path: "#" },
    ],
  },
];

const SettingsPage = () => {
  const navigate = useNavigate();

  return (
    <div className="px-5 pt-8 pb-4 max-w-lg mx-auto">
      <h1 className="font-display text-2xl mb-6">Settings</h1>

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
                onClick={() => navigate(path)}
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

      <motion.button
        className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl text-destructive text-sm font-medium hover:bg-destructive/5 transition-colors"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        <LogOut className="w-4 h-4" />
        Sign Out
      </motion.button>
    </div>
  );
};

export default SettingsPage;
