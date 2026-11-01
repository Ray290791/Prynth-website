import { useState, useEffect } from "react";
import { toast } from "sonner";
import { formatINR, formatDate } from "@/lib/format";
import { productColor } from "@/lib/products";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  shipWithShiprocket,
  updateOrderTrackingAdmin,
  refundOrderAdmin,
  addOrderNoteAdmin,
  getOrderItemProductionLogsAdmin,
  saveOrderItemProductionLogAdmin,
  toggleOrderSettledAdmin,
} from "@/lib/orders-fns";
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
  RefreshCcw,
  AlertTriangle,
  ShieldCheck,
  CheckCircle2,
  History,
  RotateCcw,
  Wrench,
  MessageSquare,
} from "lucide-react";
import type { CartItem } from "@/lib/cart-store";
import type { Address } from "@/lib/orders-store";
import { getAdminModelDownloadUrl } from "@/lib/custom-files-fns";
import {
  generateLithophaneMeshData,
  buildLithophaneBambu3mf,
  buildLithophaneStl,
} from "@/lib/lithophane-export";

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Detect if a cart item is a lithophane order */
function isLithophaneItem(item: CartItem): boolean {
  const n = item.name?.toLowerCase() ?? "";
  const notes = item.custom?.notes?.toLowerCase() ?? "";
  return n.includes("lithophane") || notes.includes("shape:") || notes.includes("lithophane");
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

  // ── Shipping states (Manual courier + Shiprocket API) ──────────────────────
  const [showManualForm, setShowManualForm] = useState(false);
  const [manualTrackingNo, setManualTrackingNo] = useState(order.tracking_number || "");
  const [manualCourier, setManualCourier] = useState(order.courier_name || "Delhivery");
  const [manualMarkShipped, setManualMarkShipped] = useState(true);

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

  const manualTrackingMutation = useMutation({
    mutationFn: () =>
      updateOrderTrackingAdmin({
        data: {
          order_number: order.order_number,
          tracking_number: manualTrackingNo.trim(),
          courier_name: manualCourier.trim(),
          mark_as_shipped: manualMarkShipped,
        },
      }),
    onSuccess: (res) => {
      setSrResult({
        awb_code: res.tracking_number,
        courier_name: res.courier_name || "",
        tracking_url: res.tracking_url || "",
      });
      setShowManualForm(false);
      toast.success("Tracking number updated successfully!");
      queryClient.invalidateQueries({ queryKey: ["adminOrders"] });
      order.tracking_number = res.tracking_number;
      order.courier_name = res.courier_name || "";
      order.tracking_url = res.tracking_url || "";
      if (manualMarkShipped) order.status = "shipped";
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to save tracking number");
    },
  });

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
      toast.success(`Shiprocket AWB: ${res.awb_code || "assigned"}`);
      queryClient.invalidateQueries({ queryKey: ["adminOrders"] });
      order.status = "shipped";
      order.tracking_number = res.awb_code;
      order.tracking_url = res.tracking_url;
      order.courier_name = res.courier_name;
    },
    onError: (err: any) => {
      toast.error(
        err?.message?.includes("credentials")
          ? "Shiprocket credentials not configured yet. Use Manual Tracking below or add credentials in Site Settings."
          : err?.message || "Failed to create Shiprocket shipment."
      );
    },
  });

  // ── Interim Selling Phase: Production Logs (D2) ───────────────────────────
  const { data: productionLogs = [], refetch: refetchProdLogs } = useQuery({
    queryKey: ["orderProdLogs", order.id],
    queryFn: () => getOrderItemProductionLogsAdmin({ data: order.id }),
    staleTime: 30_000,
  });

  const saveProdLogMutation = useMutation({
    mutationFn: (data: any) => saveOrderItemProductionLogAdmin({ data }),
    onSuccess: () => {
      refetchProdLogs();
      toast.success("Production log saved!");
    },
    onError: (err: any) => toast.error(err?.message || "Failed to save production log"),
  });

  // ── Interim Selling Phase: Refunds & Notes Timeline (D3) ───────────────────
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [refundAmount, setRefundAmount] = useState("");
  const [refundReason, setRefundReason] = useState("");
  const [refundCategory, setRefundCategory] = useState<"defect" | "delay" | "transit_damage" | "cancellation" | "other">("cancellation");

  const refundMutation = useMutation({
    mutationFn: (data: { order_id: number; amount_inr: number; reason: string; category?: any }) =>
      refundOrderAdmin({ data }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["adminOrders"] });
      queryClient.invalidateQueries({ queryKey: ["launchLedgerAdmin"] });
      toast.success(`Refund of ₹${res.refundedAmount} processed successfully!`);
      order.refund_amount = res.totalRefunded;
      if (res.isFullRefund) order.payment_status = "refunded";
      setShowRefundModal(false);
      setRefundAmount("");
      setRefundReason("");
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to process refund");
    },
  });

  const [noteText, setNoteText] = useState("");
  const [noteCategory, setNoteCategory] = useState<"defect" | "delay" | "transit_damage" | "general">("general");

  const addNoteMutation = useMutation({
    mutationFn: (data: { order_id: number; category: any; note: string }) =>
      addOrderNoteAdmin({ data }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["adminOrders"] });
      toast.success("Timeline note logged!");
      const current = Array.isArray(order.notes_timeline) ? order.notes_timeline : [];
      order.notes_timeline = [...current, res.note];
      setNoteText("");
    },
    onError: (err: any) => toast.error(err?.message || "Failed to add note"),
  });

  // ── Interim Selling Phase: Settlement & Actual Courier (D1) ────────────────
  const [actualCourierCost, setActualCourierCost] = useState(
    order.courier_actual_cost != null ? String(order.courier_actual_cost) : (order.shipping ? String(order.shipping) : "0")
  );

  const settleMutation = useMutation({
    mutationFn: (data: { order_id: number; settled: boolean; courier_actual_cost?: number }) =>
      toggleOrderSettledAdmin({ data }),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["adminOrders"] });
      queryClient.invalidateQueries({ queryKey: ["launchLedgerAdmin"] });
      order.settled = vars.settled;
      if (vars.courier_actual_cost != null) order.courier_actual_cost = vars.courier_actual_cost;
      toast.success(vars.settled ? "Order marked as settled in Launch Ledger!" : "Order unmarked as settled");
    },
    onError: (err: any) => toast.error(err?.message || "Failed to update settlement"),
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

  async function handleOpenInBambu(fileId?: string, fileName?: string) {
    if (!fileId) {
      toast.error("No uploaded 3D model file ID attached to this custom order.");
      return;
    }
    let fullUrl = getModelDownloadUrl(fileId);
    try {
      const res = await getAdminModelDownloadUrl({ data: { fileId } });
      if (res?.token) {
        fullUrl += `?token=${encodeURIComponent(res.token)}`;
      }
    } catch (e) {
      console.warn("Could not generate slicer token:", e);
    }
    const bambuUri = `bambustudio://open?file=${encodeURIComponent(fullUrl)}`;
    window.location.href = bambuUri;
    toast.success(`Launching Bambu Studio for ${fileName || "model"}…`);
  }

  async function handleOpenInOrca(fileId?: string) {
    if (!fileId) {
      toast.error("No uploaded 3D model file ID attached.");
      return;
    }
    let fullUrl = getModelDownloadUrl(fileId);
    try {
      const res = await getAdminModelDownloadUrl({ data: { fileId } });
      if (res?.token) {
        fullUrl += `?token=${encodeURIComponent(res.token)}`;
      }
    } catch (e) {
      console.warn("Could not generate slicer token:", e);
    }
    window.location.href = `orcaslicer://open?file=${encodeURIComponent(fullUrl)}`;
    toast.success("Launching Orca Slicer…");
  }

  /** Download a .3mf Bambu Studio project containing the real 3D lithophane model & print settings */
  async function handleDownloadBambu3mf(item: CartItem) {
    const photos = item.custom?.referencePhotos ?? [];
    const photo = photos[0] ?? "";

    if (!photo || photo.startsWith("[")) {
      toast.error("Customer photo unavailable for this older order (it was cleaned up earlier to save space). Please re-open the lithophane page with the original photo to generate the 3MF.");
      return;
    }

    const sizeMatch = item.size?.match(/(\d+)\s*[×x]\s*(\d+)/);
    const wMm = sizeMatch ? parseInt(sizeMatch[1]) : 150;
    const hMm = sizeMatch ? parseInt(sizeMatch[2]) : 100;
    const notesLower = (item.custom?.notes ?? "").toLowerCase();
    const shape: "flat" | "heart" | "curved" = notesLower.includes("heart")
      ? "heart"
      : notesLower.includes("curved") || notesLower.includes("arc")
      ? "curved"
      : "flat";

    const toastId = toast.loading("Generating full 3D model and Bambu Studio .3mf project…");
    try {
      const mesh = await generateLithophaneMeshData(photo, wMm, hMm, shape);
      if (!mesh) {
        toast.dismiss(toastId);
        toast.error("Could not generate 3D model from photo.");
        return;
      }

      const blob = buildLithophaneBambu3mf(order.order_number, item.name, mesh);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `prynth-lithophane-${order.order_number}.3mf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.dismiss(toastId);
      toast.success("Bambu Studio .3mf downloaded with full 3D model & 0.12mm lithophane profile!");
    } catch (err) {
      toast.dismiss(toastId);
      toast.error("Failed to generate .3mf file.");
      console.error(err);
    }
  }

  /** Download the lithophane as a binary STL generated from the reference photo */
  async function handleDownloadLithophaneStl(item: CartItem) {
    const photos = item.custom?.referencePhotos ?? [];
    const photo = photos[0] ?? "";

    if (!photo || photo.startsWith("[")) {
      toast.error("Customer photo unavailable for this older order (it was cleaned up earlier to save space). Please re-open the lithophane page with the original photo to generate the STL.");
      return;
    }

    // Parse dimensions from item.size e.g. "150 × 100 mm (Standard)"
    const sizeMatch = item.size?.match(/(\d+)\s*[×x]\s*(\d+)/);
    const wMm = sizeMatch ? parseInt(sizeMatch[1]) : 150;
    const hMm = sizeMatch ? parseInt(sizeMatch[2]) : 100;
    const notesLower = (item.custom?.notes ?? "").toLowerCase();
    const shape: "flat" | "heart" | "curved" = notesLower.includes("heart")
      ? "heart"
      : notesLower.includes("curved") || notesLower.includes("arc")
      ? "curved"
      : "flat";

    const toastId = toast.loading("Generating STL from photo…");
    try {
      const mesh = await generateLithophaneMeshData(photo, wMm, hMm, shape);
      if (!mesh) {
        toast.dismiss(toastId);
        toast.error("Could not generate STL — photo unavailable.");
        return;
      }
      const stlBuffer = buildLithophaneStl(wMm, hMm, mesh);
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
                        : order.status.startsWith("refused")
                          ? "bg-destructive text-destructive-foreground font-semibold"
                          : "bg-surface-2 border text-fg"
                }
              >
                {order.status.replace(/^refused_/, "Refused: ").replace(/_/g, " ")}
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
                <option value="refused_prohibited_item">Refused: Prohibited Item / Weapons</option>
                <option value="refused_ip_infringement">Refused: IP / Copyright Violation</option>
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
                <span className="text-sm font-semibold text-fg">Logistics & Tracking</span>
              </div>
              {srResult?.awb_code ? (
                <div className="flex items-center gap-2">
                  <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-xs">
                    Dispatched / AWB
                  </Badge>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-xs h-7 px-2"
                    onClick={() => {
                      setShowManualForm(true);
                      setShowShiprocketForm(false);
                    }}
                  >
                    Edit
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  {!showManualForm && !showShiprocketForm && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs h-7 px-2.5 cursor-pointer"
                        onClick={() => {
                          setShowManualForm(true);
                          setShowShiprocketForm(false);
                        }}
                      >
                        + Manual Tracking
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-xs h-7 px-2 text-muted hover:text-fg cursor-pointer"
                        onClick={() => {
                          setShowShiprocketForm(true);
                          setShowManualForm(false);
                        }}
                      >
                        Shiprocket API
                      </Button>
                    </>
                  )}
                </div>
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
              ) : showManualForm ? (
                <div className="space-y-3 text-xs">
                  <p className="text-muted text-[11px]">
                    Manually enter the tracking or consignment number from your courier receipt (Bluedart, Delhivery, DTDC, India Post).
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label htmlFor="m-courier" className="text-xs">Courier Service</Label>
                      <Input
                        id="m-courier"
                        value={manualCourier}
                        onChange={(e) => setManualCourier(e.target.value)}
                        placeholder="e.g. Delhivery, Bluedart"
                        className="h-8 text-xs mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="m-awb" className="text-xs">Tracking / AWB Number *</Label>
                      <Input
                        id="m-awb"
                        value={manualTrackingNo}
                        onChange={(e) => setManualTrackingNo(e.target.value)}
                        placeholder="e.g. 1294819284"
                        className="h-8 text-xs mt-1 font-mono"
                      />
                    </div>
                  </div>
                  <label className="flex items-center gap-2 text-xs cursor-pointer pt-1">
                    <input
                      type="checkbox"
                      checked={manualMarkShipped}
                      onChange={(e) => setManualMarkShipped(e.target.checked)}
                      className="size-3.5 rounded border-border text-accent focus:ring-accent"
                    />
                    <span>Mark order as Shipped & email customer</span>
                  </label>
                  <div className="flex gap-2 pt-1">
                    <Button
                      size="sm"
                      className="text-xs h-8 flex-1 bg-accent text-ink hover:opacity-90 font-semibold"
                      onClick={() => manualTrackingMutation.mutate()}
                      disabled={manualTrackingMutation.isPending || !manualTrackingNo.trim()}
                    >
                      {manualTrackingMutation.isPending ? "Saving…" : "Save Tracking Info"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs h-8"
                      onClick={() => setShowManualForm(false)}
                      disabled={manualTrackingMutation.isPending}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : showShiprocketForm ? (
                <div className="space-y-3 text-xs">
                  <p className="text-muted text-[11px]">
                    Enter parcel dimensions to automatically book courier and generate AWB via Shiprocket API.
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
                <div className="space-y-1.5 py-1">
                  <p className="text-xs text-muted">
                    No courier tracking assigned yet.
                  </p>
                  <p className="text-[11px] text-muted/80">
                    Click <strong className="text-fg font-medium">+ Manual Tracking</strong> to enter any courier's AWB number, or use Shiprocket API when configured.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* INTERIM PHASE D2: Machine-Time & Production Logs */}
          <div className="border border-border rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between bg-surface-2/60 px-4 py-3">
              <div className="flex items-center gap-2">
                <PrinterIcon className="size-4 text-accent" />
                <span className="text-sm font-semibold text-fg">Machine-Time &amp; Production Logs (D2)</span>
              </div>
              <span className="text-[11px] text-muted">Admin internal records</span>
            </div>
            <div className="p-4 space-y-4">
              <p className="text-xs text-muted leading-relaxed">
                Log printer minutes, filament usage, and QC verification for each item to calculate machine wear and partner revenue shares.
              </p>
              <div className="space-y-3">
                {items.map((item, idx) => {
                  const existingLog = (productionLogs || []).find((l: any) => l.item_index === idx) || {};
                  return (
                    <div key={idx} className="p-3 rounded-xl border border-border bg-surface-2/30 space-y-2.5 text-xs">
                      <div className="flex items-center justify-between font-semibold text-fg">
                        <span>Item #{idx + 1}: {item.name} ({item.qty}x)</span>
                        {existingLog.qc_passed && (
                          <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px]">
                            QC Passed
                          </Badge>
                        )}
                      </div>
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          const fd = new FormData(e.currentTarget);
                          saveProdLogMutation.mutate({
                            order_id: order.id,
                            item_index: idx,
                            item_name: item.name,
                            printer_label: (fd.get("printer_label") as string)?.trim(),
                            print_minutes: parseInt(fd.get("print_minutes") as string, 10) || 0,
                            filament_grams: parseInt(fd.get("filament_grams") as string, 10) || 0,
                            printed_by: (fd.get("printed_by") as string)?.trim(),
                            qc_passed: fd.get("qc_passed") === "on",
                            notes: (fd.get("notes") as string)?.trim(),
                          });
                        }}
                        className="space-y-2"
                      >
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          <div>
                            <Label className="text-[10px] text-muted">Printer Label</Label>
                            <Input
                              name="printer_label"
                              defaultValue={existingLog.printer_label || "Bambu Lab"}
                              placeholder="e.g. Bambu X1C #1"
                              className="h-7 text-xs mt-0.5"
                            />
                          </div>
                          <div>
                            <Label className="text-[10px] text-muted">Print Minutes</Label>
                            <Input
                              name="print_minutes"
                              type="number"
                              defaultValue={existingLog.print_minutes ?? 120}
                              className="h-7 text-xs mt-0.5 font-mono"
                            />
                          </div>
                          <div>
                            <Label className="text-[10px] text-muted">Filament (Grams)</Label>
                            <Input
                              name="filament_grams"
                              type="number"
                              defaultValue={existingLog.filament_grams ?? 60}
                              className="h-7 text-xs mt-0.5 font-mono"
                            />
                          </div>
                          <div>
                            <Label className="text-[10px] text-muted">Operator / Maker</Label>
                            <Input
                              name="printed_by"
                              defaultValue={existingLog.printed_by || ""}
                              placeholder="Founder"
                              className="h-7 text-xs mt-0.5"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
                          <div className="sm:col-span-2">
                            <Input
                              name="notes"
                              defaultValue={existingLog.notes || ""}
                              placeholder="Production notes (layer lines, bed temp, cooling)..."
                              className="h-7 text-xs"
                            />
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <label className="flex items-center gap-1.5 cursor-pointer text-xs">
                              <input
                                type="checkbox"
                                name="qc_passed"
                                defaultChecked={existingLog.qc_passed ?? true}
                                className="size-3.5 rounded border-border text-accent"
                              />
                              <span className="font-medium text-[11px]">QC Pass</span>
                            </label>
                            <Button
                              type="submit"
                              size="sm"
                              disabled={saveProdLogMutation.isPending}
                              className="h-7 text-xs px-3 bg-surface hover:bg-surface-2 border border-border text-fg font-semibold cursor-pointer"
                            >
                              Save Log
                            </Button>
                          </div>
                        </div>
                      </form>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* INTERIM PHASE D3: Issue Handling, Refunds & Timeline Notes */}
          <div className="border border-border rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between bg-surface-2/60 px-4 py-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="size-4 text-accent" />
                <span className="text-sm font-semibold text-fg">Issue Handling &amp; Refunds (D3)</span>
              </div>
              <div className="flex items-center gap-2">
                {Number(order.refund_amount) > 0 && (
                  <Badge className="bg-danger/10 text-danger border border-danger/30 text-xs font-mono">
                    Refunded: {formatINR(order.refund_amount)}
                  </Badge>
                )}
                {Number(order.total) > Number(order.refund_amount || 0) && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setRefundAmount(String(Number(order.total) - Number(order.refund_amount || 0)));
                      setShowRefundModal(true);
                    }}
                    className="text-xs h-7 px-2.5 text-danger border-danger/30 hover:bg-danger/10 cursor-pointer"
                  >
                    <RotateCcw className="size-3 mr-1" /> Issue Refund
                  </Button>
                )}
              </div>
            </div>
            <div className="p-4 space-y-4">
              {/* Notes Timeline History */}
              <div className="space-y-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted flex items-center gap-1.5">
                  <History className="size-3.5" /> Order Notes Timeline
                </h4>
                {Array.isArray(order.notes_timeline) && order.notes_timeline.length > 0 ? (
                  <div className="space-y-2">
                    {order.notes_timeline.map((item: any, nIdx: number) => (
                      <div key={nIdx} className="p-2.5 rounded-lg border border-border bg-surface-2/30 text-xs flex flex-col gap-1">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold capitalize text-fg flex items-center gap-1.5">
                            <span className="size-1.5 rounded-full bg-accent" />
                            {item.category?.replace("_", " ") || "Note"}
                          </span>
                          <span className="text-[10px] text-muted">
                            {item.created_at ? new Date(item.created_at).toLocaleString() : ""} by {item.created_by || "Admin"}
                          </span>
                        </div>
                        <p className="text-muted leading-relaxed">{item.note}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted italic">No timeline notes recorded yet.</p>
                )}
              </div>

              {/* Add Note Form */}
              <div className="pt-2 border-t border-border flex flex-col sm:flex-row gap-2">
                <select
                  value={noteCategory}
                  onChange={(e) => setNoteCategory(e.target.value as any)}
                  className="rounded-lg border border-border bg-surface p-1.5 text-xs text-fg h-8"
                >
                  <option value="general">General Note</option>
                  <option value="defect">Print Defect</option>
                  <option value="delay">Workshop Delay</option>
                  <option value="transit_damage">Transit Damage</option>
                </select>
                <Input
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="Log defect, reprint status, customer inquiry, or delay notes..."
                  className="h-8 text-xs flex-1"
                />
                <Button
                  size="sm"
                  onClick={() => {
                    if (!noteText.trim()) return;
                    addNoteMutation.mutate({
                      order_id: order.id,
                      category: noteCategory,
                      note: noteText.trim(),
                    });
                  }}
                  disabled={addNoteMutation.isPending || !noteText.trim()}
                  className="h-8 text-xs px-3 font-semibold cursor-pointer shrink-0"
                >
                  Log Note
                </Button>
              </div>
            </div>
          </div>

          {/* INTERIM PHASE D1: Launch Ledger Settlement */}
          <div className="border border-border rounded-2xl p-4 bg-surface-2/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-fg flex items-center gap-1.5">
                  <CheckCircle2 className="size-4 text-accent" /> Launch Ledger Settlement Gate (D1)
                </span>
                {order.settled ? (
                  <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-[10px]">
                    Settled in Raw Profit
                  </Badge>
                ) : (
                  <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 text-[10px]">
                    Unsettled (Pending)
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted max-w-md">
                Only settled orders are counted towards the ₹10,000 profit target. Mark as settled when parcel is delivered and money is in your bank.
              </p>
            </div>

            <div className="flex items-center gap-3 self-end sm:self-auto">
              <div>
                <Label className="text-[10px] text-muted block mb-0.5">Actual Courier Cost (₹)</Label>
                <Input
                  type="number"
                  value={actualCourierCost}
                  onChange={(e) => setActualCourierCost(e.target.value)}
                  className="h-8 w-24 text-xs font-mono"
                  placeholder="79"
                />
              </div>
              <Button
                size="sm"
                onClick={() => {
                  settleMutation.mutate({
                    order_id: order.id,
                    settled: !order.settled,
                    courier_actual_cost: parseFloat(actualCourierCost) || 0,
                  });
                }}
                disabled={settleMutation.isPending}
                className={cn(
                  "h-8 text-xs font-semibold px-4 cursor-pointer mt-3 sm:mt-4",
                  order.settled
                    ? "bg-surface hover:bg-surface-2 border border-border text-fg"
                    : "bg-emerald-600 hover:bg-emerald-700 text-white"
                )}
              >
                {order.settled ? "Unsettle" : "Mark as Settled"}
              </Button>
            </div>
          </div>

          {/* Refund Modal */}
          {showRefundModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
              <div className="relative w-full max-w-sm rounded-2xl border border-border bg-surface p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200">
                <div className="flex items-center gap-2.5">
                  <RotateCcw className="size-5 text-danger" />
                  <h3 className="text-base font-bold text-fg">Process Order Refund</h3>
                </div>
                <p className="text-xs text-muted leading-relaxed">
                  Calls Razorpay Refunds API, updates order status, emails customer, and logs to audit ledger.
                </p>

                <div className="space-y-3">
                  <div>
                    <Label className="text-xs">Refund Category *</Label>
                    <select
                      value={refundCategory}
                      onChange={(e) => setRefundCategory(e.target.value as any)}
                      className="w-full rounded-lg border border-border bg-surface-2 p-2 text-xs mt-1"
                    >
                      <option value="cancellation">Customer Cancellation</option>
                      <option value="defect">Print Defect / Quality Issue</option>
                      <option value="transit_damage">Damaged in Transit</option>
                      <option value="delay">Excessive Delay</option>
                      <option value="other">Other Reason</option>
                    </select>
                  </div>

                  <div>
                    <Label className="text-xs">Refund Amount (₹) *</Label>
                    <Input
                      type="number"
                      max={Number(order.total) - Number(order.refund_amount || 0)}
                      value={refundAmount}
                      onChange={(e) => setRefundAmount(e.target.value)}
                      placeholder="Amount to refund in INR"
                      className="h-8 text-xs mt-1 font-mono"
                    />
                    <p className="text-[10px] text-muted mt-0.5">
                      Max refundable: {formatINR(Number(order.total) - Number(order.refund_amount || 0))}
                    </p>
                  </div>

                  <div>
                    <Label className="text-xs">Reason for Refund *</Label>
                    <Input
                      value={refundReason}
                      onChange={(e) => setRefundReason(e.target.value)}
                      placeholder="e.g. Broken in transit, customer requested cancellation"
                      className="h-8 text-xs mt-1"
                    />
                  </div>
                </div>

                <div className="flex gap-2 justify-end pt-3 border-t border-border">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowRefundModal(false)}
                    className="text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      const amt = parseFloat(refundAmount);
                      if (!refundReason.trim() || isNaN(amt) || amt <= 0) {
                        toast.error("Please enter a valid amount and reason");
                        return;
                      }
                      refundMutation.mutate({
                        order_id: order.id,
                        amount_inr: amt,
                        reason: refundReason.trim(),
                        category: refundCategory,
                      });
                    }}
                    disabled={refundMutation.isPending || !refundReason.trim() || !refundAmount}
                    className="text-xs bg-danger hover:bg-danger/90 text-white font-semibold cursor-pointer"
                  >
                    {refundMutation.isPending ? "Refunding..." : "Confirm Refund"}
                  </Button>
                </div>
              </div>
            </div>
          )}

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
