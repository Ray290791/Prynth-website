import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { formatINR } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Trash2, X, Image as ImageIcon } from "lucide-react";
import { getAllProductsAdmin, deleteProduct, updateProduct, createProduct, toggleProductSellableAdmin, formatCategoryName } from "@/lib/products-fns";
import { getSiteSettings } from "@/lib/settings-fns";
import type { Product, ProductImage } from "@/lib/products";
import { TagInput } from "@/components/admin/tag-input";
import { ModalPortal } from "@/components/ui/modal-portal";

export function ProductsTable() {
  const queryClient = useQueryClient();
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);
  const [deletePin, setDeletePin] = useState("");

  const { data: products, isLoading } = useQuery({
    queryKey: ["adminProducts"],
    queryFn: () => getAllProductsAdmin(),
  });

  const deleteMutation = useMutation({
    mutationFn: async ({ slug, pin }: { slug: string; pin: string }) => {
      await deleteProduct({ data: { slug, pin } });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminProducts"] });
      queryClient.invalidateQueries({ queryKey: ["siteSettings"] });
      queryClient.invalidateQueries({ queryKey: ["publicProducts"] });
      queryClient.invalidateQueries({ queryKey: ["featuredProducts"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("Product permanently deleted from everywhere.");
      setDeletingProduct(null);
      setDeletePin("");
    },
    onError: (err: any) => toast.error(err?.message || "Failed to delete product"),
  });

  const toggleSellableMutation = useMutation({
    mutationFn: async ({ slug, sellable }: { slug: string; sellable: boolean }) => {
      await toggleProductSellableAdmin({ data: { slug, sellable } });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminProducts"] });
      queryClient.invalidateQueries({ queryKey: ["publicProducts"] });
      queryClient.invalidateQueries({ queryKey: ["featuredProducts"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("Product sellable status updated!");
    },
    onError: (err: any) => toast.error(err?.message || "Failed to update sellable status"),
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
            <th className="p-4 font-medium text-center">Checkout Status</th>
            <th className="p-4 font-medium text-right">Unit / Pack Cost</th>
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
              <td className="p-4 text-center whitespace-nowrap">
                <button
                  type="button"
                  onClick={() => toggleSellableMutation.mutate({ slug: p.slug, sellable: !p.sellable })}
                  disabled={toggleSellableMutation.isPending}
                  className={cn(
                    "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all cursor-pointer",
                    p.sellable 
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20" 
                      : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/20"
                  )}
                  title="Click to toggle customer checkout availability"
                >
                  <span className={cn("size-1.5 rounded-full", p.sellable ? "bg-emerald-500" : "bg-amber-500")} />
                  {p.sellable ? "Sellable" : "Paused"}
                </button>
              </td>
              <td className="p-4 text-right tabular-nums text-xs font-mono text-muted whitespace-nowrap">
                ₹{p.unitCostInr || 0} / ₹{p.packagingCostInr || 0}
              </td>
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
                      setDeletingProduct(p);
                      setDeletePin("");
                    }}
                    className="text-xs px-2.5 py-1.5 rounded-lg bg-danger/10 text-danger hover:bg-danger/20 transition-colors border border-danger/20 font-medium cursor-pointer"
                  >
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Second Line of Verification: Admin PIN Product Deletion Modal */}
      {deletingProduct && (
        <ModalPortal isOpen={!!deletingProduct}>
          <div
            className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-150"
            onClick={() => {
              if (!deleteMutation.isPending) {
                setDeletingProduct(null);
                setDeletePin("");
              }
            }}
          >
            <div
              className="relative w-full max-w-md rounded-2xl sm:rounded-3xl border border-danger/30 bg-surface p-6 shadow-2xl animate-in zoom-in-95 duration-200 cursor-default"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start gap-3.5">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-danger/15 text-danger border border-danger/25">
                  <Trash2 className="size-5" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-fg">Delete Product</h3>
                  <p className="text-xs text-muted mt-1 leading-relaxed">
                    Second line of verification required. Enter your 6-digit Admin PIN to permanently delete this item.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setDeletingProduct(null);
                    setDeletePin("");
                  }}
                  disabled={deleteMutation.isPending}
                  className="text-muted hover:text-fg p-1 rounded-lg cursor-pointer"
                >
                  <X className="size-4" />
                </button>
              </div>

              {/* Product Summary */}
              <div className="my-4 p-3 rounded-xl bg-surface-2/60 border border-border flex items-center gap-3">
                <img
                  src={deletingProduct.image}
                  alt={deletingProduct.name}
                  className="size-12 rounded-lg object-cover bg-surface shrink-0"
                />
                <div className="min-w-0 flex-1 text-xs">
                  <div className="font-semibold text-fg truncate">{deletingProduct.name}</div>
                  <div className="text-muted font-mono text-[11px] truncate">{deletingProduct.slug}</div>
                  <div className="text-accent font-medium mt-0.5">{formatINR(deletingProduct.price)}</div>
                </div>
              </div>

              <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-600 dark:text-amber-400 mb-4 leading-relaxed">
                <strong>Warning:</strong> This will permanently erase the product from all catalog listings, PostgreSQL database tables, customer wishlists, and reviews.
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!deletePin || deletePin.length !== 6) {
                    toast.error("Please enter your 6-digit Admin PIN");
                    return;
                  }
                  deleteMutation.mutate({ slug: deletingProduct.slug, pin: deletePin });
                }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-xs font-semibold text-fg mb-1.5">
                    6-Digit Admin PIN
                  </label>
                  <input
                    type="password"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    value={deletePin}
                    onChange={(e) => setDeletePin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="••••••"
                    autoFocus
                    required
                    className="w-full text-center tracking-[0.5em] text-xl font-mono py-2.5 rounded-xl border border-border bg-surface-2 text-fg focus:border-danger focus:ring-1 focus:ring-danger outline-none transition-all"
                  />
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setDeletingProduct(null);
                      setDeletePin("");
                    }}
                    disabled={deleteMutation.isPending}
                    className="px-4 py-2 rounded-xl border border-border text-xs font-medium text-muted hover:text-fg hover:bg-surface-2 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={deletePin.length !== 6 || deleteMutation.isPending}
                    className="px-4 py-2 rounded-xl bg-danger text-white text-xs font-semibold hover:bg-danger/90 disabled:opacity-50 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Trash2 className="size-3.5" />
                    <span>{deleteMutation.isPending ? "Verifying PIN & Deleting..." : "Permanently Delete"}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </ModalPortal>
      )}

      <ProductModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        product={editingProduct}
        allProducts={products || []}
      />
    </div>
  );
}

