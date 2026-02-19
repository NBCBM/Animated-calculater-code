"use client";

import { Project, Scene } from "@/lib/types";
import { OPENAI_VOICES } from "@/lib/tts";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Card } from "@/components/ui/card";
import { Mic, Play, Check, Loader2, Volume2 } from "lucide-react";
import { useState } from "react";

interface VoiceSettingsProps {
  project: Project;
  apiKey: string;
  voice: string;
  onVoiceChange: (voice: string) => void;
  onSetAudio: (sceneId: string, audioUrl: string) => void;
  onComplete: () => void;
}

export function VoiceSettings({
  project,
  apiKey,
  voice,
  onVoiceChange,
  onSetAudio,
  onComplete,
}: VoiceSettingsProps) {
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [previewingScene, setPreviewingScene] = useState<string | null>(null);

  const allHaveAudio = project.scenes.every((s) => s.audioUrl !== null);

  const generateAllAudio = async () => {
    setGenerating(true);
    setProgress(0);
    setError("");

    try {
      for (let i = 0; i < project.scenes.length; i++) {
        const scene = project.scenes[i];
        if (scene.audioUrl) {
          setProgress(((i + 1) / project.scenes.length) * 100);
          continue;
        }

        const res = await fetch("/api/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: scene.narration,
            voice,
            apiKey,
          }),
        });

        if (!res.ok) {
          throw new Error(`Failed to generate audio for scene ${i + 1}`);
        }

        const arrayBuffer = await res.arrayBuffer();
        const blob = new Blob([arrayBuffer], { type: "audio/mpeg" });
        const url = URL.createObjectURL(blob);
        onSetAudio(scene.id, url);
        setProgress(((i + 1) / project.scenes.length) * 100);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Audio generation failed");
    } finally {
      setGenerating(false);
    }
  };

  const previewScene = async (scene: Scene) => {
    if (scene.audioUrl) {
      setPreviewingScene(scene.id);
      const audio = new Audio(scene.audioUrl);
      audio.onended = () => setPreviewingScene(null);
      audio.play();
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Mic className="h-5 w-5 text-success" />
            Voice
          </h2>
          <p className="text-xs text-foreground/50 mt-1">
            Generate AI voiceover narration for each scene
          </p>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-danger/10 border border-danger/20 text-sm text-danger mb-4">
          {error}
        </div>
      )}

      <Card className="mb-6">
        <div className="flex items-end gap-4">
          <div className="flex-1">
            <Select
              label="Voice"
              value={voice}
              onChange={(e) => onVoiceChange(e.target.value)}
              options={OPENAI_VOICES.map((v) => ({
                value: v.id,
                label: `${v.name} - ${v.description}`,
              }))}
            />
          </div>
          <Button onClick={generateAllAudio} isLoading={generating}>
            <Volume2 className="h-4 w-4" />
            Generate All Audio
          </Button>
        </div>

        {generating && (
          <div className="mt-4">
            <Progress value={progress} label="Generating audio..." />
          </div>
        )}
      </Card>

      <div className="space-y-2">
        {project.scenes.map((scene) => (
          <Card key={scene.id} className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-surface flex items-center justify-center text-xs font-bold text-foreground/50">
                {scene.index + 1}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-medium truncate">{scene.title}</h4>
                <p className="text-xs text-foreground/40">
                  {scene.narration.length} chars &middot; ~{Math.ceil(scene.narration.split(" ").length / 2.5)}s
                </p>
              </div>
              <div className="flex items-center gap-2">
                {scene.audioUrl ? (
                  <>
                    <Check className="h-4 w-4 text-success" />
                    <button
                      onClick={() => previewScene(scene)}
                      className="p-1.5 rounded-lg hover:bg-white/5 transition-colors"
                    >
                      {previewingScene === scene.id ? (
                        <Loader2 className="h-4 w-4 animate-spin text-accent-light" />
                      ) : (
                        <Play className="h-4 w-4 text-foreground/50" />
                      )}
                    </button>
                  </>
                ) : (
                  <span className="text-xs text-foreground/30">Pending</span>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="pt-6">
        <Button className="w-full" onClick={onComplete} disabled={!allHaveAudio}>
          {allHaveAudio ? "Continue to Render" : "Generate audio for all scenes to continue"}
        </Button>
      </div>
    </div>
  );
}
