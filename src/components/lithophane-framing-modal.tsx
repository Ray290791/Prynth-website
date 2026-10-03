import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  RotateCcw,
  Check,
  X,
  Heart,
  Move,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { LithophaneShape } from "@/components/lithophane-viewer";
import { isInsideHeart } from "@/lib/lithophane-export";

export interface CropConfig {
  scale: number;
  panX: number;
  panY: number;
}

interface LithophaneFramingModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageSrc: string;
  shape: LithophaneShape;
  sizeMm?: { width: number; height: number };
  initialCrop?: CropConfig;
  onApply: (croppedDataUrl: string, config: CropConfig) => void;
}

// Precompute exact Taubin heart boundary points normalized to [0, 1] x [0, 1]
const HEART_BOUNDARY_POINTS: [number, number][] = (() => {
  const pts: [number, number][] = [];
  const cx = 0.5, cy = 0.45;
  const N = 80;
  for (let i = 0; i < N; i++) {
    const theta = (i / N) * 2 * Math.PI - Math.PI / 2;
    const cosT = Math.cos(theta);
    const sinT = Math.sin(theta);
    let low = 0, high = 0.65;
    for (let step = 0; step < 24; step++) {
      const mid = (low + high) / 2;
      const u = cx + mid * cosT;
      const v = cy + mid * sinT;
      if (isInsideHeart(u, v)) low = mid;
      else high = mid;
    }
    pts.push([cx + low * cosT, cy + low * sinT]);
  }
  return pts;
})();

