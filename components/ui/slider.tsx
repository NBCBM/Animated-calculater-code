"use client";

import { cn } from "@/lib/utils";
import { InputHTMLAttributes } from "react";

interface SliderProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: string;
  showValue?: boolean;
  valueLabel?: string;
}

export function Slider({ label, showValue, valueLabel, className, ...props }: SliderProps) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {(label || showValue) && (
        <div className="flex items-center justify-between">
          {label && <label className="text-sm font-medium text-foreground/80">{label}</label>}
          {showValue && (
            <span className="text-sm text-foreground/60">
              {valueLabel || props.value}
            </span>
          )}
        </div>
      )}
      <input
        type="range"
        className="w-full h-2 rounded-full bg-surface appearance-none cursor-pointer accent-accent [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-accent [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:shadow-accent/30"
        {...props}
      />
    </div>
  );
}
