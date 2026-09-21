import { type TextareaHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "min-h-32 w-full rounded-xl border border-border bg-surface px-3.5 py-3 text-sm text-fg shadow-[var(--shadow-border)] placeholder:text-subtle",
      "transition-[box-shadow,border-color] duration-150 ease-out",
      "focus:border-accent focus:outline-none focus:ring-2 focus:ring-ring/30",
      "disabled:cursor-not-allowed disabled:opacity-50",
      className,
    )}
    {...props}
  />
));
Textarea.displayName = "Textarea";
