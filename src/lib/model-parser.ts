import * as THREE from "three";
import { unzipSync, strFromU8 } from "fflate";

export interface ModelParseResult {
  geometry?: THREE.BufferGeometry;
  volumeCm3: number;
  solidVolumeCm3?: number;
  surfaceAreaMm2?: number;
  sizeMm: { x: number; y: number; z: number };
  triangles: number;
  isCad?: boolean;
  thumbnailUrl?: string;
  cadInfo?: {
    format: string;
    hasMesh: boolean;
    previewFound: boolean;
  };
}

/**
 * Signed volume of a tetrahedron formed by the origin and 3 vertices.
 */
function signedTetrahedronVolume(
  ax: number, ay: number, az: number,
  bx: number, by: number, bz: number,
  cx: number, cy: number, cz: number,
): number {
  return (
    (1 / 6) *
    (ax * (by * cz - bz * cy) -
     ay * (bx * cz - bz * cx) +
     az * (bx * cy - by * cx))
  );
}

/**
 * Computes exact physical volume in mm³ of a BufferGeometry.
 */
export function computeGeometryVolume(geometry: THREE.BufferGeometry): number {
  const pos = geometry.getAttribute("position");
  if (!pos) return 0;

  let totalVolume = 0;

  if (geometry.index) {
    const index = geometry.index;
    for (let i = 0; i < index.count; i += 3) {
      const i1 = index.getX(i);
      const i2 = index.getX(i + 1);
      const i3 = index.getX(i + 2);

      const ax = pos.getX(i1);
      const ay = pos.getY(i1);
      const az = pos.getZ(i1);

      const bx = pos.getX(i2);
      const by = pos.getY(i2);
      const bz = pos.getZ(i2);

      const cx = pos.getX(i3);
      const cy = pos.getY(i3);
      const cz = pos.getZ(i3);

      totalVolume += signedTetrahedronVolume(ax, ay, az, bx, by, bz, cx, cy, cz);
    }
  } else {
    for (let i = 0; i < pos.count; i += 3) {
      const ax = pos.getX(i);
      const ay = pos.getY(i);
      const az = pos.getZ(i);

      const bx = pos.getX(i + 1);
      const by = pos.getY(i + 1);
      const bz = pos.getZ(i + 1);

      const cx = pos.getX(i + 2);
      const cy = pos.getY(i + 2);
      const cz = pos.getZ(i + 2);

      totalVolume += signedTetrahedronVolume(ax, ay, az, bx, by, bz, cx, cy, cz);
    }
  }

  return Math.abs(totalVolume);
}

/**
 * Computes total surface area in mm² of a BufferGeometry.
 */
export function computeGeometrySurfaceArea(geometry: THREE.BufferGeometry): number {
  const pos = geometry.getAttribute("position");
  if (!pos) return 0;

  let totalArea = 0;
  const ab = new THREE.Vector3();
  const ac = new THREE.Vector3();
  const cross = new THREE.Vector3();

  if (geometry.index) {
    const index = geometry.index;
    for (let i = 0; i < index.count; i += 3) {
      const i1 = index.getX(i);
      const i2 = index.getX(i + 1);
      const i3 = index.getX(i + 2);

      const ax = pos.getX(i1), ay = pos.getY(i1), az = pos.getZ(i1);
      const bx = pos.getX(i2), by = pos.getY(i2), bz = pos.getZ(i2);
      const cx = pos.getX(i3), cy = pos.getY(i3), cz = pos.getZ(i3);

      ab.set(bx - ax, by - ay, bz - az);
      ac.set(cx - ax, cy - ay, cz - az);
      cross.crossVectors(ab, ac);
      totalArea += 0.5 * cross.length();
    }
  } else {
    for (let i = 0; i < pos.count; i += 3) {
      const ax = pos.getX(i), ay = pos.getY(i), az = pos.getZ(i);
      const bx = pos.getX(i + 1), by = pos.getY(i + 1), bz = pos.getZ(i + 1);
      const cx = pos.getX(i + 2), cy = pos.getY(i + 2), cz = pos.getZ(i + 2);

      ab.set(bx - ax, by - ay, bz - az);
      ac.set(cx - ax, cy - ay, cz - az);
      cross.crossVectors(ab, ac);
      totalArea += 0.5 * cross.length();
    }
  }

  return totalArea;
}

