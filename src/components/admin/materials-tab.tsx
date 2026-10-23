import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { formatINR } from "@/lib/format";
import { getMaterialsAdmin, createMaterial, updateMaterial, deleteMaterial, type Material, type MaterialInput } from "@/lib/materials-fns";
import { Plus, Edit2, Trash2, X, Layers, Eye, EyeOff } from "lucide-react";
import { TagInput } from "@/components/admin/tag-input";

export function MaterialsTab() {
  const queryClient = useQueryClient();
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { data: materials = [], isLoading } = useQuery({
    queryKey: ["adminMaterials"],
    queryFn: () => getMaterialsAdmin(),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await deleteMaterial({ data: { id } });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminMaterials"] });
      queryClient.invalidateQueries({ queryKey: ["materials"] });
      toast.success("Material deleted successfully");
    },
    onError: (err: any) => toast.error(err.message || "Failed to delete material")
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: number; is_active: boolean }) => {
      await updateMaterial({ data: { id, is_active } });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminMaterials"] });
      queryClient.invalidateQueries({ queryKey: ["materials"] });
      toast.success("Status updated");
    },
    onError: (err: any) => toast.error(err.message || "Failed to update status")
  });

  if (isLoading) return <div className="p-8 text-center text-muted">Loading materials...</div>;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-semibold">Materials & Filaments</h2>
          <p className="text-muted mt-1 text-sm">Manage filament offerings, technical specifications, and guide details.</p>
        </div>
        <button
          onClick={() => {
            setEditingMaterial(null);
            setIsModalOpen(true);
          }}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-ink hover:opacity-90 flex items-center gap-2 self-start sm:self-auto shadow-sm"
        >
          <Plus className="size-4" />
          <span>Add Material</span>
        </button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {materials.map((mat) => {
          const accent = mat.accent_color || "#00B8A9";
          return (
            <div
              key={mat.id}
              className={`rounded-2xl border p-6 transition-all flex flex-col justify-between ${
                mat.is_active 
                  ? "border-border bg-surface shadow-sm" 
                  : "border-border/40 bg-surface/40 opacity-75"
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span 
                      className="size-3 rounded-full shrink-0 shadow-sm" 
                      style={{ backgroundColor: accent, boxShadow: `0 0 8px ${accent}` }} 
                    />
                    <span className="font-mono text-xs font-bold uppercase tracking-wider text-muted">
                      {mat.code}
                    </span>
                    <span className="font-semibold text-fg text-base">{mat.name}</span>
                  </div>

                  <button
                    onClick={() => toggleActiveMutation.mutate({ id: mat.id, is_active: !mat.is_active })}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                      mat.is_active 
                        ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20" 
                        : "bg-muted/15 text-muted border border-border"
                    }`}
                  >
                    {mat.is_active ? <Eye className="size-3" /> : <EyeOff className="size-3" />}
                    <span>{mat.is_active ? "Active" : "Inactive"}</span>
                  </button>
                </div>

                {mat.tagline && (
                  <p className="text-xs font-medium text-accent mt-2">{mat.tagline}</p>
                )}

                <p className="text-sm text-muted mt-2 line-clamp-2">{mat.description}</p>

                <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs p-2.5 rounded-xl bg-surface-2/60 border border-border/50">
                  <div>
                    <span className="text-muted block text-[10px] uppercase">Strength</span>
                    <strong className="text-fg font-mono">{mat.durability_score}/5</strong>
                  </div>
                  <div>
                    <span className="text-muted block text-[10px] uppercase">Flexibility</span>
                    <strong className="text-fg font-mono">{mat.flexibility_score}/5</strong>
                  </div>
                  <div>
                    <span className="text-muted block text-[10px] uppercase">Print Ease</span>
                    <strong className="text-fg font-mono">{mat.print_ease_score}/5</strong>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted font-mono">
                  {mat.temp_nozzle && <span>Nozzle: {mat.temp_nozzle}</span>}
                  {mat.temp_bed && <span>Bed: {mat.temp_bed}</span>}
                  {mat.heat_resistance && <span>Heat: {mat.heat_resistance}</span>}
                </div>

                {mat.benefits && mat.benefits.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {mat.benefits.slice(0, 3).map((b, i) => (
                      <span key={i} className="text-[10px] rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 font-medium">
                        {b}
                      </span>
                    ))}
                    {mat.benefits.length > 3 && (
                      <span className="text-[10px] text-muted">+{mat.benefits.length - 3} more</span>
                    )}
                  </div>
                )}
              </div>

              <div className="mt-6 pt-3 border-t border-border flex items-center justify-between">
                <span className="text-xs text-muted font-mono">#{mat.order_index}</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setEditingMaterial(mat);
                      setIsModalOpen(true);
                    }}
                    className="text-xs px-3 py-1.5 rounded-lg bg-surface-2 hover:bg-surface-2/80 transition-colors border border-border font-medium flex items-center gap-1.5"
                  >
                    <Edit2 className="size-3" />
                    <span>Edit</span>
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Are you sure you want to delete ${mat.name}? This will remove it from the guide.`)) {
                        deleteMutation.mutate(mat.id);
                      }
                    }}
                    className="text-xs px-3 py-1.5 rounded-lg bg-danger/10 text-danger hover:bg-danger/20 transition-colors border border-danger/20 font-medium flex items-center gap-1.5"
                  >
                    <Trash2 className="size-3" />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {isModalOpen && (
        <MaterialModal
          material={editingMaterial}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </div>
  );
}

function MaterialModal({
  material,
  isOpen,
  onClose
}: {
  material: Material | null;
  isOpen: boolean;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [code, setCode] = useState(material?.code || "");
  const [name, setName] = useState(material?.name || "");
  const [tagline, setTagline] = useState(material?.tagline || "");
  const [description, setDescription] = useState(material?.description || "");
  const [tempNozzle, setTempNozzle] = useState(material?.temp_nozzle || "");
  const [tempBed, setTempBed] = useState(material?.temp_bed || "");
  const [heatResistance, setHeatResistance] = useState(material?.heat_resistance || "");
  const [durability, setDurability] = useState<number>(material?.durability_score ?? 3);
  const [flexibility, setFlexibility] = useState<number>(material?.flexibility_score ?? 2);
  const [printEase, setPrintEase] = useState<number>(material?.print_ease_score ?? 5);
  const [finishType, setFinishType] = useState(material?.finish_type || "");
  const [accentColor, setAccentColor] = useState(material?.accent_color || "#00B8A9");
  const [benefits, setBenefits] = useState<string[]>(material?.benefits || []);
  const [drawbacks, setDrawbacks] = useState<string[]>(material?.drawbacks || []);
  const [idealFor, setIdealFor] = useState<string[]>(material?.ideal_for || []);
  const [isActive, setIsActive] = useState<boolean>(material ? material.is_active : true);

  const saveMutation = useMutation({
    mutationFn: async (payload: MaterialInput) => {
      if (material) {
        await updateMaterial({ data: { id: material.id, ...payload } });
      } else {
        await createMaterial({ data: payload });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminMaterials"] });
      queryClient.invalidateQueries({ queryKey: ["materials"] });
      toast.success(material ? "Material updated!" : "Material created!");
      onClose();
    },
    onError: (err: any) => toast.error(err.message || "Failed to save material")
  });

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !name.trim() || !description.trim()) {
      toast.error("Code, Name, and Description are required.");
      return;
    }

    saveMutation.mutate({
      code: code.toLowerCase().trim(),
      name: name.trim(),
      tagline: tagline.trim() || undefined,
      description: description.trim(),
      temp_nozzle: tempNozzle.trim() || undefined,
      temp_bed: tempBed.trim() || undefined,
      heat_resistance: heatResistance.trim() || undefined,
      durability_score: durability,
      flexibility_score: flexibility,
      print_ease_score: printEase,
      finish_type: finishType.trim() || undefined,
      accent_color: accentColor.trim() || "#00B8A9",
      benefits,
      drawbacks,
      ideal_for: idealFor,
      is_active: isActive
    });
  };

  const COLOR_PRESETS = ["#00B8A9", "#3B82F6", "#F59E0B", "#EC4899", "#8B5CF6", "#10B981", "#EF4444", "#64748B"];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-surface/90 backdrop-blur-2xl border border-white/10 dark:border-white/5 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden my-auto animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between border-b border-border/50 p-4 sm:p-5 bg-surface/50 shrink-0">
          <h2 className="text-lg font-bold text-fg">
            {material ? `Edit Material: ${material.name}` : "Add New Material"}
          </h2>
          <button onClick={onClose} className="rounded-full p-2 hover:bg-surface-2 transition-colors text-muted hover:text-fg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1 space-y-5 text-sm">
          {/* Code & Name */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1.5">Code / Slug *</label>
              <input
                type="text"
                required
                placeholder="e.g. tpu"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full rounded-xl border border-border/50 bg-surface-2/50 px-3.5 py-2 text-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent font-mono uppercase"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1.5">Full Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. TPU (Thermoplastic Polyurethane)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl border border-border/50 bg-surface-2/50 px-3.5 py-2 text-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>
          </div>

          {/* Tagline */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1.5">Tagline / Hook</label>
            <input
              type="text"
              placeholder="e.g. Flexible, Rubbery & Shock-Absorbing"
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              className="w-full rounded-xl border border-border/50 bg-surface-2/50 px-3.5 py-2 text-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1.5">Overview & Description *</label>
            <textarea
              required
              rows={3}
              placeholder="Detailed description of polymer properties and printing characteristics..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-xl border border-border/50 bg-surface-2/50 px-3.5 py-2 text-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>

          {/* Thermal Specs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1.5">Nozzle Temp</label>
              <input
                type="text"
                placeholder="e.g. 210–230°C"
                value={tempNozzle}
                onChange={(e) => setTempNozzle(e.target.value)}
                className="w-full rounded-xl border border-border/50 bg-surface-2/50 px-3.5 py-2 text-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1.5">Bed Temp</label>
              <input
                type="text"
                placeholder="e.g. 40–60°C"
                value={tempBed}
                onChange={(e) => setTempBed(e.target.value)}
                className="w-full rounded-xl border border-border/50 bg-surface-2/50 px-3.5 py-2 text-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1.5">Heat Resistance</label>
              <input
                type="text"
                placeholder="e.g. 60°C (Low)"
                value={heatResistance}
                onChange={(e) => setHeatResistance(e.target.value)}
                className="w-full rounded-xl border border-border/50 bg-surface-2/50 px-3.5 py-2 text-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>
          </div>

          {/* Scores (1 to 5) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-xl border border-border/40 bg-surface-2/30">
            <div>
              <label className="block text-xs font-medium text-fg mb-1">Durability: {durability}/5</label>
              <input
                type="range"
                min={1}
                max={5}
                step={1}
                value={durability}
                onChange={(e) => setDurability(Number(e.target.value))}
                className="w-full accent-accent cursor-pointer"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-fg mb-1">Flexibility: {flexibility}/5</label>
              <input
                type="range"
                min={1}
                max={5}
                step={1}
                value={flexibility}
                onChange={(e) => setFlexibility(Number(e.target.value))}
                className="w-full accent-accent cursor-pointer"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-fg mb-1">Print Ease: {printEase}/5</label>
              <input
                type="range"
                min={1}
                max={5}
                step={1}
                value={printEase}
                onChange={(e) => setPrintEase(Number(e.target.value))}
                className="w-full accent-accent cursor-pointer"
              />
            </div>
          </div>

          {/* Finish & Accent Color */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1.5">Surface Finish</label>
              <input
                type="text"
                placeholder="e.g. Smooth Satin, Matte, Textured"
                value={finishType}
                onChange={(e) => setFinishType(e.target.value)}
                className="w-full rounded-xl border border-border/50 bg-surface-2/50 px-3.5 py-2 text-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1.5">Accent Color</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                  className="size-9 rounded-lg border border-border cursor-pointer bg-transparent"
                />
                <input
                  type="text"
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                  className="w-28 rounded-xl border border-border/50 bg-surface-2/50 px-3 py-1.5 text-xs font-mono uppercase"
                />
                <div className="flex gap-1">
                  {COLOR_PRESETS.slice(0, 4).map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setAccentColor(c)}
                      className="size-5 rounded-full border border-border"
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Benefits Tags */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1.5">Key Advantages (Benefits)</label>
            <TagInput
              tags={benefits}
              setTags={setBenefits}
              placeholder="e.g. Impact resistant, UV stable..."
            />
          </div>

          {/* Drawbacks Tags */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1.5">Considerations & Limitations</label>
            <TagInput
              tags={drawbacks}
              setTags={setDrawbacks}
              placeholder="e.g. Warps in hot sun, Requires enclosure..."
            />
          </div>

          {/* Ideal For Scenarios Tags */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1.5">Ideal For Scenarios</label>
            <TagInput
              tags={idealFor}
              setTags={setIdealFor}
              placeholder="e.g. Outdoor mounts, Phone cases..."
            />
          </div>

          {/* Active Status */}
          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="mat_active"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="size-4 rounded accent-accent cursor-pointer"
            />
            <label htmlFor="mat_active" className="text-xs font-medium cursor-pointer text-fg">
              Visible on Public Filament Guide
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border/50">
            <button
              type="button"
              onClick={onClose}
              disabled={saveMutation.isPending}
              className="px-4 py-2 rounded-xl border border-border hover:bg-surface-2 text-sm font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saveMutation.isPending}
              className="px-5 py-2 rounded-xl bg-accent text-ink font-medium text-sm hover:opacity-90 transition-opacity disabled:opacity-50 shadow-sm"
            >
              {saveMutation.isPending ? "Saving..." : material ? "Update Material" : "Create Material"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


