import { zipSync, strToU8 } from "fflate";

export interface LithoMesh {
  verts: [number, number, number][];
  triangles: [number, number, number][];
}

/**
 * Sub-pixel bilinear interpolation for continuous, buttery-smooth height displacement.
 * Prevents stair-stepping or pixelation artifacts in 3D prints.
 */
function sampleBilinearLuminance(
  data: Uint8ClampedArray,
  w: number,
  h: number,
  u: number,
  v: number
): number {
  const fx = Math.max(0, Math.min(1, u)) * (w - 1);
  const fy = Math.max(0, Math.min(1, v)) * (h - 1);
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

/**
 * Authentic heart boundary test matching lithophane-viewer.tsx
 */
export function isInsideHeart(u: number, v: number): boolean {
  const nx = (u - 0.5) * 2.4;
  const ny = (0.5 - v) * 2.4 + 0.28;
  const x2 = nx * nx;
  const y2 = ny * ny;
  const term = x2 + y2 - 1.0;
  return term * term * term - x2 * (ny * ny * ny) <= 0.0;
}

/**
 * Generates an ultra-high-definition, watertight 3D manifold mesh directly from the photo.
 * Matches the exact fidelity, contrast gamma, and tactile micro-relief seen in the 3D studio preview.
 */
export async function generateLithophaneMeshData(
  photo: string,
  widthMm: number,
  heightMm: number,
  shape: "flat" | "heart"
): Promise<LithoMesh | null> {
  if (!photo || photo.startsWith("[")) {
    return null;
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      // 1. Maintain high-resolution image buffer (do not downsample before sampling)
      const imgW = Math.min(1200, Math.max(400, img.naturalWidth || 800));
      const imgH = Math.min(1200, Math.max(400, img.naturalHeight || 800));

      const canvas = document.createElement("canvas");
      canvas.width = imgW;
      canvas.height = imgH;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(null);
        return;
      }
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, 0, 0, imgW, imgH);
      const imgData = ctx.getImageData(0, 0, imgW, imgH);
      const { data } = imgData;

      const minT = 0.8;  // Thinnest printable layer in mm (pure highlights)
      const maxT = 3.2;  // Thickest solid layer in mm (pure shadows)
      const contrast = 1.15; // Contrast gamma curve matching 3D preview

      const positions: [number, number, number][] = [];
      const triangles: [number, number, number][] = [];

      if (shape === "heart") {
        // High density grid for smooth heart curves and facial details (200x200)
        const cols = 200;
        const rows = 200;
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

            let lum = sampleBilinearLuminance(data, imgW, imgH, u, v);
            lum = Math.pow(Math.max(0, Math.min(1, lum)), contrast);
            const t = minT + (1.0 - lum) * (maxT - minT);

            const fIdx = positions.length;
            positions.push([x, y, t]);
            const bIdx = positions.length;
            positions.push([x, y, 0]);

            vertMap[r][c] = { front: fIdx, back: bIdx };
          }
        }

        const directedEdges = new Map<string, { a: number; b: number; aBack: number; bBack: number }>();

        function addHeartFrontTriangle(
          v0: { front: number; back: number },
          v1: { front: number; back: number },
          v2: { front: number; back: number }
        ) {
          // Front CCW
          triangles.push([v0.front, v1.front, v2.front]);
          // Back CW
          triangles.push([v0.back, v2.back, v1.back]);

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

        // Watertight sidewalls connecting front heart edge to back base
        for (const [, edge] of directedEdges.entries()) {
          const reverseKey = `${edge.b}_${edge.a}`;
          if (!directedEdges.has(reverseKey)) {
            triangles.push([edge.a, edge.b, edge.bBack]);
            triangles.push([edge.a, edge.bBack, edge.aBack]);
          }
        }

        resolve({ verts: positions, triangles });
      } else {
        // High density grid for flat panel (~240 cols) producing ~230,000 smooth triangles
        const cols = 240;
        const rows = Math.max(120, Math.min(320, Math.round(cols * (heightMm / widthMm))));

        for (let r = 0; r < rows; r++) {
          const v = r / (rows - 1);
          const y = (0.5 - v) * heightMm;

          for (let c = 0; c < cols; c++) {
            const u = c / (cols - 1);
            let lum = sampleBilinearLuminance(data, imgW, imgH, u, v);
            lum = Math.pow(Math.max(0, Math.min(1, lum)), contrast);
            let t = minT + (1.0 - lum) * (maxT - minT);

            // Architectural framed border (like professional lithophane makers)
            const borderDistX = Math.min(c, cols - 1 - c) * (widthMm / (cols - 1));
            const borderDistY = Math.min(r, rows - 1 - r) * (heightMm / (rows - 1));
            const borderDist = Math.min(borderDistX, borderDistY);
            const borderWidthMm = 2.4;
            if (borderDist < borderWidthMm) {
              const borderT = 3.4;
              const factor = Math.sin((borderDist / borderWidthMm) * Math.PI * 0.5);
              t = borderT * (1.0 - factor) + t * factor;
            }

            const x = (u - 0.5) * widthMm;
            // Front vertex (even indices: 2 * (r * cols + c))
            positions.push([x, y, t]);
            // Back vertex (odd indices: 2 * (r * cols + c) + 1)
            positions.push([x, y, 0]);
          }
        }

        const getIdx = (r: number, c: number, isBack: boolean) => (r * cols + c) * 2 + (isBack ? 1 : 0);

        // 1. Front face triangles (CCW)
        for (let r = 0; r < rows - 1; r++) {
          for (let c = 0; c < cols - 1; c++) {
            const tl = getIdx(r, c, false);
            const tr = getIdx(r, c + 1, false);
            const bl = getIdx(r + 1, c, false);
            const br = getIdx(r + 1, c + 1, false);
            triangles.push([tl, tr, bl]);
            triangles.push([tr, br, bl]);
          }
        }

        // 2. Back face triangles (CW to face down/outwards)
        for (let r = 0; r < rows - 1; r++) {
          for (let c = 0; c < cols - 1; c++) {
            const tl = getIdx(r, c, true);
            const tr = getIdx(r, c + 1, true);
            const bl = getIdx(r + 1, c, true);
            const br = getIdx(r + 1, c + 1, true);
            triangles.push([tl, bl, tr]);
            triangles.push([tr, bl, br]);
          }
        }

        // 3. Side Walls (closing the 3D solid plate)
        // North
        for (let c = 0; c < cols - 1; c++) {
          triangles.push([getIdx(0, c, false), getIdx(0, c, true), getIdx(0, c + 1, false)]);
          triangles.push([getIdx(0, c + 1, false), getIdx(0, c, true), getIdx(0, c + 1, true)]);
        }
        // South
        for (let c = 0; c < cols - 1; c++) {
          triangles.push([getIdx(rows - 1, c, false), getIdx(rows - 1, c + 1, false), getIdx(rows - 1, c, true)]);
          triangles.push([getIdx(rows - 1, c + 1, false), getIdx(rows - 1, c + 1, true), getIdx(rows - 1, c, true)]);
        }
        // West
        for (let r = 0; r < rows - 1; r++) {
          triangles.push([getIdx(r, 0, false), getIdx(r + 1, 0, false), getIdx(r, 0, true)]);
          triangles.push([getIdx(r + 1, 0, false), getIdx(r + 1, 0, true), getIdx(r, 0, true)]);
        }
        // East
        for (let r = 0; r < rows - 1; r++) {
          triangles.push([getIdx(r, cols - 1, false), getIdx(r, cols - 1, true), getIdx(r + 1, cols - 1, false)]);
          triangles.push([getIdx(r + 1, cols - 1, false), getIdx(r, cols - 1, true), getIdx(r + 1, cols - 1, true)]);
        }

        resolve({ verts: positions, triangles });
      }
    };
    img.onerror = () => resolve(null);
    img.src = photo;
  });
}