export function LithophaneFramingModal({
  isOpen,
  onClose,
  imageSrc,
  shape,
  sizeMm,
  initialCrop,
  onApply,
}: LithophaneFramingModalProps) {
  const [scale, setScale] = useState<number>(initialCrop?.scale ?? 1.15);
  const [panX, setPanX] = useState<number>(initialCrop?.panX ?? 0);
  const [panY, setPanY] = useState<number>(initialCrop?.panY ?? 0);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [imgLoaded, setImgLoaded] = useState<boolean>(false);
  const [containerDim, setContainerDim] = useState<{ w: number; h: number }>({ w: 340, h: 340 });

  const containerRef = useRef<HTMLDivElement>(null);
  const imageElementRef = useRef<HTMLImageElement | null>(null);
  const dragStartRef = useRef<{ x: number; y: number; panX: number; panY: number }>({
    x: 0,
    y: 0,
    panX: 0,
    panY: 0,
  });

  // Calculate target aspect ratio based on shape and physical dimensions
  const targetAspect = useMemo(() => {
    if (shape === "heart") return 1.0;
    if (sizeMm && sizeMm.width > 0 && sizeMm.height > 0) {
      return sizeMm.width / sizeMm.height;
    }
    return 1.5;
  }, [shape, sizeMm]);

  // Keep track of container dimensions for pixel-perfect frame sizing
  useEffect(() => {
    if (!isOpen) return;
    const updateDim = () => {
      if (containerRef.current) {
        const r = containerRef.current.getBoundingClientRect();
        if (r.width > 0 && r.height > 0) {
          setContainerDim({ w: r.width, h: r.height });
        }
      }
    };
    updateDim();
    const timer = setTimeout(updateDim, 50);
    window.addEventListener("resize", updateDim);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", updateDim);
    };
  }, [isOpen]);

  // Reset or initialize state when opening
  useEffect(() => {
    if (isOpen) {
      if (initialCrop) {
        setScale(initialCrop.scale);
        setPanX(initialCrop.panX);
        setPanY(initialCrop.panY);
      } else {
        setScale(shape === "heart" ? 1.25 : 1.05);
        setPanX(0);
        setPanY(shape === "heart" ? -10 : 0);
      }
    }
  }, [isOpen, initialCrop, shape]);

  // Load and cache natural dimensions of source image
  useEffect(() => {
    if (!imageSrc) return;
    setImgLoaded(false);
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = imageSrc;
    img.onload = () => {
      imageElementRef.current = img;
      setImgLoaded(true);
    };
  }, [imageSrc]);

  // Pointer drag events for panning
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      panX,
      panY,
    };
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    e.preventDefault();
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    setPanX(dragStartRef.current.panX + dx);
    setPanY(dragStartRef.current.panY + dy);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDragging) {
      setIsDragging(false);
      (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
    }
  };

  // Wheel zoom
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const delta = -e.deltaY * 0.0015;
    setScale((prev) => Math.min(3.5, Math.max(0.6, prev + delta)));
  };

  // Compute framing window geometry inside the stage
  const stageW = containerDim.w || 340;
  const stageH = containerDim.h || 340;
  const maxW = stageW * 0.88;
  const maxH = stageH * 0.88;
  let windowW: number;
  let windowH: number;
  if (maxW / maxH > targetAspect) {
    windowH = maxH;
    windowW = windowH * targetAspect;
  } else {
    windowW = maxW;
    windowH = windowW / targetAspect;
  }
  const windowLeft = (stageW - windowW) / 2;
  const windowTop = (stageH - windowH) / 2;

  // Preset actions
  const handleCenter = () => {
    setPanX(0);
    setPanY(0);
    setScale(1.05);
  };

  const handleCouplePreset = () => {
    setScale(1.4);
    setPanX(0);
    setPanY(-20);
  };

  const handleFill = () => {
    const img = imageElementRef.current;
    if (!img) return;
    const imgAspect = (img.naturalWidth || img.width) / (img.naturalHeight || img.height);
    let containW: number;
    let containH: number;
    if (imgAspect >= stageW / stageH) {
      containW = stageW;
      containH = stageW / imgAspect;
    } else {
      containH = stageH;
      containW = stageH * imgAspect;
    }
    const reqScale = Math.max(windowW / containW, windowH / containH);
    setScale(parseFloat(reqScale.toFixed(2)));
    setPanX(0);
    setPanY(0);
  };

  // Render cropped result to canvas: EXACTLY what is bounded inside the yellow outline
  const handleApply = useCallback(() => {
    const img = imageElementRef.current;
    const container = containerRef.current;
    if (!img || !container) {
      onClose();
      return;
    }

    const curStageW = container.clientWidth || stageW;
    const curStageH = container.clientHeight || stageH;

    const curMaxW = curStageW * 0.88;
    const curMaxH = curStageH * 0.88;
    let curWindowW: number;
    let curWindowH: number;
    if (curMaxW / curMaxH > targetAspect) {
      curWindowH = curMaxH;
      curWindowW = curWindowH * targetAspect;
    } else {
      curWindowW = curMaxW;
      curWindowH = curWindowW / targetAspect;
    }

    // High resolution export matching target lithophane aspect ratio
    const baseExportDim = 1200;
    const exportW = targetAspect >= 1 ? baseExportDim : Math.round(baseExportDim * targetAspect);
    const exportH = targetAspect >= 1 ? Math.round(baseExportDim / targetAspect) : baseExportDim;

    // Scale factor from screen framing window to export canvas
    const scaleFactor = exportW / curWindowW;

    const canvas = document.createElement("canvas");
    canvas.width = exportW;
    canvas.height = exportH;
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      onClose();
      return;
    }

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, exportW, exportH);

    // Geometry of photo inside the preview stage (CSS object-contain within container)
    const imgAspect = (img.naturalWidth || img.width) / (img.naturalHeight || img.height);
    let containW: number;
    let containH: number;
    if (imgAspect >= curStageW / curStageH) {
      containW = curStageW;
      containH = curStageW / imgAspect;
    } else {
      containH = curStageH;
      containW = curStageH * imgAspect;
    }

    const drawW_canvas = containW * scale * scaleFactor;
    const drawH_canvas = containH * scale * scaleFactor;

    ctx.save();
    // Center of canvas + user pan offset scaled to canvas resolution
    ctx.translate(exportW / 2 + panX * scaleFactor, exportH / 2 + panY * scaleFactor);
    ctx.drawImage(img, -drawW_canvas / 2, -drawH_canvas / 2, drawW_canvas, drawH_canvas);
    ctx.restore();

    const croppedDataUrl = canvas.toDataURL("image/jpeg", 0.95);
    onApply(croppedDataUrl, { scale, panX, panY });
    onClose();
  }, [onApply, onClose, panX, panY, scale, stageH, stageW, targetAspect]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/80 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-lg bg-accent/15 text-accent">
              {shape === "heart" ? (
                <Heart className="size-4 text-rose-500 fill-rose-500" />
              ) : (
                <Maximize2 className="size-4 text-accent" />
              )}
            </div>
            <div>
              <h3 className="text-sm font-semibold text-fg flex items-center gap-2">
                <span>
                  {shape === "heart"
                    ? "Frame Photo for Heart Keepsake"
                    : shape === "curved"
                    ? "Frame Photo for Self-Standing Arc"
                    : "Adjust Photo Framing"}
                </span>
                <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-semibold text-accent">
                  Interactive Crop
                </span>
              </h3>
              <p className="text-xs text-muted">
                {shape === "heart"
                  ? "Drag to reposition · Zoom to fit within the glowing heart outline"
                  : "Drag to reposition · The photo inside the yellow box is what becomes your lithophane"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex size-7 items-center justify-center rounded-lg text-muted hover:bg-surface-2 hover:text-fg cursor-pointer transition-colors"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Framing Stage Area */}
        <div className="relative flex flex-1 items-center justify-center p-4 bg-stone-950/80 overflow-hidden">
          <div
            ref={containerRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onWheel={handleWheel}
            className={cn(
              "relative aspect-square w-full max-w-[360px] overflow-hidden rounded-xl border border-border/60 bg-black select-none touch-none",
              isDragging ? "cursor-grabbing" : "cursor-grab"
            )}
          >
            {/* The Moveable & Scalable Photo */}
            {imageSrc && (
              <div
                className="absolute inset-0 flex items-center justify-center pointer-events-none will-change-transform"
                style={{
                  transform: `translate(${panX}px, ${panY}px) scale(${scale})`,
                  transition: isDragging ? "none" : "transform 0.08s ease-out",
                }}
              >
                <img
                  src={imageSrc}
                  alt="Framing preview"
                  draggable={false}
                  className="max-h-full max-w-full object-contain pointer-events-none select-none"
                  style={{
                    imageRendering: "auto",
                  }}
                />
              </div>
            )}

            {/* Shape Overlay Cutout */}
            <div className="absolute inset-0 pointer-events-none">
              <svg
                viewBox={`0 0 ${stageW} ${stageH}`}
                className="h-full w-full"
              >
                <defs>
                  {/* Mask: White shows outer dark scrim, Black cuts out the framing window */}
                  <mask id="framing-scrim-mask">
                    <rect x="0" y="0" width={stageW} height={stageH} fill="white" />
                    {shape === "heart" ? (
                      <polygon
                        points={HEART_BOUNDARY_POINTS.map(([u, v]) => `${windowLeft + u * windowW},${windowTop + v * windowH}`).join(" ")}
                        fill="black"
                      />
                    ) : (
                      <rect
                        x={windowLeft}
                        y={windowTop}
                        width={windowW}
                        height={windowH}
                        rx={6}
                        fill="black"
                      />
                    )}
                  </mask>
                </defs>

                {/* Outer Dimmed Scrim */}
                <rect
                  x="0"
                  y="0"
                  width={stageW}
                  height={stageH}
                  fill="rgba(5, 7, 10, 0.76)"
                  mask="url(#framing-scrim-mask)"
                />

                {/* Glowing Shape Outline & Guides */}
                {shape === "heart" ? (
                  <>
                    <polygon
                      points={HEART_BOUNDARY_POINTS.map(([u, v]) => `${windowLeft + u * windowW},${windowTop + v * windowH}`).join(" ")}
                      fill="none"
                      stroke="#f59e0b"
                      strokeWidth="2.2"
                      className="filter drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]"
                    />

                    {/* Subtle center cleft line */}
                    <line
                      x1={windowLeft + 0.5 * windowW}
                      y1={windowTop + 0.15 * windowH}
                      x2={windowLeft + 0.5 * windowW}
                      y2={windowTop + 0.95 * windowH}
                      stroke="rgba(255,255,255,0.2)"
                      strokeWidth="0.8"
                      strokeDasharray="3 3"
                    />

                    {/* Lobe sweet-spot guides */}
                    <circle
                      cx={windowLeft + 0.28 * windowW}
                      cy={windowTop + 0.30 * windowH}
                      r={windowW * 0.11}
                      fill="none"
                      stroke="rgba(255,255,255,0.22)"
                      strokeWidth="0.8"
                      strokeDasharray="2 2"
                    />
                    <circle
                      cx={windowLeft + 0.72 * windowW}
                      cy={windowTop + 0.30 * windowH}
                      r={windowW * 0.11}
                      fill="none"
                      stroke="rgba(255,255,255,0.22)"
                      strokeWidth="0.8"
                      strokeDasharray="2 2"
                    />
                  </>
                ) : (
                  <rect
                    x={windowLeft}
                    y={windowTop}
                    width={windowW}
                    height={windowH}
                    rx={6}
                    fill="none"
                    stroke="#f59e0b"
                    strokeWidth="2.2"
                    className="filter drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]"
                  />
                )}
              </svg>

              {/* Floating Helper Pill */}
              <div className="absolute top-2.5 left-1/2 -translate-x-1/2 rounded-full border border-white/15 bg-black/65 px-3 py-1 text-[11px] font-medium text-white/90 backdrop-blur-md flex items-center gap-1.5 shadow-md">
                <Move className="size-3 text-accent" />
                <span>Drag photo to position · Yellow box is your lithophane</span>
              </div>
            </div>
          </div>
        </div>

        {/* Controls Toolbar */}
        <div className="border-t border-border/80 bg-surface p-4 space-y-3">
          {/* Zoom Slider & Presets */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Zoom slider */}
            <div className="flex items-center gap-2 flex-1">
              <button
                type="button"
                onClick={() => setScale((s) => Math.max(0.6, s - 0.1))}
                className="flex size-7 items-center justify-center rounded-lg border border-border text-muted hover:text-fg cursor-pointer"
                title="Zoom out"
              >
                <ZoomOut className="size-3.5" />
              </button>
              <input
                type="range"
                min="0.6"
                max="3.0"
                step="0.05"
                value={scale}
                onChange={(e) => setScale(parseFloat(e.target.value))}
                className="w-full accent-accent cursor-pointer"
              />
              <button
                type="button"
                onClick={() => setScale((s) => Math.min(3.0, s + 0.1))}
                className="flex size-7 items-center justify-center rounded-lg border border-border text-muted hover:text-fg cursor-pointer"
                title="Zoom in"
              >
                <ZoomIn className="size-3.5" />
              </button>
              <span className="w-12 text-right font-mono text-xs text-muted tabular-nums">
                {scale.toFixed(2)}x
              </span>
            </div>

            {/* Quick Framing Presets */}
            <div className="flex items-center gap-1.5 shrink-0">
              {shape === "heart" && (
                <button
                  type="button"
                  onClick={handleCouplePreset}
                  className="rounded-lg border border-border bg-surface-2/60 px-2.5 py-1 text-[11px] font-semibold text-fg hover:border-accent hover:text-accent transition-colors cursor-pointer flex items-center gap-1"
                >
                  <Users className="size-3" />
                  <span>Fit Couple</span>
                </button>
              )}
              <button
                type="button"
                onClick={handleFill}
                className="rounded-lg border border-border bg-surface-2/60 px-2.5 py-1 text-[11px] font-semibold text-fg hover:border-accent hover:text-accent transition-colors cursor-pointer"
              >
                Fill Frame
              </button>
              <button
                type="button"
                onClick={handleCenter}
                className="rounded-lg border border-border bg-surface-2/60 px-2.5 py-1 text-[11px] font-semibold text-muted hover:text-fg transition-colors cursor-pointer flex items-center gap-1"
                title="Reset to center"
              >
                <RotateCcw className="size-3" />
                <span>Reset</span>
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-border/60">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleApply}
              disabled={!imgLoaded}
              className="gap-1.5 cursor-pointer font-semibold shadow-xs"
            >
              <Check className="size-3.5" />
              <span>Apply to 3D Keepsake</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