/**
 * Estimates realistic FDM printed filament material volume (cm³) based on shells and infill.
 * In FDM 3D printing, models are not solid plastic: they have perimeter walls, solid top/bottom
 * layers, and sparse interior infill (e.g. 20% gyroid/grid).
 */
export function estimateFdmMaterialVolumeCm3(
  solidVolumeMm3: number,
  surfaceAreaMm2: number,
  infillPct = 20,
  wallLoops = 2,
): number {
  if (solidVolumeMm3 <= 0) return 0;

  const wallThickMm = wallLoops * 0.42;
  const topBottomThickMm = 0.8;
  const avgShellThickMm = (wallThickMm + topBottomThickMm) / 2;
  // Shell volume from surface area with internal corner overlap and core extraction coefficient
  const shellVolMm3 = Math.min(solidVolumeMm3, surfaceAreaMm2 * avgShellThickMm * 0.65);
  const interiorVolMm3 = Math.max(0, solidVolumeMm3 - shellVolMm3);
  const infillRatio = Math.max(0.05, Math.min(1.0, infillPct / 100));
  const materialVolMm3 = shellVolMm3 + interiorVolMm3 * infillRatio;

  return Number((materialVolMm3 / 1000).toFixed(2));
}

/**
 * Merges multiple BufferGeometries into a single indexed BufferGeometry.
 */
export function mergeBufferGeometries(geometries: THREE.BufferGeometry[]): THREE.BufferGeometry {
  if (geometries.length === 0) return new THREE.BufferGeometry();
  if (geometries.length === 1) return geometries[0];

  let totalPositions = 0;
  let totalIndices = 0;

  for (const g of geometries) {
    const pos = g.getAttribute("position");
    if (!pos) continue;
    totalPositions += pos.count * 3;
    if (g.index) {
      totalIndices += g.index.count;
    } else {
      totalIndices += pos.count;
    }
  }

  const mergedPos = new Float32Array(totalPositions);
  const mergedIndices = new Uint32Array(totalIndices);

  let posOffset = 0;
  let indexOffset = 0;
  let vertexCountOffset = 0;

  for (const g of geometries) {
    const pos = g.getAttribute("position");
    if (!pos) continue;

    mergedPos.set(pos.array, posOffset);
    posOffset += pos.count * 3;

    if (g.index) {
      for (let i = 0; i < g.index.count; i++) {
        mergedIndices[indexOffset + i] = g.index.getX(i) + vertexCountOffset;
      }
      indexOffset += g.index.count;
    } else {
      for (let i = 0; i < pos.count; i++) {
        mergedIndices[indexOffset + i] = i + vertexCountOffset;
      }
      indexOffset += pos.count;
    }

    vertexCountOffset += pos.count;
  }

  const merged = new THREE.BufferGeometry();
  merged.setAttribute("position", new THREE.BufferAttribute(mergedPos, 3));
  merged.setIndex(new THREE.BufferAttribute(mergedIndices, 1));
  merged.computeVertexNormals();
  merged.computeBoundingBox();
  return merged;
}

/**
 * Parses a 3MF transform string (12 affine numbers) into a Three.js Matrix4.
 *
 * 3MF Specification (ISO/IEC 5143 section 4.1):
 * Matrix is space-delimited 12 numbers: m00 m01 m02 m10 m11 m12 m20 m21 m22 m30 m31 m32
 * representing the affine transformation:
 * [ m00  m01  m02  0 ]
 * [ m10  m11  m12  0 ]
 * [ m20  m21  m22  0 ]
 * [ m30  m31  m32  1 ]  (in column-vector notation [x y z 1] * M)
 *
 * In Three.js standard row-major Matrix4.set(n11, n12, n13, n14, n21, ...):
 * row 1: m00 (n[0]), m10 (n[3]), m20 (n[6]), m30 (n[9])
 * row 2: m01 (n[1]), m11 (n[4]), m21 (n[7]), m31 (n[10])
 * row 3: m02 (n[2]), m12 (n[5]), m22 (n[8]), m32 (n[11])
 * row 4: 0,          0,          0,          1
 */
export function parse3MFTransform(transformStr: string): THREE.Matrix4 {
  const m = new THREE.Matrix4();
  const n = transformStr.trim().split(/\s+/).map(Number);
  if (n.length === 12 && n.every((v) => !isNaN(v))) {
    m.set(
      n[0], n[3], n[6], n[9],
      n[1], n[4], n[7], n[10],
      n[2], n[5], n[8], n[11],
      0,    0,    0,    1
    );
  }
  return m;
}

