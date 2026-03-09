import { motion } from "framer-motion";
import { BookOpen, Plus, Mic, Camera } from "lucide-react";

const JournalPage = () => {
  return (
    <div className="px-5 pt-8 pb-4 max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl">Journal</h1>
        <button className="p-2.5 rounded-xl gradient-warm text-primary-foreground shadow-soft active:scale-95 transition-transform">
          <Plus className="w-5 h-5" />
        </button>
      </div>

      {/* Empty state */}
      <motion.div
        className="flex flex-col items-center justify-center py-16 text-center"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="w-16 h-16 rounded-2xl bg-sage-light flex items-center justify-center mb-4">
          <BookOpen className="w-8 h-8 text-sage-dark" />
        </div>
        <h2 className="font-display text-xl mb-2">Your journal is waiting</h2>
        <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
          Capture your reflections through text, voice, or photos. Your entries are private and encrypted.
        </p>

        <div className="mt-6 flex gap-3">
          <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-card border border-border text-sm font-medium shadow-soft active:scale-[0.98] transition-transform">
            <Mic className="w-4 h-4 text-primary" />
            Record
          </button>
          <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-card border border-border text-sm font-medium shadow-soft active:scale-[0.98] transition-transform">
            <Camera className="w-4 h-4 text-primary" />
            Photo
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default JournalPage;
