import { useEffect, useState, useRef, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, ContactShadows } from "@react-three/drei";
import * as THREE from "three";
import {
  Sun,
  Moon,
  RotateCw,
  Camera,
  Maximize2,
  Sparkles,
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

// Generate procedurally closed 3D solid lithophane geometry
function buildLithophaneGeometry(
  imgData: ImageData,
  shape: LithophaneShape,
  widthMm: number,
  heightMm: number,
  contrast = 1.1,
  invert = false,
  backlightOn = true
): THREE.BufferGeometry {
  const { width: imgW, height: imgH, data } = imgData;

  // Grid resolution (balanced for 60fps rendering and high spatial resolution)
  const cols = shape === "curved" ? 110 : 100;
  const rows = Math.round(cols * (heightMm / widthMm));
  const minT = 0.8; // Minimum printable wall thickness in mm
  const maxT = 3.0; // Maximum thickness (shadow areas) in mm

  // Pre-sample brightness grid
  const thicknessGrid: number[][] = [];
  const brightnessGrid: number[][] = [];

  for (let r = 0; r < rows; r++) {
    thicknessGrid[r] = [];
    brightnessGrid[r] = [];
    const v = r / (rows - 1);
    const py = Math.min(imgH - 1, Math.floor(v * imgH));

    for (let c = 0; c < cols; c++) {
      const u = c / (cols - 1);
      const px = Math.min(imgW - 1, Math.floor(u * imgW));
      const idx = (py * imgW + px) * 4;

      const red = data[idx];
      const green = data[idx + 1];
      const blue = data[idx + 2];

      // Perceptual luminance (ITU-R BT.601)
      let lum = (0.299 * red + 0.587 * green + 0.114 * blue) / 255;

      // Contrast curve
      lum = Math.pow(lum, contrast);

      if (invert) {
        lum = 1.0 - lum;
      }

      brightnessGrid[r][c] = lum;

      // In a physical lithophane:
      // High brightness (white highlights) = THIN wall (lets light pass)
      // Low brightness (dark shadows) = THICK wall (blocks light)
      let t = minT + (1.0 - lum) * (maxT - minT);

      // Heart boundary clipping
      if (shape === "heart") {
        const nx = (u - 0.5) * 2.2;
        const ny = (1.0 - v - 0.45) * 2.2;
        const heartDist = Math.pow(nx * nx + ny * ny - 1, 3) - nx * nx * Math.pow(ny, 3);
        if (heartDist > 0.05) {
          t = 0.4; // Trimmed edge
        }
      }

      thicknessGrid[r][c] = t;
    }
  }

  // Construct vertices for Front Face, Back Face, and Connecting Edges
  const positions: number[] = [];
  const uvs: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];

  const arcRad = (115 * Math.PI) / 180; // 115 deg arc for curved mantle lamp
  const curveRadius = widthMm / arcRad; // Arc radius in mm

  const frontColor = new THREE.Color();
  const litColor = new THREE.Color("#fff2d6"); // Warm tungsten LED glow
  const unlitColor = new THREE.Color("#f6f5ef"); // Sculpted white PLA plastic

  // Vertex offsets
  // Front face vertices: 0 to (rows * cols - 1)
  // Back face vertices: (rows * cols) to (2 * rows * cols - 1)

  for (let r = 0; r < rows; r++) {
    const v = r / (rows - 1);
    const y = (0.5 - v) * heightMm; // Centered at origin Y

    for (let c = 0; c < cols; c++) {
      const u = c / (cols - 1);
      const t = thicknessGrid[r][c];
      const lum = brightnessGrid[r][c];

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

        // Back is smooth cylindrical arc
        bx = curveRadius * sinA;
        bz = curveRadius * cosA - curveRadius;

        // Front is displaced outwards along the radial normal
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

      // Add Front Vertex
      positions.push(fx, fy, fz);
      uvs.push(u, 1.0 - v);

      if (backlightOn) {
        // Backlight transmission: thin areas glow bright, thick areas show shadow
        const trans = Math.min(1.0, Math.max(0.12, 0.12 + 0.88 * Math.pow(lum, 1.15)));
        frontColor.copy(litColor).multiplyScalar(trans);
      } else {
        // Solid unlit sculpt
        frontColor.copy(unlitColor).multiplyScalar(0.85 + 0.15 * lum);
      }
      colors.push(frontColor.r, frontColor.g, frontColor.b);

      // Add Back Vertex
      positions.push(bx, by, bz);
      uvs.push(u, 1.0 - v);
      if (backlightOn) {
        colors.push(litColor.r * 0.9, litColor.g * 0.9, litColor.b * 0.9);
      } else {
        colors.push(unlitColor.r * 0.9, unlitColor.g * 0.9, unlitColor.b * 0.9);
      }
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

  // 3. Side Walls (sealing the perimeter for a solid 3D print)
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
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  return geometry;
}

// 3D Solid Beech Wood LED Night Lamp Base
function WoodenBase({
  widthMm,
  depthMm = 65,
  heightMm = 24,
  backlightOn,
}: {
  widthMm: number;
  depthMm?: number;
  heightMm?: number;
  backlightOn: boolean;
}) {
  const baseW = Math.max(widthMm * 0.95, 120);

  return (
    <group position={[0, -heightMm / 2 - 2, 0]}>
      {/* Wooden Oval/Rounded Base */}
      <mesh receiveShadow castShadow>
        <boxGeometry args={[baseW, heightMm, depthMm]} />
        <meshStandardMaterial
          color="#9e7246"
          roughness={0.7}
          metalness={0.05}
        />
      </mesh>

      {/* Inset LED Light Channel */}
      <mesh position={[0, heightMm / 2 + 0.1, 0]}>
        <boxGeometry args={[baseW * 0.85, 1.5, 8]} />
        <meshStandardMaterial
          color={backlightOn ? "#ffea9f" : "#2a2a2a"}
          emissive={backlightOn ? "#ffb74d" : "#000000"}
          emissiveIntensity={backlightOn ? 1.5 : 0}
          roughness={0.3}
        />
      </mesh>

      {/* Recessed USB Braided Cable exit at the back */}
      <mesh position={[0, -heightMm / 4, -depthMm / 2 - 4]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[2.5, 2.5, 10, 16]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.9} />
      </mesh>
    </group>
  );
}

// Scene Content
function LithophaneScene({
  imgData,
  shape,
  sizeMm,
  backlightOn,
  contrast,
  invert,
  hasWoodenBase,
  autoRotate,
}: {
  imgData: ImageData | null;
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
      invert,
      backlightOn
    );
  }, [imgData, shape, sizeMm.width, sizeMm.height, contrast, invert, backlightOn]);

  useEffect(() => {
    return () => {
      if (geometry) geometry.dispose();
    };
  }, [geometry]);

  // Height offset to seat the lithophane on the table or base
  const yOffset = sizeMm.height / 2 + (hasWoodenBase ? 10 : 2);

  return (
    <group position={[0, -yOffset + sizeMm.height * 0.45, 0]}>
      {/* The Lithophane Model */}
      <group ref={meshRef} position={[0, yOffset, 0]}>
        {geometry && (
          <mesh
            geometry={geometry}
            castShadow
            receiveShadow
          >
            <meshStandardMaterial
              vertexColors
              roughness={backlightOn ? 0.35 : 0.6}
              metalness={0.02}
              side={THREE.DoubleSide}
            />
          </mesh>
        )}
      </group>

      {/* Optional Wooden LED Base */}
      {hasWoodenBase && (
        <WoodenBase
          widthMm={sizeMm.width}
          backlightOn={backlightOn}
        />
      )}

      {/* Backlight LED Source (placed directly behind the lithophane) */}
      {backlightOn && (
        <>
          <pointLight
            position={[0, yOffset, -40]}
            intensity={2800}
            distance={260}
            color="#ffe2a4"
          />
          <pointLight
            position={[0, yOffset * 0.7, -15]}
            intensity={1600}
            distance={180}
            color="#ffd07b"
          />
        </>
      )}

      {/* Realistic Ground Contact Shadow */}
      <ContactShadows
        position={[0, 0, 0]}
        opacity={0.65}
        scale={Math.max(sizeMm.width * 2, 250)}
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
  contrast = 1.1,
  invert = false,
  hasWoodenBase = true,
  className,
}: LithophaneViewerProps) {
  const [imgData, setImgData] = useState<ImageData | null>(null);
  const [loading, setLoading] = useState(false);
  const [autoRotate, setAutoRotate] = useState(false);
  const [darkRoom, setDarkRoom] = useState(true);
  const controlsRef = useRef<any>(null);

  // Extract downsampled ImageData from imageSrc
  useEffect(() => {
    if (!imageSrc) {
      setImgData(null);
      return;
    }

    setLoading(true);
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = imageSrc;

    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        const maxDim = 320;
        let w = img.width;
        let h = img.height;

        if (w > maxDim || h > maxDim) {
          if (w > h) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          } else {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }

        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) return;

        ctx.drawImage(img, 0, 0, w, h);
        const data = ctx.getImageData(0, 0, w, h);
        setImgData(data);
      } catch (err) {
        console.error("Failed to process lithophane image", err);
      } finally {
        setLoading(false);
      }
    };

    img.onerror = () => {
      setLoading(false);
    };
  }, [imageSrc]);

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
          ? "border-border/80 bg-[#090b0e]"
          : "border-border bg-gradient-to-b from-surface to-surface-2",
        className
      )}
    >
      {/* 3D Canvas */}
      <div className="relative h-full w-full flex-1">
        <Canvas
          shadows
          camera={{
            position: [0, sizeMm.height * 0.25, cameraDist],
            fov: 42,
            near: 1,
            far: 2000,
          }}
          className="h-full w-full cursor-grab active:cursor-grabbing"
        >
          {/* Ambient Lighting */}
          <ambientLight intensity={darkRoom ? 0.22 : 0.75} />
          
          {/* Studio Key Lighting */}
          <directionalLight
            position={[100, 150, 120]}
            intensity={darkRoom ? 0.45 : 1.2}
            castShadow
            shadow-mapSize={[1024, 1024]}
          />
          <directionalLight
            position={[-80, 80, -60]}
            intensity={darkRoom ? 0.2 : 0.5}
            color="#8fb0ff"
          />

          <LithophaneScene
            imgData={imgData}
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
            maxPolarAngle={Math.PI / 2 + 0.12} // Prevent viewing under floor
          />
        </Canvas>

        {/* Loading Spinner */}
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-xs">
            <div className="flex items-center gap-2.5 rounded-full border border-border bg-surface/90 px-4 py-2 text-xs font-medium text-fg shadow-lg">
              <RotateCw className="size-4 animate-spin text-accent" />
              <span>Generating 3D Lithophane Mesh…</span>
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
                ? "bg-amber-400 text-stone-950 border-amber-300 ring-4 ring-amber-400/20 shadow-amber-500/30"
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
