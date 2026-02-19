"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Project, Scene, PexelsMedia } from "@/lib/types";
import { getProject, saveProject } from "@/lib/storage";
import { useSettings } from "@/hooks/useSettings";
import { Sidebar, StudioStep } from "@/components/layout/sidebar";
import { ScriptEditor } from "@/components/studio/script-editor";
import { MediaSelector } from "@/components/studio/media-selector";
import { VoiceSettings } from "@/components/studio/voice-settings";
import { VideoRendererUI } from "@/components/studio/video-renderer-ui";
import { VideoPreview } from "@/components/studio/video-preview";
import { ThumbnailGenerator } from "@/components/studio/thumbnail-generator";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  ArrowLeft,
  Zap,
  Loader2,
} from "lucide-react";
import { v4 as uuidv4 } from "uuid";

export default function StudioPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const { settings, loaded: settingsLoaded } = useSettings();

  const [project, setProject] = useState<Project | null>(null);
  const [currentStep, setCurrentStep] = useState<StudioStep>("script");
  const [completedSteps, setCompletedSteps] = useState<StudioStep[]>([]);
  const [autoMode, setAutoMode] = useState(false);
  const [autoProgress, setAutoProgress] = useState(0);
  const [autoStatus, setAutoStatus] = useState("");
  const autoRunning = useRef(false);

  // Load project
  useEffect(() => {
    if (!params.id) return;
    const p = getProject(params.id as string);
    if (p) {
      setProject(p);
      if (p.title) {
        // Restore step from status
        if (p.status === "completed" && p.videoUrl) {
          setCurrentStep("preview");
          setCompletedSteps(["script", "media", "voice", "render", "preview"]);
        }
      }
    }
  }, [params.id]);

  // Check for auto mode
  useEffect(() => {
    if (searchParams.get("auto") === "true" && project && !autoRunning.current) {
      setAutoMode(true);
    }
  }, [searchParams, project]);

  // Persist project changes
  const updateProject = useCallback(
    (updates: Partial<Project>) => {
      setProject((prev) => {
        if (!prev) return prev;
        const updated = { ...prev, ...updates };
        saveProject(updated);
        return updated;
      });
    },
    []
  );

  const updateScene = useCallback(
    (sceneId: string, updates: Partial<Scene>) => {
      setProject((prev) => {
        if (!prev) return prev;
        const updated = {
          ...prev,
          scenes: prev.scenes.map((s) =>
            s.id === sceneId ? { ...s, ...updates } : s
          ),
        };
        saveProject(updated);
        return updated;
      });
    },
    []
  );

  const setScenes = useCallback(
    (scenes: Scene[]) => {
      setProject((prev) => {
        if (!prev) return prev;
        const title = scenes.length > 0 ? scenes[0].title.replace(/^(Introduction|Intro):?\s*/i, "") : prev.title;
        const updated = { ...prev, scenes, title: prev.title || title, status: "scripting" as const };
        saveProject(updated);
        return updated;
      });
    },
    []
  );

  const setSceneMedia = useCallback(
    (sceneId: string, media: PexelsMedia) => {
      updateScene(sceneId, { media });
    },
    [updateScene]
  );

  const setSceneAudio = useCallback(
    (sceneId: string, audioUrl: string) => {
      updateScene(sceneId, { audioUrl });
    },
    [updateScene]
  );

  // Auto mode pipeline
  useEffect(() => {
    if (!autoMode || !project || autoRunning.current || !settingsLoaded) return;
    if (!settings.openaiApiKey || !settings.pexelsApiKey) return;

    autoRunning.current = true;

    const runPipeline = async () => {
      try {
        // Step 1: Generate script
        setAutoStatus("Generating script...");
        setAutoProgress(10);
        setCurrentStep("script");

        const cfg = {
          short: { min: 3, max: 4 },
          medium: { min: 6, max: 8 },
          long: { min: 12, max: 15 },
        }[project.duration];
        const sceneCount = Math.floor(Math.random() * (cfg.max - cfg.min + 1)) + cfg.min;

        const scriptRes = await fetch("/api/generate-script", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: project.prompt,
            format: project.format,
            duration: project.duration,
            theme: project.theme,
            sceneCount,
            apiKey: settings.openaiApiKey,
          }),
        });

        if (!scriptRes.ok) throw new Error("Script generation failed");
        const scriptData = await scriptRes.json();

        const scenes: Scene[] = scriptData.scenes.map(
          (s: { title: string; narration: string; visualDescription: string; duration: number }, i: number) => ({
            id: uuidv4(),
            index: i,
            title: s.title,
            narration: s.narration,
            visualDescription: s.visualDescription,
            duration: s.duration || 25,
            status: "approved" as const,
            media: null,
            audioUrl: null,
          })
        );

        setProject((prev) => {
          if (!prev) return prev;
          const updated = {
            ...prev,
            scenes,
            title: scriptData.title || prev.title,
            status: "media-selection" as const,
          };
          saveProject(updated);
          return updated;
        });
        setCompletedSteps(["script"]);
        setAutoProgress(30);

        // Step 2: Find media
        setAutoStatus("Finding media for scenes...");
        setCurrentStep("media");

        for (let i = 0; i < scenes.length; i++) {
          const scene = scenes[i];
          try {
            const mediaRes = await fetch("/api/search-media", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                query: scene.visualDescription,
                type: "photos",
                perPage: 1,
                apiKey: settings.pexelsApiKey,
              }),
            });
            if (mediaRes.ok) {
              const mediaData = await mediaRes.json();
              if (mediaData.photos?.length > 0) {
                scenes[i] = { ...scenes[i], media: mediaData.photos[0] };
              }
            }
          } catch {
            // Skip failed media searches
          }
          setAutoProgress(30 + ((i + 1) / scenes.length) * 20);
        }

        setProject((prev) => {
          if (!prev) return prev;
          const updated = { ...prev, scenes, status: "voice-generation" as const };
          saveProject(updated);
          return updated;
        });
        setCompletedSteps(["script", "media"]);

        // Step 3: Generate audio
        setAutoStatus("Generating voiceover...");
        setCurrentStep("voice");

        for (let i = 0; i < scenes.length; i++) {
          try {
            const ttsRes = await fetch("/api/tts", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                text: scenes[i].narration,
                voice: project.voiceId,
                apiKey: settings.openaiApiKey,
              }),
            });
            if (ttsRes.ok) {
              const arrayBuffer = await ttsRes.arrayBuffer();
              const blob = new Blob([arrayBuffer], { type: "audio/mpeg" });
              scenes[i] = { ...scenes[i], audioUrl: URL.createObjectURL(blob) };
            }
          } catch {
            // Skip failed TTS
          }
          setAutoProgress(50 + ((i + 1) / scenes.length) * 30);
        }

        setProject((prev) => {
          if (!prev) return prev;
          const updated = { ...prev, scenes, status: "rendering" as const };
          saveProject(updated);
          return updated;
        });
        setCompletedSteps(["script", "media", "voice"]);
        setAutoProgress(80);

        // Step 4: Render video
        setAutoStatus("Rendering video...");
        setCurrentStep("render");

        // We'll let the VideoRendererUI handle the actual rendering
        // For auto mode, we update project and set step to render
        setAutoProgress(85);
        setAutoMode(false);
        autoRunning.current = false;

      } catch (err) {
        console.error("Auto pipeline error:", err);
        setAutoStatus("Error: " + (err instanceof Error ? err.message : "Pipeline failed"));
        setAutoMode(false);
        autoRunning.current = false;
      }
    };

    runPipeline();
  }, [autoMode, project, settings, settingsLoaded]);

  if (!project) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-accent-light mx-auto mb-4" />
          <p className="text-foreground/50">Loading project...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="h-14 glass-strong flex items-center px-4 gap-4 sticky top-0 z-30">
        <Link href="/projects" className="p-1.5 rounded-lg hover:bg-white/5 transition-colors">
          <ArrowLeft className="h-5 w-5 text-foreground/60" />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="font-semibold text-sm truncate">
            {project.title || "Untitled Project"}
          </h1>
        </div>
        <Badge
          variant={
            project.status === "completed"
              ? "success"
              : project.status === "rendering"
              ? "warning"
              : "info"
          }
        >
          {project.status}
        </Badge>
      </header>

      {/* Auto mode progress overlay */}
      {autoMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="glass-strong p-8 max-w-md w-full mx-4 text-center">
            <Zap className="h-10 w-10 text-warning mx-auto mb-4" />
            <h2 className="text-lg font-semibold mb-2">Auto Mode</h2>
            <p className="text-sm text-foreground/60 mb-6">{autoStatus}</p>
            <Progress value={autoProgress} />
          </div>
        </div>
      )}

      <div className="flex gap-4 p-4 max-w-7xl mx-auto">
        <Sidebar
          currentStep={currentStep}
          onStepChange={setCurrentStep}
          completedSteps={completedSteps}
        />

        <main className="flex-1 min-w-0">
          {currentStep === "script" && (
            <ScriptEditor
              project={project}
              apiKey={settings.openaiApiKey}
              onUpdateScene={updateScene}
              onSetScenes={setScenes}
              onComplete={() => {
                setCompletedSteps((prev) => prev.includes("script") ? prev : [...prev, "script" as const]);
                setCurrentStep("media");
                updateProject({ status: "media-selection" });
              }}
            />
          )}

          {currentStep === "media" && (
            <MediaSelector
              project={project}
              pexelsApiKey={settings.pexelsApiKey}
              onSetMedia={setSceneMedia}
              onComplete={() => {
                setCompletedSteps((prev) => prev.includes("media") ? prev : [...prev, "media" as const]);
                setCurrentStep("voice");
                updateProject({ status: "voice-generation" });
              }}
            />
          )}

          {currentStep === "voice" && (
            <VoiceSettings
              project={project}
              apiKey={settings.openaiApiKey}
              voice={project.voiceId}
              onVoiceChange={(voice) => updateProject({ voiceId: voice })}
              onSetAudio={setSceneAudio}
              onComplete={() => {
                setCompletedSteps((prev) => prev.includes("voice") ? prev : [...prev, "voice" as const]);
                setCurrentStep("render");
                updateProject({ status: "rendering" });
              }}
            />
          )}

          {currentStep === "render" && (
            <VideoRendererUI
              project={project}
              onVideoReady={(url) => updateProject({ videoUrl: url })}
              onComplete={() => {
                setCompletedSteps((prev) => prev.includes("render") ? prev : [...prev, "render" as const]);
                setCurrentStep("preview");
                updateProject({ status: "completed" });
              }}
            />
          )}

          {currentStep === "preview" && (
            <VideoPreview project={project} />
          )}

          {currentStep === "thumbnail" && (
            <ThumbnailGenerator project={project} />
          )}
        </main>
      </div>
    </div>
  );
}
