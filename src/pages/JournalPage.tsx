import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { BookOpen, Plus, Mic, Camera, X } from "lucide-react";
import { toast } from "sonner";
import { createJournalEntry, getJournalEntries, type JournalEntry } from "@/services/journalService";
import { isGuestMode } from "@/services/authService";
import { analytics } from "@/services/analyticsService";

const JournalPage = () => {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [showNew, setShowNew] = useState(false);
  const [newContent, setNewContent] = useState("");
  const [saving, setSaving] = useState(false);
  const guest = isGuestMode();

  useEffect(() => {
    if (!guest) {
      getJournalEntries().then(setEntries).catch(() => {});
    }
  }, [guest]);

  const handleSave = async () => {
    if (!newContent.trim()) return;
    setSaving(true);
    try {
      const entry = await createJournalEntry({
        entry_type: "text",
        content: newContent.trim(),
      });
      setEntries(prev => [entry, ...prev]);
      setNewContent("");
      setShowNew(false);
      analytics.track("journal_entry_created", { entry_type: "text" });
      toast.success("Entry saved");
    } catch (e: any) {
      toast.error(e.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="px-5 pt-8 pb-4 max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl">Journal</h1>
        <button
          onClick={() => setShowNew(true)}
          className="p-2.5 rounded-xl gradient-warm text-primary-foreground shadow-soft active:scale-95 transition-transform"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      {/* New entry form */}
      {showNew && (
        <motion.div
          className="mb-6 p-4 rounded-2xl bg-card border border-border shadow-soft"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-foreground">New Entry</span>
            <button onClick={() => setShowNew(false)} className="text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          </div>
          <textarea
            value={newContent}
            onChange={e => setNewContent(e.target.value)}
            placeholder="What's on your mind..."
            rows={4}
            className="w-full resize-none rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <div className="flex items-center justify-between mt-3">
            <div className="flex gap-2">
              {!guest && (
                <>
                  <button
                    onClick={() => toast.info("Audio recording coming soon")}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted text-xs font-medium text-muted-foreground"
                  >
                    <Mic className="w-3.5 h-3.5" /> Record
                  </button>
                  <button
                    onClick={() => toast.info("Photo upload coming soon")}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted text-xs font-medium text-muted-foreground"
                  >
                    <Camera className="w-3.5 h-3.5" /> Photo
                  </button>
                </>
              )}
            </div>
            <button
              onClick={handleSave}
              disabled={saving || !newContent.trim()}
              className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium disabled:opacity-40"
            >
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
          {guest && (
            <p className="mt-2 text-xs text-muted-foreground">
              Sign in to save entries and upload media.
            </p>
          )}
        </motion.div>
      )}

      {/* Entries list */}
      {entries.length > 0 ? (
        <div className="space-y-3">
          {entries.map((entry, i) => (
            <motion.div
              key={entry.id}
              className="p-4 rounded-2xl bg-card shadow-soft"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <p className="text-sm text-foreground leading-relaxed line-clamp-3">
                {entry.content}
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                {new Date(entry.created_at).toLocaleDateString()}
              </p>
            </motion.div>
          ))}
        </div>
      ) : (
        !showNew && (
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
          </motion.div>
        )
      )}
    </div>
  );
};

export default JournalPage;
