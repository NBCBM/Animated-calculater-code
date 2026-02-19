"use client";

import { Project } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Card } from "@/components/ui/card";
import { Image as ImageIcon, Download } from "lucide-react";
import { useState, useRef, useEffect, useCallback } from "react";

interface ThumbnailGeneratorProps {
  project: Project;
}

export function ThumbnailGenerator({ project }: ThumbnailGeneratorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [title, setTitle] = useState(project.title || "");
  const [fontSize, setFontSize] = useState(64);
  const [textPosition, setTextPosition] = useState<"top" | "center" | "bottom">("center");
  const [darken, setDarken] = useState(true);

  const firstMedia = project.scenes.find((s) => s.media)?.media;

  const renderThumbnail = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = 1280;
    canvas.height = 720;

    // Background
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, "#1a1a2e");
    gradient.addColorStop(1, "#16213e");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const drawText = () => {
      if (!title) return;

      if (darken) {
        ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      ctx.fillStyle = "#ffffff";
      ctx.font = `bold ${fontSize}px sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.shadowColor = "rgba(0, 0, 0, 0.8)";
      ctx.shadowBlur = 12;

      const yPositions = {
        top: canvas.height * 0.2,
        center: canvas.height * 0.5,
        bottom: canvas.height * 0.8,
      };

      // Word wrap
      const maxWidth = canvas.width - 120;
      const words = title.split(" ");
      const lines: string[] = [];
      let currentLine = "";

      for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        const metrics = ctx.measureText(testLine);
        if (metrics.width > maxWidth && currentLine) {
          lines.push(currentLine);
          currentLine = word;
        } else {
          currentLine = testLine;
        }
      }
      if (currentLine) lines.push(currentLine);

      const lineHeight = fontSize * 1.2;
      const totalHeight = lines.length * lineHeight;
      const startY = yPositions[textPosition] - totalHeight / 2 + lineHeight / 2;

      lines.forEach((line, i) => {
        ctx.fillText(line, canvas.width / 2, startY + i * lineHeight, maxWidth);
      });

      ctx.shadowBlur = 0;
    };

    if (firstMedia) {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        // Cover canvas
        const imgAspect = img.width / img.height;
        const canvasAspect = canvas.width / canvas.height;
        let w: number, h: number, x: number, y: number;
        if (imgAspect > canvasAspect) {
          h = canvas.height;
          w = h * imgAspect;
          x = (canvas.width - w) / 2;
          y = 0;
        } else {
          w = canvas.width;
          h = w / imgAspect;
          x = 0;
          y = (canvas.height - h) / 2;
        }
        ctx.drawImage(img, x, y, w, h);
        drawText();
      };
      img.src = firstMedia.src;
    } else {
      drawText();
    }
  }, [title, fontSize, textPosition, darken, firstMedia]);

  useEffect(() => {
    renderThumbnail();
  }, [renderThumbnail]);

  const downloadThumbnail = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${project.title || "thumbnail"}.png`;
      a.click();
      URL.revokeObjectURL(url);
    }, "image/png");
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <ImageIcon className="h-5 w-5 text-purple" />
            Thumbnail
          </h2>
          <p className="text-xs text-foreground/50 mt-1">Generate a thumbnail for your video</p>
        </div>
      </div>

      <div className="rounded-xl overflow-hidden bg-black mb-4">
        <canvas
          ref={canvasRef}
          className="w-full"
          style={{ aspectRatio: "16/9" }}
        />
      </div>

      <Card className="mb-4">
        <div className="space-y-4">
          <Input
            label="Title Text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter thumbnail title..."
          />
          <Slider
            label="Font Size"
            min={24}
            max={120}
            value={fontSize}
            onChange={(e) => setFontSize(parseInt(e.target.value))}
            showValue
            valueLabel={`${fontSize}px`}
          />
          <div>
            <label className="text-sm font-medium text-foreground/80 block mb-2">Text Position</label>
            <div className="flex gap-2">
              {(["top", "center", "bottom"] as const).map((pos) => (
                <button
                  key={pos}
                  onClick={() => setTextPosition(pos)}
                  className={`px-4 py-2 rounded-lg text-sm capitalize transition-all ${
                    textPosition === pos
                      ? "bg-accent text-white"
                      : "bg-white/5 text-foreground/60 hover:bg-white/10"
                  }`}
                >
                  {pos}
                </button>
              ))}
            </div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={darken}
              onChange={(e) => setDarken(e.target.checked)}
              className="accent-accent"
            />
            <span className="text-sm text-foreground/70">Darken background</span>
          </label>
        </div>
      </Card>

      <Button className="w-full" onClick={downloadThumbnail}>
        <Download className="h-4 w-4" />
        Download Thumbnail (PNG)
      </Button>
    </div>
  );
}
