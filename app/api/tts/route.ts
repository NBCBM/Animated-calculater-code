import { NextRequest } from "next/server";
import { createOpenAIClient } from "@/lib/openai";

export async function POST(request: NextRequest) {
  try {
    const { text, voice = "nova", apiKey } = await request.json();

    if (!apiKey) {
      return new Response("OpenAI API key is required", { status: 400 });
    }

    if (!text) {
      return new Response("Text is required", { status: 400 });
    }

    const client = createOpenAIClient(apiKey);
    const mp3 = await client.audio.speech.create({
      model: "tts-1",
      voice: voice as "alloy" | "ash" | "coral" | "echo" | "fable" | "nova" | "onyx" | "sage" | "shimmer",
      input: text,
      response_format: "mp3",
    });

    const arrayBuffer = await mp3.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    return new Response(buffer, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": buffer.length.toString(),
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "TTS generation failed";
    return new Response(message, { status: 500 });
  }
}
