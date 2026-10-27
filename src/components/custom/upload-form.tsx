import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { FileDropzone } from "@/components/file-dropzone";
import { ColorSwatches } from "@/components/color-swatches";
import { COLORS } from "@/lib/products";
import { QuantityStepper } from "@/components/quantity-stepper";
import { ModelViewer } from "@/components/model-viewer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatINR } from "@/lib/format";
import {
  computeQuote,
  INFILL_PATTERNS,
  SUPPORT_TYPES,
  BAMBU_SUPPORT_TYPES,
  SURFACE_FINISHES,
  BRIM_TYPES,
  type CustomPricingConfig,
} from "@/lib/quote";
import { BambuSupportSettings, type BambuSupportState } from "@/components/bambu-support-settings";
import type { Printer } from "@/lib/printers-fns";
import type { FilamentRecord } from "@/lib/filaments-fns";
import { uploadCustomFile, getCustomFileRecord } from "@/lib/custom-files-fns";
import { Turnstile } from "@/components/turnstile";
import { setCachedModelFile, getCachedModelFile } from "@/lib/custom-file-cache";
import type { CartItem, CustomSpec, useCart } from "@/lib/cart-store";
import { PrintabilityChecker } from "@/components/printability-checker";
import type { PrintabilityReport } from "@/lib/mesh-analysis";
import { parseModelFile, estimateFdmMaterialVolumeCm3 } from "@/lib/model-parser";
import {
  ChevronDown,
  Sliders,
  Sparkles,
  Printer as PrinterIcon,
  Loader2,
  Check,
  CheckCircle2,
  RefreshCcw,
  Save,
  Phone,
  Layers,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PrinterSelector, FieldSelect } from "@/components/custom/printer-selector";
import { QuotePanel } from "@/components/custom/quote-panel";

