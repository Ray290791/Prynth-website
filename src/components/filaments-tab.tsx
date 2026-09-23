import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getAllFilamentsAdmin,
  createFilament,
  updateFilament,
  updateFilamentStatus,
  updateFilamentSpools,
  deleteFilament,
  type FilamentRecord,
  type FilamentStatus,
} from "@/lib/filaments-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Disc,
  Plus,
  Edit2,
  Trash2,
  Check,
  AlertTriangle,
  Package,
  Layers,
  Search,
  Filter,
  Minus,
} from "lucide-react";
import { cn } from "@/lib/utils";

const MATERIAL_OPTIONS = [
  { id: "pla", name: "PLA (Standard)" },
  { id: "petg", name: "PETG (Functional / Durable)" },
  { id: "tpu", name: "TPU (Flexible / Elastomeric)" },
  { id: "abs", name: "ABS (Engineering)" },
];

export function FilamentsTab() {
  const queryClient = useQueryClient();
  const [editingFilament, setEditingFilament] = useState<FilamentRecord | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [selectedMaterial, setSelectedMaterial] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: filaments = [], isLoading } = useQuery({
    queryKey: ["admin", "filaments"],
    queryFn: () => getAllFilamentsAdmin(),
  });

  const createMutation = useMutation({
    mutationFn: createFilament,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "filaments"] });
      queryClient.invalidateQueries({ queryKey: ["filaments"] });
      toast.success("Filament added to inventory!");
      setIsAddOpen(false);
    },
    onError: (err: any) => toast.error(err.message || "Failed to add filament"),
  });

  const updateMutation = useMutation({
    mutationFn: updateFilament,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "filaments"] });
      queryClient.invalidateQueries({ queryKey: ["filaments"] });
      toast.success("Filament details updated!");
      setEditingFilament(null);
    },
    onError: (err: any) => toast.error(err.message || "Failed to update filament"),
  });

  const statusMutation = useMutation({
    mutationFn: updateFilamentStatus,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "filaments"] });
      queryClient.invalidateQueries({ queryKey: ["filaments"] });
      toast.success("Filament status updated!");
    },
    onError: (err: any) => toast.error(err.message || "Failed to update status"),
  });

  const spoolsMutation = useMutation({
    mutationFn: updateFilamentSpools,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "filaments"] });
      queryClient.invalidateQueries({ queryKey: ["filaments"] });
    },
    onError: (err: any) => toast.error(err.message || "Failed to update spool count"),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteFilament,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "filaments"] });
      queryClient.invalidateQueries({ queryKey: ["filaments"] });
      toast.success("Filament removed from fleet inventory");
      setDeleteConfirmId(null);
    },
    onError: (err: any) => toast.error(err.message || "Failed to delete filament"),
  });

  // Filtered filaments
  const filteredFilaments = filaments.filter((f) => {
    const matchesMaterial = selectedMaterial === "all" || f.material_id === selectedMaterial;
    const matchesSearch =
      f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.color_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (f.brand && f.brand.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesMaterial && matchesSearch;
  });

  // Inventory stats
  const totalSpools = filaments.reduce((acc, f) => acc + (f.spool_count || 0), 0);
  const inStockCount = filaments.filter((f) => f.status === "in_stock").length;
  const lowStockCount = filaments.filter((f) => f.status === "low_stock").length;
  const filamentOverCount = filaments.filter((f) => f.status === "filament_over").length;

  return (
    <div className="space-y-6">
      {/* Header with Title and Add Button */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold tracking-tight">Filament Inventory</h2>
          <p className="text-sm text-muted">
            Manage available filament materials, colors, and internal spool counts. Live stock syncs with the Custom Orders page.
          </p>
        </div>
        <Button onClick={() => setIsAddOpen(true)} className="gap-2">
          <Plus className="size-4" />
          Add Filament
        </Button>
      </div>

      {/* Inventory Overview Stat Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-2xl border border-border/80 bg-surface p-4 shadow-sm">
          <div className="flex items-center justify-between text-muted">
            <span className="text-xs font-medium uppercase tracking-wider">Total Spools</span>
            <Package className="size-4 text-accent" />
          </div>
          <p className="mt-2 font-display text-2xl font-semibold">{totalSpools}</p>
          <span className="text-xs text-muted">Private internal stock count</span>
        </div>

        <div className="rounded-2xl border border-border/80 bg-surface p-4 shadow-sm">
          <div className="flex items-center justify-between text-muted">
            <span className="text-xs font-medium uppercase tracking-wider">In Stock Colors</span>
            <span className="size-2 rounded-full bg-emerald-500" />
          </div>
          <p className="mt-2 font-display text-2xl font-semibold text-emerald-600 dark:text-emerald-400">
            {inStockCount}
          </p>
          <span className="text-xs text-muted">Active on Custom Orders page</span>
        </div>

        <div className="rounded-2xl border border-border/80 bg-surface p-4 shadow-sm">
          <div className="flex items-center justify-between text-muted">
            <span className="text-xs font-medium uppercase tracking-wider">Low Stock</span>
            <span className="size-2 rounded-full bg-amber-500" />
          </div>
          <p className="mt-2 font-display text-2xl font-semibold text-amber-600 dark:text-amber-400">
            {lowStockCount}
          </p>
          <span className="text-xs text-muted">≤ 1 spool remaining</span>
        </div>

        <div className="rounded-2xl border border-border/80 bg-surface p-4 shadow-sm">
          <div className="flex items-center justify-between text-muted">
            <span className="text-xs font-medium uppercase tracking-wider">Filament Over</span>
            <span className="size-2 rounded-full bg-rose-500" />
          </div>
          <p className="mt-2 font-display text-2xl font-semibold text-rose-600 dark:text-rose-400">
            {filamentOverCount}
          </p>
          <span className="text-xs text-muted">Hidden from customers</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          {["all", "pla", "petg", "tpu"].map((mat) => (
            <button
              key={mat}
              onClick={() => setSelectedMaterial(mat)}
              className={cn(
                "rounded-xl px-3.5 py-1.5 text-xs font-medium uppercase tracking-wider transition-colors",
                selectedMaterial === mat
                  ? "bg-accent text-ink font-semibold shadow-sm"
                  : "bg-surface-2 text-muted hover:text-fg hover:bg-surface-3"
              )}
            >
              {mat === "all" ? "All Materials" : mat}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted" />
          <Input
            placeholder="Search color or brand…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 text-xs"
          />
        </div>
      </div>

      {/* Filaments Grid / Cards */}
      {isLoading ? (
        <div className="flex h-64 items-center justify-center text-sm text-muted">
          Loading filament inventory…
        </div>
      ) : filteredFilaments.length === 0 ? (
        <div className="flex h-48 flex-col items-center justify-center rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted">
          <Disc className="mb-2 size-8 text-muted/60" />
          <p className="font-medium text-fg">No filaments found</p>
          <p className="text-xs text-muted mt-1">Try adjusting your material filter or search query.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredFilaments.map((f) => {
            const isOver = f.status === "filament_over";
            const isLow = f.status === "low_stock";

            return (
              <div
                key={f.id}
                className={cn(
                  "relative flex flex-col justify-between rounded-2xl border p-4.5 transition-all shadow-sm",
                  isOver
                    ? "border-rose-500/20 bg-surface/50 opacity-75"
                    : "border-border bg-surface hover:border-border-hover"
                )}
              >
                <div>
                  {/* Top Bar: Color Swatch + Material Badge + Actions */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="size-8 rounded-full border-2 border-white/20 shadow-inner flex-shrink-0"
                        style={{ backgroundColor: f.color_hex }}
                      />
                      <div>
                        <div className="flex items-center gap-1.5">
                          <p className="font-semibold text-sm text-fg leading-none">{f.color_name}</p>
                          <span className="font-mono text-[10px] text-muted">{f.color_hex}</span>
                        </div>
                        <p className="text-xs text-muted mt-0.5">{f.name}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setEditingFilament(f)}
                        className="p-1.5 rounded-lg text-muted hover:text-fg hover:bg-surface-2 transition-colors"
                        title="Edit filament"
                      >
                        <Edit2 className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteConfirmId(f.id)}
                        className="p-1.5 rounded-lg text-muted hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                        title="Delete filament"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Material & Brand Badges */}
                  <div className="mt-3 flex items-center gap-2">
                    <span className="rounded-md bg-surface-2 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-fg border border-border/60">
                      {f.material_id.toUpperCase()}
                    </span>
                    {f.brand && (
                      <span className="text-xs text-muted font-medium">· {f.brand}</span>
                    )}
                  </div>

                  {/* Internal Spools Counter (Owner's Eyes Only) */}
                  <div className="mt-4 flex items-center justify-between rounded-xl bg-surface-2/60 p-2.5 border border-border/40">
                    <div>
                      <span className="text-[10px] text-muted uppercase tracking-wider font-semibold block">
                        Spools In Stock
                      </span>
                      <span className="text-sm font-semibold text-fg">{f.spool_count} spools</span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => spoolsMutation.mutate({ data: { id: f.id, delta: -1 } })}
                        disabled={f.spool_count <= 0}
                        className="size-7 rounded-lg border border-border bg-surface flex items-center justify-center text-muted hover:text-fg hover:bg-surface-2 disabled:opacity-40 transition-colors"
                        title="Decrease spool count"
                      >
                        <Minus className="size-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => spoolsMutation.mutate({ data: { id: f.id, delta: 1 } })}
                        className="size-7 rounded-lg border border-border bg-surface flex items-center justify-center text-muted hover:text-fg hover:bg-surface-2 transition-colors"
                        title="Increase spool count"
                      >
                        <Plus className="size-3" />
                      </button>
                    </div>
                  </div>

                  {f.notes && (
                    <p className="mt-2 text-xs text-muted italic line-clamp-1">"{f.notes}"</p>
                  )}
                </div>

                {/* Bottom Bar: Status Selector */}
                <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between">
                  <span className="text-xs text-muted">Status</span>
                  <select
                    value={f.status}
                    onChange={(e) =>
                      statusMutation.mutate({
                        data: {
                          id: f.id,
                          status: e.target.value as FilamentStatus,
                        },
                      })
                    }
                    className={cn(
                      "text-xs font-medium rounded-lg px-2.5 py-1 border transition-colors outline-none cursor-pointer",
                      f.status === "in_stock"
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                        : f.status === "low_stock"
                          ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30"
                          : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30 font-semibold"
                    )}
                  >
                    <option value="in_stock">🟢 In Stock</option>
                    <option value="low_stock">🟡 Low Stock</option>
                    <option value="filament_over">🔴 Filament Over</option>
                  </select>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Filament Modal */}
      {(isAddOpen || editingFilament) && (
        <FilamentModal
          filament={editingFilament}
          isOpen={isAddOpen || !!editingFilament}
          onClose={() => {
            setIsAddOpen(false);
            setEditingFilament(null);
          }}
          onSave={(data) => {
            if (editingFilament) {
              updateMutation.mutate({ data: { ...data, id: editingFilament.id } });
            } else {
              createMutation.mutate({ data });
            }
          }}
          isSaving={createMutation.isPending || updateMutation.isPending}
        />
      )}

      {/* Delete Confirmation Dialog */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-surface p-6 shadow-2xl border border-border">
            <h3 className="font-display text-lg font-bold text-fg">Delete Filament?</h3>
            <p className="mt-2 text-sm text-muted">
              Are you sure you want to remove this filament from your fleet? It will no longer be selectable on the custom order page.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setDeleteConfirmId(null)}>
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={() => deleteMutation.mutate({ data: { id: deleteConfirmId } })}
                disabled={deleteMutation.isPending}
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Modal Component for Add / Edit Filament
function FilamentModal({
  filament,
  isOpen,
  onClose,
  onSave,
  isSaving,
}: {
  filament: FilamentRecord | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Omit<FilamentRecord, "id" | "created_at" | "updated_at">) => void;
  isSaving: boolean;
}) {
  const [name, setName] = useState(filament?.name || "");
  const [materialId, setMaterialId] = useState(filament?.material_id || "pla");
  const [colorId, setColorId] = useState(filament?.color_id || "");
  const [colorName, setColorName] = useState(filament?.color_name || "");
  const [colorHex, setColorHex] = useState(filament?.color_hex || "#00B8A9");
  const [spoolCount, setSpoolCount] = useState(filament?.spool_count ?? 2);
  const [status, setStatus] = useState<FilamentStatus>(filament?.status || "in_stock");
  const [brand, setBrand] = useState(filament?.brand || "Bambu Lab");
  const [notes, setNotes] = useState(filament?.notes || "");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return toast.error("Please enter a filament name.");
    if (!colorName.trim()) return toast.error("Please enter a color name.");

    // Auto-generate color_id from colorName if empty
    const slugColorId =
      colorId.trim() ||
      colorName
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "_")
        .replace(/^_+|_+$/g, "");

    onSave({
      name: name.trim(),
      material_id: materialId,
      color_id: slugColorId,
      color_name: colorName.trim(),
      color_hex: colorHex,
      spool_count: Math.max(0, spoolCount),
      status,
      brand: brand.trim() || null,
      notes: notes.trim() || null,
    });
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-3xl bg-surface p-6 sm:p-8 shadow-2xl border border-border">
        <h3 className="font-display text-xl font-bold text-fg">
          {filament ? "Edit Filament" : "Add New Filament"}
        </h3>
        <p className="text-xs text-muted mt-1">
          Configure spool stock, material category, and customer-facing color.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <Label htmlFor="fil-name">Filament Name</Label>
            <Input
              id="fil-name"
              placeholder="e.g. Bambu Matte Bone White PLA"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1.5"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="fil-material">Material</Label>
              <select
                id="fil-material"
                value={materialId}
                onChange={(e) => setMaterialId(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-border bg-surface-2 px-3 py-2 text-sm outline-none"
              >
                {MATERIAL_OPTIONS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label htmlFor="fil-brand">Brand</Label>
              <Input
                id="fil-brand"
                placeholder="e.g. Bambu Lab, eSUN"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                className="mt-1.5"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="fil-color-name">Color Name</Label>
              <Input
                id="fil-color-name"
                placeholder="e.g. Bone White"
                value={colorName}
                onChange={(e) => {
                  setColorName(e.target.value);
                  if (!filament && !colorId) {
                    setColorId(
                      e.target.value
                        .toLowerCase()
                        .replace(/[^a-z0-9]/g, "_")
                        .replace(/^_+|_+$/g, "")
                    );
                  }
                }}
                className="mt-1.5"
                required
              />
            </div>

            <div>
              <Label htmlFor="fil-hex">Color Swatch (Hex)</Label>
              <div className="mt-1.5 flex items-center gap-2">
                <input
                  type="color"
                  value={colorHex}
                  onChange={(e) => setColorHex(e.target.value)}
                  className="size-9 rounded-lg border border-border cursor-pointer bg-transparent p-0.5"
                />
                <Input
                  id="fil-hex"
                  value={colorHex}
                  onChange={(e) => setColorHex(e.target.value)}
                  className="font-mono text-xs"
                  placeholder="#00B8A9"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="fil-spools">Spools In Stock</Label>
              <Input
                id="fil-spools"
                type="number"
                min={0}
                value={spoolCount}
                onChange={(e) => setSpoolCount(parseInt(e.target.value, 10) || 0)}
                className="mt-1.5"
              />
              <span className="text-[10px] text-muted mt-1 block">Private (for your eyes only)</span>
            </div>

            <div>
              <Label htmlFor="fil-status">Live Status</Label>
              <select
                id="fil-status"
                value={status}
                onChange={(e) => setStatus(e.target.value as FilamentStatus)}
                className="mt-1.5 w-full rounded-xl border border-border bg-surface-2 px-3 py-2 text-sm outline-none"
              >
                <option value="in_stock">🟢 In Stock (Visible)</option>
                <option value="low_stock">🟡 Low Stock (Visible)</option>
                <option value="filament_over">🔴 Filament Over (Hidden from user)</option>
              </select>
            </div>
          </div>

          <div>
            <Label htmlFor="fil-notes">Internal Notes</Label>
            <Textarea
              id="fil-notes"
              placeholder="e.g. Drying required before print, 210°C nozzle / 55°C bed"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-1.5 text-xs h-20"
            />
          </div>

          <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-border">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? "Saving…" : filament ? "Save Changes" : "Add Filament"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
