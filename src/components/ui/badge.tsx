import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

export function Badge({
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full bg-accent-soft px-2.5 py-1 text-xs font-medium text-fg",
        className,
      )}
      {...props}
    />
  );
}