/**
 * Normalizes internal zip entry paths (handles Windows backslashes and ensures leading slash).
 */
function normalize3MFPath(p: string): string {
  const cleaned = p.replace(/\\/g, "/").trim();
  return cleaned.startsWith("/") ? cleaned.toLowerCase() : "/" + cleaned.toLowerCase();
}

interface Parsed3MFComponent {
  objectId: string;
  path: string;
  transform: string;
}

interface Parsed3MFObject {
  id: string;
  components: Parsed3MFComponent[];
  geom: THREE.BufferGeometry | null;
}

interface Parsed3MFBuildItem {
  objectId: string;
  transform: string;
}

interface Parsed3MFModelDoc {
  unit: string;
  objects: Parsed3MFObject[];
  buildItems: Parsed3MFBuildItem[];
}

/**
 * Robust XML parser for 3MF model files:
 * Handles arbitrary XML namespaces (e.g. <m:mesh>, <p:components>, <BambuStudio:object>),
 * works reliably in both browser client and Node/worker environments with zero external DOM dependencies.
 */
function parse3MFModelXml(xmlText: string): Parsed3MFModelDoc {
  const unitMatch = xmlText.match(/<[a-zA-Z0-9_:]*model\b[^>]*\bunit=["']([^"']+)["']/i);
  const unit = unitMatch ? unitMatch[1].toLowerCase() : "millimeter";

  const objects: Parsed3MFObject[] = [];
  const objRegex = /<([a-zA-Z0-9_:]*object)\b([^>]*)>([\s\S]*?)<\/\1>/gi;
  let match: RegExpExecArray | null;

  while ((match = objRegex.exec(xmlText)) !== null) {
    const attrsStr = match[2];
    const inner = match[3];
    const idMatch = attrsStr.match(/\bid=["']([^"']+)["']/i);
    const id = idMatch ? idMatch[1] : "";

    const components: Parsed3MFComponent[] = [];
    const compRegex = /<[a-zA-Z0-9_:]*component\b([^>]*)\/?>/gi;
    let compM: RegExpExecArray | null;
    while ((compM = compRegex.exec(inner)) !== null) {
      const cAttrs = compM[1];
      const objIdM = cAttrs.match(/\bobjectid=["']([^"']+)["']/i);
      const pathM = cAttrs.match(/\b(?:[a-zA-Z0-9_]+:)?path=["']([^"']+)["']/i);
      const transM = cAttrs.match(/\btransform=["']([^"']+)["']/i);
      components.push({
        objectId: objIdM ? objIdM[1] : "",
        path: pathM ? pathM[1] : "",
        transform: transM ? transM[1] : "",
      });
    }

    let geom: THREE.BufferGeometry | null = null;
    if (/<[a-zA-Z0-9_:]*mesh\b/i.test(inner)) {
      const vCoords: number[] = [];
      const vRegex = /<[a-zA-Z0-9_:]*vertex\b([^>]*)\/?>/gi;
      let vM: RegExpExecArray | null;
      while ((vM = vRegex.exec(inner)) !== null) {
        const vAttrs = vM[1];
        const x = parseFloat((vAttrs.match(/\bx=["']([^"']+)["']/i) || [])[1] || "0");
        const y = parseFloat((vAttrs.match(/\by=["']([^"']+)["']/i) || [])[1] || "0");
        const z = parseFloat((vAttrs.match(/\bz=["']([^"']+)["']/i) || [])[1] || "0");
        vCoords.push(x, y, z);
      }

      const indices: number[] = [];
      const tRegex = /<[a-zA-Z0-9_:]*triangle\b([^>]*)\/?>/gi;
      let tM: RegExpExecArray | null;
      while ((tM = tRegex.exec(inner)) !== null) {
        const tAttrs = tM[1];
        const v1 = parseInt((tAttrs.match(/\bv1=["']([^"']+)["']/i) || [])[1] || "0", 10);
        const v2 = parseInt((tAttrs.match(/\bv2=["']([^"']+)["']/i) || [])[1] || "0", 10);
        const v3 = parseInt((tAttrs.match(/\bv3=["']([^"']+)["']/i) || [])[1] || "0", 10);
        indices.push(v1, v2, v3);
      }

      if (vCoords.length > 0 && indices.length > 0) {
        geom = new THREE.BufferGeometry();
        geom.setAttribute("position", new THREE.BufferAttribute(new Float32Array(vCoords), 3));
        geom.setIndex(new THREE.BufferAttribute(new Uint32Array(indices), 1));
        geom.computeVertexNormals();
      }
    }

    objects.push({ id, components, geom });
  }

  // Extract build items
  const buildItems: Parsed3MFBuildItem[] = [];
  const itemRegex = /<[a-zA-Z0-9_:]*item\b([^>]*)\/?>/gi;
  let itM: RegExpExecArray | null;
  while ((itM = itemRegex.exec(xmlText)) !== null) {
    const itAttrs = itM[1];
    const objIdM = itAttrs.match(/\bobjectid=["']([^"']+)["']/i);
    const transM = itAttrs.match(/\btransform=["']([^"']+)["']/i);
    buildItems.push({
      objectId: objIdM ? objIdM[1] : "",
      transform: transM ? transM[1] : "",
    });
  }

  return { unit, objects, buildItems };
}

