import { useState, useEffect } from "react";
import { toast } from "sonner";
import { formatINR, formatDate } from "@/lib/format";
import { productColor } from "@/lib/products";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { shipWithShiprocket } from "@/lib/orders-fns";
import {
  ExternalLink,
  Download,
  Copy,
  Check,
  Package,
  Layers,
  Sparkles,
  Printer as PrinterIcon,
  X,
  FileCode,
  Truck,
  User,
  CreditCard,
  MapPin,
  Clock,
  Box,
} from "lucide-react";
import type { CartItem } from "@/lib/cart-store";
import type { Address } from "@/lib/orders-store";

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Detect if a cart item is a lithophane order */
function isLithophaneItem(item: CartItem): boolean {
  const n = item.name?.toLowerCase() ?? "";
  const notes = item.custom?.notes?.toLowerCase() ?? "";
  return n.includes("lithophane") || notes.includes("shape:") || notes.includes("lithophane");
}

/**
 * Build a minimal Bambu Studio .3mf project file (ZIP) pre-loaded with
 * lithophane print settings. Bambu Studio reads the plate config XML
 * inside the archive and applies the settings on open.
 *
 * Format ref: https://github.com/bambulab/BambuStudio/wiki/3MF-file-format
 */
function buildLithophaneBambu3mf(
  orderNumber: string,
  item: CartItem
): Blob {
  // Detect plate dimensions from item.size e.g. "150 × 100 mm (Standard)"
  const sizeMatch = item.size?.match(/(\d+)\s*[×x]\s*(\d+)/);
  const plateW = sizeMatch ? parseInt(sizeMatch[1]) : 150;
  const plateH = sizeMatch ? parseInt(sizeMatch[2]) : 100;

  // ── 3MF XML: model file ───────────────────────────────────────────────────
  // A valid .3mf needs at minimum a model XML and a Bambu plate config XML.
  // We create a flat plate with a placeholder 1mm box so Bambu loads the project;
  // the actual STL should be imported separately after opening.
  const modelXml = `<?xml version="1.0" encoding="UTF-8"?>
<model unit="millimeter" xml:lang="en-US"
  xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02"
  xmlns:p="http://schemas.microsoft.com/3dmanufacturing/production/2015/06">
  <metadata name="Title">Prynth Lithophane – ${orderNumber}</metadata>
  <metadata name="Designer">Prynth Custom Studio</metadata>
  <metadata name="Description">Lithophane: ${item.name} – ${item.size ?? ""}</metadata>
  <resources>
    <object id="1" type="model">
      <mesh>
        <vertices>
          <vertex x="0" y="0" z="0" />
          <vertex x="${plateW}" y="0" z="0" />
          <vertex x="${plateW}" y="${plateH}" z="0" />
          <vertex x="0" y="${plateH}" z="0" />
          <vertex x="0" y="0" z="1" />
          <vertex x="${plateW}" y="0" z="1" />
          <vertex x="${plateW}" y="${plateH}" z="1" />
          <vertex x="0" y="${plateH}" z="1" />
        </vertices>
        <triangles>
          <triangle v1="0" v2="1" v3="2" /><triangle v1="0" v2="2" v3="3" />
          <triangle v1="4" v2="6" v3="5" /><triangle v1="4" v2="7" v3="6" />
          <triangle v1="0" v2="4" v3="5" /><triangle v1="0" v2="5" v3="1" />
          <triangle v1="1" v2="5" v3="6" /><triangle v1="1" v2="6" v3="2" />
          <triangle v1="2" v2="6" v3="7" /><triangle v1="2" v2="7" v3="3" />
          <triangle v1="3" v2="7" v3="4" /><triangle v1="3" v2="4" v3="0" />
        </triangles>
      </mesh>
    </object>
  </resources>
  <build>
    <item objectid="1" />
  </build>
</model>`;

  // ── Bambu Studio plate / process config XML ───────────────────────────────
  // This is the key part: Bambu reads these settings and pre-fills the slicer.
  const configXml = `<?xml version="1.0" encoding="UTF-8"?>
<config>
  <plate>
    <metadata key="plater_id" value="1" />
    <metadata key="plate_name" value="Prynth Lithophane" />
    <object_config object_id="1">
      <metadata key="name" value="${item.name}" />
    </object_config>
  </plate>
  <plate_settings>
    <process>
      <!-- Lithophane requires ultra-fine layer height for maximum detail -->
      <metadata key="layer_height" value="0.12" />
      <metadata key="first_layer_height" value="0.2" />
      <metadata key="sparse_infill_density" value="20" />
      <metadata key="sparse_infill_pattern" value="rectilinear" />
      <metadata key="wall_loops" value="2" />
      <metadata key="top_shell_layers" value="3" />
      <metadata key="bottom_shell_layers" value="3" />
      <!-- No supports needed – lithophane prints flat on the bed -->
      <metadata key="enable_support" value="0" />
      <metadata key="brim_type" value="auto" />
      <metadata key="ironing_type" value="no" />
      <metadata key="fuzzy_skin" value="none" />
      <metadata key="print_sequence" value="by_layer" />
    </process>
    <filament index="0">
      <!-- Lithophane White PLA – high transmission, optical grade -->
      <metadata key="filament_type" value="PLA" />
      <metadata key="filament_colour" value="#F5F5F0" />
      <metadata key="filament_vendor" value="Bambu Lab" />
      <metadata key="nozzle_temperature" value="220" />
      <metadata key="nozzle_temperature_initial_layer" value="220" />
      <metadata key="bed_temperature" value="55" />
      <metadata key="fan_cooling_enabled" value="1" />
      <metadata key="fan_min_speed" value="100" />
      <metadata key="fan_max_speed" value="100" />
    </filament>
    <machine>
      <metadata key="machine_name" value="Bambu Lab P1S" />
      <metadata key="nozzle_diameter" value="0.4" />
    </machine>
  </plate_settings>
</config>`;

  // ── Build ZIP (3MF = ZIP with specific structure) ─────────────────────────
  // We build a minimal ZIP manually since we can't import jszip in the browser
  // without a bundler import. We'll use a simple structure that Bambu accepts.
  // (For a production-quality export, wire in fflate or jszip via npm.)
  //
  // Instead we produce a valid .3mf by writing the binary ZIP structure.
  function makeZip(files: Record<string, string>): Uint8Array {
    const encoder = new TextEncoder();
    const entries: { name: Uint8Array; data: Uint8Array; offset: number }[] = [];
    const parts: Uint8Array[] = [];
    let offset = 0;

    for (const [name, content] of Object.entries(files)) {
      const nameBytes = encoder.encode(name);
      const dataBytes = encoder.encode(content);
      // Local file header
      const header = new Uint8Array(30 + nameBytes.length);
      const dv = new DataView(header.buffer);
      dv.setUint32(0, 0x04034b50, true); // signature
      dv.setUint16(4, 20, true); // version
      dv.setUint16(6, 0, true); // flags
      dv.setUint16(8, 0, true); // no compression
      dv.setUint16(10, 0, true); // mod time
      dv.setUint16(12, 0, true); // mod date
      dv.setUint32(14, 0, true); // crc-32 (skip)
      dv.setUint32(18, dataBytes.length, true); // compressed size
      dv.setUint32(22, dataBytes.length, true); // uncompressed size
      dv.setUint16(26, nameBytes.length, true); // file name length
      dv.setUint16(28, 0, true); // extra field length
      header.set(nameBytes, 30);
      entries.push({ name: nameBytes, data: dataBytes, offset });
      parts.push(header, dataBytes);
      offset += header.length + dataBytes.length;
    }

    // Central directory
    const cdParts: Uint8Array[] = [];
    let cdSize = 0;
    for (const entry of entries) {
      const cd = new Uint8Array(46 + entry.name.length);
      const dv = new DataView(cd.buffer);
      dv.setUint32(0, 0x02014b50, true);
      dv.setUint16(4, 20, true);
      dv.setUint16(6, 20, true);
      dv.setUint16(8, 0, true);
      dv.setUint16(10, 0, true);
      dv.setUint16(12, 0, true);
      dv.setUint16(14, 0, true);
      dv.setUint32(16, 0, true);
      dv.setUint32(20, entry.data.length, true);
      dv.setUint32(24, entry.data.length, true);
      dv.setUint16(28, entry.name.length, true);
      dv.setUint16(30, 0, true);
      dv.setUint16(32, 0, true);
      dv.setUint16(34, 0, true);
      dv.setUint16(36, 0, true);
      dv.setUint32(38, 0, true);
      dv.setUint32(42, entry.offset, true);
      cd.set(entry.name, 46);
      cdParts.push(cd);
      cdSize += cd.length;
    }

    // End of central directory
    const eocd = new Uint8Array(22);
    const eocdDv = new DataView(eocd.buffer);
    eocdDv.setUint32(0, 0x06054b50, true);
    eocdDv.setUint16(4, 0, true);
    eocdDv.setUint16(6, 0, true);
    eocdDv.setUint16(8, entries.length, true);
    eocdDv.setUint16(10, entries.length, true);
    eocdDv.setUint32(12, cdSize, true);
    eocdDv.setUint32(16, offset, true);
    eocdDv.setUint16(20, 0, true);

    const allParts = [...parts, ...cdParts, eocd];
    const total = allParts.reduce((s, p) => s + p.length, 0);
    const out = new Uint8Array(total);
    let pos = 0;
    for (const p of allParts) { out.set(p, pos); pos += p.length; }
    return out;
  }

  const zipBytes = makeZip({
    "[Content_Types].xml": `<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml" /><Default Extension="xml" ContentType="application/xml" /><Override PartName="/3D/3dmodel.model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml" /></Types>`,
    "_rels/.rels": `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rel-1" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel" Target="/3D/3dmodel.model" /></Relationships>`,
    "3D/3dmodel.model": modelXml,
    "Metadata/Slic3r_PE.config": configXml,
    "Metadata/plate_1.config": configXml,
  });

  return new Blob([zipBytes], { type: "model/3mf" });
}

