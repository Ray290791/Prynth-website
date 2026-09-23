import { useEffect, useState, useRef, useMemo } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls, ContactShadows } from "@react-three/drei";
import { STLLoader, OBJLoader, ThreeMFLoader } from "three-stdlib";
import * as THREE from "three";
import {
  RotateCw,
  Maximize2,
  Minimize2,
  Eye,
  Box,
  Layers,
  ZoomIn,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  RefreshCcw,
  Camera,
  Grid,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface ModelViewerProps {
  file: File;
  printer?: {
    name?: string;
    model?: string;
    build_volume?: string;
    build_volume_x?: number;
    build_volume_y?: number;
    build_volume_z?: number;
  } | null;
  colorHex?: string;
  colorName?: string;
  onColorChange?: (colorId: string) => void;
  className?: string;
}

// Generates an authentic Bambu Lab Textured PEI Plate texture on an HTML5 canvas
function createBambuPlateTexture(widthMm = 256, depthMm = 256, printerName = "Bambu Lab P1S") {
  if (typeof document === "undefined") return null;

  const size = 1024;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const maxBed = Math.max(widthMm, depthMm);
  const scale = size / maxBed;
  const w = widthMm * scale;
  const h = depthMm * scale;
  const offsetX = (size - w) / 2;
  const offsetY = (size - h) / 2;

  // 1. Dark Textured Charcoal PEI Background
  ctx.fillStyle = "#1c1f24";
  ctx.fillRect(0, 0, size, size);

  // 2. Subtle Powder-coated PEI Stippling / Texture Noise
  ctx.fillStyle = "rgba(255, 255, 255, 0.025)";
  for (let i = 0; i < 6000; i++) {
    const rx = Math.random() * size;
    const ry = Math.random() * size;
    ctx.fillRect(rx, ry, 1.5, 1.5);
  }

  // 3. Minor Grid Lines: every 10mm
  ctx.strokeStyle = "rgba(255, 255, 255, 0.07)";
  ctx.lineWidth = 1;
  for (let x = 0; x <= widthMm; x += 10) {
    const px = offsetX + x * scale;
    ctx.beginPath();
    ctx.moveTo(px, offsetY);
    ctx.lineTo(px, offsetY + h);
    ctx.stroke();
  }
  for (let y = 0; y <= depthMm; y += 10) {
    const py = offsetY + y * scale;
    ctx.beginPath();
    ctx.moveTo(offsetX, py);
    ctx.lineTo(offsetX + w, py);
    ctx.stroke();
  }

  // 4. Major Grid Lines: every 50mm
  ctx.strokeStyle = "rgba(255, 255, 255, 0.18)";
  ctx.lineWidth = 1.5;
  for (let x = 0; x <= widthMm; x += 50) {
    const px = offsetX + x * scale;
    ctx.beginPath();
    ctx.moveTo(px, offsetY);
    ctx.lineTo(px, offsetY + h);
    ctx.stroke();
  }
  for (let y = 0; y <= depthMm; y += 50) {
    const py = offsetY + y * scale;
    ctx.beginPath();
    ctx.moveTo(offsetX, py);
    ctx.lineTo(offsetX + w, py);
    ctx.stroke();
  }

  // 5. Printable Boundary: 4mm margin from plate edge
  const marginMm = 4;
  const bX = offsetX + marginMm * scale;
  const bY = offsetY + marginMm * scale;
  const bW = (widthMm - marginMm * 2) * scale;
  const bH = (depthMm - marginMm * 2) * scale;
  ctx.strokeStyle = "#00ae42"; // Bambu Signature Green
  ctx.lineWidth = 2.5;
  ctx.strokeRect(bX, bY, bW, bH);

  // 6. Bambu Signature Nozzle Wipe / Exclusion Zone (front-left corner)
  const wipeW = 18 * scale;
  const wipeH = 26 * scale;
  const wipeX = bX;
  const wipeY = bY + bH - wipeH;

  ctx.save();
  ctx.fillStyle = "rgba(239, 68, 68, 0.12)";
  ctx.fillRect(wipeX, wipeY, wipeW, wipeH);
  ctx.strokeStyle = "rgba(239, 68, 68, 0.55)";
  ctx.lineWidth = 1.2;
  ctx.strokeRect(wipeX, wipeY, wipeW, wipeH);

  // Diagonal warning caution stripes
  ctx.strokeStyle = "rgba(239, 68, 68, 0.35)";
  for (let d = -wipeH; d < wipeW; d += 8) {
    ctx.beginPath();
    ctx.moveTo(wipeX + Math.max(0, d), wipeY + Math.max(0, -d));
    ctx.lineTo(wipeX + Math.min(wipeW, d + wipeH), wipeY + Math.min(wipeH, d + wipeH));
    ctx.stroke();
  }
  ctx.restore();

  // 7. Coordinate Origin Center Crosshair (+)
  const cx = offsetX + w / 2;
  const cy = offsetY + h / 2;
  ctx.strokeStyle = "rgba(0, 174, 66, 0.75)";
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(cx - 14, cy);
  ctx.lineTo(cx + 14, cy);
  ctx.moveTo(cx, cy - 14);
  ctx.lineTo(cx, cy + 14);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, cy, 6, 0, Math.PI * 2);
  ctx.stroke();

  // 8. Bambu Authentic Plate Typography
  ctx.font = "bold 16px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.fillStyle = "rgba(255, 255, 255, 0.45)";
  ctx.textAlign = "center";
  ctx.fillText("BAMBU LAB TEXTURED PEI PLATE", cx, offsetY + 26);

  ctx.font = "12px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
  ctx.fillText(`${printerName.toUpperCase()} · ${widthMm} × ${depthMm} mm`, cx, offsetY + 44);

  // 9. Ruler Measurements along edges
  ctx.font = "10px monospace";
  ctx.fillStyle = "rgba(255, 255, 255, 0.28)";
  ctx.textAlign = "center";
  for (let x = 50; x < widthMm; x += 50) {
    ctx.fillText(`${x}`, offsetX + x * scale, offsetY + h - 8);
  }
  ctx.textAlign = "left";
  for (let y = 50; y < depthMm; y += 50) {
    ctx.fillText(`${y}`, offsetX + 8, offsetY + h - y * scale + 4);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.anisotropy = 16;
  return texture;
}

// Compute triangle count and bounding box statistics
function computeStats(geometry: THREE.BufferGeometry) {
  geometry.computeBoundingBox();
  geometry.computeVertexNormals();
  const box = geometry.boundingBox!;
  const sizeMm = {
    x: Math.max(0, box.max.x - box.min.x),
    y: Math.max(0, box.max.y - box.min.y),
    z: Math.max(0, box.max.z - box.min.z),
  };

  const pos = geometry.attributes.position;
  let triangles = 0;
  let volumeMm3 = 0;

  function signedVolume(
    ax: number,
    ay: number,
    az: number,
    bx: number,
    by: number,
    bz: number,
    cx: number,
    cy: number,
    cz: number
  ) {
    return (
      (1 / 6) *
      (ax * (by * cz - bz * cy) - ay * (bx * cz - bz * cx) + az * (bx * cy - by * cx))
    );
  }

  if (geometry.index) {
    const idx = geometry.index;
    triangles = idx.count / 3;
    for (let i = 0; i < idx.count; i += 3) {
      const a = idx.getX(i);
      const b = idx.getX(i + 1);
      const c = idx.getX(i + 2);
      volumeMm3 += signedVolume(
        pos.getX(a),
        pos.getY(a),
        pos.getZ(a),
        pos.getX(b),
        pos.getY(b),
        pos.getZ(b),
        pos.getX(c),
        pos.getY(c),
        pos.getZ(c)
      );
    }
  } else if (pos) {
    triangles = pos.count / 3;
    for (let i = 0; i < pos.count; i += 3) {
      volumeMm3 += signedVolume(
        pos.getX(i),
        pos.getY(i),
        pos.getZ(i),
        pos.getX(i + 1),
        pos.getY(i + 1),
        pos.getZ(i + 1),
        pos.getX(i + 2),
        pos.getY(i + 2),
        pos.getZ(i + 2)
      );
    }
  }

  let volumeCm3 = Math.abs(volumeMm3) / 1000;
  if (volumeCm3 < 0.2 && sizeMm.x > 0 && sizeMm.y > 0 && sizeMm.z > 0) {
    volumeCm3 = (sizeMm.x * sizeMm.y * sizeMm.z * 0.28) / 1000;
  }

  return { sizeMm, triangles, volumeCm3 };
}

// Camera controller supporting smooth viewpoint switches
function CameraController({
  viewMode,
  buildVolume,
  autoRotate,
}: {
  viewMode: "3d" | "top" | "front";
  buildVolume: { x: number; y: number; z: number };
  autoRotate: boolean;
}) {
  const { camera } = useThree();
  const controlsRef = useRef<any>(null);

  useEffect(() => {
    const maxDim = Math.max(buildVolume.x, buildVolume.y, buildVolume.z);
    if (viewMode === "top") {
      camera.position.set(0, maxDim * 1.5, 0.001);
      camera.lookAt(0, 0, 0);
      controlsRef.current?.target.set(0, 0, 0);
    } else if (viewMode === "front") {
      camera.position.set(0, maxDim * 0.35, maxDim * 1.4);
      camera.lookAt(0, maxDim * 0.2, 0);
      controlsRef.current?.target.set(0, maxDim * 0.2, 0);
    } else {
      // 3D Isometric View
      camera.position.set(maxDim * 0.9, maxDim * 0.8, maxDim * 1.05);
      camera.lookAt(0, maxDim * 0.15, 0);
      controlsRef.current?.target.set(0, maxDim * 0.15, 0);
    }
    controlsRef.current?.update();
  }, [viewMode, camera, buildVolume]);

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      autoRotate={autoRotate}
      autoRotateSpeed={1.5}
      minDistance={30}
      maxDistance={1200}
      maxPolarAngle={Math.PI / 2 + 0.06} // Keep camera naturally above build plate
    />
  );
}

