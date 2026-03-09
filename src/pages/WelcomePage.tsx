import { useState } from "react";
import { motion } from "framer-motion";
import { Lock, Mail, Chrome, Apple, Eye, EyeOff } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { signUpWithEmail, signInWithEmail, enableGuestMode } from "@/services/authService";

const WelcomePage = () => {
  const navigate = useNavigate();
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [isSignUp, setIsSignUp] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleEmailAuth = async () => {
    if (!email || !password) {
      toast.error("Please enter email and password");
      return;
    }
    setLoading(true);
    try {
      if (isSignUp) {
        await signUpWithEmail(email, password);
        toast.success("Check your email to confirm your account!");
      } else {
        await signInWithEmail(email, password);
        navigate("/app");
      }
    } catch (e: any) {
      toast.error(e.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  const handleGuest = () => {
    enableGuestMode();
    navigate("/app");
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12 bg-background">
      <motion.div
        className="absolute top-1/4 w-64 h-64 rounded-full bg-sage-light opacity-40 blur-3xl"
        animate={{ scale: [1, 1.08, 1], opacity: [0.3, 0.5, 0.3] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      />

      <motion.div
        className="relative z-10 flex flex-col items-center max-w-sm w-full"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <h1 className="font-display text-4xl md:text-5xl text-foreground text-center leading-tight">
          In To Me I See
        </h1>
        <p className="mt-4 text-muted-foreground text-center text-base leading-relaxed">
          Your personal emotional intelligence mentor.
          Understand how you feel, regulate your emotions,
          and prepare for life's hard conversations.
        </p>

        <motion.div
          className="mt-6 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-trust-bg"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <Lock className="w-4 h-4 text-trust flex-shrink-0" />
          <span className="text-sm text-trust">
            Your emotional reflections are encrypted and private.
          </span>
        </motion.div>

        <motion.div
          className="mt-10 w-full flex flex-col gap-3"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          {!showEmailForm ? (
            <>
              <button
                onClick={() => setShowEmailForm(true)}
                className="w-full flex items-center justify-center gap-3 px-6 py-3.5 rounded-xl gradient-warm text-primary-foreground font-medium text-base shadow-card transition-transform active:scale-[0.98]"
              >
                <Mail className="w-5 h-5" />
                Continue with Email
              </button>

              <button
                onClick={() => toast.info("Google sign-in coming soon")}
                className="w-full flex items-center justify-center gap-3 px-6 py-3.5 rounded-xl bg-card border border-border font-medium text-base shadow-soft transition-transform active:scale-[0.98]"
              >
                <Chrome className="w-5 h-5" />
                Continue with Google
              </button>

              <button
                onClick={() => toast.info("Apple sign-in coming soon")}
                className="w-full flex items-center justify-center gap-3 px-6 py-3.5 rounded-xl bg-foreground text-background font-medium text-base shadow-soft transition-transform active:scale-[0.98]"
              >
                <Apple className="w-5 h-5" />
                Continue with Apple
              </button>

              <button
                onClick={handleGuest}
                className="w-full px-6 py-3 rounded-xl text-muted-foreground font-medium text-base transition-colors hover:text-foreground"
              >
                Continue as Guest
              </button>
            </>
          ) : (
            <div className="space-y-3">
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="Email address"
                className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Password"
                  className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <button
                onClick={handleEmailAuth}
                disabled={loading}
                className="w-full px-6 py-3.5 rounded-xl gradient-warm text-primary-foreground font-medium text-base shadow-card transition-transform active:scale-[0.98] disabled:opacity-50"
              >
                {loading ? "..." : isSignUp ? "Sign Up" : "Sign In"}
              </button>
              <button
                onClick={() => setIsSignUp(!isSignUp)}
                className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {isSignUp ? "Already have an account? Sign In" : "Need an account? Sign Up"}
              </button>
              <button
                onClick={() => setShowEmailForm(false)}
                className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                ← Back to options
              </button>
            </div>
          )}
        </motion.div>

        <div className="mt-8 flex gap-4 text-xs text-muted-foreground">
          <button onClick={() => navigate("/privacy")} className="underline underline-offset-2 hover:text-foreground transition-colors">
            Privacy & Security
          </button>
          <span>·</span>
          <span>Not therapy or medical advice</span>
        </div>
      </motion.div>
    </div>
  );
};

export default WelcomePage;
