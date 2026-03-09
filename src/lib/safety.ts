/**
 * Safety detection and override for self-harm / harmful action mentions.
 */

const SAFETY_KEYWORDS = [
  "kill myself", "end my life", "suicide", "self harm", "self-harm",
  "cut myself", "hurt myself", "don't want to live", "want to die",
  "no reason to live", "better off dead", "harm someone", "hurt someone",
  "violent", "attack", "weapon",
];

export function detectSafetyRisk(message: string): boolean {
  const lower = message.toLowerCase();
  return SAFETY_KEYWORDS.some(kw => lower.includes(kw));
}

export const SAFETY_RESPONSE = `I'm really sorry you're feeling this much pain right now.

You do not have to handle this alone.

Please consider reaching out to someone you trust or a crisis support service:

🇺🇸 **988 Suicide & Crisis Lifeline**: Call or text **988**
🌍 **Crisis Text Line**: Text **HOME** to **741741**
🇬🇧 **Samaritans**: Call **116 123**

Your safety matters more than anything we're doing here. I'm here when you're ready to continue. 💛`;
