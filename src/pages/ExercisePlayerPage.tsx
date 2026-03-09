import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Play, Pause, CheckCircle } from "lucide-react";
import { analytics } from "@/services/analyticsService";

const EXERCISE_DATA: Record<string, { instructions: string; durationSeconds: number }> = {
  "Release Tension Breathing": {
    instructions: "Inhale deeply through your nose for 4 counts. Hold for 2 counts. Exhale forcefully through your mouth for 6 counts, releasing tension with each breath. Repeat.",
    durationSeconds: 180,
  },
  "Body Shaking": {
    instructions: "Stand with feet hip-width apart. Begin shaking your hands gently. Let the shaking spread through your arms, shoulders, torso, and legs. Shake your whole body for the duration, then slowly come to stillness.",
    durationSeconds: 180,
  },
  "Anger Release Practice": {
    instructions: "Find a comfortable position. Clench your fists tightly for 5 seconds, then release fully. Repeat with your whole body — tense everything, hold, then let go completely. Notice the contrast between tension and release.",
    durationSeconds: 240,
  },
  "Calm Nervous System Breathing": {
    instructions: "Breathe in gently for 4 counts. Breathe out slowly for 8 counts. The extended exhale activates your parasympathetic nervous system, signaling safety. Continue at this rhythm.",
    durationSeconds: 180,
  },
  "5 Senses Grounding": {
    instructions: "Notice 5 things you can see. 4 things you can touch. 3 things you can hear. 2 things you can smell. 1 thing you can taste. Take your time with each one.",
    durationSeconds: 240,
  },
  "Calming Meditation": {
    instructions: "Close your eyes. Bring your attention to the sensation of breathing. When thoughts arise, gently return to the breath. There's nothing to fix — just observe.",
    durationSeconds: 300,
  },
  "Box Breathing": {
    instructions: "Inhale for 4 counts. Hold for 4 counts. Exhale for 4 counts. Hold for 4 counts. Repeat this square pattern.",
    durationSeconds: 180,
  },
  "Heart Connection Breathing": {
    instructions: "Place one hand on your heart. Breathe slowly and gently. With each inhale, imagine breathing warmth into your heart space. With each exhale, let the warmth spread through your body.",
    durationSeconds: 240,
  },
  "Emotional Acceptance Meditation": {
    instructions: "Close your eyes. Notice what you're feeling without trying to change it. Say to yourself: 'This feeling is here. It's okay to feel this.' Breathe gently and let the feeling be.",
    durationSeconds: 300,
  },
  "Body Scan Meditation": {
    instructions: "Close your eyes. Bring attention to the top of your head. Slowly scan downward — forehead, jaw, neck, shoulders, arms, chest, belly, hips, legs, feet. Notice sensations without judgment.",
    durationSeconds: 300,
  },
  "Self Compassion Meditation": {
    instructions: "Place your hand on your heart. Say gently: 'May I be kind to myself. May I give myself the compassion I need.' Breathe slowly and let the words land.",
    durationSeconds: 240,
  },
  "Humming Regulation": {
    instructions: "Take a deep breath in. As you exhale, hum gently at a comfortable pitch. Feel the vibration in your chest and throat. The vibration stimulates the vagus nerve, promoting calm.",
    durationSeconds: 180,
  },
  "Extended Exhale Breathing": {
    instructions: "Inhale for 3 counts. Exhale for 6 counts. The longer exhale signals safety to your nervous system. Continue at this gentle rhythm.",
    durationSeconds: 180,
  },
  "Feet Awareness": {
    instructions: "Stand or sit with feet flat on the floor. Press gently into the ground. Notice the weight, temperature, and texture beneath your feet. Stay present with this grounding contact.",
    durationSeconds: 120,
  },
  "Shoulder Release": {
    instructions: "Inhale and lift your shoulders toward your ears. Hold for 5 seconds. Exhale and drop them completely. Repeat 5 times, noticing the release each time.",
    durationSeconds: 120,
  },
  "Somatic Tracking": {
    instructions: "Close your eyes. Notice where in your body you feel the emotion most strongly. Describe the sensation to yourself: Is it tight? Heavy? Buzzing? Just observe it without trying to change anything.",
    durationSeconds: 240,
  },
  "Temperature Reset": {
    instructions: "Hold something cold (ice cube, cold water on wrists) or warm (warm cup, warm cloth). Focus entirely on the temperature sensation. Let it anchor you in the present moment.",
    durationSeconds: 120,
  },
};

