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
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type LithophaneShape = "flat" | "heart";
export type LithophaneFitMode = "dynamic" | "stretch";

export interface LithophaneViewerProps {
  imageSrc: string | null;
  shape: LithophaneShape;
  sizeMm: { width: number; height: number };
  backlightOn: boolean;
  onToggleBacklight: () => void;
  contrast?: number; // 0.8 to 1.6
  invert?: boolean;
  fitMode?: LithophaneFitMode;
  className?: string;
}

// Sub-pixel bilinear interpolation for physical vertex height displacement
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

// Mathematical boundary test for true heart cutout
function isInsideHeart(u: number, v: number): boolean {
  // Map u in [0, 1] to nx in [-1.25, 1.25]
  // Map v in [0, 1] to ny in [1.25, -1.25] (v=0 is top, v=1 is bottom)
  const nx = (u - 0.5) * 2.3;
  const ny = (0.5 - v) * 2.3 + 0.18;
  const x2 = nx * nx;
  const y2 = ny * ny;
  const term = x2 + y2 - 1.0;
  return term * term * term - x2 * (ny * ny * ny) <= 0.0;
}

// Calculate aspect-preserving mapped UV for dynamic scaling
function getMappedUv(
  u: number,
  v: number,
  plateW: number,
  plateH: number,
  fitMode: LithophaneFitMode = "dynamic",
  imgNaturalDim: { width: number; height: number } | null = null
): { u: number; v: number } {
  if (fitMode === "stretch" || !imgNaturalDim || imgNaturalDim.width <= 0 || imgNaturalDim.height <= 0) {
    return { u, v };
  }

  const plateAspect = plateW / plateH;
  const imgAspect = imgNaturalDim.width / imgNaturalDim.height;

  let mappedU = u;
  let mappedV = v;

  if (plateAspect > imgAspect) {
    // Plate is wider than photo -> fit width, crop height
    const scale = imgAspect / plateAspect;
    mappedV = (v - 0.5) * scale + 0.5;
  } else {
    // Plate is taller than photo -> fit height, crop width
    const scale = plateAspect / imgAspect;
    mappedU = (u - 0.5) * scale + 0.5;
  }

  return {
    u: Math.max(0, Math.min(1, mappedU)),
    v: Math.max(0, Math.min(1, mappedV)),
  };
}

