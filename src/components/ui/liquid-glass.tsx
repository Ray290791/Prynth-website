import React, { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Liquid Glass physical refraction configuration.
 * Formulas and uniforms ported from dashersw/liquid-glass-js & stormaref/LiquidGlassSkill.
 * (Armagan Amcalar, MIT License).
 */
export interface LiquidGlassConfig {
  edgeIntensity?: number;
  rimIntensity?: number;
  baseIntensity?: number;
  edgeDistance?: number;
  rimDistance?: number;
  baseDistance?: number;
  cornerBoost?: number;
  rippleEffect?: number;
  blurRadius?: number;
  /** Center distortion: KEEP FALSE to preserve 100% crisp text readability! */
  warp?: boolean;
}

const DEFAULT_PRESET: Required<LiquidGlassConfig> = {
  edgeIntensity: 0.015,
  rimIntensity: 0.028,
  baseIntensity: 0.05,
  edgeDistance: 0.5,
  rimDistance: 1.7,
  baseDistance: 0.2,
  cornerBoost: 0.06,
  rippleEffect: 0.26,
  blurRadius: 2,
  warp: false,
};

const SUPERSAMPLE = 2;
const MAX_MAP_EDGE = 1400;
const BLUR_STD_PER_RADIUS = 0.35;

interface FilterEntry {
  id: string;
  node: SVGFilterElement;
  refs: number;
}

const filterCache = new Map<string, FilterEntry>();
let sharedSvgDefs: SVGSVGElement | null = null;
let nextFilterId = 0;

function isChromiumSupported(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") return false;
  const brands = (navigator as any).userAgentData?.brands as { brand: string }[] | undefined;
  if (brands) {
    return brands.some((b) => /Chromium|Google Chrome|Microsoft Edge/i.test(b.brand));
  }
  return /Chrome\//.test(navigator.userAgent);
}

function ensureSharedDefs(): SVGSVGElement {
  if (!sharedSvgDefs || !sharedSvgDefs.isConnected) {
    const svgNs = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNs, "svg");
    svg.setAttribute("width", "0");
    svg.setAttribute("height", "0");
    svg.style.position = "fixed";
    svg.style.pointerEvents = "none";
    svg.style.opacity = "0";
    svg.style.zIndex = "-9999";
    svg.setAttribute("aria-hidden", "true");
    const defs = document.createElementNS(svgNs, "defs");
    svg.appendChild(defs);
    document.body.appendChild(svg);
    sharedSvgDefs = svg;
  }
  return sharedSvgDefs;
}

function clampByte(v: number): number {
  return Math.max(0, Math.min(255, Math.round(v)));
}

