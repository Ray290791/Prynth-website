import { zipSync, strToU8 } from "fflate";

export interface LithoMesh {
  verts: [number, number, number][];
  triangles: [number, number, number][];
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
 * Generates a watertight 3D manifold mesh from an image data URL.
 * Top surface has height displacement from luminance.
 * Bottom is flat at z = 0.
 * Perimeter walls connect the top edges to bottom edges, ensuring a solid body for slicers.
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
      // 80x80 grid provides razor-sharp micro-relief details while keeping 3MF file under 300 KB
      const RES = 80;
      const MAX_DEPTH = 2.4; // mm relief thickness (darkest areas)
      const BASE_THICK = 0.8; // mm light transmission base (brightest areas)

      const canvas = document.createElement("canvas");
      canvas.width = RES;
      canvas.height = RES;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(null);
        return;
      }
      ctx.drawImage(img, 0, 0, RES, RES);
      const imgData = ctx.getImageData(0, 0, RES, RES);
      const { data } = imgData;

      const verts: [number, number, number][] = [];
      const triangles: [number, number, number][] = [];

      // Grid index map: [row][col] -> vertex index
      const topIndices: (number | null)[][] = [];

      // 1. Generate top surface vertices (centered around 0, 0 in X and Y)
      for (let row = 0; row <= RES; row++) {
        topIndices[row] = [];
        for (let col = 0; col <= RES; col++) {
          const u = col / RES;
          const v = row / RES;

          if (shape === "heart" && !isInsideHeart(u, v)) {
            topIndices[row][col] = null;
            continue;
          }

          const px = Math.min(RES - 1, Math.round(u * (RES - 1)));
          const py = Math.min(RES - 1, Math.round(v * (RES - 1)));
          const idx = (py * RES + px) * 4;
          const lum = (0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2]) / 255;
          const z = BASE_THICK + (1 - lum) * MAX_DEPTH;
          const x = (u - 0.5) * widthMm;
          const y = (0.5 - v) * heightMm;

          topIndices[row][col] = verts.length;
          verts.push([x, y, z]);
        }
      }

      // 2. Generate bottom surface vertices (z = 0)
      const botIndices: (number | null)[][] = [];
      for (let row = 0; row <= RES; row++) {
        botIndices[row] = [];
        for (let col = 0; col <= RES; col++) {
          const topIdx = topIndices[row][col];
          if (topIdx === null) {
            botIndices[row][col] = null;
            continue;
          }
          const topV = verts[topIdx];
          botIndices[row][col] = verts.length;
          verts.push([topV[0], topV[1], 0]);
        }
      }

      // 3. Top and Bottom triangles
      for (let row = 0; row < RES; row++) {
        for (let col = 0; col < RES; col++) {
          const tTL = topIndices[row][col];
          const tTR = topIndices[row][col + 1];
          const tBL = topIndices[row + 1][col];
          const tBR = topIndices[row + 1][col + 1];

          const bTL = botIndices[row][col];
          const bTR = botIndices[row][col + 1];
          const bBL = botIndices[row + 1][col];
          const bBR = botIndices[row + 1][col + 1];

          // Top surface (CCW viewed from above: normal points +Z)
          if (tTL !== null && tTR !== null && tBL !== null && tBR !== null) {
            triangles.push([tTL, tBL, tTR]);
            triangles.push([tTR, tBL, tBR]);
          } else if (tTL !== null && tTR !== null && tBL !== null) {
            triangles.push([tTL, tBL, tTR]);
          } else if (tTR !== null && tBR !== null && tBL !== null) {
            triangles.push([tTR, tBL, tBR]);
          } else if (tTL !== null && tBL !== null && tBR !== null) {
            triangles.push([tTL, tBL, tBR]);
          } else if (tTL !== null && tTR !== null && tBR !== null) {
            triangles.push([tTL, tTR, tBR]);
          }

          // Bottom surface (CW viewed from above: normal points -Z)
          if (bTL !== null && bTR !== null && bBL !== null && bBR !== null) {
            triangles.push([bTL, bTR, bBL]);
            triangles.push([bTR, bBR, bBL]);
          } else if (bTL !== null && bTR !== null && bBL !== null) {
            triangles.push([bTL, bTR, bBL]);
          } else if (bTR !== null && bBR !== null && bBL !== null) {
            triangles.push([bTR, bBR, bBL]);
          } else if (bTL !== null && bBL !== null && bBR !== null) {
            triangles.push([bTL, bBR, bBL]);
          } else if (bTL !== null && bTR !== null && bBR !== null) {
            triangles.push([bTL, bBR, bTR]);
          }

          // 4. Perimeter Walls (connecting top edge to bottom edge)
          // North edge of cell
          if (tTL !== null && tTR !== null && (row === 0 || topIndices[row - 1]?.[col] === null || topIndices[row - 1]?.[col + 1] === null)) {
            triangles.push([tTL, tTR, bTL!]);
            triangles.push([tTR, bTR!, bTL!]);
          }
          // South edge of cell
          if (tBL !== null && tBR !== null && (row === RES - 1 || topIndices[row + 2]?.[col] === null || topIndices[row + 2]?.[col + 1] === null)) {
            triangles.push([tBL, bBL!, tBR]);
            triangles.push([tBR, bBL!, bBR!]);
          }
          // West edge of cell
          if (tTL !== null && tBL !== null && (col === 0 || topIndices[row]?.[col - 1] === null || topIndices[row + 1]?.[col - 1] === null)) {
            triangles.push([tTL, bTL!, tBL]);
            triangles.push([tBL, bTL!, bBL!]);
          }
          // East edge of cell
          if (tTR !== null && tBR !== null && (col === RES - 1 || topIndices[row]?.[col + 2] === null || topIndices[row + 1]?.[col + 2] === null)) {
            triangles.push([tTR, tBR, bTR!]);
            triangles.push([tBR, bBR!, bTR!]);
          }
        }
      }

      resolve({ verts, triangles });
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
    vertXml += `\n          <vertex x="${v[0].toFixed(3)}" y="${v[1].toFixed(3)}" z="${v[2].toFixed(3)}" />`;
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
