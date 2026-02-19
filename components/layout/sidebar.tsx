"use client";

import { cn } from "@/lib/utils";
import { Check, FileText, Image, Mic, Play, Film, ImageIcon } from "lucide-react";

export type StudioStep = "script" | "media" | "voice" | "render" | "preview" | "thumbnail";

interface SidebarProps {
  currentStep: StudioStep;
  onStepChange: (step: StudioStep) => void;
  completedSteps: StudioStep[];
}

const steps: { id: StudioStep; label: string; icon: React.ReactNode }[] = [
  { id: "script", label: "Script", icon: <FileText className="h-4 w-4" /> },
  { id: "media", label: "Media", icon: <Image className="h-4 w-4" /> },
  { id: "voice", label: "Voice", icon: <Mic className="h-4 w-4" /> },
  { id: "render", label: "Render", icon: <Film className="h-4 w-4" /> },
  { id: "preview", label: "Preview", icon: <Play className="h-4 w-4" /> },
  { id: "thumbnail", label: "Thumbnail", icon: <ImageIcon className="h-4 w-4" /> },
];

export function Sidebar({ currentStep, onStepChange, completedSteps }: SidebarProps) {
  return (
    <aside className="w-56 shrink-0 glass-strong p-3 flex flex-col gap-1 h-fit sticky top-4">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground/40 px-3 py-2">
        Steps
      </h3>
      {steps.map((step, i) => {
        const isCompleted = completedSteps.includes(step.id);
        const isCurrent = currentStep === step.id;

        return (
          <button
            key={step.id}
            onClick={() => onStepChange(step.id)}
            className={cn(
              "flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 text-left",
              isCurrent
                ? "bg-accent/15 text-accent-light"
                : isCompleted
                ? "text-success hover:bg-white/5"
                : "text-foreground/50 hover:text-foreground/70 hover:bg-white/5"
            )}
          >
            <div
              className={cn(
                "flex items-center justify-center h-6 w-6 rounded-full text-xs shrink-0",
                isCurrent
                  ? "bg-accent text-white"
                  : isCompleted
                  ? "bg-success/20 text-success"
                  : "bg-white/10 text-foreground/40"
              )}
            >
              {isCompleted ? <Check className="h-3.5 w-3.5" /> : i + 1}
            </div>
            {step.label}
          </button>
        );
      })}
    </aside>
  );
}
