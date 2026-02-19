"use client";

import { Scene, Project, DURATION_CONFIG } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { SceneCard } from "./scene-card";
import { speakText, stopSpeaking } from "@/lib/tts";
import { formatDuration } from "@/lib/utils";
import { v4 as uuidv4 } from "uuid";
import { FileText, RefreshCw, CheckCheck, Loader2 } from "lucide-react";
import { useState } from "react";

interface ScriptEditorProps {
  project: Project;
  apiKey: string;
  onUpdateScene: (sceneId: string, updates: Partial<Scene>) => void;
  onSetScenes: (scenes: Scene[]) => void;
  onComplete: () => void;
}

export function ScriptEditor({
  project,
  apiKey,
  onUpdateScene,
  onSetScenes,
  onComplete,
}: ScriptEditorProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState("");

  const hasScenes = project.scenes.length > 0;
  const allApproved = hasScenes && project.scenes.every((s) => s.status === "approved");
  const totalDuration = project.scenes.reduce((sum, s) => sum + s.duration, 0);
  const cfg = DURATION_CONFIG[project.duration];

  const generateScript = async () => {
    setIsGenerating(true);
    setError("");

    try {
      const sceneCount =
        Math.floor(Math.random() * (cfg.maxScenes - cfg.minScenes + 1)) + cfg.minScenes;

      const res = await fetch("/api/generate-script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: project.prompt,
          format: project.format,
          duration: project.duration,
          theme: project.theme,
          sceneCount,
          apiKey,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to generate script");
      }

      const data = await res.json();

      const scenes: Scene[] = data.scenes.map(
        (s: { title: string; narration: string; visualDescription: string; duration: number }, i: number) => ({
          id: uuidv4(),
          index: i,
          title: s.title,
          narration: s.narration,
          visualDescription: s.visualDescription,
          duration: s.duration || cfg.avgDuration,
          status: "pending" as const,
          media: null,
          audioUrl: null,
        })
      );

      onSetScenes(scenes);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Script generation failed");
    } finally {
      setIsGenerating(false);
    }
  };

  const approveAll = () => {
    project.scenes.forEach((scene) => {
      if (scene.status !== "approved") {
        onUpdateScene(scene.id, { status: "approved" });
      }
    });
  };

  const previewNarration = (text: string) => {
    stopSpeaking();
    speakText(text);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <FileText className="h-5 w-5 text-accent-light" />
            Script
          </h2>
          {hasScenes && (
            <p className="text-xs text-foreground/50 mt-1">
              {project.scenes.length} scenes &middot; {formatDuration(totalDuration)} total
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {hasScenes && (
            <>
              <Button variant="ghost" size="sm" onClick={approveAll}>
                <CheckCheck className="h-4 w-4" />
                Approve All
              </Button>
              <Button variant="ghost" size="sm" onClick={generateScript} isLoading={isGenerating}>
                <RefreshCw className="h-4 w-4" />
                Regenerate
              </Button>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-danger/10 border border-danger/20 text-sm text-danger mb-4">
          {error}
        </div>
      )}

      {!hasScenes && !isGenerating && (
        <div className="text-center py-16 glass rounded-2xl">
          <FileText className="h-12 w-12 text-foreground/20 mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">No script yet</h3>
          <p className="text-sm text-foreground/50 mb-6 max-w-sm mx-auto">
            Generate an AI-powered script based on your topic. You can review and edit each scene.
          </p>
          <Button onClick={generateScript} isLoading={isGenerating}>
            Generate Script
          </Button>
        </div>
      )}

      {isGenerating && !hasScenes && (
        <div className="text-center py-16 glass rounded-2xl">
          <Loader2 className="h-10 w-10 text-accent-light mx-auto mb-4 animate-spin" />
          <h3 className="text-lg font-medium mb-2">Generating Script...</h3>
          <p className="text-sm text-foreground/50">AI is writing your video script. This may take a moment.</p>
        </div>
      )}

      {hasScenes && (
        <div className="space-y-3">
          {project.scenes.map((scene) => (
            <SceneCard
              key={scene.id}
              scene={scene}
              onApprove={() => onUpdateScene(scene.id, { status: "approved" })}
              onReject={() => onUpdateScene(scene.id, { status: "rejected" })}
              onUpdate={(updates) => onUpdateScene(scene.id, updates)}
              onPreviewNarration={() => previewNarration(scene.narration)}
            />
          ))}

          <div className="pt-4">
            <Button
              className="w-full"
              onClick={onComplete}
              disabled={!allApproved}
            >
              {allApproved ? "Continue to Media Selection" : "Approve all scenes to continue"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
