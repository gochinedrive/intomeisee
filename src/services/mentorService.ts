import { MentorSessionState } from "@/lib/mentorSessionState";

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mentor-chat`;

export interface MentorResponse {
  assistantText: string;
  responseType: string;
  exerciseOptions?: string[];
  snapshotNeeded?: boolean;
  safetyOverride?: boolean;
}

type Message = { role: "user" | "assistant"; content: string };

/**
 * Call the mentor edge function and get a structured JSON response.
 */
export async function callMentor(
  messages: Message[],
  sessionState: MentorSessionState,
  entryPath: string
): Promise<MentorResponse> {
  const resp = await fetch(CHAT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify({ messages, sessionState, entryPath }),
  });

  if (!resp.ok) {
    const errData = await resp.json().catch(() => ({}));
    if (resp.status === 429) throw new Error("Rate limited. Please try again in a moment.");
    if (resp.status === 402) throw new Error("Usage limit reached. Please add credits.");
    throw new Error(errData.error || "Something went wrong.");
  }

  const data = await resp.json();
  return data as MentorResponse;
}