// Build Plate Component
function BuildPlate({
  width = 256,
  depth = 256,
  height = 256,
  printerName = "Bambu Lab P1S",
  showVolume = false,
  isOutOfBounds = false,
}: {
  width: number;
  depth: number;
  height: number;
  printerName: string;
  showVolume: boolean;
  isOutOfBounds: boolean;
}) {
  const texture = useMemo(() => {
    return createBambuPlateTexture(width, depth, printerName);
  }, [width, depth, printerName]);

  return (
    <group>
      {/* 1. Main Textured Spring Steel Plate Surface */}
      <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[width, depth]} />
        <meshStandardMaterial
          map={texture ?? undefined}
          roughness={0.75}
          metalness={0.12}
        />
      </mesh>

      {/* 2. Magnetic Heated Bed Base Slab */}
      <mesh position={[0, -1, 0]} receiveShadow>
        <boxGeometry args={[width, 2, depth]} />
        <meshStandardMaterial color="#16181d" roughness={0.65} metalness={0.3} />
      </mesh>

      {/* 3. Bambu Front Pull Handle / Notch */}
      <mesh position={[0, -0.9, depth / 2 + 7]} receiveShadow>
        <boxGeometry args={[Math.min(94, width * 0.4), 1.8, 14]} />
        <meshStandardMaterial color="#24272e" roughness={0.5} metalness={0.25} />
      </mesh>

      {/* 4. Bambu Green Perimeter Line */}
      <lineSegments position={[0, 0.06, 0]}>
        <edgesGeometry args={[new THREE.BoxGeometry(width, 0.08, depth)]} />
        <lineBasicMaterial color={isOutOfBounds ? "#ef4444" : "#00ae42"} linewidth={2} />
      </lineSegments>

      {/* 5. Printable Height Envelope / Build Volume Wireframe */}
      {showVolume && (
        <group position={[0, height / 2, 0]}>
          <lineSegments>
            <edgesGeometry args={[new THREE.BoxGeometry(width, height, depth)]} />
            <lineBasicMaterial
              color={isOutOfBounds ? "#ef4444" : "#38bdf8"}
              transparent
              opacity={0.32}
            />
          </lineSegments>
        </group>
      )}
    </group>
  );
}

