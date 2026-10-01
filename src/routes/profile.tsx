import { createFileRoute } from "@tanstack/react-router";
import { getUserOrders } from "@/lib/orders-fns";
import { getUserTickets } from "@/lib/contact-fns";
import { getUserProfile, getAddresses } from "@/lib/user-profile-fns";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { formatINR } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { useCurrentUser } from "@/lib/auth/use-current-user";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { updateUserProfile, setDefaultAddress, deleteAddress } from "@/lib/user-profile-fns";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Sparkles, Clock, Camera, Package } from "lucide-react";

export const Route = createFileRoute("/profile")({
  component: ProfilePage,
});

function ProfilePage() {
  const user = useCurrentUser();
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  
  const updateMutation = useMutation({
    mutationFn: updateUserProfile,
    onSuccess: () => {
      toast.success("Profile updated");
      setIsEditing(false);
      // reload page to reflect user object changes (since user comes from context)
      window.location.reload();
    },
    onError: () => toast.error("Failed to update profile")
  });

  const queryClient = useQueryClient();

  const setDefAddrMutation = useMutation({
    mutationFn: setDefaultAddress,
    onSuccess: () => {
      toast.success("Default address updated");
      queryClient.invalidateQueries({ queryKey: ["userAddresses"] });
    }
  });

  const deleteAddrMutation = useMutation({
    mutationFn: deleteAddress,
    onSuccess: () => {
      toast.success("Address deleted");
      queryClient.invalidateQueries({ queryKey: ["userAddresses"] });
    }
  });
  
  const { data: orders, isLoading: ordersLoading } = useQuery({
    queryKey: ["userOrders"],
    queryFn: () => getUserOrders(),
  });

  const { data: profile } = useQuery({
    queryKey: ["userProfile"],
    queryFn: () => getUserProfile(),
  });

  const { data: addresses } = useQuery({
    queryKey: ["userAddresses"],
    queryFn: () => getAddresses(),
  });

  const [dashboardTab, setDashboardTab] = useState<"orders" | "custom_requests">("orders");

  const { data: tickets = [], isLoading: ticketsLoading } = useQuery({
    queryKey: ["userTickets"],
    queryFn: () => getUserTickets(),
  });

  if (!user) return <div className="p-8 text-center">Please log in to view your profile.</div>;

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 md:px-6 md:py-16">
      <h1 className="font-display text-4xl font-semibold tracking-tight">Your Dashboard</h1>
      <p className="mt-2 text-muted">View and manage your account and 3D printing orders.</p>
      
      <div className="mt-10 grid gap-8 md:grid-cols-3">
        {/* Profile Sidebar */}
        <div className="space-y-6">
          <div className="rounded-xl border border-border bg-surface p-6 shadow-sm">
            <h3 className="text-lg font-semibold">Account Info</h3>
            <div className="mt-4 flex flex-col items-center sm:items-start sm:flex-row gap-4">
              <div className="relative group w-16 h-16 rounded-full border border-border bg-surface-2 overflow-hidden shrink-0">
                <img 
                  src={user.profileImageUrl || `https://api.dicebear.com/7.x/notionists/svg?seed=${user.primaryEmail}&backgroundColor=e5e5e5`} 
                  alt="Avatar" 
                  className="w-full h-full object-cover"
                />
                <label className="absolute inset-0 bg-black/50 hidden group-hover:flex items-center justify-center cursor-pointer transition-opacity">
                  <span className="text-[10px] text-white font-medium">Edit</span>
                  <input 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const img = new Image();
                        img.onload = () => {
                          const canvas = document.createElement("canvas");
                          const MAX_SIZE = 256;
                          let width = img.width;
                          let height = img.height;
                          
                          if (width > height) {
                            if (width > MAX_SIZE) {
                              height *= MAX_SIZE / width;
                              width = MAX_SIZE;
                            }
                          } else {
                            if (height > MAX_SIZE) {
                              width *= MAX_SIZE / height;
                              height = MAX_SIZE;
                            }
                          }
                          
                          canvas.width = width;
                          canvas.height = height;
                          const ctx = canvas.getContext("2d");
                          ctx?.drawImage(img, 0, 0, width, height);
                          
                          const compressedBase64 = canvas.toDataURL("image/webp", 0.8);
                          updateMutation.mutate({ data: { image: compressedBase64 } });
                        };
                        img.src = URL.createObjectURL(file);
                      }
                    }} 
                  />
                </label>
              </div>
              <div className="space-y-1 text-center sm:text-left flex-1">
                {isEditing ? (
                  <form 
                    className="flex flex-col gap-2"
                    onSubmit={(e) => {
                      e.preventDefault();
                      updateMutation.mutate({ data: { name: editName, phone: editPhone } });
                    }}
                  >
                    <Input 
                      placeholder="Name" 
                      value={editName} 
                      onChange={(e) => setEditName(e.target.value)} 
                    />
                    <Input 
                      placeholder="Phone" 
                      value={editPhone} 
                      onChange={(e) => setEditPhone(e.target.value)} 
                    />
                    <div className="flex gap-2 mt-2">
                      <Button type="submit" size="sm" disabled={updateMutation.isPending}>Save</Button>
                      <Button type="button" variant="secondary" size="sm" onClick={() => setIsEditing(false)}>Cancel</Button>
                    </div>
                  </form>
                ) : (
                  <>
                    <p className="font-medium text-lg">{user.displayName}</p>
                    <p className="text-muted text-sm">{user.primaryEmail}</p>
                    {profile?.phone && <p className="text-muted text-sm mt-2">Phone: {profile.phone}</p>}
                    <button 
                      onClick={() => {
                        setEditName(user.displayName || "");
                        setEditPhone(profile?.phone || "");
                        setIsEditing(true);
                      }}
                      className="mt-2 text-xs font-medium text-primary hover:underline"
                    >
                      Edit Profile
                    </button>
                  </>
                )}
              </div>
            </div>
            
            <div className="mt-6 border-t border-border pt-4">
              <h4 className="font-medium">Print Credits</h4>
              <p className="mt-1 text-2xl font-bold text-primary">{formatINR(profile?.credits || 0)}</p>
              <p className="text-xs text-muted">Use credits at checkout for discounts.</p>
            </div>
            
            <div className="mt-6 border-t border-border pt-4">
              <h4 className="font-medium">Refer a Friend</h4>
              <p className="text-sm text-muted">Share your code to earn credits.</p>
              <div className="mt-2 rounded bg-secondary p-2 text-center font-mono font-bold">
                {profile?.referral_code || "Loading..."}
              </div>
            </div>
          </div>
          
          <div className="rounded-xl border border-border bg-surface p-6 shadow-sm">
            <h3 className="text-lg font-semibold">Saved Addresses</h3>
            {addresses && addresses.length > 0 ? (
              <ul className="mt-4 space-y-4">
                {addresses.map((addr: any) => (
                  <li key={addr.id} className="text-sm border-b border-border pb-4 last:border-0 last:pb-0">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium">{addr.name} {addr.is_default && <Badge className="ml-2 text-xs">Default</Badge>}</p>
                        <p className="text-muted mt-1">{addr.line1}</p>
                        {addr.line2 && <p className="text-muted">{addr.line2}</p>}
                        <p className="text-muted">{addr.city}, {addr.state} {addr.pin}</p>
                        <p className="text-muted mt-1">{addr.phone}</p>
                      </div>
                      <div className="flex flex-col gap-2 shrink-0">
                        {!addr.is_default && (
                          <button 
                            type="button" 
                            className="text-xs text-primary font-medium hover:underline text-right"
                            onClick={() => setDefAddrMutation.mutate({ data: addr.id })}
                            disabled={setDefAddrMutation.isPending}
                          >
                            Set Default
                          </button>
                        )}
                        <button 
                          type="button" 
                          className="text-xs text-danger font-medium hover:underline text-right"
                          onClick={() => {
                            if(confirm("Delete this address?")) deleteAddrMutation.mutate({ data: addr.id });
                          }}
                          disabled={deleteAddrMutation.isPending}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-sm text-muted">No saved addresses.</p>
            )}
          </div>
        </div>

        {/* Main Content: Orders & Custom Requests */}
        <div className="md:col-span-2 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setDashboardTab("orders")}
                className={cn(
                  "px-4 py-2 text-sm font-semibold rounded-xl transition-colors cursor-pointer flex items-center gap-1.5",
                  dashboardTab === "orders"
                    ? "bg-accent text-ink shadow-xs"
                    : "text-muted hover:text-fg hover:bg-surface-2"
                )}
              >
                <Package className="size-4" />
                <span>Orders ({orders?.length || 0})</span>
              </button>
              <button
                type="button"
                onClick={() => setDashboardTab("custom_requests")}
                className={cn(
                  "px-4 py-2 text-sm font-semibold rounded-xl transition-colors cursor-pointer flex items-center gap-1.5",
                  dashboardTab === "custom_requests"
                    ? "bg-accent text-ink shadow-xs"
                    : "text-muted hover:text-fg hover:bg-surface-2"
                )}
              >
                <Sparkles className="size-4" />
                <span>Custom Requests ({tickets.length})</span>
              </button>
            </div>

            <Link to="/wishlist" className="text-xs font-medium text-accent hover:underline self-end sm:self-auto">
              View Wishlist →
            </Link>
          </div>

          {dashboardTab === "orders" ? (
            <div>
              {ordersLoading ? (
                <p className="mt-4 text-muted">Loading orders...</p>
              ) : !orders || orders.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border p-12 text-center bg-surface/50">
                  <p className="text-lg font-medium">No orders yet</p>
                  <p className="mt-1 text-sm text-muted">When you buy something, it will appear here.</p>
                  <Link to="/" className="mt-4 rounded-full bg-accent px-6 py-2 text-sm font-medium text-ink hover:opacity-90">
                    Start Shopping
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {orders.map((order: any) => (
                    <div key={order.id} className="rounded-xl border border-border bg-surface p-6 shadow-sm">
                      <div className="flex flex-wrap items-center justify-between gap-4">
                        <div>
                          <p className="font-medium">Order #{order.order_number}</p>
                          <p className="text-sm text-muted">{new Date(order.created_at).toLocaleDateString()}</p>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="font-semibold">{formatINR(order.total)}</p>
                            <p className="text-xs text-muted">via {order.payment_method === 'cod' ? 'Cash on Delivery' : order.payment_method === 'upi' ? 'UPI' : 'Razorpay'}</p>
                          </div>
                          <Badge className={order.status === 'pending' ? 'bg-secondary text-secondary-foreground' : order.status === 'shipped' ? 'bg-primary text-primary-foreground' : 'bg-transparent border'}>
                            {order.status}
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="mt-4 border-t border-border pt-4">
                        <h4 className="text-sm font-medium">Items</h4>
                        <ul className="mt-2 space-y-2">
                          {(typeof order.items === 'string' ? JSON.parse(order.items) : order.items).map((item: any, i: number) => (
                            <li key={i} className="text-sm text-muted flex justify-between">
                              <span>{item.qty}x {item.name} ({item.color}) {item.size && ` - ${item.size}`}</span>
                              <span>{formatINR((item.unitPrice ?? item.price ?? 0) * item.qty)}</span>
                            </li>
                          ))}
                        </ul>
                        {order.tracking_number && (
                          <div className="mt-4 rounded bg-secondary p-3 text-sm">
                            <span className="font-medium">Tracking:</span> {order.tracking_number} 
                            {order.tracking_url && <a href={order.tracking_url} target="_blank" rel="noreferrer" className="ml-2 text-primary hover:underline">Track Package</a>}
                          </div>
                        )}
                        <div className="mt-4 flex gap-3">
                          <Link to="/order/$id" params={{ id: order.order_number.toString() }} className="rounded border border-border px-4 py-2 text-sm font-medium hover:bg-secondary">
                            View Details
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div>
              {ticketsLoading ? (
                <p className="mt-4 text-muted">Loading custom requests...</p>
              ) : tickets.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border p-12 text-center bg-surface/50">
                  <div className="size-12 rounded-2xl bg-accent/15 text-accent flex items-center justify-center mb-3">
                    <Sparkles className="size-6" />
                  </div>
                  <p className="text-lg font-medium">No custom design requests yet</p>
                  <p className="mt-1 text-sm text-muted max-w-sm">
                    Need a broken part replaced or a custom gadget modeled from scratch? Describe your idea and we&apos;ll send you a quote within 24 hours.
                  </p>
                  <Link
                    to="/custom"
                    search={{ path: "idea" }}
                    className="mt-4 rounded-full bg-accent px-6 py-2 text-sm font-medium text-ink hover:opacity-90 inline-flex items-center gap-1.5"
                  >
                    <span>Describe an Idea</span>
                    <span>&rarr;</span>
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-accent/20 bg-accent/5 p-4 text-xs text-muted flex items-start gap-3">
                    <Clock className="size-4 text-accent shrink-0 mt-0.5" />
                    <span>
                      Our engineering team reviews custom requests within 24 hours. Quotes and 3D modeling proposals are sent directly to your registered email address. You can reply directly to that email thread to continue the conversation.
                    </span>
                  </div>

                  {tickets.map((t: any) => {
                    let parsed: any = null;
                    try {
                      parsed = JSON.parse(t.description);
                    } catch {}

                    const isCustom = Boolean(parsed?.isCustomRequest);
                    const isOpen = t.status === "open";

                    return (
                      <div key={t.id} className="rounded-xl border border-border bg-surface p-5 shadow-sm space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/40 pb-3">
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-fg text-sm sm:text-base">
                                Request #{t.id}
                              </span>
                              {isCustom && (
                                <Badge className="bg-accent/15 text-accent border-accent/30 text-[10px] px-2 py-0.5 font-medium">
                                  Custom 3D Idea
                                </Badge>
                              )}
                              <Badge
                                className={cn(
                                  "capitalize text-[11px] px-2 py-0.5 font-medium rounded-full border",
                                  isOpen
                                    ? "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30"
                                    : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                                )}
                              >
                                {isOpen ? "Under Review (Quote in 24h)" : "Quote Provided / Resolved"}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted">
                              Submitted on {new Date(t.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                            </p>
                          </div>
                        </div>

                        <div>
                          <p className="text-xs font-semibold text-subtle uppercase tracking-wider mb-1">
                            Your Description:
                          </p>
                          <p className="text-sm text-fg whitespace-pre-wrap bg-surface-2/40 rounded-xl p-3 border border-border/40">
                            {parsed?.idea || t.description}
                          </p>
                        </div>

                        {parsed && (
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs pt-1">
                            <div className="rounded-lg border border-border/60 bg-surface-2/30 p-2">
                              <span className="text-muted block text-[10px]">Approx. Size</span>
                              <span className="font-medium text-fg">{parsed.sizeName}</span>
                            </div>
                            <div className="rounded-lg border border-border/60 bg-surface-2/30 p-2">
                              <span className="text-muted block text-[10px]">Material</span>
                              <span className="font-medium text-fg">{parsed.materialName}</span>
                            </div>
                            <div className="rounded-lg border border-border/60 bg-surface-2/30 p-2">
                              <span className="text-muted block text-[10px]">Colour</span>
                              <span className="font-medium text-fg capitalize">{parsed.colorName}</span>
                            </div>
                            <div className="rounded-lg border border-border/60 bg-surface-2/30 p-2">
                              <span className="text-muted block text-[10px]">Quantity</span>
                              <span className="font-medium text-fg">{parsed.quantity} unit{parsed.quantity > 1 ? "s" : ""}</span>
                            </div>
                          </div>
                        )}

                        {parsed?.photos && parsed.photos.length > 0 && (
                          <div className="pt-2 border-t border-border/30">
                            <span className="text-[11px] font-medium text-muted block mb-1.5">
                              Attached Reference Photos ({parsed.photos.length}):
                            </span>
                            <div className="flex flex-wrap gap-2">
                              {parsed.photos.map((src: string, idx: number) => (
                                <div key={idx} className="size-14 rounded-lg overflow-hidden border border-border bg-surface-2">
                                  <img src={src} alt={`Attachment ${idx + 1}`} className="size-full object-cover" />
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
