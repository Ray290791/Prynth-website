import { useState } from "react";
import {
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  Sparkles,
  RotateCw,
  Layers,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Compass,
  ArrowRight,
  Sliders,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type {
  PrintabilityReport,
  SlicerRecommendation,
} from "@/lib/mesh-analysis";

export interface PrintabilityCheckerProps {
  report: PrintabilityReport | null;
  currentSettings: {
    supports: string;
    brim: string;
    quality: string;
    infillPct: number;
    infillPattern: string;
  };
  onApplyOrientation?: (rotation: [number, number, number]) => void;
  onApplyRecommendation?: (rec: SlicerRecommendation) => void;
  onApplyAllRecommendations?: () => void;
  className?: string;
}

export function PrintabilityChecker({
  report,
  currentSettings,
  onApplyOrientation,
  onApplyRecommendation,
  onApplyAllRecommendations,
  className,
}: PrintabilityCheckerProps) {
  const [expanded, setExpanded] = useState(true);
  const [appliedRecIds, setAppliedRecIds] = useState<Set<string>>(new Set());

  if (!report) return null;

  const { status, score, summary, metrics, optimalOrientation, isCurrentOrientationOptimal, recommendations } = report;

  // Check which recommendations are already satisfied by currentSettings
  const isRecApplied = (rec: SlicerRecommendation) => {
    // Dynamic re-check for orientation: NEVER permanently suppress if orientation changed
    if (rec.category === "orientation") {
      return report.isCurrentOrientationOptimal;
    }
    if (appliedRecIds.has(rec.id)) return true;
    if (rec.category === "supports") {
      return currentSettings.supports !== "none";
    }
    if (rec.category === "brim") {
      return currentSettings.brim === "outer" || currentSettings.brim === "auto";
    }
    if (rec.category === "quality") {
      return currentSettings.quality === rec.suggestedValue;
    }
    if (rec.category === "infill") {
      return (
        currentSettings.infillPct === rec.suggestedValue.infillPct &&
        currentSettings.infillPattern === rec.suggestedValue.infillPattern
      );
    }
    return false;
  };

  const handleApplySingle = (rec: SlicerRecommendation) => {
    setAppliedRecIds((prev) => new Set([...prev, rec.id]));
    if (onApplyRecommendation) {
      onApplyRecommendation(rec);
    }
  };

  const handleApplyAll = () => {
    const allIds = recommendations.map((r) => r.id);
    setAppliedRecIds(new Set(allIds));
    if (onApplyAllRecommendations) {
      onApplyAllRecommendations();
    }
  };

  const unappliedCount = recommendations.filter((r) => !isRecApplied(r)).length;

  return (
    <div
      className={cn(
        "rounded-2xl border bg-surface transition-all shadow-[var(--shadow-border)] overflow-hidden",
        status === "optimal"
          ? "border-emerald-500/30 dark:border-emerald-500/20"
          : status === "warning"
          ? "border-amber-500/40 dark:border-amber-500/30"
          : "border-rose-500/40 dark:border-rose-500/30",
        className
      )}
    >
      {/* Pre-Flight Inspection Header */}
      <div className="p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3 border-b border-border/60 bg-surface-2/40">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "flex size-10 items-center justify-center rounded-xl font-bold text-sm shadow-sm",
              status === "optimal"
                ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                : status === "warning"
                ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                : "bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30"
            )}
          >
            {score}%
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-fg flex items-center gap-1.5">
                <ShieldCheck className="size-4 text-accent" />
                Bambu Slicer Pre-Flight Inspection
              </h3>
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
                  status === "optimal"
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    : status === "warning"
                    ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                    : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                )}
              >
                {status === "optimal"
                  ? "Print Ready"
                  : status === "warning"
                  ? "Slicer Tuning Recommended"
                  : "Critical Adjustment Needed"}
              </span>
            </div>
            <p className="text-xs text-muted mt-0.5 max-w-xl">{summary}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {unappliedCount > 0 && onApplyAllRecommendations && (
            <Button
              type="button"
              size="sm"
              onClick={handleApplyAll}
              className="h-8 gap-1.5 text-xs font-semibold bg-accent text-ink hover:opacity-95 shadow-sm"
            >
              <Sparkles className="size-3.5" />
              Apply All ({unappliedCount})
            </Button>
          )}

          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="flex size-8 items-center justify-center rounded-lg text-muted hover:text-fg hover:bg-surface-2 transition-colors"
            title={expanded ? "Collapse Details" : "Expand Details"}
          >
            {expanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="p-4 sm:p-5 space-y-4">
          {/* Telemetry Metric Cards */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {/* 1. Bed Contact */}
            <div className="rounded-xl border border-border/60 bg-surface-2/30 p-2.5">
              <span className="text-[11px] text-muted block">Bed Adhesion Contact</span>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="font-semibold text-sm text-fg">
                  {metrics.contactAreaMm2.toLocaleString()} mm²
                </span>
                <span
                  className={cn(
                    "text-[11px] font-medium",
                    metrics.contactPercentage > 5
                      ? "text-emerald-500"
                      : "text-amber-500"
                  )}
                >
                  ({metrics.contactPercentage}%)
                </span>
              </div>
            </div>

            {/* 2. Overhangs */}
            <div className="rounded-xl border border-border/60 bg-surface-2/30 p-2.5">
              <span className="text-[11px] text-muted block">Overhangs &gt; 45°</span>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="font-semibold text-sm text-fg">
                  {metrics.overhangAreaMm2.toLocaleString()} mm²
                </span>
                <span
                  className={cn(
                    "text-[11px] font-medium",
                    metrics.overhangPercentage <= 2.5
                      ? "text-emerald-500"
                      : "text-amber-500 font-semibold"
                  )}
                >
                  ({metrics.overhangPercentage}%)
                </span>
              </div>
            </div>

            {/* 3. Aspect Ratio */}
            <div className="rounded-xl border border-border/60 bg-surface-2/30 p-2.5">
              <span className="text-[11px] text-muted block">Height-to-Base Ratio</span>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="font-semibold text-sm text-fg">
                  {metrics.aspectRatio}:1
                </span>
                <span
                  className={cn(
                    "text-[11px] font-medium",
                    metrics.aspectRatio < 2.2 ? "text-emerald-500" : "text-amber-500"
                  )}
                >
                  {metrics.aspectRatio < 2.2 ? "Stable" : "Tall"}
                </span>
              </div>
            </div>

            {/* 4. Build Volume Fit */}
            <div className="rounded-xl border border-border/60 bg-surface-2/30 p-2.5">
              <span className="text-[11px] text-muted block">Build Volume Fit</span>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span
                  className={cn(
                    "font-semibold text-sm",
                    metrics.fitsPrinter ? "text-emerald-500" : "text-rose-500"
                  )}
                >
                  {metrics.fitsPrinter ? "Fits Plate" : "Exceeds Limits"}
                </span>
                <span className="text-[11px] text-muted">
                  {metrics.boundingBoxMm.width}×{metrics.boundingBoxMm.depth} mm
                </span>
              </div>
            </div>
          </div>

          {/* Orientation Advisor Card */}
          {!isCurrentOrientationOptimal && optimalOrientation && onApplyOrientation && (
            <div className="rounded-xl border border-accent/40 bg-accent-soft/30 p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-accent/20 text-accent mt-0.5">
                  <Compass className="size-4" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-fg flex items-center gap-2">
                    <span>Better Print Orientation Found:</span>
                    <span className="text-accent underline font-bold">{optimalOrientation.name}</span>
                  </h4>
                  <p className="text-xs text-muted mt-1 leading-relaxed">
                    {optimalOrientation.reason}
                  </p>
                </div>
              </div>

              <Button
                type="button"
                size="sm"
                onClick={() => onApplyOrientation(optimalOrientation.rotation)}
                className="shrink-0 h-8 gap-1.5 text-xs font-semibold bg-accent text-ink hover:opacity-95"
              >
                <RotateCw className="size-3.5" />
                Apply Optimal Orientation
              </Button>
            </div>
          )}

          {/* Bed Face Selection Grid (Bambu Studio Style "Lay on Face") */}
          {report.bedFaces && report.bedFaces.length > 0 && onApplyOrientation && (
            <div className="space-y-2 pt-1 border-t border-border/40">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold text-fg flex items-center gap-1.5">
                  <Compass className="size-3.5 text-accent" />
                  <span>Choose Bed Face ({report.bedFaces.length} detected)</span>
                </h4>
                <span className="text-[11px] text-muted hidden sm:inline">Click any face to lay flat on plate</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {report.bedFaces.slice(0, 6).map((face) => (
                  <button
                    key={face.id}
                    type="button"
                    onClick={() => onApplyOrientation(face.rotation)}
                    className={cn(
                      "rounded-xl p-2.5 text-left border transition-all flex flex-col justify-between gap-2",
                      face.isCurrent
                        ? "border-accent bg-accent-soft/40 shadow-xs ring-1 ring-accent"
                        : "border-border/70 bg-surface-2/40 hover:bg-surface-2/80 hover:border-border-hover cursor-pointer"
                    )}
                  >
                    <div className="flex items-start justify-between gap-1.5">
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="text-xs font-semibold text-fg">{face.name}</p>
                          {face.isOptimal && (
                            <span className="rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-300/40 text-[9px] font-bold px-1.5 py-0.2">
                              Best Adhesion
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-muted mt-0.5">{face.description}</p>
                      </div>
                      {face.isCurrent && (
                        <span className="rounded-full bg-accent text-ink px-1.5 py-0.5 text-[9px] font-bold shrink-0">
                          Active
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between text-[10px] font-mono text-muted border-t border-border/30 pt-1.5">
                      <span>Bed Contact: {(face.contactAreaMm2 / 100).toFixed(1)} cm² ({face.contactPercentage}%)</span>
                      <span className={face.overhangPercentage > 5 ? "text-amber-500 font-semibold" : "text-emerald-700 dark:text-emerald-400 font-medium"}>
                        {face.overhangPercentage > 0 ? `${face.overhangPercentage}% overhang` : "0% overhang"}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
          {recommendations.length > 0 && (
            <div className="space-y-2 pt-1">
              <h4 className="text-xs font-semibold text-fg uppercase tracking-wider text-muted">
                Recommended Slicer Optimizations ({recommendations.length})
              </h4>

              <div className="space-y-2">
                {recommendations.map((rec) => {
                  const applied = isRecApplied(rec);
                  return (
                    <div
                      key={rec.id}
                      className={cn(
                        "rounded-xl border p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 transition-colors",
                        applied
                          ? "border-emerald-500/30 bg-emerald-500/5 text-muted"
                          : "border-border/80 bg-surface-2/40 hover:bg-surface-2/70"
                      )}
                    >
                      <div className="flex items-start gap-2.5">
                        <div
                          className={cn(
                            "flex size-6 shrink-0 items-center justify-center rounded-md text-xs font-semibold mt-0.5",
                            applied
                              ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                              : rec.impact === "high"
                              ? "bg-rose-500/15 text-rose-500"
                              : rec.impact === "medium"
                              ? "bg-amber-500/15 text-amber-500"
                              : "bg-surface-3 text-muted"
                          )}
                        >
                          {applied ? (
                            <Check className="size-3.5 stroke-[2.5]" />
                          ) : (
                            <Sliders className="size-3.5" />
                          )}
                        </div>

                        <div>
                          <p className="text-xs font-semibold text-fg flex items-center gap-1.5">
                            <span>{rec.title}</span>
                            {applied && (
                              <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 rounded-full px-2 py-0.2">
                                Applied in Form
                              </span>
                            )}
                          </p>
                          <p className="text-[11px] text-muted mt-0.5">{rec.description}</p>
                        </div>
                      </div>

                      {!applied && (
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => handleApplySingle(rec)}
                          className="shrink-0 h-7 text-[11px] font-medium gap-1 self-end sm:self-center"
                        >
                          {rec.actionLabel}
                          <ArrowRight className="size-3" />
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
