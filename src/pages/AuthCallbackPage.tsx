import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const AuthCallbackPage = () => {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Supabase automatically picks up tokens from the URL hash/query
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          console.error("Auth callback error:", sessionError);
          setError("We couldn't verify your sign-in. The link may have expired.");
          return;
        }

        if (session) {
          navigate("/app", { replace: true });
          return;
        }

        // If no session yet, listen for auth state change (email confirmation flow)
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
          if (event === "SIGNED_IN" && session) {
            subscription.unsubscribe();
            navigate("/app", { replace: true });
          }
        });

        // Timeout after 5 seconds if nothing happens
        setTimeout(() => {
          subscription.unsubscribe();
          setError("We couldn't complete your sign-in. Please try again.");
        }, 5000);
      } catch (e) {
        console.error("Auth callback unexpected error:", e);
        setError("Something went wrong. Please try signing in again.");
      }
    };

    handleCallback();
  }, [navigate]);

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-background">
        <div className="max-w-sm w-full text-center space-y-4">
          <h1 className="font-display text-2xl text-foreground">Sign-in Issue</h1>
          <p className="text-muted-foreground text-sm">{error}</p>
          <button
            onClick={() => navigate("/", { replace: true })}
            className="px-6 py-3 rounded-xl gradient-warm text-primary-foreground font-medium text-sm shadow-card"
          >
            Back to Welcome
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-background">
      <div className="text-center space-y-3">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-muted-foreground text-sm">Completing sign-in…</p>
      </div>
    </div>
  );
};

export default AuthCallbackPage;
