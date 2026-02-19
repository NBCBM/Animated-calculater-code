"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { v4 as uuidv4 } from "uuid";
import { Header } from "@/components/layout/header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { useSettings } from "@/hooks/useSettings";
import {
  VideoFormat,
  VideoDuration,
  VideoMode,
  VideoTheme,
  Project,
  DURATION_CONFIG,
} from "@/lib/types";
import { OPENAI_VOICES } from "@/lib/tts";
import { saveProject } from "@/lib/storage";
import {
  Film,
  ListOrdered,
  Clock,
  Zap,
  SlidersHorizontal,
  AlertTriangle,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

export default function CreatePage() {
  const router = useRouter();
  const { settings, hasRequiredKeys, loaded } = useSettings();

  const [prompt, setPrompt] = useState("");
  const [format, setFormat] = useState<VideoFormat>("documentary");
  const [duration, setDuration] = useState<VideoDuration>("short");
  const [mode, setMode] = useState<VideoMode>("auto");
  const [theme, setTheme] = useState<VideoTheme>("professional");
  const [voice, setVoice] = useState(settings.defaultVoice || "nova");

  const handleCreate = () => {
    if (prompt.length < 50) return;

    const cfg = DURATION_CONFIG[duration];
    const project: Project = {
      id: uuidv4(),
      title: "",
      prompt,
      format,
      duration,
      mode,
      theme,
      voiceId: voice,
      status: "draft",
      scenes: [],
      thumbnailUrl: null,
      videoUrl: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    saveProject(project);

    const autoParam = mode === "auto" ? "?auto=true" : "";
    router.push(`/studio/${project.id}${autoParam}`);
  };

  if (!loaded) {
    return (
      <>
        <Header />
        <main className="pt-24 pb-12 px-4 max-w-3xl mx-auto">
          <div className="skeleton h-8 w-48 mb-8" />
          <div className="skeleton h-96 w-full" />
        </main>
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="pt-24 pb-12 px-4 max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold mb-2">Create New Video</h1>
        <p className="text-foreground/60 mb-8">
          Describe your video topic and configure the settings below.
        </p>

        {!hasRequiredKeys && (
          <div className="flex items-start gap-3 p-4 rounded-xl bg-warning/10 border border-warning/20 mb-6">
            <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-warning">API keys not configured</p>
              <p className="text-xs text-foreground/60 mt-1">
                Please{" "}
                <Link href="/settings" className="text-accent-light underline">
                  configure your API keys
                </Link>{" "}
                before creating a video.
              </p>
            </div>
          </div>
        )}

        <div className="space-y-8">
          {/* Prompt */}
          <div>
            <Textarea
              label="Video Topic"
              placeholder="Describe your video topic in detail. For example: 'The history of space exploration, covering key milestones from the first satellite launch to modern Mars missions. Include notable achievements and future plans...'"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              maxLength={10000}
              showCount
              helperText="Minimum 50 characters. The more detail you provide, the better the AI script will be."
              className="min-h-[160px]"
            />
          </div>

          {/* Format */}
          <div>
            <label className="text-sm font-medium text-foreground/80 mb-3 block">Format</label>
            <div className="grid grid-cols-2 gap-4">
              <Card
                hover
                selected={format === "documentary"}
                onClick={() => setFormat("documentary")}
                className="cursor-pointer text-center p-5"
              >
                <Film className="h-8 w-8 text-accent-light mx-auto mb-2" />
                <h3 className="font-semibold mb-1">Documentary</h3>
                <p className="text-xs text-foreground/50">Narrative flow with in-depth exploration</p>
              </Card>
              <Card
                hover
                selected={format === "listicle"}
                onClick={() => setFormat("listicle")}
                className="cursor-pointer text-center p-5"
              >
                <ListOrdered className="h-8 w-8 text-purple mx-auto mb-2" />
                <h3 className="font-semibold mb-1">Top 10 / Listicle</h3>
                <p className="text-xs text-foreground/50">Ranked items with intro and outro</p>
              </Card>
            </div>
          </div>

          {/* Duration */}
          <div>
            <label className="text-sm font-medium text-foreground/80 mb-3 block">Duration</label>
            <div className="grid grid-cols-3 gap-4">
              {(Object.entries(DURATION_CONFIG) as [VideoDuration, typeof DURATION_CONFIG.short][]).map(
                ([key, cfg]) => (
                  <Card
                    key={key}
                    hover
                    selected={duration === key}
                    onClick={() => setDuration(key)}
                    className="cursor-pointer text-center p-4"
                  >
                    <Clock className="h-5 w-5 text-foreground/40 mx-auto mb-2" />
                    <h3 className="font-medium text-sm">{cfg.label}</h3>
                    <p className="text-xs text-foreground/40 mt-1">
                      {cfg.minScenes}-{cfg.maxScenes} scenes
                    </p>
                  </Card>
                )
              )}
            </div>
          </div>

          {/* Mode */}
          <div>
            <label className="text-sm font-medium text-foreground/80 mb-3 block">Mode</label>
            <div className="grid grid-cols-2 gap-4">
              <Card
                hover
                selected={mode === "auto"}
                onClick={() => setMode("auto")}
                className="cursor-pointer p-5"
              >
                <Zap className="h-6 w-6 text-warning mb-2" />
                <h3 className="font-semibold mb-1">Auto</h3>
                <p className="text-xs text-foreground/50">
                  AI handles everything end-to-end. Sit back and watch your video being created.
                </p>
              </Card>
              <Card
                hover
                selected={mode === "manual"}
                onClick={() => setMode("manual")}
                className="cursor-pointer p-5"
              >
                <SlidersHorizontal className="h-6 w-6 text-accent-light mb-2" />
                <h3 className="font-semibold mb-1">Manual</h3>
                <p className="text-xs text-foreground/50">
                  Review each step. Approve scripts, choose media, and customize everything.
                </p>
              </Card>
            </div>
          </div>

          {/* Theme & Voice */}
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Theme / Style"
              value={theme}
              onChange={(e) => setTheme(e.target.value as VideoTheme)}
              options={[
                { value: "professional", label: "Professional" },
                { value: "cinematic", label: "Cinematic" },
                { value: "educational", label: "Educational" },
                { value: "casual", label: "Casual" },
              ]}
            />
            <Select
              label="Voice"
              value={voice}
              onChange={(e) => setVoice(e.target.value)}
              options={OPENAI_VOICES.map((v) => ({
                value: v.id,
                label: `${v.name} - ${v.description}`,
              }))}
            />
          </div>

          {/* Submit */}
          <Button
            size="lg"
            className="w-full"
            onClick={handleCreate}
            disabled={prompt.length < 50 || !hasRequiredKeys}
          >
            Generate Video
            <ArrowRight className="h-5 w-5" />
          </Button>
        </div>
      </main>
    </>
  );
}