/**
 * Universal 3MF Parser:
 * Full support for 3MF Core Specification and 3MF Production Extension (multi-part assemblies,
 * cross-file components, external object models, affine transform matrices, build placements,
 * unit scaling, and proper Z-up to Three.js Y-up conversion).
 */
export async function parse3MF(arrayBuffer: ArrayBuffer): Promise<ModelParseResult | null> {
  try {
    const unzipped = unzipSync(new Uint8Array(arrayBuffer));
    const modelFiles = new Map<string, string>();
    let rootModel = "/3d/3dmodel.model";

    // Detect root model path from _rels/.rels if present
    for (const [rawKey, data] of Object.entries(unzipped)) {
      const norm = normalize3MFPath(rawKey);
      if (norm === "/_rels/.rels") {
        try {
          const relsText = strFromU8(data);
          const relM =
            relsText.match(/<Relationship\b[^>]*\bTarget=["']([^"']+)["'][^>]*\bType=["'][^"']*3dmodel["']/i) ||
            relsText.match(/<Relationship\b[^>]*\bType=["'][^"']*3dmodel["'][^>]*\bTarget=["']([^"']+)["']/i);
          if (relM) {
            rootModel = normalize3MFPath(relM[1]);
          }
        } catch {
          // ignore rels parse error
        }
      }

      if (norm.endsWith(".model") || (norm.includes("/3d/") && norm.endsWith(".xml"))) {
        modelFiles.set(norm, strFromU8(data));
      }
    }

    // Fallback: search for any XML with <model
    if (modelFiles.size === 0) {
      for (const [rawKey, data] of Object.entries(unzipped)) {
        try {
          const text = strFromU8(data);
          if (text.includes("<model") && (text.includes("<mesh") || text.includes("<object"))) {
            modelFiles.set(normalize3MFPath(rawKey), text);
          }
        } catch {
          // ignore binary files
        }
      }
    }

    if (modelFiles.size === 0) {
      console.warn("No .model XML files found in 3MF archive.");
      return null;
    }

    const parsedDocs = new Map<string, Parsed3MFModelDoc>();
    const objectNodesByFullKey = new Map<string, { fileNorm: string; id: string; obj: Parsed3MFObject }>();
    const objectNodesById = new Map<string, Array<{ fileNorm: string; id: string; obj: Parsed3MFObject }>>();
    let unitScale = 1.0;

    for (const [fileNorm, xmlText] of modelFiles.entries()) {
      const parsed = parse3MFModelXml(xmlText);
      parsedDocs.set(fileNorm, parsed);

      if (fileNorm === rootModel || parsedDocs.size === 1) {
        if (parsed.unit === "inch") unitScale = 25.4;
        else if (parsed.unit === "centimeter") unitScale = 10;
        else if (parsed.unit === "meter") unitScale = 1000;
        else if (parsed.unit === "micron") unitScale = 0.001;
      }

      for (const obj of parsed.objects) {
        const entry = { fileNorm, id: obj.id, obj };
        objectNodesByFullKey.set(`${fileNorm}#${obj.id}`, entry);
        const existing = objectNodesById.get(obj.id) || [];
        existing.push(entry);
        objectNodesById.set(obj.id, existing);
      }
    }

    const resolvedGeomCache = new Map<string, THREE.BufferGeometry>();

    function resolveObjectGeometry(
      fileNorm: string,
      id: string,
      visited = new Set<string>()
    ): THREE.BufferGeometry | null {
      const key = `${fileNorm}#${id}`;
      if (visited.has(key)) return null;
      if (resolvedGeomCache.has(key)) return resolvedGeomCache.get(key)!;
      visited.add(key);

      let entry = objectNodesByFullKey.get(key);
      if (!entry) {
        const list = objectNodesById.get(id);
        if (list && list.length > 0) entry = list[0];
      }
      if (!entry) return null;

      // 1. Direct mesh geometry
      if (entry.obj.geom) {
        resolvedGeomCache.set(key, entry.obj.geom);
        return entry.obj.geom;
      }

      // 2. Component references (including Production Extension cross-file references)
      if (entry.obj.components.length > 0) {
        const subGeoms: THREE.BufferGeometry[] = [];
        for (const comp of entry.obj.components) {
          const targetNorm = comp.path ? normalize3MFPath(comp.path) : entry.fileNorm;
          const childGeom = resolveObjectGeometry(targetNorm, comp.objectId, new Set(visited));
          if (childGeom) {
            const cloned = childGeom.clone();
            if (comp.transform) {
              cloned.applyMatrix4(parse3MFTransform(comp.transform));
            }
            subGeoms.push(cloned);
          }
        }
        if (subGeoms.length > 0) {
          const merged = mergeBufferGeometries(subGeoms);
          resolvedGeomCache.set(key, merged);
          return merged;
        }
      }

      return null;
    }

    const extractedGeometries: THREE.BufferGeometry[] = [];
    const candidateFiles: string[] = [];
    if (parsedDocs.has(rootModel)) candidateFiles.push(rootModel);
    for (const f of parsedDocs.keys()) {
      if (f !== rootModel) candidateFiles.push(f);
    }

    // Pass 1: Resolve all items placed on the build plate via <build><item>
    for (const f of candidateFiles) {
      const parsed = parsedDocs.get(f)!;
      if (parsed.buildItems.length > 0) {
        for (const item of parsed.buildItems) {
          const geom = resolveObjectGeometry(f, item.objectId);
          if (geom) {
            const cloned = geom.clone();
            if (item.transform) {
              cloned.applyMatrix4(parse3MFTransform(item.transform));
            }
            extractedGeometries.push(cloned);
          }
        }
      }
    }

    // Pass 2 Fallback: If no build items defined anywhere, collect all top-level root objects
    if (extractedGeometries.length === 0) {
      const referencedComps = new Set<string>();
      for (const entry of objectNodesByFullKey.values()) {
        for (const comp of entry.obj.components) {
          const targetNorm = comp.path ? normalize3MFPath(comp.path) : entry.fileNorm;
          referencedComps.add(`${targetNorm}#${comp.objectId}`);
          referencedComps.add(comp.objectId);
        }
      }

      for (const [key, entry] of objectNodesByFullKey.entries()) {
        if (!referencedComps.has(key) && !referencedComps.has(entry.id)) {
          const geom = resolveObjectGeometry(entry.fileNorm, entry.id);
          if (geom) {
            extractedGeometries.push(geom.clone());
          }
        }
      }
    }

    if (extractedGeometries.length === 0) {
      return null;
    }

    const merged = mergeBufferGeometries(extractedGeometries);

    // Apply unit scaling if file units were inches, meters, etc.
    if (unitScale !== 1.0) {
      merged.scale(unitScale, unitScale, unitScale);
    }

    // 3MF specification (ISO/IEC 5143) dictates that positive Z is the upward vertical axis.
    // Convert 3MF coordinate system (Z-up) to Three.js coordinate system (Y-up):
    merged.rotateX(-Math.PI / 2);

    // Convert to non-indexed BufferGeometry so flat faces get accurate geometric plane normals
    // and avoid normal-smoothing leakage across 90-degree hole/crease edges.
    const cleanGeom = merged.toNonIndexed();
    cleanGeom.computeVertexNormals();
    cleanGeom.computeBoundingBox();

    const bb = cleanGeom.boundingBox!;
    const sizeMm = {
      x: Math.max(0, bb.max.x - bb.min.x),
      y: Math.max(0, bb.max.y - bb.min.y),
      z: Math.max(0, bb.max.z - bb.min.z),
    };

    const solidVolumeMm3 = computeGeometryVolume(cleanGeom);
    let solidVolumeCm3 = Math.abs(solidVolumeMm3) / 1000;
    if (solidVolumeCm3 < 0.2 && sizeMm.x > 0 && sizeMm.y > 0 && sizeMm.z > 0) {
      solidVolumeCm3 = (sizeMm.x * sizeMm.y * sizeMm.z * 0.28) / 1000;
    }

    const surfaceAreaMm2 = computeGeometrySurfaceArea(cleanGeom);
    const materialVolumeCm3 = estimateFdmMaterialVolumeCm3(
      solidVolumeMm3,
      surfaceAreaMm2,
      20, // default 20% infill
      2   // default 2 wall loops
    );

    const pos = cleanGeom.getAttribute("position");
    const triangles = pos ? pos.count / 3 : 0;

    return {
      geometry: cleanGeom,
      volumeCm3: materialVolumeCm3,
      solidVolumeCm3: Number(solidVolumeCm3.toFixed(2)),
      surfaceAreaMm2: Math.round(surfaceAreaMm2),
      sizeMm,
      triangles: Math.round(triangles),
    };
  } catch (err) {
    console.error("3MF parsing error:", err);
    return null;
  }
}