/**
 * Builds a 100% compliant Bambu Studio .3mf ZIP archive containing
 * the real 3D lithophane mesh centered on the build plate + lithophane slicer profile.
 */
export function buildLithophaneBambu3mf(
  title: string,
  itemName: string,
  mesh: LithoMesh
): Blob {
  let vertXml = "";
  for (const v of mesh.verts) {
    vertXml += `\n          <vertex x="${v[0].toFixed(2)}" y="${v[1].toFixed(2)}" z="${v[2].toFixed(2)}" />`;
  }

  let triXml = "";
  for (const t of mesh.triangles) {
    triXml += `\n          <triangle v1="${t[0]}" v2="${t[1]}" v3="${t[2]}" />`;
  }

  const modelXml = `<?xml version="1.0" encoding="UTF-8"?>
<model unit="millimeter" xml:lang="en-US" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02">
  <metadata name="Title">Prynth Lithophane – ${title}</metadata>
  <metadata name="Application">Prynth Lithophane Studio</metadata>
  <resources>
    <object id="1" type="model">
      <mesh>
        <vertices>${vertXml}
        </vertices>
        <triangles>${triXml}
        </triangles>
      </mesh>
    </object>
  </resources>
  <build>
    <item objectid="1" transform="1 0 0 0 1 0 0 0 1 128 128 0" />
  </build>
</model>`;

  const contentTypes = `<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml"/>
  <Default Extension="config" ContentType="application/xml"/>
</Types>`;

  const rels = `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Target="/3D/3dmodel.model" Id="rel0" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/>
</Relationships>`;

  const modelSettings = `<?xml version="1.0" encoding="UTF-8"?>
<config>
  <plate>
    <metadata key="plater_id" value="1"/>
    <metadata key="plate_name" value="Prynth Lithophane Plate"/>
    <object_config object_id="1">
      <metadata key="name" value="${itemName}"/>
    </object_config>
  </plate>
</config>`;

  const projectSettings = `<?xml version="1.0" encoding="UTF-8"?>
<config>
  <process>
    <metadata key="layer_height" value="0.12"/>
    <metadata key="first_layer_height" value="0.20"/>
    <metadata key="sparse_infill_density" value="100%"/>
    <metadata key="sparse_infill_pattern" value="rectilinear"/>
    <metadata key="wall_loops" value="3"/>
    <metadata key="top_shell_layers" value="4"/>
    <metadata key="bottom_shell_layers" value="4"/>
    <metadata key="enable_support" value="0"/>
    <metadata key="brim_type" value="auto"/>
    <metadata key="print_sequence" value="by_layer"/>
  </process>
  <filament index="0">
    <metadata key="filament_type" value="PLA"/>
    <metadata key="filament_colour" value="#F5F5F0"/>
    <metadata key="nozzle_temperature" value="220"/>
    <metadata key="bed_temperature" value="55"/>
  </filament>
</config>`;

  const zipBytes = zipSync({
    "[Content_Types].xml": strToU8(contentTypes),
    "_rels/.rels": strToU8(rels),
    "3D/3dmodel.model": strToU8(modelXml),
    "Metadata/model_settings.config": strToU8(modelSettings),
    "Metadata/project_settings.config": strToU8(projectSettings),
  });

  return new Blob([zipBytes], { type: "model/3mf" });
}