function buildDisplacementMap(
  w: number,
  h: number,
  radius: number,
  pageW: number,
  pageH: number,
  cfg: Required<LiquidGlassConfig>
): { mapUrl: string; scale: number } {
  const ss = Math.max(0.25, Math.min(SUPERSAMPLE, MAX_MAP_EDGE / Math.max(w, h)));
  const bw = Math.max(1, Math.round(w * ss));
  const bh = Math.max(1, Math.round(h * ss));
  const r = radius * ss;
  const minDim = Math.min(w, h);
  const dx = new Float32Array(bw * bh);
  const dy = new Float32Array(bw * bh);
  let maxAbs = 0;

  for (let py = 0; py < bh; py++) {
    for (let px = 0; px < bw; px++) {
      const cx = (px + 0.5) / bw;
      const cy = (py + 0.5) / bh;

      // Signed distance to rounded-rectangle boundary
      const tx = Math.abs(px + 0.5 - bw / 2) - (bw / 2 - r);
      const ty = Math.abs(py + 0.5 - bh / 2) - (bh / 2 - r);
      const outside = Math.hypot(Math.max(tx, 0), Math.max(ty, 0));
      const inside = Math.min(Math.max(tx, ty), 0);
      const distPx = Math.max(-(outside + inside - r), 0) / ss;

      const edgeFall = Math.exp(-distPx * cfg.edgeDistance);
      const rimFall = Math.exp(-distPx * cfg.rimDistance);
      const baseFall = 1 - Math.exp(-distPx * cfg.baseDistance);
      const baseComponent = cfg.warp ? baseFall * cfg.baseIntensity : 0;
      const total = baseComponent + edgeFall * cfg.edgeIntensity + rimFall * cfg.rimIntensity;

      let nx = cx - 0.5;
      let ny = cy - 0.5;
      const len = Math.hypot(nx, ny);
      if (len > 0) {
        nx /= len;
        ny /= len;
      }

      const cornerNorm = Math.max(Math.min(cx, 1 - cx), Math.min(cy, 1 - cy)) * minDim;
      const corner = Math.exp(-cornerNorm * 0.3) * cfg.cornerBoost;
      const ripple = Math.sin((distPx / minDim) * 25) * cfg.rippleEffect * rimFall;

      const fx = (nx * (total + corner) - ny * ripple) * pageW;
      const fy = (ny * (total + corner) + nx * ripple) * pageH;

      const i = py * bw + px;
      dx[i] = fx;
      dy[i] = fy;
      maxAbs = Math.max(maxAbs, Math.abs(fx), Math.abs(fy));
    }
  }

  const scale = Math.max(maxAbs * 2, 1e-4);
  const bias = scale * (128 / 255 - 0.5);
  const canvas = document.createElement("canvas");
  canvas.width = bw;
  canvas.height = bh;
  const ctx = canvas.getContext("2d");
  if (!ctx) return { mapUrl: "", scale: 1 };

  const image = ctx.createImageData(bw, bh);
  const data = image.data;
  for (let i = 0; i < bw * bh; i++) {
    data[i * 4] = clampByte(255 * (0.5 + (dx[i] - bias) / scale));
    data[i * 4 + 1] = clampByte(255 * (0.5 + (dy[i] - bias) / scale));
    data[i * 4 + 2] = 128;
    data[i * 4 + 3] = 255;
  }
  ctx.putImageData(image, 0, 0);
  return { mapUrl: canvas.toDataURL("image/png"), scale };
}

function acquireFilter(
  key: string,
  w: number,
  h: number,
  radius: number,
  pageW: number,
  pageH: number,
  cfg: Required<LiquidGlassConfig>
): FilterEntry {
  let entry = filterCache.get(key);
  if (entry && entry.node.isConnected) {
    entry.refs++;
    return entry;
  }
  if (entry) {
    filterCache.delete(key);
  }

  const { mapUrl, scale } = buildDisplacementMap(w, h, radius, pageW, pageH, cfg);
  const id = `prynth-liquid-glass-${nextFilterId++}`;

  const svgNs = "http://www.w3.org/2000/svg";
  const filter = document.createElementNS(svgNs, "filter");
  filter.setAttribute("id", id);

  const marginPx = scale / 2 + 3 * cfg.blurRadius * BLUR_STD_PER_RADIUS;
  const mx = (marginPx / w) * 100;
  const my = (marginPx / h) * 100;
  filter.setAttribute("x", `${-mx}%`);
  filter.setAttribute("y", `${-my}%`);
  filter.setAttribute("width", `${100 + 2 * mx}%`);
  filter.setAttribute("height", `${100 + 2 * my}%`);
  filter.setAttribute("color-interpolation-filters", "sRGB");

  const feImage = document.createElementNS(svgNs, "feImage");
  feImage.setAttribute("href", mapUrl);
  feImage.setAttribute("x", "0");
  feImage.setAttribute("y", "0");
  feImage.setAttribute("width", String(w));
  feImage.setAttribute("height", String(h));
  feImage.setAttribute("preserveAspectRatio", "none");
  feImage.setAttribute("result", "map");

  const feDisplacement = document.createElementNS(svgNs, "feDisplacementMap");
  feDisplacement.setAttribute("in", "SourceGraphic");
  feDisplacement.setAttribute("in2", "map");
  feDisplacement.setAttribute("scale", String(scale));
  feDisplacement.setAttribute("xChannelSelector", "R");
  feDisplacement.setAttribute("yChannelSelector", "G");
  feDisplacement.setAttribute("result", "displaced");

  const feBlur = document.createElementNS(svgNs, "feGaussianBlur");
  feBlur.setAttribute("in", "displaced");
  feBlur.setAttribute("stdDeviation", String(cfg.blurRadius * BLUR_STD_PER_RADIUS));

  filter.append(feImage, feDisplacement, feBlur);
  ensureSharedDefs().querySelector("defs")?.appendChild(filter);

  entry = { id, node: filter, refs: 1 };
  filterCache.set(key, entry);
  return entry;
}