/**
 * OBJ Wavefront Parser.
 */
export function parseOBJ(text: string): ModelParseResult | null {
  const vertices: number[][] = [];
  const indices: number[] = [];

  const lines = text.split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    if (trimmed.startsWith("v ")) {
      const parts = trimmed.substring(2).trim().split(/\s+/).map(Number);
      if (parts.length >= 3 && parts.every((p) => !isNaN(p))) {
        vertices.push([parts[0], parts[1], parts[2]]);
      }
    } else if (trimmed.startsWith("f ")) {
      const parts = trimmed.substring(2).trim().split(/\s+/);
      const faceIndices: number[] = [];
      for (const p of parts) {
        const vIdx = parseInt(p.split("/")[0], 10);
        if (!isNaN(vIdx)) {
          // OBJ indices are 1-based (or negative relative)
          const actualIdx = vIdx > 0 ? vIdx - 1 : vertices.length + vIdx;
          faceIndices.push(actualIdx);
        }
      }
      // Triangulate convex polygons (e.g. quads)
      if (faceIndices.length >= 3) {
        for (let i = 1; i < faceIndices.length - 1; i++) {
          indices.push(faceIndices[0], faceIndices[i], faceIndices[i + 1]);
        }
      }
    }
  }

  if (vertices.length < 3 || indices.length === 0) return null;

  const positions = new Float32Array(vertices.length * 3);
  for (let i = 0; i < vertices.length; i++) {
    positions[i * 3] = vertices[i][0];
    positions[i * 3 + 1] = vertices[i][1];
    positions[i * 3 + 2] = vertices[i][2];
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geom.setIndex(new THREE.BufferAttribute(new Uint32Array(indices), 1));
  const cleanGeom = geom.toNonIndexed();
  cleanGeom.computeVertexNormals();
  cleanGeom.computeBoundingBox();

  const bb = cleanGeom.boundingBox!;
  const sizeMm = {
    x: Math.max(0, bb.max.x - bb.min.x),
    y: Math.max(0, bb.max.y - bb.min.y),
    z: Math.max(0, bb.max.z - bb.min.z),
  };

  const solidVolumeMm3 = computeGeometryVolume(cleanGeom);
  let solidVolumeCm3 = Math.abs(solidVolumeMm3) / 1000;
  if (solidVolumeCm3 < 0.2 && sizeMm.x > 0 && sizeMm.y > 0 && sizeMm.z > 0) {
    solidVolumeCm3 = (sizeMm.x * sizeMm.y * sizeMm.z * 0.28) / 1000;
  }

  const surfaceAreaMm2 = computeGeometrySurfaceArea(cleanGeom);
  const materialVolumeCm3 = estimateFdmMaterialVolumeCm3(
    solidVolumeMm3,
    surfaceAreaMm2,
    20,
    2
  );

  return {
    geometry: cleanGeom,
    volumeCm3: materialVolumeCm3,
    solidVolumeCm3: Number(solidVolumeCm3.toFixed(2)),
    surfaceAreaMm2: Math.round(surfaceAreaMm2),
    sizeMm,
    triangles: indices.length / 3,
  };
}

