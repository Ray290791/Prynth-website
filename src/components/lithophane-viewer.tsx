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

export type LithophaneShape = "flat" | "heart";

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

// Build solid 3D manifold geometry with genuine tactile relief depth
function buildLithophaneGeometry(
  imgData: ImageData,
  shape: LithophaneShape,
  widthMm: number,
  heightMm: number,
  contrast = 1.15,
  invert = false
): THREE.BufferGeometry {
  const { width: imgW, height: imgH, data } = imgData;

  const cols = 150;
  const rows = Math.max(80, Math.min(180, Math.round(cols * (heightMm / widthMm))));
  const minT = 0.8; // Minimum printable wall thickness in mm (translucent highlights)
  const maxT = 3.4; // Maximum thickness in mm (opaque darks)

  const thicknessGrid: number[][] = [];

  for (let r = 0; r < rows; r++) {
    thicknessGrid[r] = [];
    const v = r / (rows - 1);

    for (let c = 0; c < cols; c++) {
      const u = c / (cols - 1);

      let lum = sampleBilinearLuminance(data, imgW, imgH, u, v);
      lum = Math.pow(Math.max(0, Math.min(1, lum)), contrast);
      if (invert) lum = 1.0 - lum;

      // In authentic 3D printed lithophanes:
      // Dark areas = THICK polymer (up to 3.4mm)
      // Bright areas = THIN polymer (down to 0.8mm)
      let t = minT + (1.0 - lum) * (maxT - minT);

      // Heart boundary smooth masking
      if (shape === "heart") {
        const nx = (u - 0.5) * 2.2;
        const ny = (1.0 - v - 0.45) * 2.2;
        const heartDist = Math.pow(nx * nx + ny * ny - 1, 3) - nx * nx * Math.pow(ny, 3);
        if (heartDist > 0.02) {
          t = 0.5;
        }
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

// Custom True-Lithophane Shader Material
// Models physical 0.12mm 3D-printed White PLA relief with internal warm backlight transmission
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

    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vViewPosition;
    varying vec3 vWorldPosition;

    void main() {
      // Smooth Heart mask if heart shape
      if (uIsHeart > 0.5) {
        float nx = (vUv.x - 0.5) * 2.2;
        float ny = (vUv.y - 0.45) * 2.2;
        float heartDist = pow(nx * nx + ny * ny - 1.0, 3.0) - nx * nx * pow(ny, 3.0);
        if (heartDist > 0.015) {
          discard;
        }
      }

      // Sample base continuous-tone image
      vec4 texColor = texture2D(uTexture, vUv);
      float lum = 0.299 * texColor.r + 0.587 * texColor.g + 0.114 * texColor.b;
      lum = pow(clamp(lum, 0.0, 1.0), uContrast);
      if (uInvert > 0.5) lum = 1.0 - lum;

      // Micro-relief surface normal gradients from heightmap
      vec2 texel = vec2(1.0 / 800.0, 1.0 / 600.0);
      float lumR = texture2D(uTexture, vUv + vec2(texel.x, 0.0)).r;
      float lumL = texture2D(uTexture, vUv - vec2(texel.x, 0.0)).r;
      float lumU = texture2D(uTexture, vUv + vec2(0.0, texel.y)).r;
      float lumD = texture2D(uTexture, vUv - vec2(0.0, texel.y)).r;

      vec3 surfaceNormal = normalize(vNormal + vec3((lumL - lumR) * 0.4, (lumD - lumU) * 0.4, 0.0));

      // Subtle 0.12mm FDM 3D printing horizontal micro-layer texture
      float layerLine = sin(vUv.y * uDimensionsMm.y * (1.0 / 0.12) * 3.14159) * 0.035;
      surfaceNormal.y += layerLine;
      surfaceNormal = normalize(surfaceNormal);

      vec3 viewDir = normalize(vViewPosition);

      // 1. Studio ambient & key lighting (room reflections)
      vec3 keyLightDir = normalize(vec3(0.5, 0.85, 0.9));
      float NdotL = max(dot(surfaceNormal, keyLightDir), 0.0);

      // Specular reflection of silky Jade White PLA
      vec3 halfDir = normalize(keyLightDir + viewDir);
      float spec = pow(max(dot(surfaceNormal, halfDir), 0.0), 28.0) * 0.22;

      // Authentic unlit 3D carved white plastic appearance
      // Highlights & micro-shadows along the raised physical relief
      vec3 unlitPlastic = uPlasticColor * (0.38 + 0.62 * NdotL) + vec3(spec);

      // 2. Physical Backlight Transmission:
      // In real lithophanes, light shines from behind through the translucent polymer:
      // Thin areas (high lum) allow light to pass brightly with warm tungsten glow
      // Thick areas (low lum) absorb light, showing as deep rich shadows
      float transmission = 0.06 + 0.94 * pow(lum, 1.25);
      vec3 backlitGlow = uLightColor * transmission;

      // Backlit state combines the warm internal transmission with subtle surface specular reflection
      vec3 litPlastic = unlitPlastic * 0.22 + backlitGlow * 1.1 + vec3(spec * 0.4);

      // Smooth transition between Backlight OFF (Sculptural PLA) and Backlight ON (Warm Lamp Glow)
      vec3 finalColor = mix(unlitPlastic, litPlastic, uLightIntensity);

      gl_FragColor = vec4(finalColor, 1.0);
    }
  `,
};

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

// Minimalist Tabletop Easel Stand for "Printed Lithophane Only"
function TabletopEaselStand({
  widthMm,
  heightMm,
}: {
  widthMm: number;
  heightMm: number;
}) {
  const legW = 12;
  const legH = heightMm * 0.55;
  const spread = Math.min(widthMm * 0.65, 80);

  return (
    <group position={[0, 0, -8]}>
      {/* Left easel support foot */}
      <mesh position={[-spread / 2, -heightMm * 0.42, -10]} rotation={[0.25, 0, 0]}>
        <boxGeometry args={[legW, legH, 6]} />
        <meshStandardMaterial color="#22262d" roughness={0.7} />
      </mesh>

      {/* Right easel support foot */}
      <mesh position={[spread / 2, -heightMm * 0.42, -10]} rotation={[0.25, 0, 0]}>
        <boxGeometry args={[legW, legH, 6]} />
        <meshStandardMaterial color="#22262d" roughness={0.7} />
      </mesh>

      {/* Cross brace */}
      <mesh position={[0, -heightMm * 0.46, -6]}>
        <boxGeometry args={[spread + 10, 6, 6]} />
        <meshStandardMaterial color="#22262d" roughness={0.7} />
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

  // Lithophane Shader Material Uniforms
  const shaderUniforms = useMemo(() => {
    return {
      uTexture: { value: photoTexture },
      uLightIntensity: { value: backlightOn ? 1.0 : 0.0 },
      uLightColor: { value: new THREE.Color("#ffe0a4") },
      uPlasticColor: { value: new THREE.Color("#f6f5ef") },
      uContrast: { value: contrast ?? 1.15 },
      uInvert: { value: invert ? 1.0 : 0.0 },
      uDimensionsMm: { value: new THREE.Vector2(sizeMm.width, sizeMm.height) },
      uIsHeart: { value: shape === "heart" ? 1.0 : 0.0 },
    };
  }, [photoTexture, sizeMm.width, sizeMm.height, shape]);

  // Update animated uniforms dynamically
  useEffect(() => {
    shaderUniforms.uLightIntensity.value = backlightOn ? 1.0 : 0.0;
    shaderUniforms.uContrast.value = contrast ?? 1.15;
    shaderUniforms.uInvert.value = invert ? 1.0 : 0.0;
    shaderUniforms.uTexture.value = photoTexture;
    shaderUniforms.uDimensionsMm.value.set(sizeMm.width, sizeMm.height);
    shaderUniforms.uIsHeart.value = shape === "heart" ? 1.0 : 0.0;
  }, [backlightOn, contrast, invert, photoTexture, sizeMm, shape, shaderUniforms]);

  // Center lithophane seated into the wooden base slot or easel
  const yOffset = sizeMm.height / 2 - (hasWoodenBase ? 4 : 0);

  return (
    <group position={[0, -sizeMm.height * 0.45 + (hasWoodenBase ? 16 : 6), 0]}>
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

      {/* Display Base: Either Beech Wood LED Base OR Tabletop Easel Stand */}
      {hasWoodenBase ? (
        <WoodenBase widthMm={sizeMm.width} backlightOn={backlightOn} />
      ) : (
        <TabletopEaselStand widthMm={sizeMm.width} heightMm={sizeMm.height} />
      )}

      {/* Real Backlight Source placed physically BEHIND the lithophane plate */}
      {backlightOn && (
        <group position={[0, yOffset, -30]}>
          {/* Glowing warm LED light bulb mesh visible when camera looks behind */}
          <mesh>
            <sphereGeometry args={[4, 16, 16]} />
            <meshBasicMaterial color="#ffe6b0" />
          </mesh>
          <pointLight
            intensity={2800}
            distance={260}
            color="#ffe2a4"
          />
          <pointLight
            position={[0, -15, 10]}
            intensity={1400}
            distance={160}
            color="#ffd07b"
          />
        </group>
      )}

      {/* Ground Contact Shadow */}
      <ContactShadows
        position={[0, hasWoodenBase ? -20 : -4, 0]}
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
        // High-resolution canvas for crystal-clear texture mapping
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

        // Heightmap data for physical geometry displacement
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
            position: [0, sizeMm.height * 0.1, cameraDist],
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
              <span>Simulating 3D Lithophane Relief…</span>
            </div>
          </div>
        )}

        {/* Top Control Overlay Bar */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
          {/* Shape & Dimensions Pill */}
          <div className="pointer-events-auto flex items-center gap-1.5 rounded-full border border-border/80 bg-surface/85 px-3 py-1 text-xs backdrop-blur-md shadow-xs">
            <Layers className="size-3.5 text-accent" />
            <span className="font-semibold text-fg capitalize">
              {shape === "heart" ? "Heart Keepsake" : "Classic Flat Panel"}
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
            <span>{backlightOn ? "💡 Backlight: ON (Warm Glow)" : "Turn Backlight ON (See Glow)"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
