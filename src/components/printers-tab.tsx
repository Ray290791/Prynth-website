import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  getAllPrintersAdmin,
  createPrinter,
  updatePrinter,
  updatePrinterStatus,
  deletePrinter,
  type Printer,
  type PrinterStatus,
} from "@/lib/printers-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Printer as PrinterIcon,
  Plus,
  Pencil,
  Trash2,
  CheckCircle2,
  Clock,
  AlertTriangle,
  PowerOff,
  Sliders,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

const MODEL_PRESETS = [
  { name: "Bambu Lab P1S", volume: "256 × 256 × 256 mm", nozzle: "0.4 mm Hardened Steel" },
  { name: "Bambu Lab X1-Carbon", volume: "256 × 256 × 256 mm", nozzle: "0.4 mm Hardened Steel" },
  { name: "Bambu Lab A1", volume: "256 × 256 × 256 mm", nozzle: "0.4 mm Stainless Steel" },
  { name: "Bambu Lab A1 Mini", volume: "180 × 180 × 180 mm", nozzle: "0.4 mm Stainless Steel" },
];

export function PrintersTab() {
  const queryClient = useQueryClient();
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingPrinter, setEditingPrinter] = useState<Printer | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [model, setModel] = useState("Bambu Lab P1S");
  const [status, setStatus] = useState<PrinterStatus>("available");
  const [buildVolume, setBuildVolume] = useState("256 × 256 × 256 mm");
  const [nozzleSize, setNozzleSize] = useState("0.4 mm Hardened Steel");
  const [description, setDescription] = useState("");

  const { data: printers = [], isLoading } = useQuery({
    queryKey: ["admin-printers"],
    queryFn: () => getAllPrintersAdmin(),
  });

  const invalidatePrinters = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-printers"] });
    queryClient.invalidateQueries({ queryKey: ["printers"] });
  };

  const statusMutation = useMutation({
    mutationFn: updatePrinterStatus,
    onSuccess: () => {
      invalidatePrinters();
      toast.success("Printer status updated live!");
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to update status");
    },
  });

  const createMutation = useMutation({
    mutationFn: createPrinter,
    onSuccess: () => {
      invalidatePrinters();
      toast.success("New printer added to fleet!");
      resetForm();
      setShowAddModal(false);
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to add printer");
    },
  });

  const updateMutation = useMutation({
    mutationFn: updatePrinter,
    onSuccess: () => {
      invalidatePrinters();
      toast.success("Printer details updated!");
      setEditingPrinter(null);
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to update printer");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deletePrinter,
    onSuccess: () => {
      invalidatePrinters();
      toast.success("Printer removed from fleet");
      setDeletingId(null);
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to delete printer");
    },
  });

  function resetForm() {
    setName("");
    setModel("Bambu Lab P1S");
    setStatus("available");
    setBuildVolume("256 × 256 × 256 mm");
    setNozzleSize("0.4 mm Hardened Steel");
    setDescription("");
  }

  function openEdit(p: Printer) {
    setEditingPrinter(p);
    setName(p.name);
    setModel(p.model);
    setStatus(p.status);
    setBuildVolume(p.build_volume);
    setNozzleSize(p.nozzle_size);
    setDescription(p.description || "");
  }

  function handleModelSelect(preset: (typeof MODEL_PRESETS)[0]) {
    setModel(preset.name);
    setBuildVolume(preset.volume);
    setNozzleSize(preset.nozzle);
  }

  // Summary counts
  const totalCount = printers.length;
  const availableCount = printers.filter((p) => p.status === "available").length;
  const busyCount = printers.filter((p) => p.status === "busy").length;
  const maintenanceCount = printers.filter((p) => p.status === "maintenance" || p.status === "offline").length;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h2 className="font-display text-2xl font-semibold tracking-tight">3D Printer Fleet</h2>
          <p className="text-muted mt-1 text-sm">
            Manage your Bambu Lab printers, configure build volumes, and update live machine statuses for customer orders.
          </p>
        </div>
        <Button onClick={() => { resetForm(); setShowAddModal(true); }} className="gap-2">
          <Plus className="size-4" /> Add Printer
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-2xl border border-border bg-surface p-4 shadow-[var(--shadow-border)]">
          <p className="text-xs text-muted font-medium">Total Fleet</p>
          <p className="mt-2 text-2xl font-bold font-display">{totalCount}</p>
        </div>
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4">
          <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Available</p>
          <p className="mt-2 text-2xl font-bold font-display text-emerald-600 dark:text-emerald-400">
            {availableCount}
          </p>
        </div>
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
          <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">In Queue / Busy</p>
          <p className="mt-2 text-2xl font-bold font-display text-amber-600 dark:text-amber-400">
            {busyCount}
          </p>
        </div>
        <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-4">
          <p className="text-xs text-rose-600 dark:text-rose-400 font-medium">Maintenance / Offline</p>
          <p className="mt-2 text-2xl font-bold font-display text-rose-600 dark:text-rose-400">
            {maintenanceCount}
          </p>
        </div>
      </div>

      {/* Fleet Cards Grid */}
      {isLoading ? (
        <div className="rounded-3xl border border-border bg-surface p-12 text-center text-muted">
          Loading printer fleet…
        </div>
      ) : printers.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border bg-surface p-12 text-center">
          <PrinterIcon className="size-12 mx-auto text-muted mb-3 opacity-40" />
          <p className="font-medium">No printers in fleet</p>
          <p className="text-sm text-muted mt-1">Add your first Bambu Lab printer to start accepting custom prints.</p>
          <Button onClick={() => setShowAddModal(true)} className="mt-4 gap-2">
            <Plus className="size-4" /> Add Printer
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {printers.map((p) => {
            let statusBadge = (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                Available
              </span>
            );
            if (p.status === "busy") {
              statusBadge = (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-600 dark:text-amber-400">
                  <span className="size-2 rounded-full bg-amber-500" />
                  In Queue
                </span>
              );
            } else if (p.status === "maintenance") {
              statusBadge = (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/10 px-2.5 py-1 text-xs font-medium text-rose-600 dark:text-rose-400">
                  <span className="size-2 rounded-full bg-rose-500" />
                  Maintenance
                </span>
              );
            } else if (p.status === "offline") {
              statusBadge = (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-3 px-2.5 py-1 text-xs font-medium text-muted">
                  <span className="size-2 rounded-full bg-muted" />
                  Offline
                </span>
              );
            }

            return (
              <div
                key={p.id}
                className="rounded-3xl border border-border bg-surface p-5 shadow-[var(--shadow-border)] flex flex-col justify-between gap-4 transition-all hover:border-accent/40"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex size-11 items-center justify-center rounded-2xl bg-accent-soft text-accent">
                        <PrinterIcon className="size-5" />
                      </div>
                      <div>
                        <h3 className="font-display font-semibold text-lg text-fg">{p.name}</h3>
                        <p className="text-xs text-muted">{p.model}</p>
                      </div>
                    </div>
                    {statusBadge}
                  </div>

                  {p.description && (
                    <p className="mt-3 text-xs text-muted leading-relaxed line-clamp-2">{p.description}</p>
                  )}

                  <div className="mt-4 grid grid-cols-2 gap-2 border-t border-border/70 pt-3 text-xs">
                    <div>
                      <span className="text-muted block">Build Volume</span>
                      <span className="font-medium text-fg">{p.build_volume}</span>
                    </div>
                    <div>
                      <span className="text-muted block">Nozzle Size</span>
                      <span className="font-medium text-fg">{p.nozzle_size}</span>
                    </div>
                  </div>
                </div>

                <div className="border-t border-border/70 pt-3 flex flex-wrap items-center justify-between gap-3">
                  {/* Inline Status Changer */}
                  <div className="flex items-center gap-2">
                    <Label htmlFor={`status-${p.id}`} className="text-xs text-muted whitespace-nowrap">
                      Status:
                    </Label>
                    <select
                      id={`status-${p.id}`}
                      value={p.status}
                      disabled={statusMutation.isPending}
                      onChange={(e) =>
                        statusMutation.mutate({
                          data: { id: p.id, status: e.target.value as PrinterStatus },
                        })
                      }
                      className="h-8 rounded-lg border border-border bg-surface px-2.5 text-xs font-medium text-fg focus:border-accent focus:outline-none"
                    >
                      <option value="available">🟢 Available</option>
                      <option value="busy">🟡 In Queue / Busy</option>
                      <option value="maintenance">🔴 Maintenance</option>
                      <option value="offline">⚪ Offline</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEdit(p)}
                      className="h-8 px-2.5 text-xs text-muted hover:text-fg"
                    >
                      <Pencil className="size-3.5 mr-1" /> Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeletingId(p.id)}
                      className="h-8 px-2.5 text-xs text-rose-500 hover:bg-rose-500/10 hover:text-rose-600"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Modal */}
      {(showAddModal || editingPrinter) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-5 overflow-hidden animate-in fade-in duration-150">
          <div className="w-full max-w-lg my-auto rounded-3xl border border-border bg-surface p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200 max-h-[calc(100dvh-2.5rem)] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-display text-xl font-semibold">
                  {editingPrinter ? "Edit Printer" : "Add Printer to Fleet"}
                </h3>
                <p className="text-xs text-muted mt-0.5">
                  Configure printer hardware specifications and operational status.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowAddModal(false);
                  setEditingPrinter(null);
                }}
                className="size-8 rounded-full flex items-center justify-center text-muted hover:bg-surface-2 hover:text-fg"
              >
                ✕
              </button>
            </div>

            {/* Quick Model Presets */}
            <div>
              <Label className="text-xs text-muted mb-1.5 block">Quick Bambu Presets</Label>
              <div className="flex flex-wrap gap-1.5">
                {MODEL_PRESETS.map((preset) => (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => handleModelSelect(preset)}
                    className={cn(
                      "rounded-lg px-2.5 py-1 text-xs font-medium border transition-colors",
                      model === preset.name
                        ? "border-accent bg-accent-soft text-accent"
                        : "border-border bg-surface-2 text-muted hover:text-fg"
                    )}
                  >
                    {preset.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="printer-name">Friendly Name</Label>
                <Input
                  id="printer-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Bambu Lab P1S #3"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="printer-model">Model Series</Label>
                <Input
                  id="printer-model"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  placeholder="e.g. Bambu Lab P1S"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="printer-volume">Build Volume</Label>
                <Input
                  id="printer-volume"
                  value={buildVolume}
                  onChange={(e) => setBuildVolume(e.target.value)}
                  placeholder="256 × 256 × 256 mm"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="printer-nozzle">Nozzle Specification</Label>
                <Input
                  id="printer-nozzle"
                  value={nozzleSize}
                  onChange={(e) => setNozzleSize(e.target.value)}
                  placeholder="0.4 mm Hardened Steel"
                  className="mt-1"
                />
              </div>

              <div className="sm:col-span-2">
                <Label htmlFor="printer-status">Operational Status</Label>
                <select
                  id="printer-status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as PrinterStatus)}
                  className="mt-1 h-10 w-full rounded-xl border border-border bg-surface px-3 text-sm text-fg focus:border-accent focus:outline-none"
                >
                  <option value="available">🟢 Available (Ready to print orders)</option>
                  <option value="busy">🟡 In Queue / Busy (Accepts prints with queue delay)</option>
                  <option value="maintenance">🔴 Maintenance (Disabled on /custom)</option>
                  <option value="offline">⚪ Offline (Not operating)</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <Label htmlFor="printer-desc">Description / Notes</Label>
                <Textarea
                  id="printer-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Equipped with 4-spool AMS multi-color unit, high flow nozzle…"
                  className="mt-1"
                  rows={2}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <Button
                variant="outline"
                onClick={() => {
                  setShowAddModal(false);
                  setEditingPrinter(null);
                }}
              >
                Cancel
              </Button>
              <Button
                disabled={!name.trim() || createMutation.isPending || updateMutation.isPending}
                onClick={() => {
                  if (editingPrinter) {
                    updateMutation.mutate({
                      data: {
                        id: editingPrinter.id,
                        name: name.trim(),
                        model: model.trim(),
                        status,
                        build_volume: buildVolume.trim(),
                        nozzle_size: nozzleSize.trim(),
                        description: description.trim() || undefined,
                        order_index: editingPrinter.order_index,
                        is_active: editingPrinter.is_active,
                      },
                    });
                  } else {
                    createMutation.mutate({
                      data: {
                        name: name.trim(),
                        model: model.trim(),
                        status,
                        build_volume: buildVolume.trim(),
                        nozzle_size: nozzleSize.trim(),
                        description: description.trim() || undefined,
                        order_index: printers.length + 1,
                        is_active: true,
                      },
                    });
                  }
                }}
              >
                {editingPrinter ? "Save Changes" : "Add Printer"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-sm rounded-3xl border border-border bg-surface p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200">
            <h3 className="font-display text-lg font-semibold text-rose-500">Remove Printer?</h3>
            <p className="text-sm text-muted">
              Are you sure you want to remove this printer from the active fleet? Custom prints will no longer be assignable to it.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setDeletingId(null)}>
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                disabled={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate({ data: { id: deletingId } })}
              >
                Remove
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