const DEFAULT_EXERCISE = {
  instructions: "Find a comfortable position. Close your eyes. Breathe slowly and gently, focusing on each breath. Stay present with whatever you notice.",
  durationSeconds: 180,
};

const ExercisePlayerPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const exerciseName = searchParams.get("exercise") || "Box Breathing";
  const sessionId = searchParams.get("sessionId") || "";
  const entryPath = searchParams.get("entryPath") || "understand";

  const exerciseInfo = EXERCISE_DATA[exerciseName] || DEFAULT_EXERCISE;

  const [phase, setPhase] = useState<"ready" | "active" | "complete">("ready");
  const [secondsLeft, setSecondsLeft] = useState(exerciseInfo.durationSeconds);
  const [isPaused, setIsPaused] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (phase === "active" && !isPaused) {
      intervalRef.current = setInterval(() => {
        setSecondsLeft(prev => {
          if (prev <= 1) {
            clearInterval(intervalRef.current!);
            setPhase("complete");
            analytics.track("practice_completed", { exercise_name: exerciseName });
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [phase, isPaused, exerciseName]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const progress = 1 - secondsLeft / exerciseInfo.durationSeconds;

  const handleComplete = () => {
    // Navigate back to mentor chat with sessionId so it reloads the full session
    navigate(`/app/mentor/${entryPath}?sessionId=${sessionId}&exerciseCompleted=true`);
  };

  const handleBack = () => {
    navigate(`/app/mentor/${entryPath}?sessionId=${sessionId}`);
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
        <button
          onClick={handleBack}
          className="p-1.5 rounded-lg hover:bg-muted transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <p className="font-semibold text-sm text-foreground">Exercise</p>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 gap-8">
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-2xl font-bold text-foreground text-center"
        >
          {exerciseName}
        </motion.h1>

        {/* Timer ring */}
        <div className="relative w-48 h-48">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 200 200">
            <circle cx="100" cy="100" r="90" fill="none" stroke="hsl(var(--muted))" strokeWidth="8" />
            <circle
              cx="100" cy="100" r="90" fill="none"
              stroke="hsl(var(--primary))"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 90}`}
              strokeDashoffset={`${2 * Math.PI * 90 * (1 - progress)}`}
              className="transition-all duration-1000"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-3xl font-mono font-bold text-foreground">
              {formatTime(secondsLeft)}
            </span>
          </div>
        </div>

        {/* Instructions */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-sm text-muted-foreground text-center max-w-sm leading-relaxed"
        >
          {exerciseInfo.instructions}
        </motion.p>

        {/* Controls */}
        {phase === "ready" && (
          <button
            onClick={() => setPhase("active")}
            className="flex items-center gap-2 px-8 py-3 rounded-full bg-primary text-primary-foreground font-medium text-sm active:scale-95 transition-transform"
          >
            <Play className="w-5 h-5" />
            Begin Practice
          </button>
        )}

        {phase === "active" && (
          <button
            onClick={() => setIsPaused(p => !p)}
            className="flex items-center gap-2 px-8 py-3 rounded-full bg-secondary text-secondary-foreground font-medium text-sm active:scale-95 transition-transform"
          >
            {isPaused ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
            {isPaused ? "Resume" : "Pause"}
          </button>
        )}

        {phase === "complete" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center gap-4"
          >
            <CheckCircle className="w-12 h-12 text-primary" />
            <p className="text-sm text-muted-foreground">Practice complete. Well done.</p>
            <button
              onClick={handleComplete}
              className="px-8 py-3 rounded-full bg-primary text-primary-foreground font-medium text-sm active:scale-95 transition-transform"
            >
              Return to Mentor
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default ExercisePlayerPage;
