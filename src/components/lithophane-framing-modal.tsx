import { useState, useRef, useEffect, useCallback } from "react";
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  RotateCcw,
  Check,
  X,
  Heart,
  Sparkles,
  Move,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { LithophaneShape } from "@/components/lithophane-viewer";

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
  initialCrop?: CropConfig;
  onApply: (croppedDataUrl: string, config: CropConfig) => void;
}

export function LithophaneFramingModal({
  isOpen,
  onClose,
  imageSrc,
  shape,
  initialCrop,
  onApply,
}: LithophaneFramingModalProps) {
  const [scale, setScale] = useState<number>(initialCrop?.scale ?? 1.15);
  const [panX, setPanX] = useState<number>(initialCrop?.panX ?? 0);
  const [panY, setPanY] = useState<number>(initialCrop?.panY ?? 0);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [imgLoaded, setImgLoaded] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const imageElementRef = useRef<HTMLImageElement | null>(null);
  const dragStartRef = useRef<{ x: number; y: number; panX: number; panY: number }>({
    x: 0,
    y: 0,
    panX: 0,
    panY: 0,
  });

  // Reset or initialize state when opening
  useEffect(() => {
    if (isOpen) {
      if (initialCrop) {
        setScale(initialCrop.scale);
        setPanX(initialCrop.panX);
        setPanY(initialCrop.panY);
      } else {
        // Defaults: slightly zoomed in for heart so it fills nicely
        setScale(shape === "heart" ? 1.25 : 1.0);
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
    setScale((prev) => Math.min(3.5, Math.max(0.8, prev + delta)));
  };

  // Quick preset actions
  const handleCenter = () => {
    setPanX(0);
    setPanY(0);
    setScale(1.1);
  };

  const handleCouplePreset = () => {
    // Zoom in on couple faces and elevate slightly into the two lobes of the heart
    setScale(1.4);
    setPanX(0);
    setPanY(-20);
  };

  const handleFillHeart = () => {
    setScale(1.6);
  };

  // Render cropped result to canvas and apply
  const handleApply = useCallback(() => {
    const img = imageElementRef.current;
    const container = containerRef.current;
    if (!img || !container) {
      onClose();
      return;
    }

    const rect = container.getBoundingClientRect();
    const stageSize = Math.min(rect.width, rect.height) || 400;

    // Bounded export resolution: 600px is 4x oversampled vs 150x150 mesh vertex grid,
    // producing razor-sharp lithophanes while keeping the compressed payload under 45 KB.
    const exportDim = 600;
    const factor = exportDim / stageSize;

    const canvas = document.createElement("canvas");
    canvas.width = exportDim;
    canvas.height = exportDim;
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      onClose();
      return;
    }

    // High quality bicubic resampling
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    // Clean neutral background (white plastic base)
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, exportDim, exportDim);

    // ── Match exactly what the preview shows ──
    // The preview container is a square of stageSize × stageSize.
    // Inside it the image is rendered with CSS object-contain, which means
    // the image is letterboxed/pillarboxed so it fits entirely within the
    // square. The user's pan/zoom is applied on top of that contained size.
    // We must replicate the same geometry on the canvas so what was visible
    // in the preview is exactly what gets exported.
    const imgAspect = img.width / img.height;
    let containW: number;
    let containH: number;
    if (imgAspect >= 1) {
      // Landscape or square: width fills stage, height is smaller
      containW = stageSize;
      containH = stageSize / imgAspect;
    } else {
      // Portrait: height fills stage, width is smaller
      containH = stageSize;
      containW = stageSize * imgAspect;
    }

    // Scale those contain dimensions up to canvas resolution
    const drawW = containW * factor;
    const drawH = containH * factor;

    // Apply translation and scaling relative to canvas center
    ctx.save();
    ctx.translate(exportDim / 2, exportDim / 2);
    ctx.translate(panX * factor, panY * factor);
    ctx.scale(scale, scale);
    ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
    ctx.restore();

    const croppedDataUrl = canvas.toDataURL("image/jpeg", 0.95);
    onApply(croppedDataUrl, { scale, panX, panY });
    onClose();
  }, [onApply, onClose, panX, panY, scale]);

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
                  ? "Drag to reposition · Zoom to center faces inside the heart"
                  : "Drag to reposition · Zoom to frame the perfect composition"}
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
                    // Prevent image smoothing blur during live drag
                    imageRendering: "auto",
                  }}
                />
              </div>
            )}

            {/* Shape Overlay Cutout */}
            <div className="absolute inset-0 pointer-events-none">
              <svg
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                className="h-full w-full"
              >
                <defs>
                  {/* Mask: White shows outer dark scrim, Black cuts out the heart window */}
                  <mask id="heart-scrim-mask">
                    <rect x="0" y="0" width="100" height="100" fill="white" />
                    {shape === "heart" ? (
                      // Authentic smooth heart cutout matching heartTaubin bounds
                      <path
                        d="M 50 94 C 35 80, 5 62, 5 38 C 5 20, 16 6, 28 6 C 37 6, 45 10, 50 14 C 55 10, 63 6, 72 6 C 84 6, 95 20, 95 38 C 95 62, 65 80, 50 94 Z"
                        fill="black"
                      />
                    ) : (
                      // Rectangular window
                      <rect x="6" y="6" width="88" height="88" rx="4" fill="black" />
                    )}
                  </mask>
                </defs>

                {/* Outer Dimmed Scrim */}
                <rect
                  x="0"
                  y="0"
                  width="100"
                  height="100"
                  fill="rgba(5, 7, 10, 0.76)"
                  mask="url(#heart-scrim-mask)"
                />

                {/* Glowing Shape Outline & Guides */}
                {shape === "heart" ? (
                  <>
                    {/* Glowing outer heart silhouette */}
                    <path
                      d="M 50 94 C 35 80, 5 62, 5 38 C 5 20, 16 6, 28 6 C 37 6, 45 10, 50 14 C 55 10, 63 6, 72 6 C 84 6, 95 20, 95 38 C 95 62, 65 80, 50 94 Z"
                      fill="none"
                      stroke="#f59e0b"
                      strokeWidth="1.8"
                      className="filter drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]"
                    />

                    {/* Subtle dashed inner guideline */}
                    <path
                      d="M 50 90 C 37 77, 8 60, 8 39 C 8 23, 18 10, 28 10 C 36 10, 44 14, 50 17 C 56 14, 64 10, 72 10 C 82 10, 92 23, 92 39 C 92 60, 63 77, 50 90 Z"
                      fill="none"
                      stroke="#f59e0b"
                      strokeWidth="0.75"
                      strokeDasharray="2 3"
                      opacity="0.6"
                    />

                    {/* Lobe sweet-spot guides (where faces sit best) */}
                    <circle
                      cx="32"
                      cy="30"
                      r="11"
                      fill="none"
                      stroke="rgba(255,255,255,0.25)"
                      strokeWidth="0.8"
                      strokeDasharray="2 2"
                    />
                    <circle
                      cx="68"
                      cy="30"
                      r="11"
                      fill="none"
                      stroke="rgba(255,255,255,0.25)"
                      strokeWidth="0.8"
                      strokeDasharray="2 2"
                    />

                    {/* Center cleft line */}
                    <line
                      x1="50"
                      y1="20"
                      x2="50"
                      y2="85"
                      stroke="rgba(255,255,255,0.15)"
                      strokeWidth="0.6"
                      strokeDasharray="3 3"
                    />
                  </>
                ) : (
                  <rect
                    x="6"
                    y="6"
                    width="88"
                    height="88"
                    rx="4"
                    fill="none"
                    stroke="#f59e0b"
                    strokeWidth="1.5"
                  />
                )}
              </svg>

              {/* Floating Helper Pill */}
              <div className="absolute top-2.5 left-1/2 -translate-x-1/2 rounded-full border border-white/15 bg-black/65 px-3 py-1 text-[11px] font-medium text-white/90 backdrop-blur-md flex items-center gap-1.5 shadow-md">
                <Move className="size-3 text-accent" />
                <span>Drag photo to center faces</span>
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
                onClick={() => setScale((s) => Math.max(0.8, s - 0.1))}
                className="flex size-7 items-center justify-center rounded-lg border border-border text-muted hover:text-fg cursor-pointer"
                title="Zoom out"
              >
                <ZoomOut className="size-3.5" />
              </button>
              <input
                type="range"
                min="0.8"
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
                onClick={handleFillHeart}
                className="rounded-lg border border-border bg-surface-2/60 px-2.5 py-1 text-[11px] font-semibold text-fg hover:border-accent hover:text-accent transition-colors cursor-pointer"
              >
                Fill
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