/**
 * Builds a standard binary STL ArrayBuffer from the 3D lithophane mesh.
 * Can be opened in Fusion 360, Bambu Studio, Cura, or any CAD/slicer software.
 */
export function buildLithophaneStl(
  widthMm: number,
  heightMm: number,
  mesh: LithoMesh
): ArrayBuffer {
  const triCount = mesh.triangles.length;
  const buffer = new ArrayBuffer(84 + triCount * 50);
  const view = new DataView(buffer);

  const headerText = `Prynth Lithophane STL – ${widthMm}x${heightMm}mm`;
  for (let i = 0; i < 80; i++) {
    view.setUint8(i, i < headerText.length ? headerText.charCodeAt(i) : 0);
  }
  view.setUint32(80, triCount, true);

  let offset = 84;
  for (let t = 0; t < triCount; t++) {
    const [i1, i2, i3] = mesh.triangles[t];
    const v1 = mesh.verts[i1];
    const v2 = mesh.verts[i2];
    const v3 = mesh.verts[i3];

    // Compute surface normal
    const ax = v2[0] - v1[0], ay = v2[1] - v1[1], az = v2[2] - v1[2];
    const bx = v3[0] - v1[0], by = v3[1] - v1[1], bz = v3[2] - v1[2];
    let nx = ay * bz - az * by;
    let ny = az * bx - ax * bz;
    let nz = ax * by - ay * bx;
    const len = Math.hypot(nx, ny, nz);
    if (len > 0) {
      nx /= len; ny /= len; nz /= len;
    }

    // Normal vector
    view.setFloat32(offset, nx, true); offset += 4;
    view.setFloat32(offset, ny, true); offset += 4;
    view.setFloat32(offset, nz, true); offset += 4;
    // Vertex 1
    view.setFloat32(offset, v1[0], true); offset += 4;
    view.setFloat32(offset, v1[1], true); offset += 4;
    view.setFloat32(offset, v1[2], true); offset += 4;
    // Vertex 2
    view.setFloat32(offset, v2[0], true); offset += 4;
    view.setFloat32(offset, v2[1], true); offset += 4;
    view.setFloat32(offset, v2[2], true); offset += 4;
    // Vertex 3
    view.setFloat32(offset, v3[0], true); offset += 4;
    view.setFloat32(offset, v3[1], true); offset += 4;
    view.setFloat32(offset, v3[2], true); offset += 4;
    // Attribute byte count
    view.setUint16(offset, 0, true); offset += 2;
  }

  return buffer;
}