// Model Mesh positioned directly on top of the bed at Y = 0
function GroundedModel({
  geometry,
  rotation,
  color,
  wireframe,
  isOutOfBounds,
}: {
  geometry: THREE.BufferGeometry;
  rotation: [number, number, number];
  color: string;
  wireframe: boolean;
  isOutOfBounds: boolean;
}) {
  // Compute grounding offset so lowest vertex is precisely on Y = 0, centered on X/Z
  const { offset } = useMemo(() => {
    const tempMesh = new THREE.Mesh(geometry);
    tempMesh.rotation.set(rotation[0], rotation[1], rotation[2]);
    tempMesh.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(tempMesh);
    const center = box.getCenter(new THREE.Vector3());
    return {
      offset: [-center.x, -box.min.y, -center.z] as [number, number, number],
      box,
    };
  }, [geometry, rotation]);

  const matColor = isOutOfBounds ? "#f87171" : color;

  return (
    <group position={offset}>
      <group rotation={rotation}>
        <mesh geometry={geometry} castShadow receiveShadow>
          <meshStandardMaterial
            color={matColor}
            roughness={0.38}
            metalness={0.08}
            wireframe={wireframe}
          />
        </mesh>
      </group>
    </group>
  );
}

// Color Swatches for interactive slicer preview
const PREVIEW_SWATCHES = [
  { id: "charcoal", name: "Charcoal", hex: "#2A2E32" },
  { id: "teal", name: "Teal", hex: "#00B8A9" },
  { id: "bone", name: "Bone", hex: "#EFEBE3" },
  { id: "stone", name: "Stone", hex: "#9AA0A6" },
  { id: "bambu_green", name: "Slicer Green", hex: "#00ae42" },
  { id: "orange", name: "Signal Orange", hex: "#ff6a00" },
];

