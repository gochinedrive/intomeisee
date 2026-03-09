import { supabase } from "@/integrations/supabase/client";

export async function getProgressStats() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { totalSessions: 0, totalPractices: 0, streakDays: 0 };

  const [sessions, practices] = await Promise.all([
    supabase
      .from("mentor_sessions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", session.user.id),
    supabase
      .from("practice_sessions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", session.user.id),
  ]);

  return {
    totalSessions: sessions.count || 0,
    totalPractices: practices.count || 0,
    streakDays: 0, // Will be computed from daily activity later
  };
}

export async function getRecentEmotions() {
  const { data } = await supabase
    .from("emotion_checkins")
    .select("emotion, intensity, created_at")
    .order("created_at", { ascending: false })
    .limit(10);
  return data || [];
}
