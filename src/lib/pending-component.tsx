import { Loader2 } from "lucide-react";

export function AppPendingComponent() {
  return (
    <div className="relative min-h-[50vh] w-full flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-200">
      {/* Top indeterminate accent progress bar */}
      <div className="fixed top-0 left-0 right-0 z-50 h-0.5 bg-accent/20 overflow-hidden">
        <div className="h-full bg-accent w-1/3 animate-[shimmer_1.5s_infinite_linear] rounded-full" />
      </div>

      <div className="flex flex-col items-center gap-3">
        <div className="flex size-11 items-center justify-center rounded-2xl bg-surface-2 border border-border shadow-xs">
          <Loader2 className="size-5 text-accent animate-spin" />
        </div>
        <p className="text-xs font-medium text-muted tracking-wide uppercase">
          Loading prynth!…
        </p>
      </div>
    </div>
  );
}
