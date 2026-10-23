import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Image as ImageIcon,
  Plus,
  Pencil,
  Trash2,
  Upload,
  Eye,
  EyeOff,
  Layers,
  Sparkles,
  Link as LinkIcon,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  getGalleryAdmin,
  createGalleryItem,
  updateGalleryItem,
  deleteGalleryItem,
  type GalleryItem,
} from "@/lib/gallery-fns";

export function GalleryTab() {
  const queryClient = useQueryClient();
  const [editingItem, setEditingItem] = useState<GalleryItem | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  // Form states
  const [title, setTitle] = useState("");
  const [caption, setCaption] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [material, setMaterial] = useState("Bambu Matte PLA");
  const [tag, setTag] = useState("Functional Print");
  const [isFeatured, setIsFeatured] = useState(true);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["galleryAdmin"],
    queryFn: () => getGalleryAdmin(),
  });

  const resetForm = () => {
    setTitle("");
    setCaption("");
    setImageUrl("");
    setMaterial("Bambu Matte PLA");
    setTag("Functional Print");
    setIsFeatured(true);
    setEditingItem(null);
    setIsAdding(false);
  };

  const startEdit = (item: GalleryItem) => {
    setEditingItem(item);
    setTitle(item.title);
    setCaption(item.caption || "");
    setImageUrl(item.image_url || "");
    setMaterial(item.material || "Bambu Matte PLA");
    setTag(item.tag || "Functional Print");
    setIsFeatured(item.is_featured);
    setIsAdding(true);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      toast.error("File size must be under 8MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setImageUrl(result);
      toast.success("Image loaded into preview");
    };
    reader.readAsDataURL(file);
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      await createGalleryItem({
        data: {
          title,
          caption,
          image_url: imageUrl,
          material,
          tag,
          is_featured: isFeatured,
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["galleryAdmin"] });
      queryClient.invalidateQueries({ queryKey: ["galleryItems"] });
      toast.success("Showcase item published!");
      resetForm();
    },
    onError: (err: any) => toast.error(err.message || "Failed to add showcase item"),
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!editingItem) return;
      await updateGalleryItem({
        data: {
          id: editingItem.id,
          title,
          caption,
          image_url: imageUrl,
          material,
          tag,
          is_featured: isFeatured,
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["galleryAdmin"] });
      queryClient.invalidateQueries({ queryKey: ["galleryItems"] });
      toast.success("Showcase item updated!");
      resetForm();
    },
    onError: (err: any) => toast.error(err.message || "Failed to update showcase item"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await deleteGalleryItem({ data: { id } });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["galleryAdmin"] });
      queryClient.invalidateQueries({ queryKey: ["galleryItems"] });
      toast.success("Showcase item deleted");
    },
    onError: (err: any) => toast.error(err.message || "Failed to delete showcase item"),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }
    if (editingItem) {
      updateMutation.mutate();
    } else {
      createMutation.mutate();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-xl sm:text-2xl font-bold tracking-tight">
            Print Quality Showcase & Gallery Editor
          </h2>
          <p className="text-xs sm:text-sm text-muted mt-1">
            Manage real studio photographs, client prototype showcases, and print finish demonstrations.
          </p>
        </div>
        {!isAdding && (
          <Button
            onClick={() => {
              resetForm();
              setIsAdding(true);
            }}
            className="flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="size-4" />
            <span>Add Showcase Item</span>
          </Button>
        )}
      </div>

      {/* ADD / EDIT FORM MODAL / PANEL */}
      {isAdding && (
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-accent/40 bg-surface/80 p-5 sm:p-6 shadow-xl backdrop-blur-md animate-in fade-in duration-200 space-y-4"
        >
          <div className="flex items-center justify-between border-b border-border pb-3">
            <h3 className="font-semibold text-base flex items-center gap-2">
              <ImageIcon className="size-5 text-accent" />
              <span>{editingItem ? "Edit Showcase Item" : "New Showcase Photo Slot"}</span>
            </h3>
            <Button type="button" variant="ghost" size="sm" onClick={resetForm}>
              Cancel
            </Button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="title">Showcase Title *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Drone Motor Mount or Matte Pegboard Setup"
                required
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="tag">Category / Tag</Label>
              <Input
                id="tag"
                value={tag}
                onChange={(e) => setTag(e.target.value)}
                placeholder="e.g. Desk Setup, Prototype, Enclosure, Art"
                className="mt-1"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="material">Material / Filament Used</Label>
              <Input
                id="material"
                value={material}
                onChange={(e) => setMaterial(e.target.value)}
                placeholder="e.g. Bambu Matte PLA, PETG-CF, ASA"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="caption">Caption & Print Details</Label>
              <Input
                id="caption"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="e.g. 0.16mm layer height, 4 walls, 25% gyroid infill"
                className="mt-1"
              />
            </div>
          </div>

          {/* Photo Slot / Image Upload Section */}
          <div className="rounded-xl border border-border bg-surface-2/60 p-4 space-y-3">
            <Label className="font-semibold text-xs uppercase tracking-wider text-muted">
              Photograph / Media (Leave blank to keep placeholder)
            </Label>

            <div className="flex flex-col sm:flex-row gap-4 items-center">
              {/* Preview Container */}
              <div className="relative size-32 shrink-0 rounded-xl border border-dashed border-border bg-surface flex flex-col items-center justify-center overflow-hidden">
                {imageUrl ? (
                  <>
                    <img
                      src={imageUrl}
                      alt="Preview"
                      className="size-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => setImageUrl("")}
                      className="absolute top-1 right-1 rounded-full bg-black/60 p-1 text-white hover:bg-black transition-colors"
                    >
                      <X className="size-3" />
                    </button>
                  </>
                ) : (
                  <div className="text-center p-2 text-muted">
                    <ImageIcon className="mx-auto size-6 opacity-40 mb-1" />
                    <span className="text-[10px] block font-mono">Blank Placeholder</span>
                  </div>
                )}
              </div>

              {/* Upload Controls */}
              <div className="flex-1 space-y-2 w-full">
                <div>
                  <Label htmlFor="imageUpload" className="text-xs text-muted block mb-1">
                    Upload from your device:
                  </Label>
                  <label className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-1.5 text-xs font-medium hover:bg-surface-2 transition-colors cursor-pointer">
                    <Upload className="size-3.5" />
                    <span>Choose Image File (JPG / PNG / WebP)</span>
                    <input
                      id="imageUpload"
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="sr-only"
                    />
                  </label>
                </div>

                <div>
                  <Label htmlFor="imageUrl" className="text-xs text-muted block mb-1">
                    Or paste an image URL:
                  </Label>
                  <div className="relative">
                    <LinkIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted pointer-events-none" />
                    <Input
                      id="imageUrl"
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      placeholder="https://... or /products/..."
                      className="pl-8 text-xs"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <label className="flex items-center gap-2 text-xs sm:text-sm font-medium cursor-pointer">
              <input
                type="checkbox"
                checked={isFeatured}
                onChange={(e) => setIsFeatured(e.target.checked)}
                className="size-4 rounded border-border text-accent focus:ring-accent"
              />
              <span>Display on Public Showcase & Gallery</span>
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button type="button" variant="outline" onClick={resetForm}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createMutation.isPending || updateMutation.isPending}
              className="bg-accent text-ink hover:opacity-90 font-semibold"
            >
              {createMutation.isPending || updateMutation.isPending
                ? "Saving..."
                : editingItem
                ? "Update Showcase Item"
                : "Add to Showcase"}
            </Button>
          </div>
        </form>
      )}

      {/* GALLERY GRID */}
      {isLoading ? (
        <div className="py-12 text-center text-sm text-muted">Loading showcase items...</div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-12 text-center">
          <ImageIcon className="mx-auto size-10 text-muted/50" />
          <h3 className="mt-3 text-sm font-semibold">No showcase items created yet</h3>
          <p className="mt-1 text-xs text-muted">
            Add print photographs and real customer models to demonstrate finish and precision.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <div
              key={item.id}
              className="group rounded-2xl border border-border bg-surface overflow-hidden flex flex-col justify-between shadow-xs transition-all hover:border-border/80"
            >
              <div>
                {/* Photo or Blank Placeholder */}
                <div className="relative aspect-4/3 w-full bg-surface-2 overflow-hidden border-b border-border">
                  {item.image_url ? (
                    <img
                      src={item.image_url}
                      alt={item.title}
                      className="size-full object-cover transition-transform group-hover:scale-105"
                    />
                  ) : (
                    <div className="size-full flex flex-col items-center justify-center p-4 text-center bg-surface-2/60">
                      <div className="size-10 rounded-xl bg-accent/15 border border-accent/20 flex items-center justify-center text-accent mb-2">
                        <ImageIcon className="size-5" />
                      </div>
                      <p className="text-xs font-semibold text-fg">Blank Photo Placeholder</p>
                      <p className="text-[11px] text-muted mt-0.5">Click edit to upload photo</p>
                    </div>
                  )}

                  {item.tag && (
                    <span className="absolute top-2.5 left-2.5 rounded-full bg-surface/90 backdrop-blur-md px-2.5 py-0.5 text-[10px] font-semibold text-fg border border-border">
                      {item.tag}
                    </span>
                  )}
                </div>

                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-semibold text-sm text-fg truncate">{item.title}</h4>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => startEdit(item)}
                        title="Edit photo or details"
                        className="p-1 rounded-lg text-muted hover:bg-surface-2 hover:text-fg transition-colors cursor-pointer"
                      >
                        <Pencil className="size-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Delete showcase item "${item.title}"?`)) {
                            deleteMutation.mutate(item.id);
                          }
                        }}
                        title="Delete"
                        className="p-1 rounded-lg text-muted hover:bg-danger/10 hover:text-danger transition-colors cursor-pointer"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </div>

                  {item.material && (
                    <p className="text-xs text-accent font-medium mt-1 flex items-center gap-1">
                      <Layers className="size-3" />
                      <span>{item.material}</span>
                    </p>
                  )}

                  {item.caption && (
                    <p className="text-xs text-muted mt-2 line-clamp-2 leading-relaxed">
                      {item.caption}
                    </p>
                  )}
                </div>
              </div>

              <div className="p-4 pt-0">
                <div className="pt-3 border-t border-border/50 flex items-center justify-between text-[11px] text-muted">
                  <span>
                    {item.is_featured ? (
                      <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                        <Eye className="size-3" /> Visible
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-muted">
                        <EyeOff className="size-3" /> Hidden
                      </span>
                    )}
                  </span>
                  <span className="text-[10px] font-mono">#{item.sort_order}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