export function useLiquidGlass(
  ref: React.RefObject<HTMLElement | null>,
  config?: LiquidGlassConfig
) {
  useEffect(() => {
    const el = ref.current;
    if (!el || !isChromiumSupported()) return;

    let currentKey: string | null = null;
    let resizeTimer: any = null;
    let animFrame: number = 0;

    const mergedCfg: Required<LiquidGlassConfig> = { ...DEFAULT_PRESET, ...(config || {}) };

    const rebuild = () => {
      if (!el || !el.isConnected) return;
      const w = Math.round(el.offsetWidth);
      const h = Math.round(el.offsetHeight);
      if (w < 4 || h < 4) return;

      const style = window.getComputedStyle(el);
      const rawRadius = parseFloat(style.borderTopLeftRadius) || 16;
      const radius = Math.min(rawRadius, Math.min(w, h) / 2);
      const pageW = window.innerWidth;
      const pageH = window.innerHeight;

      const key = `${w}|${h}|${radius}|${pageW}|${pageH}|${JSON.stringify(mergedCfg)}`;
      if (key === currentKey) return;

      if (currentKey) {
        const prev = filterCache.get(currentKey);
        if (prev && --prev.refs <= 0) {
          filterCache.delete(currentKey);
          prev.node.remove();
        }
      }

      const entry = acquireFilter(key, w, h, radius, pageW, pageH, mergedCfg);
      currentKey = key;
      el.style.backdropFilter = `url(#${entry.id})`;
      (el.style as any).webkitBackdropFilter = `url(#${entry.id})`;
    };

    const scheduleRebuild = () => {
      cancelAnimationFrame(animFrame);
      animFrame = requestAnimationFrame(rebuild);
    };

    const onWindowResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(scheduleRebuild, 180);
    };

    const observer = new ResizeObserver(scheduleRebuild);
    observer.observe(el);
    window.addEventListener("resize", onWindowResize, { passive: true });
    scheduleRebuild();

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", onWindowResize);
      clearTimeout(resizeTimer);
      cancelAnimationFrame(animFrame);
      if (currentKey) {
        const prev = filterCache.get(currentKey);
        if (prev && --prev.refs <= 0) {
          filterCache.delete(currentKey);
          prev.node.remove();
        }
      }
    };
  }, [config]);
}

export interface LiquidGlassProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
  config?: LiquidGlassConfig;
  interactive?: boolean;
}

export const LiquidGlass = React.forwardRef<HTMLDivElement, LiquidGlassProps>(
  ({ children, className, config, interactive = false, ...props }, forwardedRef) => {
    const localRef = useRef<HTMLDivElement | null>(null);

    // Combine refs
    const setRef = (node: HTMLDivElement | null) => {
      localRef.current = node;
      if (typeof forwardedRef === "function") {
        forwardedRef(node);
      } else if (forwardedRef) {
        (forwardedRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
      }
    };

    useLiquidGlass(localRef, config);

    return (
      <div
        ref={setRef}
        className={cn(
          "liquid-glass",
          interactive && "liquid-glass--hover",
          className
        )}
        {...props}
      >
        <div className="relative z-10">{children}</div>
      </div>
    );
  }
);
LiquidGlass.displayName = "LiquidGlass";
