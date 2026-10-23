import React, { useState, useEffect, useId } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { formatINR } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Search, Plus, Edit2, Trash2, X, Eye, EyeOff, Package, Image as ImageIcon } from "lucide-react";
import { getAllProductsAdmin, deleteProduct, updateProduct, createProduct } from "@/lib/products-fns";
import { getSiteSettings } from "@/lib/settings-fns";
import type { Product, ProductImage } from "@/lib/products";
import { TagInput } from "@/components/admin/tag-input";

export function ProductsTable() {
  const queryClient = useQueryClient();
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { data: products, isLoading } = useQuery({
    queryKey: ["adminProducts"],
    queryFn: () => getAllProductsAdmin(),
  });

  const deleteMutation = useMutation({
    mutationFn: async (slug: string) => {
      await deleteProduct({ data: slug });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminProducts"] });
      toast.success("Product deleted successfully");
    },
    onError: () => toast.error("Failed to delete product")
  });

  if (isLoading) {
    return <div className="p-8 text-center text-muted">Loading products...</div>;
  }

  if (!products || products.length === 0) {
    return <div className="p-8 text-center text-muted">No products found.</div>;
  }

  return (
    <div>
      <div className="flex justify-end p-4 border-b border-border">
        <button
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-ink hover:opacity-90"
          onClick={() => {
            setEditingProduct(null);
            setIsModalOpen(true);
          }}
        >
          Add Product
        </button>
      </div>
      <table className="w-full text-left text-sm">
        <thead className="border-b border-border bg-surface-2 text-muted">
          <tr>
            <th className="p-4 font-medium">Product</th>
            <th className="p-4 font-medium">Price</th>
            <th className="p-4 font-medium">Category</th>
            <th className="p-4 font-medium text-right w-44 min-w-[150px]">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {products.map((p) => (
            <tr key={p.slug} className="hover:bg-surface-2/50 transition-colors">
              <td className="p-4">
                <div className="flex items-center gap-3">
                  <img src={p.image} alt={p.name} className="size-10 rounded-lg object-cover bg-surface-2" />
                  <div>
                    <div className="font-medium">{p.name}</div>
                    <div className="text-xs text-muted truncate max-w-[200px]">{p.blurb}</div>
                  </div>
                </div>
              </td>
              <td className="p-4 tabular-nums font-medium">{formatINR(p.price)}</td>
              <td className="p-4 capitalize">{Array.isArray(p.categories) ? p.categories.join(", ") : p.category}</td>
              <td className="p-4 text-right whitespace-nowrap w-44 min-w-[150px]">
                <div className="inline-flex items-center justify-end gap-2">
                  <button
                    onClick={() => {
                      setEditingProduct(p);
                      setIsModalOpen(true);
                    }}
                    className="text-xs px-2.5 py-1.5 rounded-lg bg-surface hover:bg-surface-2 transition-colors border border-border font-medium"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Are you sure you want to delete ${p.name}?`)) {
                        deleteMutation.mutate(p.slug);
                      }
                    }}
                    className="text-xs px-2.5 py-1.5 rounded-lg bg-danger/10 text-danger hover:bg-danger/20 transition-colors border border-danger/20 font-medium"
                  >
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <ProductModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        product={editingProduct}
      />
    </div>
  );
}

function ProductModal({
  product,
  isOpen,
  onClose
}: {
  product?: Product | null,
  isOpen: boolean,
  onClose: () => void
}) {
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [imagePreview, setImagePreview] = useState(product?.image || "");
  const [colors, setColors] = useState<string[]>(product?.colors || []);
  const [categories, setCategories] = useState<string[]>(product?.categories || (product?.category ? [product.category] : []));
  const [sizes, setSizes] = useState<string[]>(product?.sizes || (product?.size ? [product.size] : []));
  const [materials, setMaterials] = useState<string[]>(product?.materials || (product?.material ? [product.material] : []));
  const [gallery, setGallery] = useState<ProductImage[]>(product?.gallery || []);

  const { data: settings } = useQuery({
    queryKey: ["siteSettings"],
    queryFn: () => getSiteSettings(),
  });
  const categoriesList = settings?.product_categories
    ? settings.product_categories.split(",").map((c: string) => c.trim())
    : ["Desk", "Home", "Bath"];

  // Reset states when product changes (e.g. opening different products)
  useEffect(() => {
    setImagePreview(product?.image || "");
    setColors(product?.colors || []);
    setCategories(product?.categories || (product?.category ? [product.category] : []));
    setSizes(product?.sizes || (product?.size ? [product.size] : []));
    setMaterials(product?.materials || (product?.material ? [product.material] : []));
    setGallery(product?.gallery || []);
  }, [product]);

  const mutation = useMutation({
    mutationFn: async (data: Product) => {
      if (product) {
        await updateProduct({ data });
      } else {
        await createProduct({ data });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminProducts"] });
      toast.success(`Product ${product ? "updated" : "created"}!`);
      onClose();
    },
    onError: (err) => toast.error(err.message),
    onSettled: () => setBusy(false)
  });

  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 sm:p-6 overflow-y-auto animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl max-h-[min(88vh,calc(100dvh-4rem))] flex flex-col rounded-2xl sm:rounded-3xl border border-border bg-surface shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between border-b border-border/50 p-6 bg-transparent shrink-0">
          <h2 className="text-xl font-bold">{product ? "Edit Product" : "Add Product"}</h2>
          <button onClick={onClose} className="rounded-full p-2 hover:bg-surface-2 transition-colors text-muted hover:text-ink">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setBusy(true);
              const fd = new FormData(e.currentTarget);
              const data: Product = {
                slug: fd.get("slug") as string,
                name: fd.get("name") as string,
                price: parseInt(fd.get("price") as string, 10),
                image: imagePreview,
                gallery: gallery,
                categories: categories,
                blurb: fd.get("blurb") as string,
                description: fd.get("description") as string,
                colors: colors,
                sizes: sizes,
                materials: materials,
                printTime: fd.get("printTime") as string,
                featured: fd.get("featured") === "on",
                badge: (fd.get("badge") as "Favourite" | "New") || undefined,
                includes: fd.get("includes") as string,
                care: fd.get("care") as string,
              };
              mutation.mutate(data);
            }}
            className="space-y-4"
          >
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Slug (ID)</label>
                <input name="slug" defaultValue={product?.slug} required readOnly={!!product} className="w-full rounded-xl border border-border/50 bg-surface-2/50 backdrop-blur-sm px-4 py-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Name</label>
                <input name="name" defaultValue={product?.name} required className="w-full rounded-xl border border-border/50 bg-surface-2/50 backdrop-blur-sm px-4 py-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Price (INR)</label>
                <input name="price" type="number" defaultValue={product?.price} required className="w-full rounded-xl border border-border/50 bg-surface-2/50 backdrop-blur-sm px-4 py-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Categories</label>
                <TagInput tags={categories} setTags={setCategories} suggestions={categoriesList} placeholder="e.g. Desk, Keyboards" />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">Primary Image (Thumbnail)</label>
                <div className="flex gap-4 items-start">
                  <div className="w-24 h-24 shrink-0 rounded-lg border border-border bg-surface-2 overflow-hidden">
                    {imagePreview ? (
                      <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-muted text-xs">
                        <ImageIcon className="w-6 h-6 mb-1 opacity-50" />
                        No Image
                      </div>
                    )}
                  </div>
                  <div className="flex-1 space-y-2">
                    <input type="hidden" name="image" value={imagePreview || ""} />
                    <input
                      type="file"
                      accept="image/*"
                      className="w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-medium file:bg-accent/10 file:text-accent hover:file:bg-accent/20 cursor-pointer"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (e) => setImagePreview(e.target?.result as string);
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                    <p className="text-xs text-muted">Upload an image from your device. (JPEG, PNG, WEBP)</p>
                  </div>
                </div>
              </div>

              {/* Multi-Image Gallery with Tags */}
              <div className="col-span-2 pt-4 border-t border-border mt-4">
                <label className="block text-sm font-medium mb-1">Image Gallery</label>
                <p className="text-xs text-muted mb-4">Upload multiple images for the product page carousel. You can tag each image with colors, sizes, or materials.</p>
                
                <div className="space-y-4">
                  {gallery.map((img, idx) => (
                    <div key={idx} className="flex gap-4 items-start p-4 border border-border rounded-lg bg-surface-2">
                      <img src={img.url} alt="Gallery" className="w-24 h-24 object-cover rounded border border-border shrink-0" />
                      <div className="flex-1">
                        <label className="block text-xs font-medium mb-1">Tags (e.g., Teal, Standard, PLA)</label>
                        <TagInput 
                          tags={img.tags} 
                          setTags={(newTags) => {
                            const newGallery = [...gallery];
                            newGallery[idx].tags = newTags;
                            setGallery(newGallery);
                          }} 
                          placeholder="Add tags..." 
                        />
                      </div>
                      <button 
                        type="button" 
                        onClick={() => setGallery(gallery.filter((_, i) => i !== idx))}
                        className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}

                  <div className="flex items-center gap-4 p-6 border-2 border-dashed border-border/50 rounded-xl bg-surface-2/30 hover:bg-surface-2/50 transition-colors">
                    <div className="flex-1">
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-medium file:bg-surface-3 file:text-foreground hover:file:bg-border cursor-pointer"
                        onChange={(e) => {
                          const files = Array.from(e.target.files || []);
                          if (files.length > 0) {
                            Promise.all(files.map(file => {
                              return new Promise<ProductImage>((resolve) => {
                                const reader = new FileReader();
                                reader.onload = (e) => resolve({ url: e.target?.result as string, tags: [] });
                                reader.readAsDataURL(file);
                              });
                            })).then(newImages => {
                              setGallery([...gallery, ...newImages]);
                            });
                          }
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">Blurb (Short)</label>
                <input name="blurb" defaultValue={product?.blurb} required className="w-full rounded-xl border border-border/50 bg-surface-2/50 backdrop-blur-sm px-4 py-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea name="description" defaultValue={product?.description} required rows={3} className="w-full rounded-xl border border-border/50 bg-surface-2/50 backdrop-blur-sm px-4 py-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-2">Colors</label>
                <TagInput tags={colors} setTags={setColors} placeholder="e.g. Teal" isColor={true} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Sizes</label>
                <TagInput tags={sizes} setTags={setSizes} placeholder="e.g. Standard" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Materials</label>
                <TagInput tags={materials} setTags={setMaterials} placeholder="e.g. PLA" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Print Time</label>
                <input name="printTime" defaultValue={product?.printTime} required className="w-full rounded-xl border border-border/50 bg-surface-2/50 backdrop-blur-sm px-4 py-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">Includes</label>
                <input name="includes" defaultValue={product?.includes} required className="w-full rounded-xl border border-border/50 bg-surface-2/50 backdrop-blur-sm px-4 py-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">Care</label>
                <input name="care" defaultValue={product?.care} required className="w-full rounded-xl border border-border/50 bg-surface-2/50 backdrop-blur-sm px-4 py-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Badge (Optional)</label>
                <input name="badge" defaultValue={product?.badge} className="w-full rounded-xl border border-border/50 bg-surface-2/50 backdrop-blur-sm px-4 py-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" name="featured" id="featured" defaultChecked={product?.featured} className="rounded" />
                <label htmlFor="featured" className="text-sm font-medium">Featured Product</label>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-border/50">
              <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-xl border border-border/50 bg-surface-2/30 hover:bg-surface-2/80 text-sm font-medium transition-colors">Cancel</button>
              <button type="submit" disabled={busy} className="px-5 py-2.5 rounded-xl bg-accent text-ink hover:opacity-90 text-sm font-medium transition-opacity">
                {busy ? "Saving..." : "Save Product"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

