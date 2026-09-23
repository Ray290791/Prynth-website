import * as THREE from "three";
import { unzipSync, strFromU8 } from "fflate";

export interface ModelParseResult {
  geometry?: THREE.BufferGeometry;
  volumeCm3: number;
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
 */
function parse3MFTransform(transformStr: string): THREE.Matrix4 {
  const m = new THREE.Matrix4();
  const n = transformStr.trim().split(/\s+/).map(Number);
  if (n.length === 12 && n.every((v) => !isNaN(v))) {
    // 3MF affine matrix layout:
    // [n[0]  n[1]  n[2]  n[9]]
    // [n[3]  n[4]  n[5]  n[10]]
    // [n[6]  n[7]  n[8]  n[11]]
    // [0     0     0     1   ]
    m.set(
      n[0], n[1], n[2], n[9],
      n[3], n[4], n[5], n[10],
      n[6], n[7], n[8], n[11],
      0, 0, 0, 1
    );
  }
  return m;
}

/**
 * Helper to find elements by localName regardless of XML namespace prefixes (e.g. <m:mesh> or <mesh>).
 */
function getElementsByLocalName(parent: Document | Element, localName: string): Element[] {
  if ("getElementsByTagNameNS" in parent) {
    try {
      const list = parent.getElementsByTagNameNS("*", localName);
      if (list && list.length > 0) return Array.from(list);
    } catch {
      // fallback
    }
  }
  const direct = parent.getElementsByTagName(localName);
  if (direct && direct.length > 0) return Array.from(direct);

  const all = parent.getElementsByTagName("*");
  const result: Element[] = [];
  const target = localName.toLowerCase();
  for (let i = 0; i < all.length; i++) {
    const el = all[i];
    const elLocal = el.localName?.toLowerCase();
    const tag = el.tagName.toLowerCase();
    if (elLocal === target || tag === target || tag.endsWith(":" + target)) {
      result.push(el);
    }
  }
  return result;
}

/**
 * Parses vertices and triangles from a `<mesh>` DOM node.
 */
function parseMeshNode(meshNode: Element): THREE.BufferGeometry | null {
  const vNodes = getElementsByLocalName(meshNode, "vertex");
  const tNodes = getElementsByLocalName(meshNode, "triangle");

  if (vNodes.length === 0 || tNodes.length === 0) return null;

  const positions = new Float32Array(vNodes.length * 3);
  for (let i = 0; i < vNodes.length; i++) {
    const v = vNodes[i];
    positions[i * 3] = parseFloat(v.getAttribute("x") || "0");
    positions[i * 3 + 1] = parseFloat(v.getAttribute("y") || "0");
    positions[i * 3 + 2] = parseFloat(v.getAttribute("z") || "0");
  }

  const indices = new Uint32Array(tNodes.length * 3);
  for (let i = 0; i < tNodes.length; i++) {
    const t = tNodes[i];
    indices[i * 3] = parseInt(t.getAttribute("v1") || "0", 10);
    indices[i * 3 + 1] = parseInt(t.getAttribute("v2") || "0", 10);
    indices[i * 3 + 2] = parseInt(t.getAttribute("v3") || "0", 10);
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geom.setIndex(new THREE.BufferAttribute(indices, 1));
  geom.computeVertexNormals();
  return geom;
}

/**
 * Robust 3MF Parser:
 * Supports standard 3MF, Bambu Studio / OrcaSlicer project 3MFs, Fusion 360 3MFs,
 * component assemblies, and Windows zip archives with backslash path separators.
 */
export async function parse3MF(arrayBuffer: ArrayBuffer): Promise<ModelParseResult | null> {
  try {
    const unzipped = unzipSync(new Uint8Array(arrayBuffer));
    const modelFiles: { path: string; text: string }[] = [];

    // Find all .model XML files inside zip
    for (const [rawKey, data] of Object.entries(unzipped)) {
      const normalized = rawKey.replace(/\\/g, "/").toLowerCase();
      if (normalized.endsWith(".model") || (normalized.includes("3d/") && normalized.endsWith(".xml"))) {
        modelFiles.push({ path: rawKey, text: strFromU8(data) });
      }
    }

    // Fallback: look for any xml file containing <model and <mesh
    if (modelFiles.length === 0) {
      for (const [rawKey, data] of Object.entries(unzipped)) {
        try {
          const text = strFromU8(data);
          if (text.includes("<model") && (text.includes("<mesh") || text.includes("<object"))) {
            modelFiles.push({ path: rawKey, text });
          }
        } catch {
          // ignore binary files
        }
      }
    }

    if (modelFiles.length === 0) {
      console.warn("No .model XML files found in 3MF archive.");
      return null;
    }

    const parser = new DOMParser();
    const extractedGeometries: THREE.BufferGeometry[] = [];

    for (const { text } of modelFiles) {
      const doc = parser.parseFromString(text, "application/xml");
      if (doc.querySelector("parsererror")) {
        console.warn("DOMParser syntax error in 3MF model XML");
        continue;
      }

      // Map object id to base geometry
      const objectMap = new Map<string, THREE.BufferGeometry>();
      const objects = getElementsByLocalName(doc, "object");

      // Pass 1: Parse direct mesh objects
      for (let i = 0; i < objects.length; i++) {
        const obj = objects[i];
        const id = obj.getAttribute("id") || String(i);
        const meshes = getElementsByLocalName(obj, "mesh");
        if (meshes.length > 0) {
          const geom = parseMeshNode(meshes[0]);
          if (geom) {
            objectMap.set(id, geom);
          }
        }
      }

      // Pass 2: Parse assembly objects that contain <component> references
      for (let i = 0; i < objects.length; i++) {
        const obj = objects[i];
        const id = obj.getAttribute("id") || String(i);
        if (objectMap.has(id)) continue;

        const components = getElementsByLocalName(obj, "component");
        if (components.length > 0) {
          const subGeoms: THREE.BufferGeometry[] = [];
          for (const comp of components) {
            const compId = comp.getAttribute("objectid") || "";
            const refGeom = objectMap.get(compId);
            if (refGeom) {
              const cloned = refGeom.clone();
              const transformAttr = comp.getAttribute("transform");
              if (transformAttr) {
                cloned.applyMatrix4(parse3MFTransform(transformAttr));
              }
              subGeoms.push(cloned);
            }
          }
          if (subGeoms.length > 0) {
            objectMap.set(id, mergeBufferGeometries(subGeoms));
          }
        }
      }

      // Check for <build> items with placements
      const buildItems = getElementsByLocalName(doc, "item");
      let buildPlaced = false;

      if (buildItems.length > 0) {
        for (let i = 0; i < buildItems.length; i++) {
          const item = buildItems[i];
          const objId = item.getAttribute("objectid") || "";
          const baseGeom = objectMap.get(objId);
          if (baseGeom) {
            const geom = baseGeom.clone();
            const transformAttr = item.getAttribute("transform");
            if (transformAttr) {
              const matrix = parse3MFTransform(transformAttr);
              geom.applyMatrix4(matrix);
            }
            extractedGeometries.push(geom);
            buildPlaced = true;
          }
        }
      }

      // If build items were not present or matched, use all mesh objects directly
      if (!buildPlaced && objectMap.size > 0) {
        objectMap.forEach((geom) => extractedGeometries.push(geom.clone()));
      }
    }

    if (extractedGeometries.length === 0) {
      return null;
    }

    const merged = mergeBufferGeometries(extractedGeometries);
    merged.computeBoundingBox();
    merged.computeVertexNormals();

    const bb = merged.boundingBox!;
    const sizeMm = {
      x: Math.max(0, bb.max.x - bb.min.x),
      y: Math.max(0, bb.max.y - bb.min.y),
      z: Math.max(0, bb.max.z - bb.min.z),
    };

    const volumeMm3 = computeGeometryVolume(merged);
    let volumeCm3 = Math.abs(volumeMm3) / 1000;
    if (volumeCm3 < 0.2 && sizeMm.x > 0 && sizeMm.y > 0 && sizeMm.z > 0) {
      volumeCm3 = (sizeMm.x * sizeMm.y * sizeMm.z * 0.28) / 1000;
    }

    const pos = merged.getAttribute("position");
    const triangles = merged.index ? merged.index.count / 3 : (pos ? pos.count / 3 : 0);

    return {
      geometry: merged,
      volumeCm3: Number(volumeCm3.toFixed(2)),
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
  geom.computeVertexNormals();
  geom.computeBoundingBox();

  const bb = geom.boundingBox!;
  const sizeMm = {
    x: Math.max(0, bb.max.x - bb.min.x),
    y: Math.max(0, bb.max.y - bb.min.y),
    z: Math.max(0, bb.max.z - bb.min.z),
  };

  const volumeMm3 = computeGeometryVolume(geom);
  let volumeCm3 = Math.abs(volumeMm3) / 1000;
  if (volumeCm3 < 0.2 && sizeMm.x > 0 && sizeMm.y > 0 && sizeMm.z > 0) {
    volumeCm3 = (sizeMm.x * sizeMm.y * sizeMm.z * 0.28) / 1000;
  }

  return {
    geometry: geom,
    volumeCm3: Number(volumeCm3.toFixed(2)),
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
        const parser = new DOMParser();
        const doc = parser.parseFromString(xmlText, "application/xml");
        const meshes = getElementsByLocalName(doc, "mesh");
        if (meshes.length > 0) {
          const geom = parseMeshNode(meshes[0]);
          if (geom) {
            extractedGeometry = geom;
            hasMesh = true;
            break;
          }
        }
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

  // Pure CAD archive without raw tessellated mesh
  return {
    volumeCm3: 28, // Default desk preset volume fallback
    sizeMm: { x: 120, y: 100, z: 45 },
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
