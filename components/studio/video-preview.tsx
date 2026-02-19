"use client";

import { Project } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatDuration } from "@/lib/utils";
import { Download, Play, Film } from "lucide-react";

interface VideoPreviewProps {
  project: Project;
}

export function VideoPreview({ project }: VideoPreviewProps) {
  const totalDuration = project.scenes.reduce((sum, s) => sum + s.duration, 0);

  const downloadVideo = () => {
    if (!project.videoUrl) return;
    const a = document.createElement("a");
    a.href = project.videoUrl;
    a.download = `${project.title || "video"}.webm`;
    a.click();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Play className="h-5 w-5 text-accent-light" />
            Preview
          </h2>
          <p className="text-xs text-foreground/50 mt-1">
            Review your finished video
          </p>
        </div>
      </div>

      {project.videoUrl ? (
        <>
          <div className="rounded-xl overflow-hidden bg-black mb-4">
            <video
              src={project.videoUrl}
              controls
              className="w-full"
              autoPlay={false}
            />
          </div>

          {/* Scene timeline */}
          <Card className="mb-4 p-4">
            <h3 className="text-sm font-medium mb-3">Scenes</h3>
            <div className="flex gap-1 rounded-lg overflow-hidden">
              {project.scenes.map((scene, i) => {
                const widthPercent = (scene.duration / totalDuration) * 100;
                const colors = [
                  "bg-accent",
                  "bg-purple",
                  "bg-success",
                  "bg-warning",
                  "bg-danger",
                  "bg-accent-light",
                ];
                return (
                  <div
                    key={scene.id}
                    className={`${colors[i % colors.length]} h-8 rounded flex items-center justify-center transition-all hover:opacity-80`}
                    style={{ width: `${widthPercent}%`, minWidth: "24px" }}
                    title={`${scene.title} (${scene.duration}s)`}
                  >
                    <span className="text-[10px] text-white font-medium truncate px-1">
                      {scene.index + 1}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between mt-2">
              <span className="text-xs text-foreground/40">0:00</span>
              <span className="text-xs text-foreground/40">{formatDuration(totalDuration)}</span>
            </div>
          </Card>

          {/* Info */}
          <Card className="mb-4 p-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-xs text-foreground/40">Scenes</p>
                <p className="text-lg font-bold">{project.scenes.length}</p>
              </div>
              <div>
                <p className="text-xs text-foreground/40">Duration</p>
                <p className="text-lg font-bold">{formatDuration(totalDuration)}</p>
              </div>
              <div>
                <p className="text-xs text-foreground/40">Format</p>
                <p className="text-lg font-bold capitalize">{project.format}</p>
              </div>
            </div>
          </Card>

          <Button className="w-full" onClick={downloadVideo}>
            <Download className="h-4 w-4" />
            Download Video (.webm)
          </Button>
        </>
      ) : (
        <div className="text-center py-16 glass rounded-2xl">
          <Film className="h-12 w-12 text-foreground/20 mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">No video yet</h3>
          <p className="text-sm text-foreground/50">
            Complete the rendering step to see your video preview here.
          </p>
        </div>
      )}
    </div>
  );
}