/**
 * Generate a binary STL from the lithophane reference photo.
 * Samples the image luminance on a grid and displaces vertices by height.
 * Returns null if the photo is unavailable (stripped from DB).
 */
async function generateLithophaneStl(
  photo: string,
  widthMm: number,
  heightMm: number,
  shape: "flat" | "heart"
): Promise<ArrayBuffer | null> {
  if (!photo || photo === "[photo-stripped]" || photo === "[photo-stripped-cleanup]") {
    return null;
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const RES = 150; // vertices per axis
      const MAX_DEPTH = 3.5; // mm
      const BASE_THICK = 0.8; // mm

      const canvas = document.createElement("canvas");
      canvas.width = RES;
      canvas.height = RES;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, RES, RES);
      const imgData = ctx.getImageData(0, 0, RES, RES);
      const { data } = imgData;

      // Heart boundary (matching lithophane-viewer.tsx)
      function isInsideHeart(u: number, v: number): boolean {
        const nx = (u - 0.5) * 2.4;
        const ny = (0.5 - v) * 2.4 + 0.28;
        const x2 = nx * nx; const y2 = ny * ny;
        const term = x2 + y2 - 1.0;
        return term * term * term - x2 * (ny * ny * ny) <= 0.0;
      }

      const triangles: number[] = [];

      function addTri(ax: number, ay: number, az: number, bx: number, by: number, bz: number, cx: number, cy: number, cz: number) {
        const ux = bx - ax, uy = by - ay, uz = bz - az;
        const vx = cx - ax, vy = cy - ay, vz = cz - az;
        const nx2 = uy * vz - uz * vy, ny2 = uz * vx - ux * vz, nz2 = ux * vy - uy * vx;
        triangles.push(nx2, ny2, nz2, ax, ay, az, bx, by, bz, cx, cy, cz);
      }

      type V = [number, number, number];
      const verts: (V | null)[][] = [];

      for (let row = 0; row <= RES; row++) {
        verts[row] = [];
        for (let col = 0; col <= RES; col++) {
          const u = col / RES;
          const v = row / RES;
          if (shape === "heart" && !isInsideHeart(u, v)) {
            verts[row][col] = null;
            continue;
          }
          const px = Math.min(RES - 1, Math.round(u * (RES - 1)));
          const py = Math.min(RES - 1, Math.round(v * (RES - 1)));
          const idx = (py * RES + px) * 4;
          const lum = (0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2]) / 255;
          const z = BASE_THICK + (1 - lum) * MAX_DEPTH;
          const x = u * widthMm;
          const y = (1 - v) * heightMm;
          verts[row][col] = [x, y, z];
        }
      }

      // Front face
      for (let row = 0; row < RES; row++) {
        for (let col = 0; col < RES; col++) {
          const tl = verts[row][col], tr = verts[row][col + 1];
          const bl = verts[row + 1][col], br = verts[row + 1][col + 1];
          if (tl && tr && bl && br) {
            addTri(tl[0], tl[1], tl[2], tr[0], tr[1], tr[2], bl[0], bl[1], bl[2]);
            addTri(tr[0], tr[1], tr[2], br[0], br[1], br[2], bl[0], bl[1], bl[2]);
          } else if (tl && tr && bl) addTri(tl[0], tl[1], tl[2], tr[0], tr[1], tr[2], bl[0], bl[1], bl[2]);
          else if (tr && br && bl) addTri(tr[0], tr[1], tr[2], br[0], br[1], br[2], bl[0], bl[1], bl[2]);
        }
      }

      // Back face (flat base at z=0)
      for (let row = 0; row < RES; row++) {
        for (let col = 0; col < RES; col++) {
          const u0 = col / RES, u1 = (col + 1) / RES;
          const v0 = row / RES, v1 = (row + 1) / RES;
          if (shape === "heart") {
            if (!isInsideHeart((u0 + u1) / 2, (v0 + v1) / 2)) continue;
          }
          const x0 = u0 * widthMm, x1 = u1 * widthMm;
          const y0 = (1 - v0) * heightMm, y1 = (1 - v1) * heightMm;
          addTri(x0, y1, 0, x1, y0, 0, x0, y0, 0);
          addTri(x0, y1, 0, x1, y1, 0, x1, y0, 0);
        }
      }

      // Binary STL: 80-byte header + 4-byte tri count + 50 bytes per triangle
      const triCount = triangles.length / 12;
      const buffer = new ArrayBuffer(84 + triCount * 50);
      const view = new DataView(buffer);
      // Header
      const headerText = `Prynth Lithophane STL – ${widthMm}x${heightMm}mm`;
      for (let i = 0; i < 80; i++) view.setUint8(i, i < headerText.length ? headerText.charCodeAt(i) : 0);
      view.setUint32(80, triCount, true);

      let offset = 84;
      for (let t = 0; t < triCount; t++) {
        const base = t * 12;
        // Normal
        view.setFloat32(offset, triangles[base], true); offset += 4;
        view.setFloat32(offset, triangles[base + 1], true); offset += 4;
        view.setFloat32(offset, triangles[base + 2], true); offset += 4;
        // Vertex 1
        view.setFloat32(offset, triangles[base + 3], true); offset += 4;
        view.setFloat32(offset, triangles[base + 4], true); offset += 4;
        view.setFloat32(offset, triangles[base + 5], true); offset += 4;
        // Vertex 2
        view.setFloat32(offset, triangles[base + 6], true); offset += 4;
        view.setFloat32(offset, triangles[base + 7], true); offset += 4;
        view.setFloat32(offset, triangles[base + 8], true); offset += 4;
        // Vertex 3
        view.setFloat32(offset, triangles[base + 9], true); offset += 4;
        view.setFloat32(offset, triangles[base + 10], true); offset += 4;
        view.setFloat32(offset, triangles[base + 11], true); offset += 4;
        // Attribute byte count
        view.setUint16(offset, 0, true); offset += 2;
      }
      resolve(buffer);
    };
    img.onerror = () => resolve(null);
    img.src = photo;
  });
}

