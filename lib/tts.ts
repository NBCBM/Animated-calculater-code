export function getAvailableVoices(): SpeechSynthesisVoice[] {
  if (typeof window === "undefined") return [];
  return window.speechSynthesis.getVoices();
}

export function speakText(text: string, voiceUri?: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const utterance = new SpeechSynthesisUtterance(text);
    if (voiceUri) {
      const voice = getAvailableVoices().find((v) => v.voiceURI === voiceUri);
      if (voice) utterance.voice = voice;
    }
    utterance.rate = 0.9;
    utterance.onend = () => resolve();
    utterance.onerror = (e) => reject(e);
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  });
}

export function stopSpeaking(): void {
  if (typeof window !== "undefined") {
    window.speechSynthesis.cancel();
  }
}

export async function generateTTSAudio(
  text: string,
  voice: string,
  apiKey: string
): Promise<ArrayBuffer> {
  const response = await fetch("/api/tts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, voice, apiKey }),
  });
  if (!response.ok) {
    const err = await response.text();
    throw new Error(`TTS generation failed: ${err}`);
  }
  return response.arrayBuffer();
}

export const OPENAI_VOICES = [
  { id: "alloy", name: "Alloy", description: "Neutral and balanced" },
  { id: "ash", name: "Ash", description: "Warm and conversational" },
  { id: "coral", name: "Coral", description: "Clear and engaging" },
  { id: "echo", name: "Echo", description: "Smooth and composed" },
  { id: "fable", name: "Fable", description: "Expressive and dynamic" },
  { id: "nova", name: "Nova", description: "Friendly and upbeat" },
  { id: "onyx", name: "Onyx", description: "Deep and authoritative" },
  { id: "sage", name: "Sage", description: "Calm and thoughtful" },
  { id: "shimmer", name: "Shimmer", description: "Bright and optimistic" },
] as const;