export function ModelViewer({
  file,
  printer,
  colorHex = "#2A2E32",
  colorName = "charcoal",
  onColorChange,
  className,
}: ModelViewerProps) {
  const [geometry, setGeometry] = useState<THREE.BufferGeometry | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  // Slicer Viewport States
  const [viewMode, setViewMode] = useState<"3d" | "top" | "front">("3d");
  const [rotation, setRotation] = useState<[number, number, number]>([0, 0, 0]);
  const [showVolume, setShowVolume] = useState(false);
  const [wireframe, setWireframe] = useState(false);
  const [autoRotate, setAutoRotate] = useState(false);
  const [activeColor, setActiveColor] = useState(colorHex);
  const [expanded, setExpanded] = useState(false);
  const [stats, setStats] = useState<{
    sizeMm: { x: number; y: number; z: number };
    triangles: number;
    volumeCm3: number;
  } | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Sync activeColor when colorHex changes from parent form
  useEffect(() => {
    setActiveColor(colorHex);
  }, [colorHex]);

  // Printer build dimensions (default to Bambu Lab P1S 256x256x256)
  const buildVolume = useMemo(() => {
    if (printer?.build_volume_x && printer?.build_volume_y) {
      return {
        x: printer.build_volume_x,
        y: printer.build_volume_y,
        z: printer.build_volume_z ?? 256,
      };
    }
    if (printer?.build_volume) {
      const match = printer.build_volume.match(/\d+/g);
      if (match && match.length >= 2) {
        return {
          x: parseInt(match[0], 10) || 256,
          y: parseInt(match[1], 10) || 256,
          z: parseInt(match[2] ?? match[0], 10) || 256,
        };
      }
    }
    return { x: 256, y: 256, z: 256 };
  }, [printer]);

  const printerName = printer?.name ?? "Bambu Lab P1S";

  // Load 3D model (STL, OBJ, 3MF)
  useEffect(() => {
    let url = "";
    setLoading(true);
    setError(false);
    setGeometry(null);
    setStats(null);
    setRotation([0, 0, 0]);

    try {
      url = URL.createObjectURL(file);
      const ext = file.name.split(".").pop()?.toLowerCase();

      if (ext === "obj") {
        const loader = new OBJLoader();
        loader.load(
          url,
          (group) => {
            const geoms: THREE.BufferGeometry[] = [];
            group.traverse((child) => {
              if ((child as THREE.Mesh).isMesh && (child as THREE.Mesh).geometry) {
                geoms.push((child as THREE.Mesh).geometry.clone());
              }
            });
            if (geoms.length > 0) {
              const merged = geoms[0]; // fallback to primary mesh
              handleLoadedGeometry(merged);
            } else {
              setError(true);
              setLoading(false);
            }
          },
          undefined,
          () => {
            setError(true);
            setLoading(false);
          }
        );
      } else if (ext === "3mf") {
        const loader = new ThreeMFLoader();
        loader.load(
          url,
          (group) => {
            let foundGeom: THREE.BufferGeometry | null = null;
            group.traverse((child) => {
              if (!foundGeom && (child as THREE.Mesh).isMesh && (child as THREE.Mesh).geometry) {
                foundGeom = (child as THREE.Mesh).geometry.clone();
              }
            });
            if (foundGeom) {
              handleLoadedGeometry(foundGeom);
            } else {
              setError(true);
              setLoading(false);
            }
          },
          undefined,
          () => {
            setError(true);
            setLoading(false);
          }
        );
      } else {
        // Default STL loader
        const loader = new STLLoader();
        loader.load(
          url,
          (geo) => {
            handleLoadedGeometry(geo);
          },
          undefined,
          (err) => {
            console.error("Failed to load STL file:", err);
            setError(true);
            setLoading(false);
          }
        );
      }
    } catch (e) {
      console.error("Error creating model URL:", e);
      setError(true);
      setLoading(false);
    }

    function handleLoadedGeometry(geo: THREE.BufferGeometry) {
      // Auto-scale if exported in meters (e.g., bounding box < 1mm)
      geo.computeBoundingBox();
      const b = geo.boundingBox!;
      const maxSpan = Math.max(b.max.x - b.min.x, b.max.y - b.min.y, b.max.z - b.min.z);
      if (maxSpan > 0 && maxSpan < 1.0) {
        geo.scale(1000, 1000, 1000);
      }

      const st = computeStats(geo);
      setStats(st);
      setGeometry(geo);
      setLoading(false);
    }

    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [file]);

  // Check if model fits within printer build volume
  const isOutOfBounds = useMemo(() => {
    if (!stats) return false;
    // Account for current rotation
    const rotX = rotation[0];
    const rotZ = rotation[2];
    const xFlipped = Math.abs(Math.sin(rotZ)) > 0.5;
    const yFlipped = Math.abs(Math.sin(rotX)) > 0.5;

    const curWidth = xFlipped ? stats.sizeMm.y : stats.sizeMm.x;
    const curDepth = yFlipped ? stats.sizeMm.y : stats.sizeMm.z;
    const curHeight = yFlipped ? stats.sizeMm.z : stats.sizeMm.y;

    return (
      curWidth > buildVolume.x ||
      curDepth > buildVolume.y ||
      curHeight > buildVolume.z
    );
  }, [stats, rotation, buildVolume]);

  if (!mounted) {
    return (
      <div className="flex h-80 w-full animate-pulse items-center justify-center rounded-2xl bg-surface-2 text-sm text-muted">
        Initializing 3D Slicer Plate…
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-80 w-full flex-col items-center justify-center rounded-2xl border border-dashed border-border/80 bg-surface-2/60 p-6 text-center text-sm text-muted">
        <AlertTriangle className="mb-2 size-8 text-amber-500" />
        <p className="font-medium text-fg">3D Preview not available for this file</p>
        <p className="mt-1 text-xs text-muted max-w-sm">
          We can still slice and print your model! Our print team will load <span className="font-mono text-fg">{file.name}</span> in Bambu Studio before manufacturing.
        </p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative rounded-2xl border border-border/80 bg-[#14161a] overflow-hidden transition-all shadow-inner",
        expanded
          ? "fixed inset-3 sm:inset-8 z-50 flex flex-col rounded-3xl shadow-2xl border-accent/40 ring-1 ring-accent/30"
          : "h-80 sm:h-96 w-full",
        className
      )}
    >
      {/* Top Floating Slicer HUD / Controls Bar */}
      <div className="absolute top-3 inset-x-3 z-10 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        {/* Left: Printer & Fit Status Badge */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <div className="flex items-center gap-2 rounded-xl bg-black/75 px-3 py-1.5 backdrop-blur-md border border-white/10 text-xs shadow-md">
            <span className="size-2 rounded-full bg-[#00ae42]" />
            <span className="font-semibold text-white/90">{printerName}</span>
            <span className="text-white/40">·</span>
            <span className="text-white/60 font-mono text-[11px]">
              {buildVolume.x}×{buildVolume.y} mm
            </span>
          </div>

          {stats && (
            <div
              className={cn(
                "hidden sm:flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 backdrop-blur-md border text-xs font-medium shadow-md transition-colors",
                isOutOfBounds
                  ? "bg-rose-500/20 text-rose-300 border-rose-500/40"
                  : "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
              )}
            >
              {isOutOfBounds ? (
                <>
                  <AlertTriangle className="size-3.5" />
                  <span>Exceeds Bed Limits</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="size-3.5" />
                  <span>Fits Plate</span>
                </>
              )}
            </div>
          )}
        </div>

        {/* Right: Camera Presets & Slicer Actions */}
        <div className="flex items-center gap-1.5 pointer-events-auto rounded-xl bg-black/75 p-1 backdrop-blur-md border border-white/10 shadow-md">
          {/* View Modes */}
          <button
            type="button"
            title="3D Isometric View"
            onClick={() => setViewMode("3d")}
            className={cn(
              "px-2.5 py-1 rounded-lg text-xs font-medium transition-colors",
              viewMode === "3d"
                ? "bg-accent text-ink"
                : "text-white/70 hover:text-white hover:bg-white/10"
            )}
          >
            3D
          </button>
          <button
            type="button"
            title="Top Slicer View"
            onClick={() => setViewMode("top")}
            className={cn(
              "px-2.5 py-1 rounded-lg text-xs font-medium transition-colors",
              viewMode === "top"
                ? "bg-accent text-ink"
                : "text-white/70 hover:text-white hover:bg-white/10"
            )}
          >
            Top
          </button>
          <button
            type="button"
            title="Front Slicer View"
            onClick={() => setViewMode("front")}
            className={cn(
              "px-2.5 py-1 rounded-lg text-xs font-medium transition-colors",
              viewMode === "front"
                ? "bg-accent text-ink"
                : "text-white/70 hover:text-white hover:bg-white/10"
            )}
          >
            Front
          </button>

          <div className="h-3.5 w-px bg-white/20 mx-0.5" />

          {/* Rotate 90° X */}
          <button
            type="button"
            title="Rotate 90° (Lay Flat / Turn)"
            onClick={() =>
              setRotation((prev) => [(prev[0] + Math.PI / 2) % (Math.PI * 2), prev[1], prev[2]])
            }
            className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
          >
            <RotateCw className="size-3.5" />
          </button>

          {/* Toggle Build Volume Box */}
          <button
            type="button"
            title="Toggle Print Volume Enclosure"
            onClick={() => setShowVolume((prev) => !prev)}
            className={cn(
              "p-1.5 rounded-lg transition-colors",
              showVolume
                ? "bg-cyan-500/20 text-cyan-400"
                : "text-white/70 hover:text-white hover:bg-white/10"
            )}
          >
            <Box className="size-3.5" />
          </button>

          {/* Toggle Wireframe */}
          <button
            type="button"
            title="Toggle Mesh Wireframe"
            onClick={() => setWireframe((prev) => !prev)}
            className={cn(
              "p-1.5 rounded-lg transition-colors",
              wireframe
                ? "bg-accent/20 text-accent"
                : "text-white/70 hover:text-white hover:bg-white/10"
            )}
          >
            <Grid className="size-3.5" />
          </button>

          {/* Fullscreen / Expand */}
          <button
            type="button"
            title={expanded ? "Minimize Preview" : "Expand Slicer Preview"}
            onClick={() => setExpanded((prev) => !prev)}
            className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
          >
            {expanded ? <Minimize2 className="size-3.5" /> : <Maximize2 className="size-3.5" />}
          </button>
        </div>
      </div>

      {/* 3D Canvas Area */}
      <div className="h-full w-full">
        {loading ? (
          <div className="flex h-full w-full items-center justify-center text-sm text-white/70 gap-2">
            <span className="size-4 animate-spin rounded-full border-2 border-accent border-t-transparent" />
            Generating build plate preview…
          </div>
        ) : geometry ? (
          <Canvas
            shadows
            camera={{ position: [200, 180, 240], fov: 45 }}
            className="h-full w-full cursor-grab active:cursor-grabbing"
          >
            <color attach="background" args={["#121417"]} />

            {/* Slicer Studio Lights */}
            <ambientLight intensity={1.15} />
            <directionalLight
              position={[140, 240, 160]}
              intensity={1.7}
              castShadow
              shadow-mapSize={[1024, 1024]}
            />
            <directionalLight position={[-140, 160, -140]} intensity={0.65} />

            {/* Build Plate */}
            <BuildPlate
              width={buildVolume.x}
              depth={buildVolume.y}
              height={buildVolume.z}
              printerName={printerName}
              showVolume={showVolume}
              isOutOfBounds={isOutOfBounds}
            />

            {/* Grounded Model Sitting on Plate (Y=0) */}
            <GroundedModel
              geometry={geometry}
              rotation={rotation}
              color={activeColor}
              wireframe={wireframe}
              isOutOfBounds={isOutOfBounds}
            />

            {/* Realistic Contact Shadow directly onto Plate */}
            <ContactShadows
              position={[0, 0.02, 0]}
              opacity={0.62}
              scale={Math.max(buildVolume.x, buildVolume.y) * 1.3}
              blur={1.8}
              far={70}
            />

            {/* Camera and Navigation Controller */}
            <CameraController
              viewMode={viewMode}
              buildVolume={buildVolume}
              autoRotate={autoRotate}
            />
          </Canvas>
        ) : null}
      </div>

      {/* Bottom Floating Stats & Quick Swatches Bar */}
      <div className="absolute bottom-3 inset-x-3 z-10 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        {/* Left: Model Dimension Tags */}
        {stats && (
          <div className="flex items-center gap-1.5 pointer-events-auto rounded-xl bg-black/75 px-3 py-1.5 backdrop-blur-md border border-white/10 text-[11px] text-white/80 shadow-md">
            <span className="font-medium text-white/90">
              {stats.sizeMm.x.toFixed(1)} × {stats.sizeMm.z.toFixed(1)} × {stats.sizeMm.y.toFixed(1)} mm
            </span>
            <span className="text-white/30">|</span>
            <span className="text-white/60">{stats.volumeCm3.toFixed(1)} cm³</span>
            <span className="text-white/30 hidden sm:inline">|</span>
            <span className="text-white/60 hidden sm:inline">
              {stats.triangles.toLocaleString("en-IN")} tris
            </span>
          </div>
        )}

        {/* Right: Quick Filament Color Swatches + Turntable Toggle */}
        <div className="flex items-center gap-2 pointer-events-auto rounded-xl bg-black/75 px-2.5 py-1.5 backdrop-blur-md border border-white/10 shadow-md">
          <span className="text-[10px] text-white/50 uppercase tracking-wider hidden sm:inline font-medium">
            Filament:
          </span>
          <div className="flex items-center gap-1">
            {PREVIEW_SWATCHES.map((swatch) => (
              <button
                key={swatch.id}
                type="button"
                title={swatch.name}
                onClick={() => {
                  setActiveColor(swatch.hex);
                  if (onColorChange) onColorChange(swatch.id);
                }}
                className={cn(
                  "size-4 rounded-full border transition-all active:scale-90",
                  activeColor === swatch.hex
                    ? "border-accent scale-110 ring-2 ring-accent/40"
                    : "border-white/20 hover:scale-105"
                )}
                style={{ backgroundColor: swatch.hex }}
              />
            ))}
          </div>

          <div className="h-3 w-px bg-white/20 mx-0.5" />

          {/* Turntable Auto-Rotate Toggle */}
          <button
            type="button"
            title={autoRotate ? "Pause Turntable" : "Start Turntable Rotation"}
            onClick={() => setAutoRotate((prev) => !prev)}
            className={cn(
              "px-2 py-0.5 rounded text-[11px] font-medium transition-colors",
              autoRotate ? "bg-accent/20 text-accent" : "text-white/60 hover:text-white"
            )}
          >
            Turntable
          </button>
        </div>
      </div>

      {/* Subtle Navigation Helper Notice */}
      <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 text-[10px] text-white/30 pointer-events-none hidden md:block">
        Left-drag rotate · Right-drag pan · Scroll zoom
      </div>
    </div>
  );
}
