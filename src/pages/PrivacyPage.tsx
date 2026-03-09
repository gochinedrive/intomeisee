import { useNavigate } from "react-router-dom";
import { ArrowLeft, Shield, Lock, Eye, Trash2, Download } from "lucide-react";

const PrivacyPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background px-6 py-8 max-w-2xl mx-auto">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-muted-foreground mb-6 hover:text-foreground transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <h1 className="font-display text-3xl mb-2">Privacy & Security</h1>
      <p className="text-muted-foreground mb-8">How IntoMeISee protects your emotional data.</p>

      <div className="space-y-6">
        {[
          { icon: Shield, title: "What this app is", text: "IntoMeISee is a self-reflection and emotional intelligence tool. It does not provide therapy, diagnosis, or medical advice." },
          { icon: Lock, title: "Your data is private", text: "Your emotional reflections are encrypted and private. Private content is never sent to analytics systems." },
          { icon: Eye, title: "What we track", text: "We track only structured, non-identifying metadata to improve the product. We never track the content of your reflections, journal entries, or conversations." },
          { icon: Download, title: "Export your data", text: "You can export all your data at any time from Settings." },
          { icon: Trash2, title: "Delete your account", text: "You can permanently delete your account and all associated data from Settings." },
        ].map(({ icon: Icon, title, text }) => (
          <div key={title} className="flex gap-4 p-4 rounded-xl bg-card shadow-soft">
            <Icon className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-sm mb-1">{title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{text}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PrivacyPage;
