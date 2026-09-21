import { createFileRoute } from "@tanstack/react-router";
import { getUserOrders } from "@/lib/orders-fns";
import { getUserProfile, getAddresses } from "@/lib/user-profile-fns";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { formatINR } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { useCurrentUser } from "@/lib/auth/use-current-user";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { updateUserProfile, setDefaultAddress, deleteAddress } from "@/lib/user-profile-fns";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

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
              <img 
                src={`https://api.dicebear.com/7.x/notionists/svg?seed=${user.primaryEmail}&backgroundColor=e5e5e5`} 
                alt="Avatar" 
                className="w-16 h-16 rounded-full border border-border bg-surface-2"
              />
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

        {/* Orders List */}
        <div className="md:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Order History</h2>
            <Link to="/wishlist" className="text-sm font-medium text-primary hover:underline">View Wishlist →</Link>
          </div>
          
          {ordersLoading ? (
            <p className="mt-4 text-muted">Loading orders...</p>
          ) : !orders || orders.length === 0 ? (
            <div className="mt-4 flex flex-col items-center justify-center rounded-xl border border-dashed border-border p-12 text-center">
              <p className="text-lg font-medium">No orders yet</p>
              <p className="mt-1 text-sm text-muted">When you buy something, it will appear here.</p>
              <Link to="/" className="mt-4 rounded-full bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
                Start Shopping
              </Link>
            </div>
          ) : (
            <div className="mt-4 space-y-4">
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
      </div>
    </div>
  );
}
