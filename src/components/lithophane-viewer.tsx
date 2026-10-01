import { useEffect, useState, useRef, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, ContactShadows } from "@react-three/drei";
import * as THREE from "three";
import {
  Sun,
  Moon,
  RotateCw,
  Camera,
  Layers,
  Lightbulb,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type LithophaneShape = "curved" | "flat" | "heart";

export interface LithophaneViewerProps {
  imageSrc: string | null;
  shape: LithophaneShape;
  sizeMm: { width: number; height: number };
  backlightOn: boolean;
  onToggleBacklight: () => void;
  contrast?: number; // 0.8 to 1.6
  invert?: boolean;
  hasWoodenBase?: boolean;
  className?: string;
}

// Sub-pixel bilinear interpolation for smooth, silky displacement without staircasing
function sampleBilinearLuminance(
  data: Uint8ClampedArray,
  w: number,
  h: number,
  u: number,
  v: number
): number {
  const fx = u * (w - 1);
  const fy = v * (h - 1);
  const x0 = Math.floor(fx);
  const y0 = Math.floor(fy);
  const x1 = Math.min(w - 1, x0 + 1);
  const y1 = Math.min(h - 1, y0 + 1);
  const dx = fx - x0;
  const dy = fy - y0;

  const idx00 = (y0 * w + x0) * 4;
  const idx10 = (y0 * w + x1) * 4;
  const idx01 = (y1 * w + x0) * 4;
  const idx11 = (y1 * w + x1) * 4;

  const l00 = (0.299 * data[idx00] + 0.587 * data[idx00 + 1] + 0.114 * data[idx00 + 2]) / 255;
  const l10 = (0.299 * data[idx10] + 0.587 * data[idx10 + 1] + 0.114 * data[idx10 + 2]) / 255;
  const l01 = (0.299 * data[idx01] + 0.587 * data[idx01 + 1] + 0.114 * data[idx01 + 2]) / 255;
  const l11 = (0.299 * data[idx11] + 0.587 * data[idx11 + 1] + 0.114 * data[idx11 + 2]) / 255;

  const top = l00 * (1 - dx) + l10 * dx;
  const bot = l01 * (1 - dx) + l11 * dx;
  return top * (1 - dy) + bot * dy;
}

// Build closed, manifold 3D solid lithophane geometry with high spatial resolution
function buildLithophaneGeometry(
  imgData: ImageData,
  shape: LithophaneShape,
  widthMm: number,
  heightMm: number,
  contrast = 1.15,
  invert = false
): THREE.BufferGeometry {
  const { width: imgW, height: imgH, data } = imgData;

  // Ultra-fine grid resolution for silky smooth surface relief
  const cols = 150;
  const rows = Math.max(80, Math.min(180, Math.round(cols * (heightMm / widthMm))));
  const minT = 0.8; // Minimum printable wall thickness in mm
  const maxT = 3.0; // Maximum thickness in mm

  const thicknessGrid: number[][] = [];

  for (let r = 0; r < rows; r++) {
    thicknessGrid[r] = [];
    const v = r / (rows - 1);

    for (let c = 0; c < cols; c++) {
      const u = c / (cols - 1);

      // Bilinear subpixel sampling
      let lum = sampleBilinearLuminance(data, imgW, imgH, u, v);

      // Contrast curve
      lum = Math.pow(Math.max(0, Math.min(1, lum)), contrast);

      if (invert) {
        lum = 1.0 - lum;
      }

      // In real lithophanes:
      // High brightness = THIN wall (lets light pass)
      // Low brightness = THICK wall (blocks light)
      let t = minT + (1.0 - lum) * (maxT - minT);

      // Heart boundary smooth masking
      if (shape === "heart") {
        const nx = (u - 0.5) * 2.2;
        const ny = (1.0 - v - 0.45) * 2.2;
        const heartDist = Math.pow(nx * nx + ny * ny - 1, 3) - nx * nx * Math.pow(ny, 3);
        if (heartDist > 0.04) {
          t = 0.6; // Trimmed edge
        }
      }

      thicknessGrid[r][c] = t;
    }
  }

  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  // Elegant 75° gentle curved arc (1.31 rad) for mantle lamp
  const arcRad = (75 * Math.PI) / 180;
  const curveRadius = widthMm / arcRad;

  for (let r = 0; r < rows; r++) {
    const v = r / (rows - 1);
    const y = (0.5 - v) * heightMm;

    for (let c = 0; c < cols; c++) {
      const u = c / (cols - 1);
      const t = thicknessGrid[r][c];

      let fx = 0,
        fy = y,
        fz = 0;
      let bx = 0,
        by = y,
        bz = 0;

      if (shape === "curved") {
        const angle = (u - 0.5) * arcRad;
        const sinA = Math.sin(angle);
        const cosA = Math.cos(angle);

        // Smooth back surface along cylinder radius
        bx = curveRadius * sinA;
        bz = curveRadius * cosA - curveRadius;

        // Front surface displaced along outward normal
        const rFront = curveRadius + t;
        fx = rFront * sinA;
        fz = rFront * cosA - curveRadius;
      } else {
        // Flat panel
        const x = (u - 0.5) * widthMm;
        fx = x;
        fz = t;

        bx = x;
        bz = 0;
      }

      // Front Vertex (index = (r * cols + c) * 2)
      positions.push(fx, fy, fz);
      uvs.push(u, 1.0 - v);

      // Back Vertex (index = (r * cols + c) * 2 + 1)
      positions.push(bx, by, bz);
      uvs.push(u, 1.0 - v);
    }
  }

  const getIdx = (r: number, c: number, isBack: boolean) => {
    return (r * cols + c) * 2 + (isBack ? 1 : 0);
  };

  // 1. Front face triangles (CCW)
  for (let r = 0; r < rows - 1; r++) {
    for (let c = 0; c < cols - 1; c++) {
      const tl = getIdx(r, c, false);
      const tr = getIdx(r, c + 1, false);
      const bl = getIdx(r + 1, c, false);
      const br = getIdx(r + 1, c + 1, false);

      indices.push(tl, tr, bl);
      indices.push(tr, br, bl);
    }
  }

  // 2. Back face triangles (CW to face backward)
  for (let r = 0; r < rows - 1; r++) {
    for (let c = 0; c < cols - 1; c++) {
      const tl = getIdx(r, c, true);
      const tr = getIdx(r, c + 1, true);
      const bl = getIdx(r + 1, c, true);
      const br = getIdx(r + 1, c + 1, true);

      indices.push(tl, bl, tr);
      indices.push(tr, bl, br);
    }
  }

  // 3. Side Walls (watertight solid perimeter)
  // Top edge (r = 0)
  for (let c = 0; c < cols - 1; c++) {
    const f1 = getIdx(0, c, false);
    const f2 = getIdx(0, c + 1, false);
    const b1 = getIdx(0, c, true);
    const b2 = getIdx(0, c + 1, true);
    indices.push(f1, b1, f2);
    indices.push(f2, b1, b2);
  }

  // Bottom edge (r = rows - 1)
  for (let c = 0; c < cols - 1; c++) {
    const f1 = getIdx(rows - 1, c, false);
    const f2 = getIdx(rows - 1, c + 1, false);
    const b1 = getIdx(rows - 1, c, true);
    const b2 = getIdx(rows - 1, c + 1, true);
    indices.push(f1, f2, b1);
    indices.push(f2, b2, b1);
  }

  // Left edge (c = 0)
  for (let r = 0; r < rows - 1; r++) {
    const f1 = getIdx(r, 0, false);
    const f2 = getIdx(r + 1, 0, false);
    const b1 = getIdx(r, 0, true);
    const b2 = getIdx(r + 1, 0, true);
    indices.push(f1, f2, b1);
    indices.push(f2, b2, b1);
  }

  // Right edge (c = cols - 1)
  for (let r = 0; r < rows - 1; r++) {
    const f1 = getIdx(r, cols - 1, false);
    const f2 = getIdx(r + 1, cols - 1, false);
    const b1 = getIdx(r, cols - 1, true);
    const b2 = getIdx(r + 1, cols - 1, true);
    indices.push(f1, b1, f2);
    indices.push(f2, b1, b2);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  return geometry;
}

// Solid Beech Wood Night Lamp Oval Base with Recessed Slot
function WoodenBase({
  widthMm,
  depthMm = 65,
  heightMm = 20,
  backlightOn,
}: {
  widthMm: number;
  depthMm?: number;
  heightMm?: number;
  backlightOn: boolean;
}) {
  const baseW = Math.max(widthMm * 1.05, 130);

  return (
    <group position={[0, -heightMm / 2, 0]}>
      {/* Sleek rounded beech wood base body */}
      <mesh receiveShadow castShadow position={[0, 0, 0]}>
        <boxGeometry args={[baseW, heightMm, depthMm]} />
        <meshStandardMaterial
          color="#9b6e45"
          roughness={0.65}
          metalness={0.03}
        />
      </mesh>

      {/* Recessed slot where the lithophane sits */}
      <mesh position={[0, heightMm / 2 - 2, 0]}>
        <boxGeometry args={[widthMm + 6, 4.5, 9]} />
        <meshStandardMaterial color="#2d1c10" roughness={0.9} />
      </mesh>

      {/* Internal warm LED light strip nestled inside slot */}
      <mesh position={[0, heightMm / 2 - 1, 0]}>
        <boxGeometry args={[widthMm, 1.5, 4]} />
        <meshStandardMaterial
          color={backlightOn ? "#fff5dc" : "#221a14"}
          emissive={backlightOn ? "#ffc66d" : "#000000"}
          emissiveIntensity={backlightOn ? 2.5 : 0}
          roughness={0.2}
        />
      </mesh>

      {/* Rear USB braided cable relief */}
      <mesh position={[0, -heightMm / 4, -depthMm / 2 - 3]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[2, 2, 8, 16]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.9} />
      </mesh>
    </group>
  );
}

// Scene Content
function LithophaneScene({
  imgData,
  photoTexture,
  shape,
  sizeMm,
  backlightOn,
  contrast,
  invert,
  hasWoodenBase,
  autoRotate,
}: {
  imgData: ImageData | null;
  photoTexture: THREE.CanvasTexture | null;
  shape: LithophaneShape;
  sizeMm: { width: number; height: number };
  backlightOn: boolean;
  contrast?: number;
  invert?: boolean;
  hasWoodenBase?: boolean;
  autoRotate: boolean;
}) {
  const meshRef = useRef<THREE.Group>(null);

  const geometry = useMemo(() => {
    if (!imgData) return null;
    return buildLithophaneGeometry(
      imgData,
      shape,
      sizeMm.width,
      sizeMm.height,
      contrast,
      invert
    );
  }, [imgData, shape, sizeMm.width, sizeMm.height, contrast, invert]);

  useEffect(() => {
    return () => {
      if (geometry) geometry.dispose();
    };
  }, [geometry]);

  // Center lithophane seated into the wooden base slot
  const yOffset = sizeMm.height / 2 - (hasWoodenBase ? 4 : 0);

  return (
    <group position={[0, -sizeMm.height * 0.45 + (hasWoodenBase ? 16 : 0), 0]}>
      {/* The Lithophane Model */}
      <group ref={meshRef} position={[0, yOffset, 0]}>
        {geometry && (
          <mesh geometry={geometry} castShadow receiveShadow>
            <meshStandardMaterial
              map={backlightOn ? photoTexture : null}
              emissiveMap={backlightOn ? photoTexture : null}
              emissive={backlightOn ? new THREE.Color("#ffe0a4") : new THREE.Color("#000000")}
              emissiveIntensity={backlightOn ? 1.05 : 0}
              color={backlightOn ? "#fff7ea" : "#f6f5ef"}
              roughness={backlightOn ? 0.4 : 0.65}
              metalness={0.02}
              side={THREE.DoubleSide}
            />
          </mesh>
        )}
      </group>

      {/* Beech Wood LED Base */}
      {hasWoodenBase && (
        <WoodenBase widthMm={sizeMm.width} backlightOn={backlightOn} />
      )}

      {/* Internal Backlight Emitters */}
      {backlightOn && (
        <>
          <pointLight
            position={[0, yOffset, -35]}
            intensity={2600}
            distance={260}
            color="#ffe2a4"
          />
          <pointLight
            position={[0, yOffset * 0.4, -10]}
            intensity={1600}
            distance={160}
            color="#ffd07b"
          />
        </>
      )}

      {/* Ground Contact Shadow */}
      <ContactShadows
        position={[0, hasWoodenBase ? -20 : 0, 0]}
        opacity={0.65}
        scale={Math.max(sizeMm.width * 2, 260)}
        blur={1.8}
        far={100}
      />
    </group>
  );
}

export function LithophaneViewer({
  imageSrc,
  shape,
  sizeMm,
  backlightOn,
  onToggleBacklight,
  contrast = 1.15,
  invert = false,
  hasWoodenBase = true,
  className,
}: LithophaneViewerProps) {
  const [imgData, setImgData] = useState<ImageData | null>(null);
  const [photoTexture, setPhotoTexture] = useState<THREE.CanvasTexture | null>(null);
  const [loading, setLoading] = useState(false);
  const [autoRotate, setAutoRotate] = useState(false);
  const [darkRoom, setDarkRoom] = useState(true);
  const controlsRef = useRef<any>(null);

  // Process image, generate high-resolution texture map and heightmap data
  useEffect(() => {
    if (!imageSrc) {
      setImgData(null);
      setPhotoTexture(null);
      return;
    }

    setLoading(true);
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = imageSrc;

    img.onload = () => {
      try {
        // 1. High-resolution canvas for crystal-clear texture mapping (1024 max)
        const maxTexDim = 1024;
        let tw = img.width;
        let th = img.height;
        if (tw > maxTexDim || th > maxTexDim) {
          if (tw > th) {
            th = Math.round((th * maxTexDim) / tw);
            tw = maxTexDim;
          } else {
            tw = Math.round((tw * maxTexDim) / th);
            th = maxTexDim;
          }
        }

        const texCanvas = document.createElement("canvas");
        texCanvas.width = tw;
        texCanvas.height = th;
        const texCtx = texCanvas.getContext("2d", { willReadFrequently: true });
        if (!texCtx) return;

        // Draw image with smooth high quality scaling
        texCtx.imageSmoothingEnabled = true;
        texCtx.imageSmoothingQuality = "high";
        texCtx.drawImage(img, 0, 0, tw, th);

        // Convert texture to warm continuous-tone lithophane transmission
        const imgRaw = texCtx.getImageData(0, 0, tw, th);
        const pData = imgRaw.data;
        for (let i = 0; i < pData.length; i += 4) {
          let lum = (0.299 * pData[i] + 0.587 * pData[i + 1] + 0.114 * pData[i + 2]) / 255;
          lum = Math.pow(lum, contrast);
          if (invert) lum = 1.0 - lum;

          // Warm lithophane illumination tint
          // Highlights = warm glowing white (#FFF9E6)
          // Shadows = warm deep amber/sepia (#3D2C1C)
          const r = Math.round(55 + 200 * lum);
          const g = Math.round(40 + 205 * Math.pow(lum, 1.05));
          const b = Math.round(25 + 200 * Math.pow(lum, 1.2));

          pData[i] = r;
          pData[i + 1] = g;
          pData[i + 2] = b;
        }
        texCtx.putImageData(imgRaw, 0, 0);

        const tex = new THREE.CanvasTexture(texCanvas);
        tex.minFilter = THREE.LinearMipmapLinearFilter;
        tex.magFilter = THREE.LinearFilter;
        tex.needsUpdate = true;
        setPhotoTexture(tex);

        // 2. Sampled heightmap data for physical geometry displacement
        const maxDispDim = 320;
        let dw = img.width;
        let dh = img.height;
        if (dw > maxDispDim || dh > maxDispDim) {
          if (dw > dh) {
            dh = Math.round((dh * maxDispDim) / dw);
            dw = maxDispDim;
          } else {
            dw = Math.round((dw * maxDispDim) / dh);
            dw = maxDispDim;
          }
        }

        const dispCanvas = document.createElement("canvas");
        dispCanvas.width = dw;
        dispCanvas.height = dh;
        const dispCtx = dispCanvas.getContext("2d", { willReadFrequently: true });
        if (dispCtx) {
          dispCtx.imageSmoothingEnabled = true;
          dispCtx.imageSmoothingQuality = "high";
          dispCtx.drawImage(img, 0, 0, dw, dh);
          setImgData(dispCtx.getImageData(0, 0, dw, dh));
        }
      } catch (err) {
        console.error("Failed to process lithophane image", err);
      } finally {
        setLoading(false);
      }
    };

    img.onerror = () => {
      setLoading(false);
    };
  }, [imageSrc, contrast, invert]);

  const handleResetCamera = () => {
    if (controlsRef.current) {
      controlsRef.current.reset();
    }
  };

  const cameraDist = Math.max(sizeMm.width, sizeMm.height) * 1.85;

  return (
    <div
      className={cn(
        "relative flex h-[380px] sm:h-[460px] md:h-[540px] w-full flex-col overflow-hidden rounded-2xl border transition-colors",
        darkRoom
          ? "border-border/80 bg-[#07090c]"
          : "border-border bg-gradient-to-b from-surface to-surface-2",
        className
      )}
    >
      {/* 3D Canvas */}
      <div className="relative h-full w-full flex-1">
        <Canvas
          shadows
          camera={{
            position: [0, sizeMm.height * 0.15, cameraDist],
            fov: 38,
            near: 1,
            far: 2000,
          }}
          className="h-full w-full cursor-grab active:cursor-grabbing"
        >
          {/* Ambient Lighting */}
          <ambientLight intensity={darkRoom ? 0.35 : 0.85} />

          {/* Key Light */}
          <directionalLight
            position={[100, 150, 120]}
            intensity={darkRoom ? 0.6 : 1.3}
            castShadow
            shadow-mapSize={[1024, 1024]}
          />
          <directionalLight
            position={[-80, 80, -60]}
            intensity={darkRoom ? 0.3 : 0.6}
            color="#8fb0ff"
          />

          <LithophaneScene
            imgData={imgData}
            photoTexture={photoTexture}
            shape={shape}
            sizeMm={sizeMm}
            backlightOn={backlightOn}
            contrast={contrast}
            invert={invert}
            hasWoodenBase={hasWoodenBase}
            autoRotate={autoRotate}
          />

          <OrbitControls
            ref={controlsRef}
            autoRotate={autoRotate}
            autoRotateSpeed={1.8}
            enableDamping
            dampingFactor={0.08}
            minDistance={cameraDist * 0.45}
            maxDistance={cameraDist * 2.8}
            maxPolarAngle={Math.PI / 2 + 0.1}
          />
        </Canvas>

        {/* Loading Spinner */}
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-xs">
            <div className="flex items-center gap-2.5 rounded-full border border-border bg-surface/90 px-4 py-2 text-xs font-medium text-fg shadow-lg">
              <RotateCw className="size-4 animate-spin text-accent" />
              <span>Generating HD 3D Lithophane…</span>
            </div>
          </div>
        )}

        {/* Top Control Overlay Bar */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
          {/* Shape & Dimensions Pill */}
          <div className="pointer-events-auto flex items-center gap-1.5 rounded-full border border-border/80 bg-surface/85 px-3 py-1 text-xs backdrop-blur-md shadow-xs">
            <Layers className="size-3.5 text-accent" />
            <span className="font-semibold text-fg capitalize">
              {shape === "curved" ? "Curved Arc Lamp" : shape === "heart" ? "Heart Keepsake" : "Framed Lightbox"}
            </span>
            <span className="text-muted">·</span>
            <span className="text-muted tabular-nums">
              {sizeMm.width} × {sizeMm.height} mm
            </span>
          </div>

          {/* Quick Viewer Toggles */}
          <div className="pointer-events-auto flex items-center gap-1.5 rounded-full border border-border/80 bg-surface/85 p-1 backdrop-blur-md shadow-xs">
            {/* Dark Room vs Studio Day Mode */}
            <button
              type="button"
              onClick={() => setDarkRoom(!darkRoom)}
              title={darkRoom ? "Switch to daylight studio" : "Switch to dark cozy room"}
              className={cn(
                "flex size-7 items-center justify-center rounded-full transition-colors cursor-pointer",
                darkRoom ? "bg-accent/20 text-accent" : "text-muted hover:text-fg"
              )}
            >
              {darkRoom ? <Moon className="size-3.5" /> : <Sun className="size-3.5" />}
            </button>

            {/* Auto-Rotate */}
            <button
              type="button"
              onClick={() => setAutoRotate(!autoRotate)}
              title={autoRotate ? "Pause 360° rotation" : "Auto-rotate 360°"}
              className={cn(
                "flex size-7 items-center justify-center rounded-full transition-colors cursor-pointer",
                autoRotate ? "bg-accent text-ink font-bold" : "text-muted hover:text-fg"
              )}
            >
              <RotateCw className={cn("size-3.5", autoRotate && "animate-spin")} />
            </button>

            {/* Reset Camera */}
            <button
              type="button"
              onClick={handleResetCamera}
              title="Reset camera view"
              className="flex size-7 items-center justify-center rounded-full text-muted hover:text-fg transition-colors cursor-pointer"
            >
              <Camera className="size-3.5" />
            </button>
          </div>
        </div>

        {/* Bottom Prominent Backlight Power Button */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 pointer-events-auto">
          <button
            type="button"
            onClick={onToggleBacklight}
            className={cn(
              "flex items-center gap-2.5 rounded-full px-4 py-2 text-xs font-semibold shadow-lg transition-all duration-200 cursor-pointer border",
              backlightOn
                ? "bg-amber-400 text-stone-950 border-amber-300 ring-4 ring-amber-400/20 shadow-amber-500/30 font-bold"
                : "bg-surface/90 text-fg border-border hover:bg-surface hover:border-accent/40"
            )}
          >
            <Lightbulb className={cn("size-4", backlightOn ? "fill-current text-stone-950" : "text-muted")} />
            <span>{backlightOn ? "💡 Backlight: ON (Warm LED)" : "Turn Backlight ON"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
