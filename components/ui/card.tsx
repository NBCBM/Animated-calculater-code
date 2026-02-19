import { cn } from "@/lib/utils";
import { HTMLAttributes, forwardRef } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
  selected?: boolean;
}

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, hover, selected, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "glass p-6",
          hover && "cursor-pointer transition-all duration-200 hover:bg-white/8 hover:border-white/15 hover:shadow-lg hover:shadow-accent/5",
          selected && "border-accent/50 bg-accent/5 shadow-lg shadow-accent/10",
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = "Card";
export { Card };
