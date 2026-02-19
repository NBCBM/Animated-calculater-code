"use client";

import { cn } from "@/lib/utils";
import { TextareaHTMLAttributes, forwardRef } from "react";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
  showCount?: boolean;
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, helperText, showCount, maxLength, value, ...props }, ref) => {
    const length = typeof value === "string" ? value.length : 0;

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label className="text-sm font-medium text-foreground/80">{label}</label>
        )}
        <textarea
          ref={ref}
          value={value}
          maxLength={maxLength}
          className={cn(
            "w-full rounded-xl bg-white/5 border border-border px-4 py-3 text-sm text-foreground placeholder:text-foreground/40 outline-none transition-all duration-200 resize-y min-h-[120px]",
            "focus:border-accent focus:ring-1 focus:ring-accent/50",
            error && "border-danger focus:border-danger focus:ring-danger/50",
            className
          )}
          {...props}
        />
        <div className="flex items-center justify-between">
          <div>
            {error && <p className="text-xs text-danger">{error}</p>}
            {helperText && !error && (
              <p className="text-xs text-foreground/50">{helperText}</p>
            )}
          </div>
          {showCount && maxLength && (
            <p className={cn("text-xs", length > maxLength * 0.9 ? "text-warning" : "text-foreground/40")}>
              {length}/{maxLength}
            </p>
          )}
        </div>
      </div>
    );
  }
);

Textarea.displayName = "Textarea";
export { Textarea };