function ProductModal({
  product,
  isOpen,
  onClose,
  allProducts = [],
}: {
  product?: Product | null;
  isOpen: boolean;
  onClose: () => void;
  allProducts?: Product[];
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

  // Dynamic category suggestions aggregated across site settings + all catalog products + current tags
  const categoriesList = React.useMemo(() => {
    const catMap = new Map<string, string>(); // lowercase -> display label

    // 1. From settings
    const fromSettings = (settings?.product_categories || "Desk, Home, Bath")
      .split(",")
      .map((c: string) => c.trim())
      .filter(Boolean);
    for (const c of fromSettings) {
      if (!catMap.has(c.toLowerCase())) {
        catMap.set(c.toLowerCase(), formatCategoryName(c));
      }
    }

    // 2. From all products in catalog
    if (Array.isArray(allProducts)) {
      for (const p of allProducts) {
        const pCats = Array.isArray(p.categories) && p.categories.length > 0
          ? p.categories
          : (p.category ? [p.category] : []);
        for (const c of pCats) {
          const trimmed = c?.trim();
          if (trimmed && !catMap.has(trimmed.toLowerCase())) {
            catMap.set(trimmed.toLowerCase(), formatCategoryName(trimmed));
          }
        }
      }
    }

    // 3. From current product categories (so any newly added tag is immediately available)
    for (const c of categories) {
      const trimmed = c?.trim();
      if (trimmed && !catMap.has(trimmed.toLowerCase())) {
        catMap.set(trimmed.toLowerCase(), formatCategoryName(trimmed));
      }
    }

    return Array.from(catMap.values()).sort((a, b) => a.localeCompare(b));
  }, [settings?.product_categories, allProducts, categories]);

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
      queryClient.invalidateQueries({ queryKey: ["siteSettings"] });
      queryClient.invalidateQueries({ queryKey: ["publicProducts"] });
      queryClient.invalidateQueries({ queryKey: ["featuredProducts"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success(`Product ${product ? "updated" : "created"}!`);
      onClose();
    },
    onError: (err) => toast.error(err.message),
    onSettled: () => setBusy(false)
  });

  if (!isOpen) return null;

  return (
    <ModalPortal isOpen={isOpen}>
      <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 sm:p-6 overflow-y-auto animate-in fade-in duration-150">
        <div className="relative w-full max-w-2xl max-h-[min(88vh,calc(100dvh-4rem))] flex flex-col rounded-2xl sm:rounded-3xl border border-border bg-surface shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
          <div className="flex items-center justify-between border-b border-border/50 p-6 bg-transparent shrink-0">
            <h2 className="text-xl font-bold">{product ? "Edit Product" : "Add Product"}</h2>
            <button onClick={onClose} className="rounded-full p-2 hover:bg-surface-2 transition-colors text-muted hover:text-ink cursor-pointer">
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
                sellable: fd.get("sellable") === "on",
                unitCostInr: parseInt(fd.get("unitCostInr") as string, 10) || 0,
                packagingCostInr: parseInt(fd.get("packagingCostInr") as string, 10) || 0,
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

              <div className="col-span-2 rounded-xl border border-accent/20 bg-surface-2/40 p-4 space-y-3">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-accent">Production Economics &amp; Cost Ledger</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium mb-1">Unit Material &amp; Print Cost (₹)</label>
                    <input 
                      name="unitCostInr" 
                      type="number" 
                      defaultValue={product?.unitCostInr ?? 0} 
                      className="w-full rounded-xl border border-border/50 bg-surface-2/50 px-3 py-2 text-sm font-mono" 
                    />
                    <p className="text-[11px] text-muted mt-0.5">Filament, energy, &amp; machine fee</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">Packaging &amp; Box Cost (₹)</label>
                    <input 
                      name="packagingCostInr" 
                      type="number" 
                      defaultValue={product?.packagingCostInr ?? 0} 
                      className="w-full rounded-xl border border-border/50 bg-surface-2/50 px-3 py-2 text-sm font-mono" 
                    />
                    <p className="text-[11px] text-muted mt-0.5">Cardboard box, paper fill, stickers</p>
                  </div>
                </div>
                <label className="flex items-center gap-2 cursor-pointer pt-1">
                  <input 
                    type="checkbox" 
                    name="sellable" 
                    id="sellable" 
                    defaultChecked={product?.sellable ?? true} 
                    className="size-4 rounded border-border accent-accent" 
                  />
                  <span className="text-xs font-semibold text-fg">Active for Customer Checkout</span>
                </label>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-border/50">
              <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-xl border border-border/50 bg-surface-2/30 hover:bg-surface-2/80 text-sm font-medium transition-colors cursor-pointer">Cancel</button>
              <button type="submit" disabled={busy} className="px-5 py-2.5 rounded-xl bg-accent text-ink hover:opacity-90 text-sm font-medium transition-opacity cursor-pointer">
                {busy ? "Saving..." : "Save Product"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
    </ModalPortal>
  );
}