export function OrderDetailsDialog({
  order,
  onClose,
  onUpdateStatus,
}: {
  order: any;
  onClose: () => void;
  onUpdateStatus: (status: string) => void;
}) {
  const [copiedSettings, setCopiedSettings] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // ── Shiprocket shipping form state ──────────────────────────────────────
  const [showShiprocketForm, setShowShiprocketForm] = useState(false);
  const [srPickup, setSrPickup] = useState("Primary");
  const [srLength, setSrLength] = useState("15");
  const [srBreadth, setSrBreadth] = useState("10");
  const [srHeight, setSrHeight] = useState("5");
  const [srWeight, setSrWeight] = useState("0.5");
  const [srResult, setSrResult] = useState<{ awb_code: string; courier_name: string; tracking_url: string } | null>(
    order.tracking_number
      ? { awb_code: order.tracking_number, courier_name: order.courier_name || "", tracking_url: order.tracking_url || "" }
      : null
  );

  const shiprocketMutation = useMutation({
    mutationFn: () =>
      shipWithShiprocket({
        data: {
          order_number: order.order_number,
          pickup_location: srPickup.trim() || "Primary",
          length_cm: parseFloat(srLength) || 15,
          breadth_cm: parseFloat(srBreadth) || 10,
          height_cm: parseFloat(srHeight) || 5,
          weight_kg: parseFloat(srWeight) || 0.5,
        },
      }),
    onSuccess: (res) => {
      setSrResult({ awb_code: res.awb_code, courier_name: res.courier_name, tracking_url: res.tracking_url });
      setShowShiprocketForm(false);
      toast.success(`Shipment created! AWB: ${res.awb_code || "assigned"}`);
      queryClient.invalidateQueries({ queryKey: ["adminOrders"] });
      order.status = "shipped";
      order.tracking_number = res.awb_code;
      order.tracking_url = res.tracking_url;
      order.courier_name = res.courier_name;
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to create Shiprocket shipment.");
    },
  });

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  if (!order) return null;

  const items = (typeof order.items === "string" ? JSON.parse(order.items) : order.items) as CartItem[];
  const address = (typeof order.shipping_address === "string" ? JSON.parse(order.shipping_address) : order.shipping_address) as Address;

  function getModelDownloadUrl(fileId: string) {
    if (typeof window === "undefined") return `/api/custom-model/${fileId}`;
    return `${window.location.origin}/api/custom-model/${fileId}`;
  }

  function handleOpenInBambu(fileId?: string, fileName?: string) {
    if (!fileId) {
      toast.error("No uploaded 3D model file ID attached to this custom order.");
      return;
    }
    const fullUrl = getModelDownloadUrl(fileId);
    const bambuUri = `bambustudio://open?file=${encodeURIComponent(fullUrl)}`;
    window.location.href = bambuUri;
    toast.success(`Launching Bambu Studio for ${fileName || "model"}…`);
  }

  function handleOpenInOrca(fileId?: string) {
    if (!fileId) {
      toast.error("No uploaded 3D model file ID attached.");
      return;
    }
    const fullUrl = getModelDownloadUrl(fileId);
    window.location.href = `orcaslicer://open?file=${encodeURIComponent(fullUrl)}`;
    toast.success("Launching Orca Slicer…");
  }

  /** Download a .3mf Bambu Studio project pre-loaded with lithophane settings */
  function handleDownloadBambu3mf(item: CartItem) {
    const blob = buildLithophaneBambu3mf(order.order_number, item);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `prynth-lithophane-${order.order_number}.3mf`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Bambu Studio .3mf downloaded — open it in Bambu Studio and import your STL.");
  }

  /** Download the lithophane as a binary STL generated from the reference photo */
  async function handleDownloadLithophaneStl(item: CartItem) {
    const photos = item.custom?.referencePhotos ?? [];
    const photo = photos[0] ?? "";

    if (!photo || photo.startsWith("[")) {
      toast.error("The reference photo for this order was stripped from the database to save space. Re-open the lithophane page with the original photo to download the STL.");
      return;
    }

    // Parse dimensions from item.size e.g. "150 × 100 mm (Standard)"
    const sizeMatch = item.size?.match(/(\d+)\s*[×x]\s*(\d+)/);
    const wMm = sizeMatch ? parseInt(sizeMatch[1]) : 150;
    const hMm = sizeMatch ? parseInt(sizeMatch[2]) : 100;
    const notesLower = (item.custom?.notes ?? "").toLowerCase();
    const shape: "flat" | "heart" = notesLower.includes("heart") ? "heart" : "flat";

    const toastId = toast.loading("Generating STL from photo…");
    try {
      const stlBuffer = await generateLithophaneStl(photo, wMm, hMm, shape);
      if (!stlBuffer) {
        toast.dismiss(toastId);
        toast.error("Could not generate STL — photo unavailable.");
        return;
      }
      const blob = new Blob([stlBuffer], { type: "application/octet-stream" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `prynth-lithophane-${order.order_number}.stl`;
      a.click();
      URL.revokeObjectURL(url);
      toast.dismiss(toastId);
      toast.success("Lithophane STL downloaded — open in Fusion 360 or Bambu Studio.");
    } catch (err) {
      toast.dismiss(toastId);
      toast.error("STL generation failed.");
      console.error(err);
    }
  }

  function handleCopySlicerSettings(item: CartItem) {
    const custom = item.custom;
    if (!custom) return;

    const text = [
      `=== Bambu Studio Slicer Settings ===`,
      `Order: #${order.order_number}`,
      `Item: ${item.name}`,
      `Target Machine: ${custom.printerName || "Bambu Lab P1S"}`,
      `Filament Material: ${custom.material || "PLA"}`,
      `Color: ${productColor(item.color).name}`,
      `Layer Profile: ${custom.quality || "0.20 mm · Standard"}`,
      `Infill Percentage: ${custom.infillPercentage ?? 20}%`,
      `Infill Pattern: ${custom.infillPattern || "Gyroid"}`,
      `Perimeter Wall Loops: ${custom.wallLoops || 2}`,
      custom.supportEnabled !== undefined
        ? `Enable Support: ${custom.supportEnabled ? "Yes" : "No"}`
        : null,
      `Support: ${custom.supports || "None"}`,
      custom.supportType ? `Support Type: ${custom.supportType}` : null,
      custom.supportThresholdAngle != null ? `Threshold Angle: ${custom.supportThresholdAngle}°` : null,
      custom.supportOnBuildPlateOnly != null ? `On Build Plate Only: ${custom.supportOnBuildPlateOnly ? "Yes" : "No"}` : null,
      custom.supportBaseFilament ? `Support Base Filament: ${custom.supportBaseFilament}` : null,
      custom.supportInterfaceFilament ? `Support Interface Filament: ${custom.supportInterfaceFilament}` : null,
      `Surface Finish: ${custom.surfaceFinish || "Standard"}`,
      `Bed Brim: ${custom.brim || "Auto"}`,
      custom.orientation ? `Print Orientation: ${custom.orientation}` : null,
      custom.preflightScore ? `Pre-Flight Score: ${custom.preflightScore}` : null,
      custom.fileName ? `Model File: ${custom.fileName}` : null,
      custom.notes ? `Customer Notes: ${custom.notes}` : null,
    ]
      .filter(Boolean)
      .join("\n");

    navigator.clipboard.writeText(text);
    setCopiedSettings(item.id);
    toast.success("Bambu Studio settings copied to clipboard!");
    setTimeout(() => setCopiedSettings(null), 2500);
  }

  function handleExportBambuJson(item: CartItem) {
    const custom = item.custom;
    if (!custom) return;

    const config = {
      order_number: order.order_number,
      printer_name: custom.printerName || "Bambu Lab P1S",
      printer_model: custom.printerModel || "Bambu Lab P1S",
      filament_type: custom.material || "PLA",
      filament_color: productColor(item.color).name,
      layer_height: custom.quality || "0.20 mm",
      sparse_infill_density: `${custom.infillPercentage ?? 20}%`,
      sparse_infill_pattern: custom.infillPattern || "gyroid",
      wall_loops: custom.wallLoops || 2,
      enable_support: custom.supportEnabled !== undefined
        ? (custom.supportEnabled ? 1 : 0)
        : (custom.supports && custom.supports !== "none" ? 1 : 0),
      support_type: custom.supportType || (custom.supports && custom.supports !== "none" ? custom.supports : "tree(auto)"),
      support_threshold_angle: custom.supportThresholdAngle ?? 30,
      support_on_build_plate_only: custom.supportOnBuildPlateOnly ? 1 : 0,
      support_base_filament: custom.supportBaseFilament || "Default",
      support_interface_filament: custom.supportInterfaceFilament || "Default",
      fuzzy_skin: custom.surfaceFinish === "fuzzy" ? "all_walls" : "none",
      ironing_type: custom.surfaceFinish === "ironing" ? "top" : "no",
      brim_type: custom.brim || "auto",
      source_file: custom.fileName || null,
      generated_by: "Prynth Custom Studio",
      timestamp: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(config, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bambu-config-${order.order_number}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Bambu config preset downloaded!");
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 sm:p-6 overflow-y-auto animate-in fade-in duration-150">
      <div className="relative w-full max-w-3xl max-h-[min(88vh,calc(100dvh-4rem))] flex flex-col rounded-2xl sm:rounded-3xl border border-border bg-surface shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Fixed Header */}
        <div className="shrink-0 flex items-start justify-between border-b border-border p-5 sm:p-6 bg-surface/90 backdrop-blur-xs z-10">
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="font-display text-2xl font-bold">#{order.order_number}</h2>
              <Badge
                className={
                  order.status === "pending"
                    ? "bg-secondary text-secondary-foreground"
                    : order.status === "shipped"
                      ? "bg-primary text-primary-foreground"
                      : order.status === "printing"
                        ? "bg-accent text-accent-foreground"
                        : "bg-surface-2 border text-fg"
                }
              >
                {order.status}
              </Badge>
            </div>
            <p className="text-xs text-muted mt-1">
              Placed on {new Date(order.created_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="size-8 rounded-full flex items-center justify-center text-muted hover:bg-surface-2 hover:text-fg transition-colors"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6 overscroll-contain">
          {/* Quick Status Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-surface-2/60 p-4 border border-border/60">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted">Update Status:</span>
              <select
                value={order.status}
                onChange={(e) => onUpdateStatus(e.target.value)}
                className="h-8 rounded-lg border border-border bg-surface px-2.5 text-xs font-medium text-fg focus:border-accent focus:outline-none"
              >
                <option value="pending">Pending</option>
                <option value="processing">Processing</option>
                <option value="printing">🖨️ Printing</option>
                <option value="shipped">Shipped</option>
                <option value="delivered">Delivered</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            <div className="flex items-center gap-4 text-xs text-muted">
              <span>Payment: <strong className="text-fg capitalize">{order.payment_status}</strong></span>
              <span>Method: <strong className="text-fg uppercase">{order.payment_method}</strong></span>
              {order.razorpay_order_id && (
                <span className="font-mono text-[11px] truncate max-w-[150px]">{order.razorpay_order_id}</span>
              )}
            </div>
          </div>

          {/* Customer & Shipping Information */}
          <div className="grid gap-4 sm:grid-cols-2 text-xs">
            <div className="rounded-2xl border border-border p-4 bg-surface space-y-2">
              <div className="flex items-center gap-2 font-semibold text-fg">
                <User className="size-4 text-accent" /> Customer Details
              </div>
              <p className="font-medium text-sm text-fg">{order.user_name || address?.name || "Guest Customer"}</p>
              <p className="text-muted">{order.user_email || order.guest_email || address?.email}</p>
              {address?.phone && <p className="text-muted font-mono">{address.phone}</p>}
            </div>

            <div className="rounded-2xl border border-border p-4 bg-surface space-y-2">
              <div className="flex items-center gap-2 font-semibold text-fg">
                <MapPin className="size-4 text-accent" /> Shipping Address
              </div>
              {address ? (
                <div className="text-muted leading-relaxed">
                  <p>{address.line1}</p>
                  {address.line2 && <p>{address.line2}</p>}
                  <p>
                    {address.city}, {address.state} — {address.pincode || (address as any).pin}
                  </p>
                  <p className="text-[11px] font-medium text-accent mt-1">Method: {order.shipping_method || "Standard"}</p>
                </div>
              ) : (
                <p className="text-muted">No address provided</p>
              )}
            </div>
          </div>

          {/* Order Items & Custom Production Specs */}
          <div className="space-y-3">
            <h3 className="font-display font-semibold text-base flex items-center gap-2">
              <Package className="size-4 text-accent" /> Order Items ({items.length})
            </h3>

            <div className="divide-y divide-border border border-border rounded-2xl overflow-hidden bg-surface">
              {items.map((item, idx) => {
                const isCustom = Boolean(item.custom);
                const custom = item.custom;

                return (
                  <div key={item.id || idx} className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-sm text-fg">{item.name}</p>
                          {isCustom && (
                            <Badge className="bg-accent/15 text-accent border-accent/30 text-[10px] uppercase font-bold tracking-wider">
                              Custom 3D Print
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted mt-0.5">
                          Color: <strong className="text-fg">{productColor(item.color).name}</strong>
                          {item.size && ` · Size: ${item.size}`}
                          {" · "}Qty: <strong className="text-fg">{item.qty}</strong>
                        </p>
                      </div>
                      <p className="font-semibold tabular-nums text-sm">
                        {formatINR(item.unitPrice * item.qty)}
                      </p>
                    </div>

                    {/* Highlighted Bambu Slicer Specifications Card */}
                    {isCustom && custom && (
                      <div className="rounded-2xl border border-accent/30 bg-accent-soft/30 p-4 space-y-3">
                        <div className="flex items-center justify-between border-b border-accent/20 pb-2">
                          <div className="flex items-center gap-2">
                            <PrinterIcon className="size-4 text-accent" />
                            <span className="text-xs font-semibold text-fg">
                              Target Fleet Machine: {custom.printerName || "Bambu Lab P1S"}
                            </span>
                          </div>
                          {custom.fileName && (
                            <span className="font-mono text-[11px] text-muted truncate max-w-[200px]">
                              {custom.fileName}
                            </span>
                          )}
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                          <div className="rounded-xl bg-surface/80 p-2 border border-border/40">
                            <span className="text-muted block text-[10px]">Layer Profile</span>
                            <span className="font-semibold text-fg">{custom.quality || "0.20 mm Standard"}</span>
                          </div>

                          <div className="rounded-xl bg-surface/80 p-2 border border-border/40">
                            <span className="text-muted block text-[10px]">Infill Density</span>
                            <span className="font-semibold text-fg">
                              {custom.infillPercentage ?? 20}% {custom.infillPattern ? `(${custom.infillPattern})` : ""}
                            </span>
                          </div>

                          <div className="rounded-xl bg-surface/80 p-2 border border-border/40">
                            <span className="text-muted block text-[10px]">Perimeter Walls</span>
                            <span className="font-semibold text-fg">{custom.wallLoops ?? 2} loops</span>
                          </div>

                          <div className="rounded-xl bg-surface/80 p-2 border border-border/40">
                            <span className="text-muted block text-[10px]">Supports</span>
                            <span className="font-semibold text-accent">{custom.supports || "None"}</span>
                            {custom.supportInterfaceFilament && custom.supportInterfaceFilament !== "Default" && (
                              <span className="text-[10px] text-muted block mt-0.5">
                                Interface: {custom.supportInterfaceFilament}
                              </span>
                            )}
                          </div>

                          <div className="rounded-xl bg-surface/80 p-2 border border-border/40">
                            <span className="text-muted block text-[10px]">Surface Finish</span>
                            <span className="font-semibold text-fg capitalize">{custom.surfaceFinish || "Standard"}</span>
                          </div>

                          <div className="rounded-xl bg-surface/80 p-2 border border-border/40">
                            <span className="text-muted block text-[10px]">Bed Adhesion</span>
                            <span className="font-semibold text-fg">{custom.brim || "Auto"}</span>
                          </div>

                          <div className="rounded-xl bg-surface/80 p-2 border border-border/40">
                            <span className="text-muted block text-[10px]">Material</span>
                            <span className="font-semibold text-fg">{custom.material || "PLA"}</span>
                          </div>

                          <div className="rounded-xl bg-surface/80 p-2 border border-border/40">
                            <span className="text-muted block text-[10px]">Est. Volume</span>
                            <span className="font-semibold text-fg">
                              {custom.volumeCm3 ? `${custom.volumeCm3.toFixed(1)} cm³` : "Preset"}
                            </span>
                          </div>

                          {custom.orientation && (
                            <div className="rounded-xl bg-surface/80 p-2 border border-border/40">
                              <span className="text-muted block text-[10px]">Orientation</span>
                              <span className="font-semibold text-accent">{custom.orientation}</span>
                            </div>
                          )}

                          {custom.preflightScore && (
                            <div className="rounded-xl bg-surface/80 p-2 border border-border/40">
                              <span className="text-muted block text-[10px]">Pre-Flight Slicer Score</span>
                              <span className="font-semibold text-emerald-500">{custom.preflightScore}</span>
                            </div>
                          )}
                        </div>

                        {custom.notes && (
                          <div className="rounded-xl bg-surface/60 p-2.5 text-xs border border-border/40">
                            <span className="font-medium text-fg">Customer Notes: </span>
                            <span className="text-muted">{custom.notes}</span>
                          </div>
                        )}

                        {custom.referencePhotos && custom.referencePhotos.length > 0 && (
                          <div className="rounded-xl bg-surface/80 p-3 border border-border/40 space-y-2">
                            <span className="text-xs font-semibold text-fg flex items-center gap-1.5">
                              Attached Reference Photos ({custom.referencePhotos.length})
                            </span>
                            <div className="flex flex-wrap gap-2">
                              {custom.referencePhotos.map((photo: string, pIdx: number) =>
                                photo.startsWith("[") ? (
                                  <div
                                    key={pIdx}
                                    className="flex items-center gap-1.5 rounded-lg border border-border/60 bg-surface-2/60 px-3 py-1.5 text-xs text-muted"
                                  >
                                    <span>Photo archived (database space cleanup)</span>
                                  </div>
                                ) : (
                                  <a
                                    key={pIdx}
                                    href={photo}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="group relative block size-16 overflow-hidden rounded-lg border border-border hover:border-accent shadow-2xs"
                                    title={`View photo ${pIdx + 1}`}
                                  >
                                    <img
                                      src={photo}
                                      alt={`Reference ${pIdx + 1}`}
                                      className="size-full object-cover transition-transform group-hover:scale-105"
                                    />
                                  </a>
                                )
                              )}
                            </div>
                          </div>
                        )}

                        {/* Bambu Slicer Action Bar */}
                        <div className="pt-3 border-t border-accent/20">
                          <p className="text-[11px] font-semibold text-muted uppercase tracking-wider mb-2">Slicer & Machine Actions</p>
                          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 w-full">
                            {custom.fileId ? (
                              <>
                                {/* Primary Button: Open in Bambu Studio (custom 3D file) */}
                                <Button
                                  size="sm"
                                  onClick={() => handleOpenInBambu(custom.fileId, custom.fileName)}
                                  className="w-full gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-sm text-xs justify-center whitespace-nowrap"
                                >
                                  <PrinterIcon className="size-3.5 shrink-0" />
                                  Bambu Studio
                                </Button>

                                {/* Secondary Button: Open in Orca */}
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleOpenInOrca(custom.fileId)}
                                  className="w-full gap-1.5 text-xs justify-center whitespace-nowrap"
                                >
                                  <ExternalLink className="size-3.5 shrink-0" />
                                  Orca Slicer
                                </Button>

                                {/* Download Raw 3D Model */}
                                <Button
                                  asChild
                                  variant="outline"
                                  size="sm"
                                  className="w-full gap-1.5 text-xs justify-center whitespace-nowrap"
                                >
                                  <a
                                    href={getModelDownloadUrl(custom.fileId)}
                                    download={custom.fileName || "model.stl"}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center justify-center gap-1.5"
                                  >
                                    <Download className="size-3.5 shrink-0" />
                                    Download 3D
                                  </a>
                                </Button>
                              </>
                            ) : isLithophaneItem(item) ? (
                              <>
                                {/* Lithophane: Download pre-configured Bambu Studio .3mf */}
                                <Button
                                  size="sm"
                                  onClick={() => handleDownloadBambu3mf(item)}
                                  className="w-full gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-sm text-xs justify-center whitespace-nowrap"
                                  title="Downloads a .3mf project file with lithophane settings pre-loaded (0.12mm layer, 20% infill, no supports)"
                                >
                                  <PrinterIcon className="size-3.5 shrink-0" />
                                  Bambu .3mf
                                </Button>

                                {/* Lithophane: Re-generate & download STL from reference photo */}
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleDownloadLithophaneStl(item)}
                                  className="w-full gap-1.5 text-xs justify-center whitespace-nowrap"
                                  title="Generates and downloads the lithophane STL from the reference photo — open in Fusion 360 or Bambu Studio"
                                >
                                  <Box className="size-3.5 shrink-0" />
                                  Download STL
                                </Button>
                              </>
                            ) : null}

                            {/* Copy Slicer Checklist */}
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => handleCopySlicerSettings(item)}
                              className="w-full gap-1.5 text-xs justify-center whitespace-nowrap"
                            >
                              {copiedSettings === item.id ? (
                                <>
                                  <Check className="size-3.5 text-emerald-500 shrink-0" /> Copied!
                                </>
                              ) : (
                                <>
                                  <Copy className="size-3.5 shrink-0" /> Copy Specs
                                </>
                              )}
                            </Button>

                            {/* Export Bambu Slicer JSON Preset */}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleExportBambuJson(item)}
                              className="w-full gap-1.5 text-xs justify-center whitespace-nowrap"
                            >
                              <FileCode className="size-3.5 shrink-0" /> Preset JSON
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Shiprocket Shipping Panel */}
          <div className="border border-border rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between bg-surface-2/60 px-4 py-3">
              <div className="flex items-center gap-2">
                <Truck className="size-4 text-accent" />
                <span className="text-sm font-semibold text-fg">Shiprocket Shipping</span>
              </div>
              {srResult ? (
                <Badge className="bg-primary/10 text-primary border-primary/30 text-xs">
                  AWB Assigned
                </Badge>
              ) : (
                !showShiprocketForm && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs h-7 px-3"
                    onClick={() => setShowShiprocketForm(true)}
                  >
                    + Create Shipment
                  </Button>
                )
              )}
            </div>

            <div className="p-4">
              {srResult ? (
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted">AWB / Tracking No.</span>
                    <span className="font-mono font-semibold text-fg">{srResult.awb_code || "—"}</span>
                  </div>
                  {srResult.courier_name && (
                    <div className="flex justify-between">
                      <span className="text-muted">Courier</span>
                      <span className="font-medium text-fg">{srResult.courier_name}</span>
                    </div>
                  )}
                  {srResult.tracking_url && (
                    <a
                      href={srResult.tracking_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 mt-1 text-accent hover:underline font-medium"
                    >
                      <ExternalLink className="size-3" /> Track Package
                    </a>
                  )}
                </div>
              ) : showShiprocketForm ? (
                <div className="space-y-3 text-xs">
                  <p className="text-muted text-[11px]">
                    Enter the package dimensions and the pickup location name exactly as configured in your Shiprocket account.
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="col-span-2">
                      <Label htmlFor="sr-pickup" className="text-xs">Pickup Location Name</Label>
                      <Input
                        id="sr-pickup"
                        value={srPickup}
                        onChange={(e) => setSrPickup(e.target.value)}
                        placeholder="Primary"
                        className="h-8 text-xs mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="sr-length" className="text-xs">Length (cm)</Label>
                      <Input
                        id="sr-length"
                        type="number"
                        min="1"
                        value={srLength}
                        onChange={(e) => setSrLength(e.target.value)}
                        className="h-8 text-xs mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="sr-breadth" className="text-xs">Breadth (cm)</Label>
                      <Input
                        id="sr-breadth"
                        type="number"
                        min="1"
                        value={srBreadth}
                        onChange={(e) => setSrBreadth(e.target.value)}
                        className="h-8 text-xs mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="sr-height" className="text-xs">Height (cm)</Label>
                      <Input
                        id="sr-height"
                        type="number"
                        min="1"
                        value={srHeight}
                        onChange={(e) => setSrHeight(e.target.value)}
                        className="h-8 text-xs mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="sr-weight" className="text-xs">Weight (kg)</Label>
                      <Input
                        id="sr-weight"
                        type="number"
                        min="0.1"
                        step="0.1"
                        value={srWeight}
                        onChange={(e) => setSrWeight(e.target.value)}
                        className="h-8 text-xs mt-1"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <Button
                      size="sm"
                      className="text-xs h-8 flex-1"
                      onClick={() => shiprocketMutation.mutate()}
                      disabled={shiprocketMutation.isPending}
                    >
                      {shiprocketMutation.isPending ? "Creating shipment…" : "Ship via Shiprocket"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs h-8"
                      onClick={() => setShowShiprocketForm(false)}
                      disabled={shiprocketMutation.isPending}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-muted py-1">
                  No shipment created yet. Click "+ Create Shipment" to book a courier via Shiprocket.
                </p>
              )}
            </div>
          </div>

          {/* Pricing Summary */}

          <div className="border-t border-border pt-4 text-xs space-y-1.5">
            <div className="flex justify-between text-muted">
              <span>Subtotal</span>
              <span className="tabular-nums font-medium text-fg">{formatINR(order.subtotal)}</span>
            </div>
            <div className="flex justify-between text-muted">
              <span>Shipping ({order.shipping_method || "Standard"})</span>
              <span className="tabular-nums font-medium text-fg">
                {Number(order.shipping) === 0 ? "Free" : formatINR(order.shipping)}
              </span>
            </div>
            {Number(order.extra) > 0 && (
              <div className="flex justify-between text-muted">
                <span>COD Collection Fee</span>
                <span className="tabular-nums font-medium text-fg">{formatINR(order.extra)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-bold border-t border-border pt-2 text-fg">
              <span>Total Paid / Payable</span>
              <span className="tabular-nums font-display text-base text-accent">{formatINR(order.total)}</span>
            </div>
          </div>
        </div>

        {/* Fixed Footer */}
        <div className="shrink-0 flex items-center justify-end gap-3 border-t border-border p-4 sm:p-5 bg-surface-2/40 z-10">
          <Button variant="outline" onClick={onClose} className="px-5">
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
