export type StlEstimate = {
  triangles: number;
  volumeCm3: number;
  sizeMm: { x: number; y: number; z: number };
};

function signedVolume(
  ax: number,
  ay: number,
  az: number,
  bx: number,
  by: number,
  bz: number,
  cx: number,
  cy: number,
  cz: number,
) {
  return (
    (1 / 6) *
    (ax * (by * cz - bz * cy) - ay * (bx * cz - bz * cx) + az * (bx * cy - by * cx))
  );
}

function finish(
  triangles: number,
  volumeMm3: number,
  min: number[],
  max: number[],
): StlEstimate {
  const sizeMm = {
    x: Math.max(0, max[0] - min[0]),
    y: Math.max(0, max[1] - min[1]),
    z: Math.max(0, max[2] - min[2]),
  };
  let volumeCm3 = Math.abs(volumeMm3) / 1000;
  if (volumeCm3 < 0.2) {
    volumeCm3 = (sizeMm.x * sizeMm.y * sizeMm.z * 0.28) / 1000;
  }
  return { triangles, volumeCm3, sizeMm };
}

function parseBinary(bytes: Uint8Array): StlEstimate | null {
  if (bytes.byteLength < 84) return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const triangles = view.getUint32(80, true);
  const expected = 84 + triangles * 50;
  if (triangles <= 0 || bytes.byteLength < expected) return null;
  let volume = 0;
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  let offset = 84;
  for (let i = 0; i < triangles; i++) {
    const ax = view.getFloat32(offset + 12, true);
    const ay = view.getFloat32(offset + 16, true);
    const az = view.getFloat32(offset + 20, true);
    const bx = view.getFloat32(offset + 24, true);
    const by = view.getFloat32(offset + 28, true);
    const bz = view.getFloat32(offset + 32, true);
    const cx = view.getFloat32(offset + 36, true);
    const cy = view.getFloat32(offset + 40, true);
    const cz = view.getFloat32(offset + 44, true);
    volume += signedVolume(ax, ay, az, bx, by, bz, cx, cy, cz);
    for (const [x, y, z] of [
      [ax, ay, az],
      [bx, by, bz],
      [cx, cy, cz],
    ] as const) {
      if (x < min[0]) min[0] = x;
      if (y < min[1]) min[1] = y;
      if (z < min[2]) min[2] = z;
      if (x > max[0]) max[0] = x;
      if (y > max[1]) max[1] = y;
      if (z > max[2]) max[2] = z;
    }
    offset += 50;
  }
  return finish(triangles, volume, min, max);
}

function parseAscii(text: string): StlEstimate | null {
  const verts: number[][] = [];
  const re = /vertex\s+([^\s]+)\s+([^\s]+)\s+([^\s]+)/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    verts.push([Number(m[1]), Number(m[2]), Number(m[3])]);
  }
  if (verts.length < 3) return null;
  let volume = 0;
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i + 2 < verts.length; i += 3) {
    const [a, b, c] = [verts[i], verts[i + 1], verts[i + 2]];
    volume += signedVolume(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]);
    for (const v of [a, b, c]) {
      if (v[0] < min[0]) min[0] = v[0];
      if (v[1] < min[1]) min[1] = v[1];
      if (v[2] < min[2]) min[2] = v[2];
      if (v[0] > max[0]) max[0] = v[0];
      if (v[1] > max[1]) max[1] = v[1];
      if (v[2] > max[2]) max[2] = v[2];
    }
  }
  return finish(Math.floor(verts.length / 3), volume, min, max);
}

export async function parseStl(file: File): Promise<StlEstimate | null> {
  const buf = await file.arrayBuffer();
  const bytes = new Uint8Array(buf);
  if (bytes.byteLength < 84) return parseAscii(new TextDecoder().decode(bytes));
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const triangles = view.getUint32(80, true);
  const expected = 84 + triangles * 50;
  if (triangles > 0 && bytes.byteLength >= expected && bytes.byteLength <= expected + 16) {
    return parseBinary(bytes);
  }
  const text = new TextDecoder().decode(bytes.slice(0, Math.min(bytes.byteLength, 80)));
  if (text.trim().toLowerCase().startsWith("solid")) {
    return parseAscii(new TextDecoder().decode(bytes));
  }
  return parseBinary(bytes);
}