export function UploadForm({
  add,
  pricingConfig,
  printers,
  filaments,
  editItem,
  onUpdateItem,
}: {
  add: ReturnType<typeof useCart.getState>["add"];
  pricingConfig: CustomPricingConfig;
  printers: Printer[];
  filaments: FilamentRecord[];
  editItem?: CartItem | null;
  onUpdateItem?: (id: string, updated: Partial<CartItem>) => void;
}) {
  const navigate = useNavigate();
  const [selectedPrinterId, setSelectedPrinterId] = useState(() => {
    if (editItem?.custom?.printerId) return editItem.custom.printerId;
    const firstAvail = printers.find((p) => p.status === "available");
    return firstAvail?.id || printers[0]?.id || "p1s-01";
  });

  useEffect(() => {
    if (printers.length > 0 && !printers.some((p) => p.id === selectedPrinterId)) {
      const firstAvail = printers.find((p) => p.status === "available");
      setSelectedPrinterId(firstAvail?.id || printers[0].id);
    }
  }, [printers, selectedPrinterId]);

  const selectedPrinter = printers.find((p) => p.id === selectedPrinterId) ?? printers[0];

  const [file, setFile] = useState<File | null>(() => {
    if (editItem) {
      const cached = getCachedModelFile(editItem.custom?.fileId || editItem.id);
      if (cached) return cached;
    }
    return null;
  });
  const [projectFiles, setProjectFiles] = useState<File[]>([]);
  const [fileId, setFileId] = useState<string | null>(() => editItem?.custom?.fileId || null);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [volume, setVolume] = useState(() => editItem?.custom?.volumeCm3 || 0);
  const [solidVolume, setSolidVolume] = useState<number | null>(() => editItem?.custom?.solidVolumeCm3 ?? null);
  const [surfaceArea, setSurfaceArea] = useState<number | null>(() => editItem?.custom?.surfaceAreaMm2 ?? null);
  const [sizeLabel, setSizeLabel] = useState("");
  const [autoDetected, setAutoDetected] = useState(() => Boolean(editItem?.custom?.dimensionsMm || editItem?.custom?.dimensions));
  const [parsedDimensions, setParsedDimensions] = useState<{ x: number; y: number; z: number } | null>(
    () => editItem?.custom?.dimensionsMm ?? null,
  );
  const [parsedTriangles, setParsedTriangles] = useState(0);
  const [parsing, setParsing] = useState(false);
  const [material, setMaterial] = useState(() => editItem?.custom?.materialId || "pla");
  const [quality, setQuality] = useState(() => editItem?.custom?.qualityId || "standard");
  const [infillPct, setInfillPct] = useState(() => editItem?.custom?.infillPercentage ?? 20);
  const [infillPattern, setInfillPattern] = useState(() => editItem?.custom?.infillPattern || "gyroid");
  const [wallLoops, setWallLoops] = useState(() => editItem?.custom?.wallLoops ?? 2);
  const [supportState, setSupportState] = useState<BambuSupportState>(() => {
    if (editItem?.custom?.supportEnabled !== undefined) {
      return {
        enabled: editItem.custom.supportEnabled,
        type: editItem.custom.supportType || "tree(auto)",
        thresholdAngle: editItem.custom.supportThresholdAngle ?? 30,
        onBuildPlateOnly: editItem.custom.supportOnBuildPlateOnly ?? false,
        baseFilament: editItem.custom.supportBaseFilament || "Default",
        interfaceFilament: editItem.custom.supportInterfaceFilament || "Default",
      };
    }
    const legacy = editItem?.custom?.supports;
    const isLegacyEnabled = Boolean(legacy && legacy !== "none" && legacy !== "None");
    const legacyIsTree = (legacy || "").toLowerCase().includes("tree");
    return {
      enabled: isLegacyEnabled,
      type: legacyIsTree ? "tree(auto)" : "normal(auto)",
      thresholdAngle: 30,
      onBuildPlateOnly: false,
      baseFilament: "Default",
      interfaceFilament: "Default",
    };
  });
  const [surfaceFinish, setSurfaceFinish] = useState(() => editItem?.custom?.surfaceFinish || "standard");
  const [brim, setBrim] = useState(() => editItem?.custom?.brim || "auto");
  const [showAdvanced, setShowAdvanced] = useState(() => {
    if (!editItem?.custom) return false;
    return (
      (editItem.custom.infillPattern && editItem.custom.infillPattern !== "gyroid") ||
      (editItem.custom.wallLoops && editItem.custom.wallLoops !== 2) ||
      (editItem.custom.supportEnabled || (editItem.custom.supports && editItem.custom.supports !== "none")) ||
      (editItem.custom.surfaceFinish && editItem.custom.surfaceFinish !== "standard") ||
      (editItem.custom.brim && editItem.custom.brim !== "auto")
    );
  });
  const [color, setColor] = useState(() => editItem?.custom?.colorId || editItem?.color || "charcoal");
  const [qty, setQty] = useState(() => editItem?.qty || 1);
  const [notes, setNotes] = useState(() => editItem?.custom?.notes || "");
  const [fallback, setFallback] = useState("desk");
  const [modelRotation, setModelRotation] = useState<[number, number, number]>(
    () => editItem?.custom?.modelRotation || [0, 0, 0],
  );
  const [printabilityReport, setPrintabilityReport] = useState<PrintabilityReport | null>(null);
  const [ipWarrantyAccepted, setIpWarrantyAccepted] = useState(false);


  // Restore file from server if editing and not in client memory cache
  useEffect(() => {
    if (!editItem || file) return;
    const fid = editItem.custom?.fileId;
    if (fid) {
      setParsing(true);
      getCustomFileRecord({ data: { id: fid } })
        .then((rec) => {
          if (rec?.file_data) {
            const binary = atob(rec.file_data);
            const bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) {
              bytes[i] = binary.charCodeAt(i);
            }
            const restored = new File([bytes], rec.file_name, { type: rec.mime_type });
            setFile(restored);
            setCachedModelFile(fid, restored);
            setCachedModelFile(editItem.id, restored);
          }
        })
        .catch((err) => console.error("Could not restore custom model file:", err))
        .finally(() => setParsing(false));
    }
  }, [editItem, file]);

  // Filter filaments dynamically by selected material
  const materialFilaments = useMemo(() => {
    return filaments.filter(
      (f) => f.material_id.toLowerCase() === material.toLowerCase() && f.status !== "filament_over" && f.spool_count > 0,
    );
  }, [filaments, material]);

  // Compute available colors and dynamic colorMap
  const { availableColors, colorMap } = useMemo(() => {
    if (materialFilaments.length > 0) {
      const colors: string[] = [];
      const map: Record<string, { id: string; name: string; hex: string }> = {};
      for (const f of materialFilaments) {
        if (!colors.includes(f.color_id)) {
          colors.push(f.color_id);
          map[f.color_id] = { id: f.color_id, name: f.color_name, hex: f.color_hex };
        }
      }
      return { availableColors: colors, colorMap: map };
    }
    const defaultColors = ["charcoal", "teal", "bone", "stone"];
    const map: Record<string, { id: string; name: string; hex: string }> = {};
    for (const c of defaultColors) {
      if (COLORS[c]) {
        map[c] = { id: c, name: COLORS[c].name, hex: COLORS[c].hex };
      }
    }
    return { availableColors: defaultColors, colorMap: map };
  }, [materialFilaments]);

  useEffect(() => {
    if (availableColors.length > 0 && !availableColors.includes(color)) {
      setColor(availableColors[0]);
    }
  }, [availableColors, color]);

  const selectedColorName = colorMap[color]?.name ?? COLORS[color]?.name ?? color;
  const selectedColorHex = colorMap[color]?.hex ?? COLORS[color]?.hex ?? "#2A2E32";

  async function handleFile(next: File | null) {
    setFile(next);
    if (next) {
      setCachedModelFile(next.name, next);
      if (editItem?.id) setCachedModelFile(editItem.id, next);
    }
    setFileId(null);
    setVolume(0);
    setSolidVolume(null);
    setSurfaceArea(null);
    setSizeLabel("");
    setAutoDetected(false);
    setParsedDimensions(null);
    setParsedTriangles(0);
    setModelRotation([0, 0, 0]);
    setPrintabilityReport(null);
    if (!next) return;

    // Upload model in background so admin can open it directly in Bambu Studio
    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = e.target?.result as string;
      if (base64) {
        setUploadingFile(true);
        try {
          const res = await uploadCustomFile({
            data: {
              fileName: next.name,
              fileSize: next.size,
              mimeType: next.type || "application/octet-stream",
              fileData: base64,
              turnstileToken: turnstileToken || undefined,
            },
          });
          if (res?.fileId) {
            setFileId(res.fileId);
            setCachedModelFile(res.fileId, next);
          }
        } catch (err) {
          console.error("Failed to upload model file:", err);
        } finally {
          setUploadingFile(false);
        }
      }
    };
    reader.readAsDataURL(next);

    const ext = next.name.split(".").pop()?.toLowerCase();
    setParsing(true);
    try {
      const est = await parseModelFile(next);
      if (est && est.volumeCm3 > 0) {
        setVolume(est.volumeCm3);
        setSolidVolume(est.solidVolumeCm3 ?? est.volumeCm3);
        setSurfaceArea(est.surfaceAreaMm2 ?? null);
        if (est.isCad && !est.cadInfo?.hasMesh) {
          setAutoDetected(false);
          setSizeLabel(
            `Fusion 360 CAD Model · Direct Bambu Studio Slicing (Est. ${est.volumeCm3.toFixed(1)} cm³)`
          );
        } else {
          setAutoDetected(true);
          setParsedDimensions(est.sizeMm);
          setParsedTriangles(est.triangles);
          setSizeLabel(
            `${est.sizeMm.x.toFixed(1)} × ${est.sizeMm.y.toFixed(1)} × ${est.sizeMm.z.toFixed(1)} mm · ${est.triangles.toLocaleString("en-IN")} triangles`
          );
        }
      } else {
        setAutoDetected(false);
        toast.error("Could not calculate 3D geometry from this file. Please verify it is a valid, uncorrupted STL, 3MF, or OBJ mesh.");
        const preset =
          pricingConfig.sizePresets.find((s) => s.id === fallback) ??
          pricingConfig.sizePresets[1] ??
          pricingConfig.sizePresets[0];
        setVolume(preset.cm3);
        setSizeLabel(`Could not calculate geometry. Using ${preset.name} size preset.`);
      }
    } catch (err) {
      console.error("Model parse failed:", err);
      setAutoDetected(false);
      toast.error("Error reading 3D file. Please ensure it is a valid STL, 3MF, or OBJ mesh.");
      const preset =
        pricingConfig.sizePresets.find((s) => s.id === fallback) ??
        pricingConfig.sizePresets[1] ??
        pricingConfig.sizePresets[0];
      setVolume(preset.cm3);
      setSizeLabel(`Could not calculate geometry. Using ${preset.name} size preset.`);
    } finally {
      setParsing(false);
    }
  }

  const dynamicVolume = useMemo(() => {
    if (solidVolume && surfaceArea) {
      return estimateFdmMaterialVolumeCm3(
        solidVolume * 1000,
        surfaceArea,
        infillPct,
        wallLoops,
      );
    }
    return volume;
  }, [solidVolume, surfaceArea, infillPct, wallLoops, volume]);

  const quote = useMemo(
    () =>
      computeQuote(
        {
          volumeCm3: dynamicVolume,
          solidVolumeCm3: solidVolume ?? undefined,
          surfaceAreaMm2: surfaceArea ?? undefined,
          materialId: material,
          qualityId: quality,
          infillPercentage: infillPct,
          infillPattern,
          wallLoops,
          supports: supportState.enabled ? supportState.type : "none",
          supportEnabled: supportState.enabled,
          supportType: supportState.type,
          supportThresholdAngle: supportState.thresholdAngle,
          supportOnBuildPlateOnly: supportState.onBuildPlateOnly,
          supportBaseFilament: supportState.baseFilament,
          supportInterfaceFilament: supportState.interfaceFilament,
          surfaceFinish,
          brim,
          qty,
        },
        pricingConfig,
        "upload",
      ),
    [
      dynamicVolume,
      solidVolume,
      surfaceArea,
      material,
      quality,
      infillPct,
      infillPattern,
      wallLoops,
      supportState,
      surfaceFinish,
      brim,
      qty,
      pricingConfig,
    ],
  );

  const materialMeta = pricingConfig.materials.find((m) => m.id === material);
  const qualityMeta = pricingConfig.qualities.find((q) => q.id === quality);
  const patternMeta = INFILL_PATTERNS.find((p) => p.id === infillPattern);
  const finishMeta = SURFACE_FINISHES.find((f) => f.id === surfaceFinish);
  const supportTypeMeta = BAMBU_SUPPORT_TYPES.find((t) => t.id === supportState.type);
  const supportDisplayLabel = supportState.enabled
    ? `${supportTypeMeta?.label ?? supportState.type} · ${supportState.thresholdAngle}°${
        supportState.onBuildPlateOnly ? " · Plate only" : ""
      }${supportState.interfaceFilament !== "Default" ? ` · ${supportState.interfaceFilament}` : ""}`
    : "None";

  function addEstimate() {
    if ((!file && !editItem?.custom?.fileName) || quote.total <= 0) {
      toast.error("Upload a model first.");
      return;
    }
    if (!ipWarrantyAccepted) {
      toast.error("Please confirm intellectual property and safety compliance.");
      return;
    }
    const fileName = file ? file.name : (editItem?.custom?.fileName || "Model");
    const fileSize = file ? file.size : (editItem?.custom?.fileSize || 0);

    const customData: CustomSpec = {
      path: "upload",
      fileName,
      fileSize,
      fileId: fileId ?? editItem?.custom?.fileId ?? undefined,
      printerId: selectedPrinter?.id,
      printerName: selectedPrinter?.name,
      printerModel: selectedPrinter?.model,
      material: materialMeta?.name ?? material,
      materialId: material,
      quality: qualityMeta?.name ?? quality,
      qualityId: quality,
      infill: `${infillPct}% (${patternMeta?.name ?? "Gyroid"})`,
      infillPercentage: infillPct,
      infillPattern,
      wallLoops,
      supports: supportDisplayLabel,
      supportEnabled: supportState.enabled,
      supportType: supportState.type,
      supportThresholdAngle: supportState.thresholdAngle,
      supportOnBuildPlateOnly: supportState.onBuildPlateOnly,
      supportBaseFilament: supportState.baseFilament,
      supportInterfaceFilament: supportState.interfaceFilament,
      surfaceFinish: finishMeta?.name ?? surfaceFinish,
      brim,
      orientation:
        modelRotation[0] !== 0 || modelRotation[2] !== 0
          ? `Rotated (${Math.round((modelRotation[0] * 180) / Math.PI)}°, ${Math.round((modelRotation[2] * 180) / Math.PI)}°)`
          : "Default (As Uploaded)",
      modelRotation,
      preflightScore: printabilityReport ? `${printabilityReport.score}% (${printabilityReport.status})` : editItem?.custom?.preflightScore,
      color: selectedColorName,
      colorId: color,
      colorHex: selectedColorHex,
      dimensions: parsedDimensions
        ? `${parsedDimensions.x.toFixed(1)} × ${parsedDimensions.y.toFixed(1)} × ${parsedDimensions.z.toFixed(1)} mm`
        : editItem?.custom?.dimensions,
      dimensionsMm: parsedDimensions ?? editItem?.custom?.dimensionsMm,
      notes,
      volumeCm3: quote.volumeCm3,
      solidVolumeCm3: solidVolume ?? editItem?.custom?.solidVolumeCm3,
      surfaceAreaMm2: surfaceArea ?? editItem?.custom?.surfaceAreaMm2,
    };

    if (editItem && onUpdateItem) {
      onUpdateItem(editItem.id, {
        name: `Custom print · ${fileName}`,
        color: selectedColorName,
        unitPrice: quote.total,
        qty,
        custom: customData,
      });
      toast.success("Custom order settings updated in cart!");
      void navigate({ to: "/cart" });
      return;
    }

    add({
      kind: "custom",
      name: `Custom print · ${fileName}`,
      color: selectedColorName,
      unitPrice: quote.total,
      qty,
      custom: customData,
    });
    toast.success("Estimate added to cart");
  }

  return (
    <div className="grid gap-8 md:grid-cols-12">
      <form
        className="space-y-6 md:col-span-7"
        onSubmit={(e) => {
          e.preventDefault();
          addEstimate();
        }}
      >
        <FileDropzone
          file={file}
          onFile={handleFile}
          multiple={true}
          onFiles={(files) => {
            setProjectFiles(files);
            handleFile(files[0]);
          }}
        />

        <Turnstile
          onVerify={(tok) => setTurnstileToken(tok)}
          onExpire={() => setTurnstileToken(null)}
          onError={() => setTurnstileToken(null)}
          className="my-2 flex justify-center"
        />

        {projectFiles.length > 1 && (
          <div className="rounded-2xl border border-accent/30 bg-surface/70 p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-accent flex items-center gap-1.5">
                <Layers className="size-3.5" />
                Project Assembly Workspace ({projectFiles.length} Parts)
              </span>
              <span className="text-[11px] text-muted font-medium">Click part to configure</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {projectFiles.map((f, i) => {
                const isActive = file?.name === f.name;
                return (
                  <button
                    key={f.name + i}
                    type="button"
                    onClick={() => handleFile(f)}
                    className={`flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-medium border transition-all cursor-pointer ${
                      isActive
                        ? "border-accent bg-accent text-ink font-semibold shadow-xs"
                        : "border-border bg-surface-2 text-muted hover:border-fg/30 hover:text-fg"
                    }`}
                  >
                    <span>Part #{i + 1}: {f.name}</span>
                    <span className="text-[10px] opacity-75">({(f.size / (1024 * 1024)).toFixed(1)}MB)</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
        {uploadingFile && (
          <p className="flex items-center gap-1.5 text-xs text-accent">
            <Loader2 className="size-3.5 animate-spin" />
            Uploading 3D model to production queue…
          </p>
        )}
        {parsing && (
          <div className="flex items-center gap-2 rounded-xl bg-surface-2 p-3 text-xs text-muted animate-pulse">
            <Loader2 className="size-4 animate-spin text-accent" />
            <span>Analyzing 3D model geometry, wall boundaries, and exact volume…</span>
          </div>
        )}

        {autoDetected && parsedDimensions && (
          <div className="rounded-2xl border border-emerald-200 dark:border-emerald-500/30 bg-emerald-50/70 dark:bg-emerald-950/20 p-4 space-y-2.5 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-400 font-semibold text-sm">
                <CheckCircle2 className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <span>Model Dimensions & Volume Auto-Detected</span>
              </div>
              <span className="rounded-full bg-emerald-100 dark:bg-emerald-500/20 border border-emerald-200 dark:border-emerald-500/30 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800 dark:text-emerald-300">
                Live Slicer Measurement
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
              <div className="rounded-xl bg-white/80 dark:bg-black/40 border border-emerald-100 dark:border-white/5 p-2.5 shadow-2xs">
                <p className="text-slate-600 dark:text-white/60">Bounding Dimensions</p>
                <p className="font-mono font-semibold text-slate-900 dark:text-white mt-0.5">
                  {parsedDimensions.x.toFixed(1)} × {parsedDimensions.y.toFixed(1)} × {parsedDimensions.z.toFixed(1)} mm
                </p>
              </div>
              <div className="rounded-xl bg-white/80 dark:bg-black/40 border border-emerald-100 dark:border-white/5 p-2.5 shadow-2xs">
                <p className="text-slate-600 dark:text-white/60">Estimated Printed Volume</p>
                <p className="font-mono font-semibold text-emerald-700 dark:text-emerald-400 mt-0.5">
                  {dynamicVolume.toFixed(1)} cm³ {quote.weightGrams ? `(~${quote.weightGrams.toFixed(0)}g)` : ""}
                </p>
              </div>
              <div className="rounded-xl bg-white/80 dark:bg-black/40 border border-emerald-100 dark:border-white/5 p-2.5 col-span-2 sm:col-span-1 shadow-2xs">
                <p className="text-slate-600 dark:text-white/60">Solid CAD Volume</p>
                <p className="font-mono font-semibold text-slate-700 dark:text-white/80 mt-0.5">
                  {(solidVolume ?? volume).toFixed(1)} cm³
                </p>
              </div>
            </div>
            <p className="text-[11px] text-emerald-800/90 dark:text-emerald-300/80 pt-0.5">
              Your price is automatically calculated from your model's realistic printed filament volume (~{dynamicVolume.toFixed(1)} cm³ with {infillPct}% infill & {wallLoops} walls), saving over 50% compared to solid volume pricing.
            </p>
          </div>
        )}

        {!autoDetected && !parsing && sizeLabel && (
          <p className="text-xs text-muted">{sizeLabel}</p>
        )}

        {file && !parsing && (
          <div className="mt-5 space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold flex items-center gap-2">
                <span className="size-2 rounded-full bg-accent animate-pulse" />
                Slicer Build Plate 3D Preview
              </Label>
              <span className="text-xs text-muted">
                {selectedPrinter?.name ?? "Bambu Lab P1S"} ({selectedPrinter?.build_volume ?? "256 × 256 mm"})
              </span>
            </div>
            <ModelViewer
              file={file}
              printer={selectedPrinter}
              colorName={selectedColorName}
              colorHex={selectedColorHex}
              rotation={modelRotation}
              onRotationChange={setModelRotation}
              onReportChange={setPrintabilityReport}
              onDimensionsChange={(newDims, newVol, newSolidVol) => {
                setParsedDimensions(newDims);
                setVolume(newVol);
                if (newSolidVol !== undefined) {
                  setSolidVolume(newSolidVol);
                }
                setAutoDetected(true);
                setSizeLabel(
                  `${newDims.x.toFixed(1)} × ${newDims.y.toFixed(1)} × ${newDims.z.toFixed(1)} mm`
                );
              }}
              onColorChange={(colorId) => {
                if (availableColors.includes(colorId) || colorMap[colorId]) {
                  setColor(colorId);
                }
              }}
            />

            {/* Printability Pre-Flight Analysis & Slicer Recommendations */}
            <PrintabilityChecker
              report={printabilityReport}
              currentSettings={{
                supports: supportState.enabled ? supportState.type : "none",
                brim,
                quality,
                infillPct,
                infillPattern,
              }}
              onApplyOrientation={(rot) => {
                setModelRotation(rot);
                toast.success("Applied optimal orientation!");
              }}
              onApplyRecommendation={(rec) => {
                if (rec.category === "orientation" && rec.suggestedValue) {
                  setModelRotation(rec.suggestedValue);
                  toast.success("Applied optimal orientation!");
                } else if (rec.category === "supports") {
                  setSupportState((prev) => ({
                    ...prev,
                    enabled: true,
                    type: rec.suggestedValue === "tree" ? "tree(auto)" : "normal(auto)",
                  }));
                  setShowAdvanced(true);
                  toast.success(`Enabled ${rec.suggestedValue === "tree" ? "Tree" : "Normal"} Supports!`);
                } else if (rec.category === "brim") {
                  setBrim(rec.suggestedValue);
                  setShowAdvanced(true);
                  toast.success("Enabled Outer Brim for bed adhesion!");
                } else if (rec.category === "quality") {
                  setQuality(rec.suggestedValue);
                  toast.success(`Layer profile set to ${rec.suggestedValue}!`);
                } else if (rec.category === "infill") {
                  setInfillPct(rec.suggestedValue.infillPct);
                  setInfillPattern(rec.suggestedValue.infillPattern);
                  setWallLoops(rec.suggestedValue.wallLoops);
                  setShowAdvanced(true);
                  toast.success("Optimized infill & wall thickness!");
                }
              }}
              onApplyAllRecommendations={() => {
                if (!printabilityReport) return;
                for (const rec of printabilityReport.recommendations) {
                  if (rec.category === "orientation" && rec.suggestedValue) {
                    setModelRotation(rec.suggestedValue);
                  } else if (rec.category === "supports") {
                    setSupportState((prev) => ({
                      ...prev,
                      enabled: true,
                      type: rec.suggestedValue === "tree" ? "tree(auto)" : "normal(auto)",
                    }));
                  } else if (rec.category === "brim") {
                    setBrim(rec.suggestedValue);
                  } else if (rec.category === "quality") {
                    setQuality(rec.suggestedValue);
                  } else if (rec.category === "infill") {
                    setInfillPct(rec.suggestedValue.infillPct);
                    setInfillPattern(rec.suggestedValue.infillPattern);
                    setWallLoops(rec.suggestedValue.wallLoops);
                  }
                }
                setShowAdvanced(true);
                toast.success("All optimal slicer recommendations applied!");
              }}
            />
          </div>
        )}

        {autoDetected ? (
          <div className="rounded-xl border border-emerald-200 dark:border-emerald-500/20 bg-emerald-50/50 dark:bg-surface/80 p-3 flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="flex items-center gap-1.5 text-emerald-800 dark:text-emerald-400 font-medium">
              <span className="size-2 rounded-full bg-emerald-600 dark:bg-emerald-400 animate-pulse" />
              <span>Model dimensions active ({dynamicVolume.toFixed(1)} cm³ printed / {(solidVolume ?? volume).toFixed(1)} cm³ solid). Size presets bypassed.</span>
            </span>
            <button
              type="button"
              onClick={() => {
                setAutoDetected(false);
                const preset = pricingConfig.sizePresets.find((s) => s.id === fallback) ?? pricingConfig.sizePresets[0];
                setVolume(preset.cm3);
                toast.info(`Switched to manual ${preset.name} size preset.`);
              }}
              className="text-xs text-muted hover:text-accent underline cursor-pointer"
            >
              Manual preset override
            </button>
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between">
              <Label>{file ? "Could not auto-calculate volume — select approximate size:" : "If we can't read the file, treat it as"}</Label>
              {file && parsedDimensions && (
                <button
                  type="button"
                  onClick={() => {
                    setAutoDetected(true);
                    if (parsedDimensions) {
                      const estVol = (parsedDimensions.x * parsedDimensions.y * parsedDimensions.z * 0.28) / 1000;
                      setVolume(estVol > 0 ? estVol : 28);
                    }
                    toast.success("Restored auto-detected model dimensions!");
                  }}
                  className="text-xs text-accent hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCcw className="size-3" /> Re-apply auto-detected volume
                </button>
              )}
            </div>
            <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2.5 w-full">
              {pricingConfig.sizePresets.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    setFallback(s.id);
                    setVolume(s.cm3);
                  }}
                  className={cn(
                    "flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition-all min-h-12 leading-none",
                    fallback === s.id
                      ? "border-accent bg-accent text-ink shadow-sm font-semibold"
                      : "border-border/80 bg-surface text-muted shadow-[var(--shadow-border)] hover:border-accent/40 hover:text-fg font-medium",
                  )}
                >
                  <span className="text-xs sm:text-sm font-semibold">{s.name}</span>
                  <span className={cn("mt-1 text-[11px] leading-tight", fallback === s.id ? "opacity-80 text-ink" : "text-muted")}>
                    {s.hint} ({s.cm3} cm³)
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Printer Selection */}
        <PrinterSelector
          printers={printers}
          selectedPrinterId={selectedPrinterId}
          onSelect={setSelectedPrinterId}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          {/* Material */}
          <FieldSelect id="mat" label="Material" value={material} onChange={setMaterial}>
            {pricingConfig.materials.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </FieldSelect>

          {/* Layer Height (Bambu Lab P1S Profiles - No Multipliers) */}
          <FieldSelect id="qual" label="Layer Height & Detail" value={quality} onChange={setQuality}>
            {pricingConfig.qualities.map((q) => (
              <option key={q.id} value={q.id}>
                {q.name}
              </option>
            ))}
          </FieldSelect>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted">
          <p>{materialMeta?.note}</p>
          <Link to="/materials" className="text-xs font-medium text-accent hover:underline inline-flex items-center gap-1">
            Need help choosing? View Filament Guide &rarr;
          </Link>
        </div>
        <p className="text-sm text-muted">{qualityMeta?.note}</p>

        {/* INFILL SLIDER + NUMERIC TEXTBOX */}
        <div className="rounded-2xl border border-border bg-surface p-4 sm:p-5 space-y-3 shadow-[var(--shadow-border)]">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="infill-slider" className="text-sm font-medium">Infill Percentage</Label>
              <p className="text-xs text-muted">Internal density for strength vs. weight</p>
            </div>
            <div className="flex items-center gap-1.5">
              <input
                id="infill-number"
                type="number"
                min="5"
                max="100"
                step="1"
                value={infillPct}
                onChange={(e) => {
                  const val = Math.max(5, Math.min(100, Number(e.target.value) || 5));
                  setInfillPct(val);
                }}
                className="w-16 h-9 rounded-xl border border-border bg-surface-2 px-2.5 text-right font-medium text-sm text-fg focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent tabular-nums"
              />
              <span className="text-sm font-bold text-muted">%</span>
            </div>
          </div>

          <div className="py-1">
            <input
              id="infill-slider"
              type="range"
              min="5"
              max="100"
              step="1"
              value={infillPct}
              onChange={(e) => setInfillPct(Number(e.target.value))}
              className="w-full accent-accent h-2.5 bg-surface-2 rounded-lg cursor-pointer"
            />
          </div>

          {/* Quick Preset Buttons */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1 w-full">
            {[
              { pct: 15, label: "15% · Light" },
              { pct: 20, label: "20% · Standard" },
              { pct: 40, label: "40% · Sturdy" },
              { pct: 70, label: "70% · Heavy" },
              { pct: 100, label: "100% · Solid" },
            ].map((p, idx) => (
              <button
                key={p.pct}
                type="button"
                onClick={() => setInfillPct(p.pct)}
                className={cn(
                  "h-9 rounded-xl px-2 text-xs font-medium transition-colors flex items-center justify-center text-center leading-none border",
                  idx === 4 ? "col-span-2 sm:col-span-1" : "",
                  infillPct === p.pct
                    ? "border-accent bg-accent text-ink font-semibold"
                    : "border-border/70 bg-surface-2 text-muted hover:border-accent/60 hover:text-fg",
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* ADVANCED BAMBU STUDIO SLICER SETTINGS (COLLAPSIBLE) */}
        <div className="rounded-2xl border border-border bg-surface shadow-[var(--shadow-border)] overflow-hidden">
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="w-full flex items-center justify-between p-4 sm:p-5 text-left hover:bg-surface-2/40 transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <span className="flex size-7 items-center justify-center rounded-lg bg-accent/15 text-accent">
                <Sliders className="size-4" />
              </span>
              <div>
                <p className="font-semibold text-sm text-fg flex items-center gap-2">
                  <span>Advanced Bambu Slicer Settings</span>
                  <span className="rounded-full bg-accent/15 text-accent px-2 py-0.5 text-[10px] font-semibold">
                    Studio Tuned
                  </span>
                </p>
                <p className="text-xs text-muted mt-0.5">
                  Pattern ({patternMeta?.name}), {wallLoops} wall loops, supports ({supportState.enabled ? supportTypeMeta?.label ?? supportState.type : "None"})
                </p>
              </div>
            </div>
            <ChevronDown
              className={cn("size-4 text-muted transition-transform duration-200", showAdvanced ? "rotate-180" : "")}
            />
          </button>

          {showAdvanced && (
            <div className="p-4 sm:p-5 pt-0 space-y-4 border-t border-border/70 animate-in fade-in duration-200">
              <div className="grid gap-4 sm:grid-cols-2 pt-3">
                {/* Infill Pattern */}
                <div>
                  <Label htmlFor="infill-pattern">Infill Pattern</Label>
                  <select
                    id="infill-pattern"
                    value={infillPattern}
                    onChange={(e) => setInfillPattern(e.target.value)}
                    className="h-11 w-full rounded-xl border border-border bg-surface px-3.5 text-sm text-fg shadow-[var(--shadow-border)] focus:border-accent focus:outline-none"
                  >
                    {INFILL_PATTERNS.map((pat) => (
                      <option key={pat.id} value={pat.id}>
                        {pat.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-muted mt-1">{patternMeta?.hint}</p>
                </div>

                {/* Wall Loops (Perimeters) */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <Label htmlFor="wall-loops">Wall Loops (Shells)</Label>
                    <span className="text-xs font-semibold text-accent">{wallLoops} loops</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      id="wall-loops"
                      type="range"
                      min="2"
                      max="6"
                      step="1"
                      value={wallLoops}
                      onChange={(e) => setWallLoops(Number(e.target.value))}
                      className="w-full accent-accent h-2.5 bg-surface-2 rounded-lg cursor-pointer"
                    />
                    <input
                      type="number"
                      min="2"
                      max="6"
                      value={wallLoops}
                      onChange={(e) => setWallLoops(Math.max(2, Math.min(6, Number(e.target.value) || 2)))}
                      className="w-12 h-9 rounded-xl border border-border bg-surface-2 text-center font-medium text-xs text-fg"
                    />
                  </div>
                  <p className="text-xs text-muted mt-1">Extra walls dramatically increase side-impact strength</p>
                </div>
              </div>

              {/* Bambu Support Settings */}
              <BambuSupportSettings value={supportState} onChange={setSupportState} />

              <div className="grid gap-4 sm:grid-cols-2">
                {/* Surface Finish / Texture */}
                <div>
                  <Label htmlFor="finish">Surface Finish</Label>
                  <select
                    id="finish"
                    value={surfaceFinish}
                    onChange={(e) => setSurfaceFinish(e.target.value)}
                    className="h-11 w-full rounded-xl border border-border bg-surface px-3.5 text-sm text-fg shadow-[var(--shadow-border)] focus:border-accent focus:outline-none"
                  >
                    {SURFACE_FINISHES.map((fin) => (
                      <option key={fin.id} value={fin.id}>
                        {fin.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-muted mt-1">{finishMeta?.hint}</p>
                </div>

                {/* Brim */}
                <div>
                  <Label htmlFor="brim">Build Plate Adhesion</Label>
                  <select
                    id="brim"
                    value={brim}
                    onChange={(e) => setBrim(e.target.value)}
                    className="h-11 w-full rounded-xl border border-border bg-surface px-3.5 text-sm text-fg shadow-[var(--shadow-border)] focus:border-accent focus:outline-none"
                  >
                    {BRIM_TYPES.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-muted mt-1">Outer brim to prevent corner warp</p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between">
            <Label>Colour</Label>
            <span className="text-xs text-muted">
              {availableColors.length} {material.toUpperCase()} {availableColors.length === 1 ? "shade" : "shades"} in stock
            </span>
          </div>
          <ColorSwatches
            colors={availableColors}
            colorMap={colorMap}
            value={color}
            onChange={setColor}
          />
        </div>


        <div>
          <Label>Quantity</Label>
          <QuantityStepper value={qty} onChange={setQty} />
        </div>

        <div>
          <Label htmlFor="notes">Notes (optional)</Label>
          <Textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Orientation preference, which face should be pretty, critical hole tolerances…"
          />
        </div>

        <div className="rounded-xl border border-border/80 bg-surface-2/40 p-3 text-[11px] text-muted leading-relaxed">
          Your 3D CAD models and fabrication specifications are processed strictly for geometric slicing, volume estimation, and manufacturing. Uploaded designs are encrypted with private admin-only access and never published or shared. Read our{" "}
          <Link to="/privacy" className="text-accent underline font-medium">
            Privacy Policy
          </Link>.
        </div>

        {/* R9: Statutory IP and Non-Weapon Warranty */}
        <div className="rounded-xl border border-border/80 bg-surface-2/40 p-3.5">
          <label className="flex items-start gap-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              id="ip_warranty"
              checked={ipWarrantyAccepted}
              onChange={(e) => setIpWarrantyAccepted(e.target.checked)}
              className="mt-0.5 size-4 rounded border-border accent-accent cursor-pointer shrink-0"
            />
            <span className="text-[11px] text-fg leading-relaxed">
              I certify that I hold legal rights or license to fabricate this design, and warrant that it is <strong>not a weapon, firearm receiver/component, controlled weapon, dangerous item, or counterfeit</strong>. I accept that Prynth refuses and refunds non-compliant orders.
            </span>
          </label>
        </div>

        <Button
          type="submit"
          size="lg"
          disabled={(!file && !editItem?.custom?.fileName) || !ipWarrantyAccepted}
          className="gap-2"
        >
          {editItem ? (
            <>
              <Save className="size-4" />
              Update in cart · {formatINR(quote.total * qty)}
            </>
          ) : (
            <>
              Add estimate to cart · {quote.total > 0 ? formatINR(quote.total * qty) : ""}
            </>
          )}
        </Button>
      </form>

      <div className="md:col-span-5">
        <QuotePanel
          total={quote.total}
          print={quote.print}
          modeling={0}
          days={quote.days}
          volumeCm3={quote.volumeCm3}
          solidVolumeCm3={solidVolume ?? undefined}
          weightGrams={quote.weightGrams}
          ready={Boolean(file || editItem?.custom?.fileName) && quote.total > 0}
          specs={{
            printerName: selectedPrinter?.name,
            qualityName: qualityMeta?.name,
            infillLabel: `${infillPct}% ${patternMeta?.name ?? "Gyroid"}`,
            wallLoops,
            supports: supportState.enabled ? supportDisplayLabel : undefined,
            surfaceFinish: surfaceFinish !== "standard" ? finishMeta?.name : undefined,
            orientation:
              modelRotation[0] !== 0 || modelRotation[2] !== 0
                ? `Rotated (${Math.round((modelRotation[0] * 180) / Math.PI)}°, ${Math.round((modelRotation[2] * 180) / Math.PI)}°)`
                : undefined,
            dimensions: parsedDimensions
              ? `${parsedDimensions.x.toFixed(1)} × ${parsedDimensions.y.toFixed(1)} × ${parsedDimensions.z.toFixed(1)} mm`
              : undefined,
          }}
          fileName={file ? file.name : (editItem?.custom?.fileName || "Model")}
          material={materialMeta?.name || material}
          color={selectedColorName}
          qty={qty}
        />
      </div>
    </div>
  );
}
