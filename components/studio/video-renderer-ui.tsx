"use client";

import { Project, RenderConfig, DEFAULT_RENDER_CONFIG } from "@/lib/types";
import { VideoRenderer } from "@/lib/video-renderer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Select } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Film, Play, Square, Download } from "lucide-react";
import { useState, useRef, useEffect } from "react";

interface VideoRendererUIProps {
  project: Project;
  onVideoReady: (url: string) => void;
  onComplete: () => void;
}

export function VideoRendererUI({ project, onVideoReady, onComplete }: VideoRendererUIProps) {
  const [config, setConfig] = useState<RenderConfig>(DEFAULT_RENDER_CONFIG);
  const [status, setStatus] = useState<"idle" | "preparing" | "rendering" | "complete" | "error">("idle");
  const [progress, setProgress] = useState(0);
  const [currentScene, setCurrentScene] = useState(0);
  const [videoUrl, setVideoUrl] = useState<string | null>(project.videoUrl);
  const [error, setError] = useState("");
  const rendererRef = useRef<VideoRenderer | null>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return () => {
      if (rendererRef.current) {
        rendererRef.current.destroy();
      }
    };
  }, []);

  const startRender = async () => {
    setStatus("preparing");
    setProgress(0);
    setError("");

    try {
      const renderer = new VideoRenderer(config);
      rendererRef.current = renderer;

      renderer.setProgressCallback((p, scene) => {
        setProgress(Math.round(p * 100));
        setCurrentScene(scene);
      });

      // Show canvas preview
      if (canvasContainerRef.current) {
        canvasContainerRef.current.innerHTML = "";
        const canvas = renderer.getCanvas();
        canvas.style.width = "100%";
        canvas.style.height = "auto";
        canvas.style.borderRadius = "0.5rem";
        canvasContainerRef.current.appendChild(canvas);
      }

      setStatus("preparing");
      await renderer.prepare(project.scenes);

      setStatus("rendering");
      const blob = await renderer.render();

      const url = URL.createObjectURL(blob);
      setVideoUrl(url);
      onVideoReady(url);
      setStatus("complete");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Rendering failed");
      setStatus("error");
    }
  };

  const cancelRender = () => {
    if (rendererRef.current) {
      rendererRef.current.cancel();
    }
    setStatus("idle");
  };

  const downloadVideo = () => {
    if (!videoUrl) return;
    const a = document.createElement("a");
    a.href = videoUrl;
    a.download = `${project.title || "video"}.webm`;
    a.click();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Film className="h-5 w-5 text-warning" />
            Render
          </h2>
          <p className="text-xs text-foreground/50 mt-1">
            Configure settings and render your video
          </p>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-danger/10 border border-danger/20 text-sm text-danger mb-4">
          {error}
        </div>
      )}

      {/* Settings */}
      {status === "idle" && (
        <Card className="mb-6">
          <h3 className="font-medium text-sm mb-4">Render Settings</h3>
          <div className="space-y-4">
            <Select
              label="Transition"
              value={config.transition}
              onChange={(e) =>
                setConfig({ ...config, transition: e.target.value as RenderConfig["transition"] })
              }
              options={[
                { value: "fade", label: "Fade" },
                { value: "crossfade", label: "Crossfade" },
                { value: "none", label: "None" },
              ]}
            />

            <Slider
              label="Transition Duration"
              min={200}
              max={2000}
              step={100}
              value={config.transitionDuration}
              onChange={(e) =>
                setConfig({ ...config, transitionDuration: parseInt(e.target.value) })
              }
              showValue
              valueLabel={`${config.transitionDuration}ms`}
            />

            <Slider
              label="Ken Burns Intensity"
              min={0}
              max={100}
              value={config.kenBurnsIntensity * 100}
              onChange={(e) =>
                setConfig({ ...config, kenBurnsIntensity: parseInt(e.target.value) / 100 })
              }
              showValue
              valueLabel={`${Math.round(config.kenBurnsIntensity * 100)}%`}
            />

            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.showSubtitles}
                  onChange={(e) => setConfig({ ...config, showSubtitles: e.target.checked })}
                  className="accent-accent"
                />
                <span className="text-sm text-foreground/70">Show Subtitles</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.showSceneTitles}
                  onChange={(e) => setConfig({ ...config, showSceneTitles: e.target.checked })}
                  className="accent-accent"
                />
                <span className="text-sm text-foreground/70">Show Scene Titles</span>
              </label>
            </div>
          </div>
        </Card>
      )}

      {/* Canvas Preview */}
      {(status === "preparing" || status === "rendering") && (
        <div className="mb-6">
          <div
            ref={canvasContainerRef}
            className="rounded-xl overflow-hidden bg-surface aspect-video"
          />
          <div className="mt-4">
            <Progress
              value={progress}
              label={
                status === "preparing"
                  ? "Preparing assets..."
                  : `Rendering scene ${currentScene + 1} of ${project.scenes.length}`
              }
            />
          </div>
        </div>
      )}

      {/* Complete state */}
      {status === "complete" && videoUrl && (
        <div className="mb-6">
          <div className="rounded-xl overflow-hidden bg-surface">
            <video
              src={videoUrl}
              controls
              className="w-full"
            />
          </div>
          <div className="flex gap-3 mt-4">
            <Button onClick={downloadVideo} className="flex-1">
              <Download className="h-4 w-4" />
              Download Video
            </Button>
            <Button variant="secondary" onClick={() => setStatus("idle")}>
              Re-render
            </Button>
          </div>
        </div>
      )}

      {/* Actions */}
      {status === "idle" && (
        <Button className="w-full" onClick={startRender}>
          <Play className="h-4 w-4" />
          Start Rendering
        </Button>
      )}

      {(status === "preparing" || status === "rendering") && (
        <Button variant="danger" className="w-full" onClick={cancelRender}>
          <Square className="h-4 w-4" />
          Cancel
        </Button>
      )}

      {status === "complete" && (
        <Button className="w-full mt-3" onClick={onComplete}>
          Continue to Preview
        </Button>
      )}
    </div>
  );
}
