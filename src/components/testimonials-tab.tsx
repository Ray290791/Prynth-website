import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Star,
  Plus,
  Pencil,
  Trash2,
  CheckCircle2,
  MessageSquareQuote,
  Eye,
  EyeOff,
  User,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  getTestimonialsAdmin,
  createTestimonial,
  updateTestimonial,
  deleteTestimonial,
  type Testimonial,
} from "@/lib/testimonials-fns";

export function TestimonialsTab() {
  const queryClient = useQueryClient();
  const [editingItem, setEditingItem] = useState<Testimonial | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  // Form states
  const [authorName, setAuthorName] = useState("");
  const [authorRole, setAuthorRole] = useState("");
  const [rating, setRating] = useState(5);
  const [quote, setQuote] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [verified, setVerified] = useState(true);
  const [isFeatured, setIsFeatured] = useState(true);

  const { data: testimonials = [], isLoading } = useQuery({
    queryKey: ["testimonialsAdmin"],
    queryFn: () => getTestimonialsAdmin(),
  });

  const resetForm = () => {
    setAuthorName("");
    setAuthorRole("");
    setRating(5);
    setQuote("");
    setAvatarUrl("");
    setVerified(true);
    setIsFeatured(true);
    setEditingItem(null);
    setIsAdding(false);
  };

  const startEdit = (item: Testimonial) => {
    setEditingItem(item);
    setAuthorName(item.author_name);
    setAuthorRole(item.author_role || "");
    setRating(item.rating);
    setQuote(item.quote);
    setAvatarUrl(item.avatar_url || "");
    setVerified(item.verified);
    setIsFeatured(item.is_featured);
    setIsAdding(true);
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      await createTestimonial({
        data: {
          author_name: authorName,
          author_role: authorRole,
          rating,
          quote,
          avatar_url: avatarUrl,
          verified,
          is_featured: isFeatured,
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["testimonialsAdmin"] });
      queryClient.invalidateQueries({ queryKey: ["testimonials"] });
      toast.success("Testimonial created successfully!");
      resetForm();
    },
    onError: (err: any) => toast.error(err.message || "Failed to create testimonial"),
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!editingItem) return;
      await updateTestimonial({
        data: {
          id: editingItem.id,
          author_name: authorName,
          author_role: authorRole,
          rating,
          quote,
          avatar_url: avatarUrl,
          verified,
          is_featured: isFeatured,
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["testimonialsAdmin"] });
      queryClient.invalidateQueries({ queryKey: ["testimonials"] });
      toast.success("Testimonial updated successfully!");
      resetForm();
    },
    onError: (err: any) => toast.error(err.message || "Failed to update testimonial"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await deleteTestimonial({ data: { id } });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["testimonialsAdmin"] });
      queryClient.invalidateQueries({ queryKey: ["testimonials"] });
      toast.success("Testimonial removed");
    },
    onError: (err: any) => toast.error(err.message || "Failed to delete testimonial"),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!authorName.trim() || !quote.trim()) {
      toast.error("Author name and quote are required");
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
            Customer Testimonials & Social Proof
          </h2>
          <p className="text-xs sm:text-sm text-muted mt-1">
            Manage reviews and client testimonials shown on the homepage, product pages, and studio showcase.
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
            <span>Add Testimonial</span>
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
              <MessageSquareQuote className="size-5 text-accent" />
              <span>{editingItem ? "Edit Testimonial" : "Create New Testimonial"}</span>
            </h3>
            <Button type="button" variant="ghost" size="sm" onClick={resetForm}>
              Cancel
            </Button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="authorName">Client / Customer Name *</Label>
              <Input
                id="authorName"
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                placeholder="e.g. Vikram K. or Acme Robotics"
                required
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="authorRole">Role / Location (Optional)</Label>
              <Input
                id="authorRole"
                value={authorRole}
                onChange={(e) => setAuthorRole(e.target.value)}
                placeholder="e.g. Hardware Engineer, Mumbai"
                className="mt-1"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Star Rating</Label>
              <div className="flex items-center gap-1.5 mt-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className="p-1 hover:scale-110 transition-transform cursor-pointer"
                  >
                    <Star
                      className={`size-6 ${
                        star <= rating
                          ? "fill-amber-400 text-amber-400"
                          : "text-muted/40"
                      }`}
                    />
                  </button>
                ))}
                <span className="text-xs font-semibold ml-2 text-muted">
                  {rating} / 5 Stars
                </span>
              </div>
            </div>

            <div>
              <Label htmlFor="avatarUrl">Avatar Photo URL (Optional - leave blank for default)</Label>
              <Input
                id="avatarUrl"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder="https://... or leave blank"
                className="mt-1"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="quote">Testimonial Review Text *</Label>
            <textarea
              id="quote"
              value={quote}
              onChange={(e) => setQuote(e.target.value)}
              placeholder="What did the customer say about print quality, tolerance, speed, or packaging?"
              rows={3}
              required
              className="mt-1 w-full rounded-xl border border-border bg-surface-2 p-3 text-xs sm:text-sm placeholder:text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>

          <div className="flex flex-wrap items-center gap-6 pt-2">
            <label className="flex items-center gap-2 text-xs sm:text-sm font-medium cursor-pointer">
              <input
                type="checkbox"
                checked={verified}
                onChange={(e) => setVerified(e.target.checked)}
                className="size-4 rounded border-border text-accent focus:ring-accent"
              />
              <span>Mark as Verified Buyer</span>
            </label>

            <label className="flex items-center gap-2 text-xs sm:text-sm font-medium cursor-pointer">
              <input
                type="checkbox"
                checked={isFeatured}
                onChange={(e) => setIsFeatured(e.target.checked)}
                className="size-4 rounded border-border text-accent focus:ring-accent"
              />
              <span>Display on Homepage & Showcase (Featured)</span>
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
                ? "Update Testimonial"
                : "Publish Testimonial"}
            </Button>
          </div>
        </form>
      )}

      {/* TESTIMONIALS LIST */}
      {isLoading ? (
        <div className="py-12 text-center text-sm text-muted">Loading testimonials...</div>
      ) : testimonials.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-12 text-center">
          <MessageSquareQuote className="mx-auto size-10 text-muted/50" />
          <h3 className="mt-3 text-sm font-semibold">No testimonials added yet</h3>
          <p className="mt-1 text-xs text-muted">
            Add client reviews and recommendations to showcase your studio's print quality.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {testimonials.map((item) => (
            <div
              key={item.id}
              className="rounded-2xl border border-border bg-surface p-4 sm:p-5 flex flex-col justify-between shadow-xs transition-all hover:border-border/80"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    {item.avatar_url ? (
                      <img
                        src={item.avatar_url}
                        alt={item.author_name}
                        className="size-10 rounded-full object-cover border border-border"
                      />
                    ) : (
                      <div className="size-10 rounded-full bg-accent/15 border border-accent/20 flex items-center justify-center font-bold text-accent text-sm">
                        {item.author_name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <h4 className="font-semibold text-sm flex items-center gap-1.5">
                        <span>{item.author_name}</span>
                        {item.verified && (
                          <span title="Verified Client">
                            <CheckCircle2 className="size-3.5 text-emerald-500" />
                          </span>
                        )}
                      </h4>
                      {item.author_role && (
                        <p className="text-xs text-muted">{item.author_role}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => startEdit(item)}
                      title="Edit"
                      className="p-1.5 rounded-lg text-muted hover:bg-surface-2 hover:text-fg transition-colors cursor-pointer"
                    >
                      <Pencil className="size-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Delete testimonial from ${item.author_name}?`)) {
                          deleteMutation.mutate(item.id);
                        }
                      }}
                      title="Delete"
                      className="p-1.5 rounded-lg text-muted hover:bg-danger/10 hover:text-danger transition-colors cursor-pointer"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-1 mt-3">
                  {[...Array(item.rating)].map((_, i) => (
                    <Star key={i} className="size-3.5 fill-amber-400 text-amber-400" />
                  ))}
                </div>

                <p className="mt-2.5 text-xs sm:text-sm text-muted leading-relaxed italic">
                  "{item.quote}"
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-border/50 flex items-center justify-between text-[11px] text-muted">
                <span className="flex items-center gap-1">
                  {item.is_featured ? (
                    <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                      <Eye className="size-3" /> Live on Site
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-muted">
                      <EyeOff className="size-3" /> Hidden
                    </span>
                  )}
                </span>
                <span className="text-[10px] font-mono">
                  Order #{item.sort_order}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
