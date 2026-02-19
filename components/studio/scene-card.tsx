"use client";

import { Scene } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Check,
  X,
  Edit3,
  Volume2,
  GripVertical,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useState } from "react";

interface SceneCardProps {
  scene: Scene;
  onApprove: () => void;
  onReject: () => void;
  onUpdate: (updates: Partial<Scene>) => void;
  onPreviewNarration: () => void;
}

export function SceneCard({
  scene,
  onApprove,
  onReject,
  onUpdate,
  onPreviewNarration,
}: SceneCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);

  const statusVariant = {
    pending: "default" as const,
    approved: "success" as const,
    rejected: "danger" as const,
    editing: "info" as const,
  };

  return (
    <Card className={cn("transition-all", scene.status === "rejected" && "opacity-50")}>
      <div className="flex items-start gap-3">
        <div className="flex items-center gap-2 shrink-0 pt-1">
          <GripVertical className="h-4 w-4 text-foreground/20 cursor-grab" />
          <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center text-sm font-bold text-accent-light">
            {scene.index + 1}
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {editing ? (
              <input
                className="flex-1 bg-transparent border-b border-border text-foreground font-semibold text-sm outline-none focus:border-accent"
                value={scene.title}
                onChange={(e) => onUpdate({ title: e.target.value })}
                onBlur={() => setEditing(false)}
                autoFocus
              />
            ) : (
              <h4 className="font-semibold text-sm truncate">{scene.title}</h4>
            )}
            <Badge variant={statusVariant[scene.status]}>{scene.status}</Badge>
            <span className="text-xs text-foreground/40 shrink-0">{scene.duration}s</span>
          </div>

          <p className="text-xs text-foreground/50 line-clamp-2 mb-2">
            {scene.narration}
          </p>

          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-accent-light hover:text-accent flex items-center gap-1"
          >
            {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            {expanded ? "Collapse" : "Expand"}
          </button>

          {expanded && (
            <div className="mt-3 space-y-3">
              <div>
                <label className="text-xs font-medium text-foreground/50 block mb-1">
                  Narration
                </label>
                <textarea
                  className="w-full bg-white/5 border border-border rounded-lg px-3 py-2 text-sm text-foreground resize-y min-h-[80px] outline-none focus:border-accent"
                  value={scene.narration}
                  onChange={(e) => onUpdate({ narration: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-foreground/50 block mb-1">
                  Visual Description (for media search)
                </label>
                <input
                  className="w-full bg-white/5 border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
                  value={scene.visualDescription}
                  onChange={(e) => onUpdate({ visualDescription: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-foreground/50 block mb-1">
                  Duration (seconds)
                </label>
                <input
                  type="number"
                  min={5}
                  max={120}
                  className="w-24 bg-white/5 border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
                  value={scene.duration}
                  onChange={(e) => onUpdate({ duration: parseInt(e.target.value) || 15 })}
                />
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={onPreviewNarration}
            className="p-1.5 rounded-lg hover:bg-white/5 transition-colors"
            title="Preview narration"
          >
            <Volume2 className="h-4 w-4 text-foreground/40" />
          </button>
          <button
            onClick={() => setEditing(true)}
            className="p-1.5 rounded-lg hover:bg-white/5 transition-colors"
            title="Edit"
          >
            <Edit3 className="h-4 w-4 text-foreground/40" />
          </button>
          <button
            onClick={onApprove}
            className="p-1.5 rounded-lg hover:bg-success/10 transition-colors"
            title="Approve"
          >
            <Check className="h-4 w-4 text-success" />
          </button>
          <button
            onClick={onReject}
            className="p-1.5 rounded-lg hover:bg-danger/10 transition-colors"
            title="Reject"
          >
            <X className="h-4 w-4 text-danger" />
          </button>
        </div>
      </div>
    </Card>
  );
}
