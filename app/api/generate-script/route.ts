import { NextRequest, NextResponse } from "next/server";
import { createOpenAIClient } from "@/lib/openai";
import { VideoFormat, VideoTheme } from "@/lib/types";

function buildSystemPrompt(format: VideoFormat, theme: VideoTheme): string {
  const toneMap: Record<VideoTheme, string> = {
    professional: "professional, clear, and authoritative",
    cinematic: "cinematic, dramatic, and immersive",
    educational: "educational, informative, and accessible",
    casual: "casual, conversational, and engaging",
  };

  const tone = toneMap[theme];

  if (format === "documentary") {
    return `You are a professional documentary scriptwriter. Generate a video script in JSON format.
Each scene should have compelling narrative narration, and a visual description optimized as a stock footage search query.
The tone should be ${tone}.
Return ONLY valid JSON with this structure:
{
  "title": "Video Title",
  "scenes": [
    {
      "title": "Scene Title",
      "narration": "The narration text that will be spoken as voiceover...",
      "visualDescription": "descriptive keywords for stock footage search, e.g. aerial view of mountain landscape sunrise",
      "duration": 20
    }
  ]
}
Make sure narration text is natural spoken language. Visual descriptions should be specific, searchable stock footage keywords.`;
  }

  return `You are a Top 10 listicle video scriptwriter. Generate a numbered list video script in JSON format.
Include an introduction scene and a conclusion scene, with numbered items in between.
Each item should have an engaging title, informative narration, and specific visual description for stock footage.
The tone should be ${tone}.
Return ONLY valid JSON with this structure:
{
  "title": "Top N: Video Title",
  "scenes": [
    {
      "title": "Introduction",
      "narration": "Opening narration...",
      "visualDescription": "descriptive keywords for stock footage",
      "duration": 15
    },
    {
      "title": "#1: Item Name",
      "narration": "Detailed narration about this item...",
      "visualDescription": "specific stock footage search keywords",
      "duration": 25
    }
  ]
}
Make sure narration text is natural spoken language. Visual descriptions should be specific, searchable stock footage keywords.`;
}

function buildUserPrompt(
  prompt: string,
  format: VideoFormat,
  sceneCount: number,
  duration: string
): string {
  const durationMap: Record<string, string> = {
    short: "1-2 minutes total",
    medium: "3-5 minutes total",
    long: "8-10 minutes total",
  };

  return `Create a ${format === "listicle" ? "Top " + (sceneCount - 2) : ""} video about the following topic:

${prompt}

Requirements:
- Generate exactly ${sceneCount} scenes
- Target duration: ${durationMap[duration] || "3-5 minutes total"}
- Each scene's duration should be between 10-45 seconds
- Scene durations should sum to approximately the target total duration
- Visual descriptions should be 5-15 words, optimized for stock photo/video search
- Narration should be 2-4 sentences per scene, written as natural speech`;
}

export async function POST(request: NextRequest) {
  try {
    const { prompt, format, duration, theme, sceneCount, apiKey } = await request.json();

    if (!apiKey) {
      return NextResponse.json({ error: "OpenAI API key is required" }, { status: 400 });
    }

    const client = createOpenAIClient(apiKey);
    const systemPrompt = buildSystemPrompt(format, theme);
    const userPrompt = buildUserPrompt(prompt, format, sceneCount, duration);

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.8,
    });

    const content = completion.choices[0].message.content;
    if (!content) {
      return NextResponse.json({ error: "No response from AI" }, { status: 500 });
    }

    const result = JSON.parse(content);
    return NextResponse.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Script generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
