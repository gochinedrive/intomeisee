
-- User profiles
CREATE TABLE public.user_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  display_name text,
  avatar_url text,
  is_guest boolean NOT NULL DEFAULT false,
  onboarding_completed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own profile" ON public.user_profiles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.user_profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.user_profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Mentor sessions
CREATE TABLE public.mentor_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  entry_path text NOT NULL DEFAULT 'understand',
  current_step text NOT NULL DEFAULT 'awaiting_emotion',
  emotion text,
  body_location text,
  pre_intensity smallint,
  exercise_options_shown text[],
  selected_exercise text,
  attempt_number smallint NOT NULL DEFAULT 1,
  post_intensity smallint,
  mirror_used boolean NOT NULL DEFAULT false,
  mirror_confirmed boolean,
  emotion_label_suggested text,
  emotion_label_confirmed boolean,
  safety_override_state text,
  improvement_choice text,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.mentor_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own sessions" ON public.mentor_sessions FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Mentor messages
CREATE TABLE public.mentor_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES public.mentor_sessions(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role text NOT NULL,
  content text NOT NULL,
  step_at_time text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.mentor_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own messages" ON public.mentor_messages FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Emotion checkins
CREATE TABLE public.emotion_checkins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  session_id uuid REFERENCES public.mentor_sessions(id) ON DELETE SET NULL,
  emotion text NOT NULL,
  body_location text,
  intensity smallint,
  context text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.emotion_checkins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own checkins" ON public.emotion_checkins FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Practice sessions
CREATE TABLE public.practice_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  session_id uuid REFERENCES public.mentor_sessions(id) ON DELETE SET NULL,
  exercise_name text NOT NULL,
  pre_intensity smallint,
  post_intensity smallint,
  outcome text,
  duration_seconds integer,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.practice_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own practices" ON public.practice_sessions FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Journal entries
CREATE TABLE public.journal_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  entry_type text NOT NULL DEFAULT 'text',
  title text,
  content text,
  reflection_prompt text,
  mood text,
  tags text[],
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own journal" ON public.journal_entries FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Journal media
CREATE TABLE public.journal_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id uuid REFERENCES public.journal_entries(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  media_type text NOT NULL,
  storage_path text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.journal_media ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own media" ON public.journal_media FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Progress snapshots
CREATE TABLE public.progress_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  snapshot_date date NOT NULL DEFAULT CURRENT_DATE,
  total_sessions integer NOT NULL DEFAULT 0,
  total_practices integer NOT NULL DEFAULT 0,
  streak_days integer NOT NULL DEFAULT 0,
  top_emotions text[],
  avg_intensity_change numeric,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.progress_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own snapshots" ON public.progress_snapshots FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Daily insights
CREATE TABLE public.daily_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  insight_text text NOT NULL,
  insight_type text NOT NULL DEFAULT 'reflection',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.daily_insights ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own insights" ON public.daily_insights FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Emotional profiles
CREATE TABLE public.emotional_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  top_emotions jsonb NOT NULL DEFAULT '[]'::jsonb,
  common_body_locations jsonb NOT NULL DEFAULT '[]'::jsonb,
  preferred_exercises jsonb NOT NULL DEFAULT '[]'::jsonb,
  avg_pre_intensity numeric,
  avg_post_intensity numeric,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.emotional_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own profile" ON public.emotional_profiles FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Pattern insights
CREATE TABLE public.pattern_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  pattern_type text NOT NULL,
  description text NOT NULL,
  data jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.pattern_insights ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own patterns" ON public.pattern_insights FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Snapshot requests (for memory layer 5)
CREATE TABLE public.snapshot_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  request_type text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  result jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.snapshot_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own requests" ON public.snapshot_requests FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- User feedback
CREATE TABLE public.user_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  feedback_type text NOT NULL DEFAULT 'general',
  content text NOT NULL,
  rating smallint,
  context jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.user_feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own feedback" ON public.user_feedback FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Storage buckets for journal media
INSERT INTO storage.buckets (id, name, public) VALUES ('journal-photos', 'journal-photos', false);
INSERT INTO storage.buckets (id, name, public) VALUES ('journal-audio', 'journal-audio', false);

-- Storage RLS
CREATE POLICY "Users upload own photos" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'journal-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users read own photos" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'journal-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users delete own photos" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'journal-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users upload own audio" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'journal-audio' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users read own audio" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'journal-audio' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users delete own audio" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'journal-audio' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email));
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