// Build solid 3D manifold geometry with genuine tactile relief depth
function buildLithophaneGeometry(
  imgData: ImageData,
  shape: LithophaneShape,
  widthMm: number,
  heightMm: number,
  contrast = 1.15,
  invert = false,
  fitMode: LithophaneFitMode = "dynamic",
  imgNaturalDim: { width: number; height: number } | null = null
): THREE.BufferGeometry {
  const { width: imgW, height: imgH, data } = imgData;
  const minT = 0.8; // Minimum printable wall thickness in mm (translucent highlights)
  const maxT = 3.4; // Maximum thickness in mm (opaque darks)

  // 1. TRUE PHYSICAL 3D HEART CUTOUT MESH
  if (shape === "heart") {
    const cols = 130;
    const rows = 130;
    const positions: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];

    // Map from (r, c) to { front: number, back: number }
    const vertMap: ({ front: number; back: number } | null)[][] = [];

    for (let r = 0; r < rows; r++) {
      vertMap[r] = [];
      const v = r / (rows - 1);
      const y = (0.5 - v) * heightMm;

      for (let c = 0; c < cols; c++) {
        const u = c / (cols - 1);
        const x = (u - 0.5) * widthMm;

        if (!isInsideHeart(u, v)) {
          vertMap[r][c] = null;
          continue;
        }

        const { u: sU, v: sV } = getMappedUv(u, v, widthMm, heightMm, fitMode, imgNaturalDim);
        let lum = sampleBilinearLuminance(data, imgW, imgH, sU, sV);
        lum = Math.pow(Math.max(0, Math.min(1, lum)), contrast);
        if (invert) lum = 1.0 - lum;

        const t = minT + (1.0 - lum) * (maxT - minT);

        const fIdx = positions.length / 3;
        positions.push(x, y, t);
        uvs.push(u, 1.0 - v);

        const bIdx = positions.length / 3;
        positions.push(x, y, 0);
        uvs.push(u, 1.0 - v);

        vertMap[r][c] = { front: fIdx, back: bIdx };
      }
    }

    // Directed edges to extract perimeter boundary
    const directedEdges = new Map<string, { a: number; b: number; aBack: number; bBack: number }>();

    function addHeartFrontTriangle(
      v0: { front: number; back: number },
      v1: { front: number; back: number },
      v2: { front: number; back: number }
    ) {
      // Front CCW
      indices.push(v0.front, v1.front, v2.front);
      // Back CW
      indices.push(v0.back, v2.back, v1.back);

      // Track 3 edges for sidewall construction
      const edges = [
        [v0, v1],
        [v1, v2],
        [v2, v0],
      ] as const;

      for (const [p1, p2] of edges) {
        const key = `${p1.front}_${p2.front}`;
        directedEdges.set(key, { a: p1.front, b: p2.front, aBack: p1.back, bBack: p2.back });
      }
    }

    // Triangulate grid cells inside heart
    for (let r = 0; r < rows - 1; r++) {
      for (let c = 0; c < cols - 1; c++) {
        const tl = vertMap[r][c];
        const tr = vertMap[r][c + 1];
        const bl = vertMap[r + 1][c];
        const br = vertMap[r + 1][c + 1];

        const count = (tl ? 1 : 0) + (tr ? 1 : 0) + (bl ? 1 : 0) + (br ? 1 : 0);
        if (count === 4) {
          addHeartFrontTriangle(tl!, tr!, bl!);
          addHeartFrontTriangle(tr!, br!, bl!);
        } else if (count === 3) {
          if (!br) addHeartFrontTriangle(tl!, tr!, bl!);
          else if (!bl) addHeartFrontTriangle(tl!, tr!, br!);
          else if (!tr) addHeartFrontTriangle(tl!, br!, bl!);
          else if (!tl) addHeartFrontTriangle(tr!, br!, bl!);
        }
      }
    }

    // Construct watertight sidewalls on unpaired boundary edges
    for (const [, edge] of directedEdges.entries()) {
      const reverseKey = `${edge.b}_${edge.a}`;
      if (!directedEdges.has(reverseKey)) {
        // Unpaired edge: add quad connecting front to back
        indices.push(edge.a, edge.b, edge.bBack);
        indices.push(edge.a, edge.bBack, edge.aBack);
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();

    return geometry;
  }

  // 2. CLASSIC FLAT PANEL RECTANGULAR MESH WITH ARCHITECTURAL BORDER
  const cols = 180;
  const rows = Math.max(90, Math.min(240, Math.round(cols * (heightMm / widthMm))));

  const thicknessGrid: number[][] = [];

  for (let r = 0; r < rows; r++) {
    thicknessGrid[r] = [];
    const v = r / (rows - 1);

    for (let c = 0; c < cols; c++) {
      const u = c / (cols - 1);

      const { u: sU, v: sV } = getMappedUv(u, v, widthMm, heightMm, fitMode, imgNaturalDim);
      let lum = sampleBilinearLuminance(data, imgW, imgH, sU, sV);
      lum = Math.pow(Math.max(0, Math.min(1, lum)), contrast);
      if (invert) lum = 1.0 - lum;

      let t = minT + (1.0 - lum) * (maxT - minT);

      // Architectural framed perimeter border (like LithophaneMaker framed prints)
      const borderDistX = Math.min(c, cols - 1 - c) * (widthMm / (cols - 1));
      const borderDistY = Math.min(r, rows - 1 - r) * (heightMm / (rows - 1));
      const borderDist = Math.min(borderDistX, borderDistY);
      const borderWidthMm = 2.6;
      if (borderDist < borderWidthMm) {
        const borderT = 3.6;
        const factor = Math.sin((borderDist / borderWidthMm) * Math.PI * 0.5);
        t = borderT * (1.0 - factor) + t * factor;
      }

      thicknessGrid[r][c] = t;
    }
  }

  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let r = 0; r < rows; r++) {
    const v = r / (rows - 1);
    const y = (0.5 - v) * heightMm;

    for (let c = 0; c < cols; c++) {
      const u = c / (cols - 1);
      const t = thicknessGrid[r][c];
      const x = (u - 0.5) * widthMm;

      // Front Face (Z displaced according to physical polymer thickness)
      positions.push(x, y, t);
      uvs.push(u, 1.0 - v);

      // Back Face (smooth flat back at Z = 0)
      positions.push(x, y, 0);
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

  // 3. Side Walls (closing the 3D solid plate along top, bottom, left, right)
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

// True-Lithophane Physics Shader Material
// Simulates light transmission through translucent white PLA polymer from a rear light source
const lithophaneShader = {
  vertexShader: `
    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vViewPosition;
    varying vec3 vWorldPosition;

    void main() {
      vUv = uv;
      vNormal = normalize(normalMatrix * normal);
      vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
      vViewPosition = -mvPosition.xyz;
      vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
      gl_Position = projectionMatrix * mvPosition;
    }
  `,
  fragmentShader: `
    uniform sampler2D uTexture;
    uniform float uLightIntensity;
    uniform vec3 uLightColor;
    uniform vec3 uPlasticColor;
    uniform float uContrast;
    uniform float uInvert;
    uniform vec2 uDimensionsMm;
    uniform float uIsHeart;
    uniform vec2 uUvScale;

    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vViewPosition;
    varying vec3 vWorldPosition;

    void main() {
      // Smooth Heart mask if heart shape
      if (uIsHeart > 0.5) {
        float nx = (vUv.x - 0.5) * 2.3;
        float ny = (0.5 - vUv.y) * 2.3 + 0.18;
        float x2 = nx * nx;
        float y2 = ny * ny;
        float term = x2 + y2 - 1.0;
        float heartDist = term * term * term - x2 * (ny * ny * ny);
        if (heartDist > 0.012) {
          discard;
        }
      }

      // Dynamic aspect-ratio preserve mapping
      vec2 mappedUv = (vUv - 0.5) * uUvScale + 0.5;
      mappedUv = clamp(mappedUv, 0.0, 1.0);

      // Clean, unadulterated high-resolution continuous luminance
      vec4 texColor = texture2D(uTexture, mappedUv);
      float lum = 0.299 * texColor.r + 0.587 * texColor.g + 0.114 * texColor.b;
      lum = pow(clamp(lum, 0.0, 1.0), uContrast);
      if (uInvert > 0.5) {
        lum = 1.0 - lum;
      }

      // ── Tactile 3D Bas-Relief Surface Normals (LithophaneMaker High-Definition Relief) ──
      // Samples neighboring micro-relief gradients to give facial features, hair, and edges crisp physical 3D contours
      vec2 texel = vec2(1.0 / 800.0, 1.0 / 800.0);
      float lumR = texture2D(uTexture, clamp(mappedUv + vec2(texel.x, 0.0), 0.0, 1.0)).r;
      float lumL = texture2D(uTexture, clamp(mappedUv - vec2(texel.x, 0.0), 0.0, 1.0)).r;
      float lumU = texture2D(uTexture, clamp(mappedUv + vec2(0.0, texel.y), 0.0, 1.0)).r;
      float lumD = texture2D(uTexture, clamp(mappedUv - vec2(0.0, texel.y), 0.0, 1.0)).r;

      vec3 surfaceNormal = normalize(vNormal + vec3((lumL - lumR) * 0.70, (lumD - lumU) * 0.70, 0.0));

      // Authentic 0.12mm FDM filament layer micro-sheen (anisotropic grazing specular only, zero black stripes)
      float layerCount = uDimensionsMm.y / 0.12;
      float microSheen = sin(vUv.y * layerCount * 6.2831853) * 0.035;

      vec3 viewDir = normalize(vViewPosition);

      // ── Directional Studio Three-Point Lighting for 3D Relief ──
      // Key light from top-right: casts natural shadows in the carved relief valleys and highlights on peaks
      vec3 keyLightDir = normalize(vec3(0.55, 0.75, 0.70));
      float NdotL = max(dot(surfaceNormal, keyLightDir), 0.0);

      // Fill light from left: softens shadows and accentuates contours
      vec3 fillLightDir = normalize(vec3(-0.60, 0.35, -0.30));
      float NdotFill = max(dot(surfaceNormal, fillLightDir), 0.0);

      // Ambient Occlusion: deeper carved recesses naturally receive subtle contact shading
      float ao = clamp(0.38 + 0.62 * pow(lum, 0.55), 0.0, 1.0);

      // Specular highlight of silky 3D printed polymer
      vec3 halfDir = normalize(keyLightDir + viewDir);
      float spec = pow(max(dot(surfaceNormal, halfDir), 0.0), 24.0) * (0.26 + microSheen);

      // 1. UNLIT 3D SCULPTED RELIEF (LithophaneMaker STL Style):
      // Shows the genuine, carved physical 3D plastic bas-relief under studio lighting
      vec3 plaBase = uPlasticColor; // Jade White / Ivory architectural PLA
      vec3 unlitPlastic = plaBase * (0.24 * ao + 0.64 * NdotL + 0.16 * NdotFill) + vec3(spec);

      // 2. SUNLIGHT BACKLIT TRANSMISSION:
      // Real Beer-Lambert optical transmission: thin areas glow brightly, thick areas block light
      float transmission = pow(lum, 1.28);
      vec3 sunlitGold = uLightColor; // Warm sunlight through polymer
      vec3 transmittedGlow = sunlitGold * (0.05 + 0.95 * transmission) * 1.30;

      // Combined lit state: warm rear light streaming through + front surface specular reflections
      vec3 litPlastic = transmittedGlow + plaBase * 0.10 * NdotL + vec3(spec * 0.35);

      // Smooth transition between 3D Carved Relief (Backlight OFF) and Sunlit Window Glow (Backlight ON)
      vec3 finalColor = mix(unlitPlastic, litPlastic, uLightIntensity);

      gl_FragColor = vec4(finalColor, 1.0);
    }
  `,
};

// 100% 3D-Printed Desktop Display Stand (Printed in Matte Charcoal PLA)
function PrintedDesktopStand({
  widthMm,
  heightMm,
  shape,
}: {
  widthMm: number;
  heightMm: number;
  shape: LithophaneShape;
}) {
  const standW = Math.max(widthMm * 0.82, 84);
  const standDepth = 48;
  const standH = 12;

  if (shape === "heart") {
    // Custom sculpted heart cradle stand with angled V-notch and dual support brackets
    return (
      <group position={[0, -heightMm * 0.44, 0]}>
        {/* Main weighted base pedestal */}
        <mesh receiveShadow castShadow position={[0, -standH / 2, 6]}>
          <boxGeometry args={[standW, standH, standDepth]} />
          <meshStandardMaterial color="#1e2229" roughness={0.7} metalness={0.08} />
        </mesh>

        {/* Center V-cradle where the lower point of the heart rests */}
        <mesh position={[0, 2, 6]}>
          <boxGeometry args={[26, 8, 12]} />
          <meshStandardMaterial color="#16191f" roughness={0.8} />
        </mesh>

        {/* Left angled support wing */}
        <mesh position={[-standW * 0.28, 4, 6]} rotation={[0, 0, 0.15]}>
          <boxGeometry args={[14, 12, 10]} />
          <meshStandardMaterial color="#222730" roughness={0.75} />
        </mesh>

        {/* Right angled support wing */}
        <mesh position={[standW * 0.28, 4, 6]} rotation={[0, 0, -0.15]}>
          <boxGeometry args={[14, 12, 10]} />
          <meshStandardMaterial color="#222730" roughness={0.75} />
        </mesh>

        {/* Chamfered front bevel */}
        <mesh position={[0, -standH / 4, standDepth / 2 + 3]} rotation={[0.4, 0, 0]}>
          <boxGeometry args={[standW, 6, 8]} />
          <meshStandardMaterial color="#262b33" roughness={0.75} />
        </mesh>
      </group>
    );
  }

  return (
    <group position={[0, -heightMm * 0.48, 0]}>
      {/* Sleek slotted desktop pedestal stand */}
      <mesh receiveShadow castShadow position={[0, -standH / 2, 6]}>
        <boxGeometry args={[standW, standH, standDepth]} />
        <meshStandardMaterial
          color="#1e2229"
          roughness={0.7}
          metalness={0.08}
        />
      </mesh>

      {/* Chamfered front bevel */}
      <mesh position={[0, -standH / 4, standDepth / 2 + 3]} rotation={[0.4, 0, 0]}>
        <boxGeometry args={[standW, 6, 8]} />
        <meshStandardMaterial color="#262b33" roughness={0.75} />
      </mesh>

      {/* Recessed slot where the lithophane rests */}
      <mesh position={[0, -1, 3]}>
        <boxGeometry args={[widthMm + 4, 6, 7]} />
        <meshStandardMaterial color="#12151a" roughness={0.9} />
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
  autoRotate,
  fitMode = "dynamic",
  imgNaturalDim,
}: {
  imgData: ImageData | null;
  photoTexture: THREE.CanvasTexture | null;
  shape: LithophaneShape;
  sizeMm: { width: number; height: number };
  backlightOn: boolean;
  contrast?: number;
  invert?: boolean;
  autoRotate: boolean;
  fitMode?: LithophaneFitMode;
  imgNaturalDim: { width: number; height: number } | null;
}) {
  const meshRef = useRef<THREE.Group>(null);

  const uvScale = useMemo(() => {
    if (fitMode === "stretch" || !imgNaturalDim || imgNaturalDim.width <= 0 || imgNaturalDim.height <= 0) {
      return new THREE.Vector2(1.0, 1.0);
    }
    const plateAspect = sizeMm.width / sizeMm.height;
    const imgAspect = imgNaturalDim.width / imgNaturalDim.height;
    if (plateAspect > imgAspect) {
      // Plate is wider than photo -> fit width, crop height
      return new THREE.Vector2(1.0, imgAspect / plateAspect);
    } else {
      // Plate is taller than photo -> fit height, crop width
      return new THREE.Vector2(plateAspect / imgAspect, 1.0);
    }
  }, [fitMode, sizeMm.width, sizeMm.height, imgNaturalDim]);

  const geometry = useMemo(() => {
    if (!imgData) return null;
    return buildLithophaneGeometry(
      imgData,
      shape,
      sizeMm.width,
      sizeMm.height,
      contrast,
      invert,
      fitMode,
      imgNaturalDim
    );
  }, [imgData, shape, sizeMm.width, sizeMm.height, contrast, invert, fitMode, imgNaturalDim]);

  useEffect(() => {
    return () => {
      if (geometry) geometry.dispose();
    };
  }, [geometry]);

  // Lithophane Shader Material Uniforms
  const shaderUniforms = useMemo(() => {
    return {
      uTexture: { value: photoTexture },
      uLightIntensity: { value: backlightOn ? 1.0 : 0.0 },
      uLightColor: { value: new THREE.Color("#fff2d6") },
      uPlasticColor: { value: new THREE.Color("#f6f5ef") },
      uContrast: { value: contrast ?? 1.15 },
      uInvert: { value: invert ? 1.0 : 0.0 },
      uDimensionsMm: { value: new THREE.Vector2(sizeMm.width, sizeMm.height) },
      uIsHeart: { value: shape === "heart" ? 1.0 : 0.0 },
      uUvScale: { value: uvScale },
    };
  }, [photoTexture, sizeMm.width, sizeMm.height, shape, uvScale]);

  // Update animated uniforms dynamically
  useEffect(() => {
    shaderUniforms.uLightIntensity.value = backlightOn ? 1.0 : 0.0;
    shaderUniforms.uContrast.value = contrast ?? 1.15;
    shaderUniforms.uInvert.value = invert ? 1.0 : 0.0;
    shaderUniforms.uTexture.value = photoTexture;
    shaderUniforms.uDimensionsMm.value.set(sizeMm.width, sizeMm.height);
    shaderUniforms.uIsHeart.value = shape === "heart" ? 1.0 : 0.0;
    shaderUniforms.uUvScale.value = uvScale;
  }, [backlightOn, contrast, invert, photoTexture, sizeMm, shape, shaderUniforms, uvScale]);

  const yOffset = sizeMm.height / 2;

  return (
    <group position={[0, -sizeMm.height * 0.45, 0]}>
      {/* The Lithophane Physical 3D Model with custom translucent shader */}
      <group ref={meshRef} position={[0, yOffset, 0]}>
        {geometry && (
          <mesh geometry={geometry} castShadow receiveShadow>
            <shaderMaterial
              vertexShader={lithophaneShader.vertexShader}
              fragmentShader={lithophaneShader.fragmentShader}
              uniforms={shaderUniforms}
              side={THREE.DoubleSide}
            />
          </mesh>
        )}
      </group>

      {/* 100% 3D-Printed Desktop Display Stand included with every print */}
      <PrintedDesktopStand widthMm={sizeMm.width} heightMm={sizeMm.height} shape={shape} />

      {/* Real Backlight Source placed physically BEHIND the lithophane (Window sunlight / lamp) */}
      {backlightOn && (
        <group position={[0, yOffset, -40]}>
          {/* Visible warm light source (window / lamp beacon) when viewing from behind */}
          <mesh>
            <sphereGeometry args={[5, 16, 16]} />
            <meshBasicMaterial color="#fff3d6" />
          </mesh>
          <pointLight
            intensity={2800}
            distance={280}
            color="#fff0d0"
          />
          <pointLight
            position={[0, -10, 15]}
            intensity={1200}
            distance={180}
            color="#ffe2a4"
          />
        </group>
      )}

      {/* Ground Contact Shadow */}
      <ContactShadows
        position={[0, -12, 0]}
        opacity={0.6}
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
  fitMode = "dynamic",
  className,
}: LithophaneViewerProps) {
  const [imgData, setImgData] = useState<ImageData | null>(null);
  const [photoTexture, setPhotoTexture] = useState<THREE.CanvasTexture | null>(null);
  const [imgNaturalDim, setImgNaturalDim] = useState<{ width: number; height: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [autoRotate, setAutoRotate] = useState(false);
  const [darkRoom, setDarkRoom] = useState(true);
  const controlsRef = useRef<any>(null);

  useEffect(() => {
    if (!imageSrc) {
      setImgData(null);
      setPhotoTexture(null);
      setImgNaturalDim(null);
      return;
    }

    setLoading(true);
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = imageSrc;

    img.onload = () => {
      try {
        setImgNaturalDim({
          width: img.naturalWidth || img.width,
          height: img.naturalHeight || img.height,
        });
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

        texCtx.imageSmoothingEnabled = true;
        texCtx.imageSmoothingQuality = "high";
        texCtx.drawImage(img, 0, 0, tw, th);

        const tex = new THREE.CanvasTexture(texCanvas);
        tex.minFilter = THREE.LinearMipmapLinearFilter;
        tex.magFilter = THREE.LinearFilter;
        tex.needsUpdate = true;
        setPhotoTexture(tex);

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
            position: [0, sizeMm.height * 0.08, cameraDist],
            fov: 38,
            near: 1,
            far: 2000,
          }}
          className="h-full w-full cursor-grab active:cursor-grabbing"
        >
          {/* Ambient Lighting */}
          <ambientLight intensity={darkRoom ? 0.45 : 0.85} />

          {/* Key Light: directional studio light to highlight physical 3D carved relief */}
          <directionalLight
            position={[90, 130, 110]}
            intensity={darkRoom ? 1.1 : 1.5}
            castShadow
            shadow-mapSize={[1024, 1024]}
          />
          {/* Fill Light: secondary rim light to accentuate contoured borders */}
          <directionalLight
            position={[-90, 70, -60]}
            intensity={darkRoom ? 0.45 : 0.75}
            color="#b8ceff"
          />

          <LithophaneScene
            imgData={imgData}
            photoTexture={photoTexture}
            shape={shape}
            sizeMm={sizeMm}
            backlightOn={backlightOn}
            contrast={contrast}
            invert={invert}
            autoRotate={autoRotate}
            fitMode={fitMode}
            imgNaturalDim={imgNaturalDim}
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
              <span>Simulating 3D Lithophane Relief…</span>
            </div>
          </div>
        )}

        {/* Top Control Overlay Bar */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
          {/* Shape, Dimensions & Relief Mode Badge */}
          <div className="pointer-events-auto flex items-center gap-2">
            <div className="flex items-center gap-1.5 rounded-full border border-border/80 bg-surface/85 px-3 py-1 text-xs backdrop-blur-md shadow-xs">
              <Layers className="size-3.5 text-accent" />
              <span className="font-semibold text-fg capitalize">
                {shape === "heart" ? "Heart Keepsake" : "Classic Flat Panel"}
              </span>
              <span className="text-muted">·</span>
              <span className="text-muted tabular-nums">
                {sizeMm.width} × {sizeMm.height} mm
              </span>
            </div>

            {backlightOn ? (
              <div className="hidden sm:flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-[11px] font-semibold text-amber-300 backdrop-blur-md shadow-xs">
                <span>☀️ Sunlit Window Glow</span>
              </div>
            ) : (
              <div className="hidden sm:flex items-center gap-1 rounded-full border border-accent/40 bg-accent/15 px-2.5 py-1 text-[11px] font-semibold text-accent backdrop-blur-md shadow-xs">
                <span>🗿 3D Carved Relief Texture</span>
              </div>
            )}

            {fitMode === "stretch" ? (
              <div className="hidden md:flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-[11px] font-semibold text-amber-300 backdrop-blur-md shadow-xs">
                <span>Strict Frame</span>
              </div>
            ) : (
              <div className="hidden md:flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-300 backdrop-blur-md shadow-xs">
                <span>Dynamic 1:1 Scale</span>
              </div>
            )}
          </div>

          {/* Quick Viewer Toggles */}
          <div className="pointer-events-auto flex items-center gap-1.5 rounded-full border border-border/80 bg-surface/85 p-1 backdrop-blur-md shadow-xs">
            {/* View Mode Toggle: Backlit vs 3D Relief Texture */}
            <button
              type="button"
              onClick={onToggleBacklight}
              title={backlightOn ? "Switch to 3D Carved Relief Texture (Inspect Physical Print)" : "Switch to Sunlight Backlit View"}
              className={cn(
                "flex size-7 items-center justify-center rounded-full transition-colors cursor-pointer",
                backlightOn ? "text-amber-400 hover:text-amber-300" : "bg-accent/20 text-accent font-bold"
              )}
            >
              {backlightOn ? <Sun className="size-3.5" /> : <Layers className="size-3.5" />}
            </button>

            {/* Dark Room vs Daylight Studio */}
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

        {/* Bottom Prominent Dual-Mode Switcher Button */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 pointer-events-auto">
          <button
            type="button"
            onClick={onToggleBacklight}
            className={cn(
              "flex items-center gap-2.5 rounded-full px-5 py-2.5 text-xs font-semibold shadow-xl transition-all duration-200 cursor-pointer border",
              backlightOn
                ? "bg-amber-400 text-stone-950 border-amber-300 ring-4 ring-amber-400/20 shadow-amber-500/30 font-bold"
                : "bg-surface/95 text-fg border-accent/50 ring-4 ring-accent/20 shadow-accent/25 hover:bg-surface font-bold"
            )}
          >
            {backlightOn ? (
              <>
                <Sun className="size-4 text-stone-950 fill-current shrink-0" />
                <span>☀️ Sunlight Backlit: ON · Click to Inspect 3D Relief Texture</span>
              </>
            ) : (
              <>
                <Layers className="size-4 text-accent shrink-0" />
                <span>🗿 3D Carved Relief: ON · Click for Sunlight Backlight</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
