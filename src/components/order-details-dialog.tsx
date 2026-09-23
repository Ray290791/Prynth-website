import { useState } from "react";
import { toast } from "sonner";
import { formatINR, formatDate } from "@/lib/format";
import { productColor } from "@/lib/products";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
} from "lucide-react";
import type { CartItem } from "@/lib/cart-store";
import type { Address } from "@/lib/orders-store";

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
    
    // Attempt protocol launch
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
      `Support Type: ${custom.supports || "None"}`,
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
      enable_support: custom.supports && custom.supports !== "none" ? 1 : 0,
      support_type: custom.supports || "none",
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="relative w-full max-w-3xl my-8 rounded-3xl border border-border bg-surface p-6 shadow-2xl space-y-6 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-border pb-4">
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
            className="size-8 rounded-full flex items-center justify-center text-muted hover:bg-surface-2 hover:text-fg"
          >
            <X className="size-5" />
          </button>
        </div>

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

                      {/* Bambu Slicer Action Bar */}
                      <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-accent/20">
                        {custom.fileId ? (
                          <>
                            {/* Primary Button: Open in Bambu Studio */}
                            <Button
                              size="sm"
                              onClick={() => handleOpenInBambu(custom.fileId, custom.fileName)}
                              className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-sm"
                            >
                              <PrinterIcon className="size-4" />
                              Open in Bambu Studio
                            </Button>

                            {/* Secondary Button: Open in Orca */}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenInOrca(custom.fileId)}
                              className="gap-1.5 text-xs"
                            >
                              <ExternalLink className="size-3.5" />
                              Open in Orca
                            </Button>

                            {/* Download Raw 3D Model */}
                            <Button
                              asChild
                              variant="outline"
                              size="sm"
                              className="gap-1.5 text-xs"
                            >
                              <a
                                href={getModelDownloadUrl(custom.fileId)}
                                download={custom.fileName || "model.stl"}
                                target="_blank"
                                rel="noreferrer"
                              >
                                <Download className="size-3.5" />
                                Download 3D File
                              </a>
                            </Button>
                          </>
                        ) : null}

                        {/* Copy Slicer Checklist */}
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleCopySlicerSettings(item)}
                          className="gap-1.5 text-xs ml-auto"
                        >
                          {copiedSettings === item.id ? (
                            <>
                              <Check className="size-3.5 text-emerald-500" /> Copied!
                            </>
                          ) : (
                            <>
                              <Copy className="size-3.5" /> Copy Slicer Settings
                            </>
                          )}
                        </Button>

                        {/* Export Bambu Slicer JSON Preset */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleExportBambuJson(item)}
                          className="gap-1.5 text-xs"
                        >
                          <FileCode className="size-3.5" /> Preset JSON
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
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

        {/* Footer */}
        <div className="flex justify-end gap-2 border-t border-border pt-4">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