/**
 * Autodesk Fusion 360 (.f3d) Archive Parser.
 * Extracts embedded thumbnail render or internal mesh from the ZIP container.
 */
export async function parseF3D(arrayBuffer: ArrayBuffer, fileName: string): Promise<ModelParseResult> {
  let thumbnailUrl: string | undefined;
  let extractedGeometry: THREE.BufferGeometry | undefined;
  let hasMesh = false;
  let previewFound = false;

  try {
    const unzipped = unzipSync(new Uint8Array(arrayBuffer));

    // 1. Search for embedded thumbnail or preview image
    for (const [key, data] of Object.entries(unzipped)) {
      const lower = key.toLowerCase();
      if (
        lower.endsWith(".png") ||
        lower.endsWith(".jpg") ||
        lower.endsWith(".jpeg") ||
        lower.endsWith(".webp")
      ) {
        if (!thumbnailUrl || lower.includes("thumb") || lower.includes("preview") || lower.includes("icon")) {
          const mime = lower.endsWith(".png") ? "image/png" : "image/jpeg";
          const blob = new Blob([data], { type: mime });
          thumbnailUrl = URL.createObjectURL(blob);
          previewFound = true;
        }
      }
    }

    // 2. Search for any embedded mesh (STL, OBJ, or 3MF model)
    for (const [key, data] of Object.entries(unzipped)) {
      const lower = key.toLowerCase();
      if (lower.endsWith(".stl")) {
        const { parseSTL } = await import("./stl");
        const stlRes = parseSTL(data);
        if (stlRes?.geometry) {
          extractedGeometry = stlRes.geometry;
          hasMesh = true;
          break;
        }
      } else if (lower.endsWith(".obj")) {
        const objText = strFromU8(data);
        const objRes = parseOBJ(objText);
        if (objRes?.geometry) {
          extractedGeometry = objRes.geometry;
          hasMesh = true;
          break;
        }
      } else if (lower.endsWith(".model")) {
        // Embedded 3MF model chunk
        const xmlText = strFromU8(data);
        const parsed = parse3MFModelXml(xmlText);
        for (const obj of parsed.objects) {
          if (obj.geom) {
            extractedGeometry = obj.geom;
            hasMesh = true;
            break;
          }
        }
        if (hasMesh) break;
      }
    }
  } catch (err) {
    console.error("F3D zip unpack error:", err);
  }

  if (extractedGeometry) {
    extractedGeometry.computeBoundingBox();
    extractedGeometry.computeVertexNormals();
    const bb = extractedGeometry.boundingBox!;
    const sizeMm = {
      x: Math.max(0, bb.max.x - bb.min.x),
      y: Math.max(0, bb.max.y - bb.min.y),
      z: Math.max(0, bb.max.z - bb.min.z),
    };
    const volumeMm3 = computeGeometryVolume(extractedGeometry);
    return {
      geometry: extractedGeometry,
      volumeCm3: Number((volumeMm3 / 1000).toFixed(2)),
      sizeMm,
      triangles: extractedGeometry.index ? extractedGeometry.index.count / 3 : 0,
      isCad: true,
      thumbnailUrl,
      cadInfo: { format: "Fusion 360 (.f3d)", hasMesh: true, previewFound },
    };
  }

  // Pure CAD archive without raw tessellated mesh (cannot be sliced without meshing)
  return {
    volumeCm3: 0,
    sizeMm: { x: 0, y: 0, z: 0 },
    triangles: 0,
    isCad: true,
    thumbnailUrl,
    cadInfo: { format: "Fusion 360 (.f3d)", hasMesh: false, previewFound },
  };
}

/**
 * Universal 3D Model & CAD File Parser:
 * Supports STL, 3MF, OBJ, and F3D files.
 */
export async function parseModelFile(file: File): Promise<ModelParseResult | null> {
  const ext = file.name.split(".").pop()?.toLowerCase();
  const buffer = await file.arrayBuffer();

  if (ext === "3mf") {
    return await parse3MF(buffer);
  }

  if (ext === "obj") {
    const text = new TextDecoder().decode(buffer);
    return parseOBJ(text);
  }

  if (ext === "f3d") {
    return await parseF3D(buffer, file.name);
  }

  // Default STL parser
  const { parseSTL } = await import("./stl");
  return parseSTL(new Uint8Array(buffer));
}
