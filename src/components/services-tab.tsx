import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getAllServicesAdmin,
  createServiceAdmin,
  updateServiceAdmin,
  deleteServiceAdmin,
  type ServiceRecord,
  type ServiceProcessStep,
  type ServiceFAQ,
  type ServiceExample,
} from "@/lib/services-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { formatINR } from "@/lib/format";
import { toast } from "sonner";
import {
  Plus,
  Edit2,
  Trash2,
  Check,
  X,
  ExternalLink,
  Layers,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { getServiceIcon } from "@/components/services-dropdown";
import { Link, useRouter } from "@tanstack/react-router";

export function ServicesTab() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [editingService, setEditingService] = useState<Partial<ServiceRecord> | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const { data: services = [], isLoading } = useQuery({
    queryKey: ["adminServices"],
    queryFn: () => getAllServicesAdmin(),
  });

  const createMutation = useMutation({
    mutationFn: (data: Partial<ServiceRecord>) => createServiceAdmin({ data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminServices"] });
      queryClient.invalidateQueries({ queryKey: ["publicServices"] });
      router.invalidate();
      toast.success("Service created successfully!");
      setIsCreating(false);
      setEditingService(null);
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to create service.");
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: Partial<ServiceRecord> & { id: string }) =>
      updateServiceAdmin({ data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminServices"] });
      queryClient.invalidateQueries({ queryKey: ["publicServices"] });
      router.invalidate();
      toast.success("Service updated successfully!");
      setEditingService(null);
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update service.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteServiceAdmin({ data: { id } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminServices"] });
      queryClient.invalidateQueries({ queryKey: ["publicServices"] });
      router.invalidate();
      toast.success("Service deleted.");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to delete service.");
    },
  });

  const handleStartCreate = () => {
    setIsCreating(true);
    setEditingService({
      id: "",
      slug: "",
      title: "",
      tagline: "",
      short_desc: "",
      full_desc: "",
      icon: "DraftingCompass",
      badge: "",
      turnaround: "2–4 days",
      starting_price: 399,
      deliverables: ["Production-ready STEP file", "High-detail STL/3MF print file"],
      features: ["Design for Additive Manufacturing (DFAM)", "Functional assembly fit check"],
      process_steps: [
        { step: "01", title: "Project Brief", description: "Review customer specs & sketches" },
        { step: "02", title: "Parametric CAD", description: "3D CAD modeling with tolerances" },
        { step: "03", title: "Digital Preview", description: "Customer review and approval" },
        { step: "04", title: "Manufacture & Ship", description: "Bambu Lab fleet print & delivery" },
      ],
      faq: [
        { question: "What files do you deliver?", answer: "We deliver full STEP and STL/3MF files." },
      ],
      examples: [],
      is_active: true,
      sort_order: (services.length + 1),
    });
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingService) return;

    if (isCreating) {
      createMutation.mutate(editingService);
    } else if (editingService.id) {
      updateMutation.mutate(editingService as ServiceRecord);
    }
  };

  if (isLoading) {
    return <div className="p-8 text-center text-muted">Loading engineering services...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <h2 className="font-display text-2xl font-bold tracking-tight text-fg">
            Engineering &amp; Custom Services
          </h2>
          <p className="text-xs text-muted mt-1">
            Manage the engineering services displayed in the header dropdown, services hub, and dedicated service landing pages.
          </p>
        </div>
        <Button onClick={handleStartCreate} className="gap-2 cursor-pointer shrink-0">
          <Plus className="size-4" />
          <span>Add New Service</span>
        </Button>
      </div>

      {/* Editor Modal / Panel */}
      {editingService && (
        <div className="rounded-2xl border border-accent/40 bg-surface p-6 shadow-md">
          <div className="flex items-center justify-between pb-4 border-b border-border">
            <h3 className="font-display text-lg font-bold text-fg">
              {isCreating ? "Create New Engineering Service" : `Edit Service: ${editingService.title}`}
            </h3>
            <button
              type="button"
              onClick={() => {
                setEditingService(null);
                setIsCreating(false);
              }}
              className="size-7 rounded-lg text-muted hover:text-fg hover:bg-surface-2 flex items-center justify-center cursor-pointer"
            >
              <X className="size-4" />
            </button>
          </div>

          <form onSubmit={handleSave} className="mt-5 space-y-5">
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <Label htmlFor="srv-title">Service Title</Label>
                <Input
                  id="srv-title"
                  required
                  value={editingService.title || ""}
                  onChange={(e) => {
                    const title = e.target.value;
                    const slug = isCreating
                      ? title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")
                      : editingService.slug;
                    setEditingService({ ...editingService, title, slug });
                  }}
                  placeholder="e.g. Electronics Enclosure Design"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="srv-slug">URL Slug</Label>
                <Input
                  id="srv-slug"
                  required
                  value={editingService.slug || ""}
                  onChange={(e) => setEditingService({ ...editingService, slug: e.target.value })}
                  placeholder="electronics-enclosures"
                  className="mt-1"
                />
                <span className="text-[10px] text-muted">Page: /services/{editingService.slug || "slug"}</span>
              </div>

              <div>
                <Label htmlFor="srv-badge">Badge (Optional)</Label>
                <Input
                  id="srv-badge"
                  value={editingService.badge || ""}
                  onChange={(e) => setEditingService({ ...editingService, badge: e.target.value })}
                  placeholder="e.g. Popular, Fast Turnaround"
                  className="mt-1"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-4">
              <div>
                <Label htmlFor="srv-price">Starting Price (₹)</Label>
                <Input
                  id="srv-price"
                  type="number"
                  required
                  min={0}
                  value={editingService.starting_price ?? 399}
                  onChange={(e) =>
                    setEditingService({
                      ...editingService,
                      starting_price: Number(e.target.value) || 0,
                    })
                  }
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="srv-turnaround">Turnaround Guarantee</Label>
                <Input
                  id="srv-turnaround"
                  required
                  value={editingService.turnaround || "2–4 days"}
                  onChange={(e) =>
                    setEditingService({ ...editingService, turnaround: e.target.value })
                  }
                  placeholder="2–4 days"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="srv-icon">Icon</Label>
                <select
                  id="srv-icon"
                  value={editingService.icon || "DraftingCompass"}
                  onChange={(e) =>
                    setEditingService({ ...editingService, icon: e.target.value })
                  }
                  className="mt-1 h-10 w-full rounded-xl border border-border bg-surface px-3 text-sm text-fg"
                >
                  <option value="DraftingCompass">Drafting Compass (CAD/3D)</option>
                  <option value="Cpu">CPU (Electronics / IoT)</option>
                  <option value="Wrench">Wrench (Broken Parts / Repair)</option>
                  <option value="Zap">Zap (Rapid Prototyping)</option>
                  <option value="Layers">Layers (Batch Manufacturing)</option>
                  <option value="PenTool">Pen Tool (Design / Creative)</option>
                </select>
              </div>

              <div>
                <Label htmlFor="srv-sort">Sort Order</Label>
                <Input
                  id="srv-sort"
                  type="number"
                  value={editingService.sort_order ?? 0}
                  onChange={(e) =>
                    setEditingService({
                      ...editingService,
                      sort_order: parseInt(e.target.value) || 0,
                    })
                  }
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="srv-tagline">Tagline / Subtitle</Label>
              <Input
                id="srv-tagline"
                value={editingService.tagline || ""}
                onChange={(e) => setEditingService({ ...editingService, tagline: e.target.value })}
                placeholder="e.g. Custom snap-fit & screw-boss housings for IoT, PCBs & devices"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="srv-short">Short Description (Cards &amp; Dropdown)</Label>
              <Textarea
                id="srv-short"
                rows={2}
                value={editingService.short_desc || ""}
                onChange={(e) =>
                  setEditingService({ ...editingService, short_desc: e.target.value })
                }
                placeholder="Brief summary for listings..."
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="srv-full">Full Service Description (Hero &amp; Detail Page)</Label>
              <Textarea
                id="srv-full"
                rows={4}
                value={editingService.full_desc || ""}
                onChange={(e) =>
                  setEditingService({ ...editingService, full_desc: e.target.value })
                }
                placeholder="Detailed explanation of the engineering service, capabilities, and why customers choose prynth!..."
                className="mt-1"
              />
            </div>

            {/* Deliverables tags */}
            <div>
              <Label>Deliverables (One per line)</Label>
              <Textarea
                rows={3}
                value={(editingService.deliverables || []).join("\n")}
                onChange={(e) =>
                  setEditingService({
                    ...editingService,
                    deliverables: e.target.value
                      .split("\n")
                      .map((s) => s.trim())
                      .filter(Boolean),
                  })
                }
                placeholder="Production-ready STEP (.step) files&#10;Watertight STL/3MF print files&#10;2D engineering drawings"
                className="mt-1 font-mono text-xs"
              />
            </div>

            {/* Technical features tags */}
            <div>
              <Label>Technical Features &amp; Quality Standards (One per line)</Label>
              <Textarea
                rows={3}
                value={(editingService.features || []).join("\n")}
                onChange={(e) =>
                  setEditingService({
                    ...editingService,
                    features: e.target.value
                      .split("\n")
                      .map((s) => s.trim())
                      .filter(Boolean),
                  })
                }
                placeholder="Design for Additive Manufacturing (DFAM)&#10;M2/M3 brass heat-set inserts&#10;Fine layer resolution"
                className="mt-1 font-mono text-xs"
              />
            </div>

            {/* Active Toggle */}
            <div className="flex items-center gap-3 pt-2">
              <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                <input
                  type="checkbox"
                  checked={editingService.is_active ?? true}
                  onChange={(e) =>
                    setEditingService({ ...editingService, is_active: e.target.checked })
                  }
                  className="size-4 rounded border-border text-accent focus:ring-accent"
                />
                <span>Active &amp; Visible on Website</span>
              </label>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-border">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setEditingService(null);
                  setIsCreating(false);
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
                className="gap-1.5"
              >
                <Check className="size-4" />
                <span>{isCreating ? "Create Service" : "Save Changes"}</span>
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Services Table / Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {services.map((srv) => {
          const Icon = getServiceIcon(srv.icon);
          return (
            <div
              key={srv.id}
              className="flex flex-col justify-between rounded-xl border border-border bg-surface p-5 shadow-xs transition-colors hover:border-accent/40"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex size-10 items-center justify-center rounded-lg border border-border bg-surface-2 text-accent">
                    <Icon className="size-5" />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Badge className={srv.is_active ? "bg-accent/15 text-accent text-[10px]" : "bg-surface-2 text-muted text-[10px]"}>
                      {srv.is_active ? "Active" : "Hidden"}
                    </Badge>
                    <button
                      type="button"
                      onClick={() => {
                        setIsCreating(false);
                        setEditingService(srv);
                      }}
                      className="size-7 rounded-md text-muted hover:text-fg hover:bg-surface-2 flex items-center justify-center cursor-pointer"
                      title="Edit Service"
                    >
                      <Edit2 className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`Are you sure you want to delete service "${srv.title}"?`)) {
                          deleteMutation.mutate(srv.id);
                        }
                      }}
                      className="size-7 rounded-md text-muted hover:text-danger hover:bg-danger/10 flex items-center justify-center cursor-pointer"
                      title="Delete Service"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </div>

                <h3 className="font-display text-base font-bold text-fg">{srv.title}</h3>
                <p className="text-xs text-accent font-medium mt-0.5">{srv.tagline}</p>
                <p className="text-xs text-muted mt-2 line-clamp-2 leading-relaxed">
                  {srv.short_desc}
                </p>

                <div className="mt-4 flex flex-wrap gap-2 text-[11px] text-muted">
                  <span className="rounded bg-surface-2 px-2 py-0.5 border border-border">
                    From {formatINR(srv.starting_price)}
                  </span>
                  <span className="rounded bg-surface-2 px-2 py-0.5 border border-border">
                    {srv.turnaround}
                  </span>
                  <span className="rounded bg-surface-2 px-2 py-0.5 border border-border font-mono">
                    /services/{srv.slug}
                  </span>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between text-xs">
                <Link
                  to="/services/$slug"
                  params={{ slug: srv.slug }}
                  target="_blank"
                  className="inline-flex items-center gap-1 text-accent hover:underline font-medium"
                >
                  <span>Preview Page</span>
                  <ExternalLink className="size-3" />
                </Link>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setIsCreating(false);
                    setEditingService(srv);
                  }}
                  className="h-8 text-xs cursor-pointer"
                >
                  Edit Specs
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
