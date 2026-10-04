import { createFileRoute, useRouter, useNavigate } from "@tanstack/react-router";
import { getAllOrdersAdmin, updateOrderStatus, deleteOrderAdmin, triggerDatabaseMaintenance } from "@/lib/orders-fns";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { formatINR } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useState, useEffect, useId } from "react";
import { cn } from "@/lib/utils";
import { Package, Box, X, Settings, Image as ImageIcon, BarChart3, Tag, ClipboardList, Shield, UserCog, HelpCircle, Users, Search, Trash2, Layers, Edit2, Plus, Eye, EyeOff, Printer as PrinterIcon, Disc, CreditCard, Mail, Bell } from "lucide-react";
import { InquiriesTab } from "@/components/inquiries-tab";
import { PrintersTab } from "@/components/printers-tab";
import { FilamentsTab } from "@/components/filaments-tab";
import { PaymentOptionsTab } from "@/components/payment-options-tab";
import { NotificationsTab } from "@/components/notifications-tab";
import { OrderDetailsDialog } from "@/components/order-details-dialog";
import { getMaterialsAdmin, createMaterial, updateMaterial, deleteMaterial, type Material, type MaterialInput } from "@/lib/materials-fns";
import { getAllProductsAdmin, deleteProduct, updateProduct, createProduct, updateProductInventory } from "@/lib/products-fns";
import { getAdminSiteSettings, getSiteSettings, updateSiteSettings } from "@/lib/settings-fns";
import { CustomPricingSettings } from "@/components/custom-pricing-settings";
import { LithophanePricingSettings } from "@/components/lithophane-pricing-settings";
import { PegboardSettings } from "@/components/pegboard-settings";
import { getCouponsAdmin, createCoupon, deleteCoupon, getAnalyticsAdmin } from "@/lib/ecommerce-fns";
import { getAdminTeam, addAdmin, removeAdmin, getAdminProfile, setAdminPin, requestPinResetOTP, resetAdminPinWithOTP, getAllUsersAdmin } from "@/lib/admin-fns";
import { getFaqsAdmin, createFaq, updateFaq, deleteFaq, reorderFaqs } from "@/lib/faq-fns";
import { type Product, type ProductImage } from "@/lib/products";
import { AreaChart, Area, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export const Route = createFileRoute("/admin")({
  validateSearch: (search: Record<string, unknown>) => ({
    tab: (search.tab as string) || "orders",
  }),
  component: AdminPage,
});

function AdminPage() {
  const { tab: activeTab } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const setActiveTab = (tab: string) => navigate({ search: { tab } });
  
  const queryClient = useQueryClient();
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [deletingOrder, setDeletingOrder] = useState<string | null>(null);
  const [orderSearchQuery, setOrderSearchQuery] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);

  const { data: orders, isLoading, error } = useQuery({
    queryKey: ["adminOrders"],
    queryFn: async () => {
      const data = await getAllOrdersAdmin();
      return data ?? [];
    },
    enabled: activeTab === "orders" || activeTab === "users",
    staleTime: 60_000,
  });

  const filteredOrders = orders?.filter((o: any) => {
    const q = orderSearchQuery.toLowerCase().replace(/^#/, '').trim();
    return (
      (o.order_number?.toLowerCase().includes(q) ?? false) ||
      (o.user_name?.toLowerCase().includes(q) ?? false) ||
      (o.user_email?.toLowerCase().includes(q) ?? false)
    );
  });

  const updateMutation = useMutation({
    mutationFn: async ({ order_number, status }: { order_number: string, status: string }) => {
      await updateOrderStatus({ data: { order_number, status } });
    },
    onMutate: ({ order_number }) => setUpdatingId(order_number),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminOrders"] });
      toast.success("Order status updated and customer notified!");
      setUpdatingId(null);
    },
    onError: () => {
      toast.error("Failed to update order status");
      setUpdatingId(null);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async ({ order_number, pin }: { order_number: string, pin?: string }) => {
      await deleteOrderAdmin({ data: { order_number, pin } });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminOrders"] });
      toast.success("Order permanently deleted.");
      setDeletingOrder(null);
    },
    onError: (err) => {
      toast.error(err.message || "Failed to delete order");
    }
  });

  if (error) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-24 text-center">
        <h1 className="font-display text-3xl font-semibold text-danger">Unauthorized</h1>
        <p className="mt-2 text-muted">You do not have administrative privileges to access this console.</p>
      </div>
    );
  }

  const navItems = [
    { id: "analytics", label: "Analytics", icon: BarChart3 },
    { id: "orders", label: "Orders", icon: Package },
    { id: "inquiries", label: "Inquiries", icon: Mail },
    { id: "printers", label: "Printers", icon: PrinterIcon },
    { id: "filaments", label: "Filaments", icon: Disc },
    { id: "products", label: "Products", icon: Box },
    { id: "inventory", label: "Inventory", icon: ClipboardList },
    { id: "materials", label: "Materials", icon: Layers },
    { id: "coupons", label: "Coupons", icon: Tag },
    { id: "faqs", label: "FAQs", icon: HelpCircle },
    { id: "admin-team", label: "Admin Team", icon: Shield },
    { id: "admin-profile", label: "Admin Profile", icon: UserCog },
    { id: "users", label: "Users", icon: Users },
    { id: "payments", label: "Payment Options", icon: CreditCard },
    { id: "settings", label: "Site Settings", icon: Settings },
    { id: "notifications", label: "Phone Alerts", icon: Bell },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-6 md:py-12 flex flex-col md:flex-row gap-8 items-start">
      {/* Responsive Navigation: horizontal swipeable ribbon on mobile/tablet, sticky vertical sidebar on desktop */}
      <aside className="w-full shrink-0 md:w-64 md:sticky md:top-20 md:self-start md:z-20 md:max-h-[calc(100dvh-5.5rem)] md:overflow-y-auto no-scrollbar">
        <div className="flex items-center justify-between mb-3 md:mb-5">
          <h1 className="font-display text-xl sm:text-2xl font-semibold tracking-tight">Admin Console</h1>
          <span className="md:hidden text-[11px] text-muted font-medium bg-surface-2 px-2.5 py-1 rounded-full border border-border">
            Swipe tabs →
          </span>
        </div>
        <div className="sticky top-14 sm:top-16 z-30 md:static -mx-4 px-4 py-1.5 md:mx-0 md:px-0 md:py-0 bg-bg/85 md:bg-transparent backdrop-blur-xl md:backdrop-blur-none">
          <nav className="flex md:flex-col gap-1.5 p-2 sm:p-2.5 md:p-3 rounded-2xl md:rounded-3xl border border-white/20 dark:border-white/10 bg-surface/50 backdrop-blur-2xl backdrop-saturate-150 shadow-xl shadow-black/5 overflow-x-auto md:overflow-visible no-scrollbar">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={cn(
                    "flex items-center gap-2 md:gap-3 rounded-xl px-3.5 py-2 md:px-4 md:py-2.5 text-xs sm:text-sm font-medium transition-all leading-none shrink-0 whitespace-nowrap cursor-pointer",
                    isActive
                      ? "bg-accent text-ink font-semibold shadow-xs"
                      : "text-muted hover:bg-surface-2 hover:text-fg"
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-w-0">
        {activeTab === "orders" && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
              <div>
                <h2 className="text-2xl font-semibold">Orders</h2>
                <p className="text-muted mt-1 text-sm">Manage all incoming 3D printing orders.</p>
              </div>
              <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                <div className="relative w-full sm:w-72">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted" />
                  <input
                    type="text"
                    placeholder="Search by order #, name or email..."
                    value={orderSearchQuery}
                    onChange={(e) => setOrderSearchQuery(e.target.value)}
                    className="w-full rounded-lg border border-border bg-surface-2 pl-9 pr-4 py-2 text-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent transition-colors"
                  />
                </div>
                <button
                  onClick={() => {
                    if (!filteredOrders) return;
                    const csv = [
                      ["Order Number", "Customer Name", "Customer Email", "Date", "Total", "Status", "Payment Status"],
                      ...filteredOrders.map((o: any) => [
                        o.order_number,
                        `"${o.user_name}"`,
                        o.user_email,
                        new Date(o.created_at).toLocaleDateString(),
                        o.total,
                        o.status,
                        o.payment_status
                      ])
                    ].map(e => e.join(",")).join("\n");
                    const blob = new Blob([csv], { type: 'text/csv' });
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `orders-${new Date().toISOString().split('T')[0]}.csv`;
                    a.click();
                    window.URL.revokeObjectURL(url);
                  }}
                  className="w-full sm:w-auto rounded-lg bg-accent px-4 py-2 text-sm font-medium text-ink hover:opacity-90 shrink-0"
                >
                  Export CSV
                </button>
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-border bg-surface">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-border bg-surface-2 text-muted">
                  <tr>
                    <th className="p-4 font-medium">Order</th>
                    <th className="p-4 font-medium">Customer</th>
                    <th className="p-4 font-medium">Date</th>
                    <th className="p-4 font-medium">Total</th>
                    <th className="p-4 font-medium">Status</th>
                    <th className="p-4 font-medium text-right w-64 min-w-[240px]">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {isLoading ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-muted">Loading orders...</td>
                    </tr>
                  ) : !filteredOrders || filteredOrders.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-muted">No orders found.</td>
                    </tr>
                  ) : (
                    filteredOrders.map((order: any) => (
                      <tr
                        key={order.id}
                        className="hover:bg-surface-2/60 transition-colors cursor-pointer group"
                        onClick={() => setSelectedOrder(order)}
                      >
                        <td className="p-4 font-medium text-accent group-hover:underline">
                          #{order.order_number}
                        </td>
                        <td className="p-4">
                          <div className="font-medium text-fg">{order.user_name}</div>
                          <div className="text-xs text-muted">{order.user_email}</div>
                        </td>
                        <td className="p-4 text-muted">{new Date(order.created_at).toLocaleDateString()}</td>
                        <td className="p-4 tabular-nums font-medium">{formatINR(order.total)}</td>
                        <td className="p-4">
                          <Badge className={order.status === 'pending' ? 'bg-secondary' : order.status === 'shipped' ? 'bg-primary' : order.status === 'printing' ? 'bg-accent text-accent-foreground' : 'bg-transparent border'}>
                            {order.status}
                          </Badge>
                          <div className="text-xs text-muted mt-1">Payment: {order.payment_status}</div>
                        </td>
                        <td className="p-4 text-right whitespace-nowrap w-64 min-w-[240px]" onClick={(e) => e.stopPropagation()}>
                          <div className="inline-flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setSelectedOrder(order)}
                              className="text-xs px-2.5 py-1.5 rounded-lg bg-surface-2 hover:bg-surface-3 transition-colors border border-border font-medium shadow-2xs"
                            >
                              Details
                            </button>
                            <select
                              className="text-xs rounded-lg border border-border bg-surface px-2 py-1.5 focus:ring-1 focus:ring-accent font-medium"
                              value={order.status}
                              onChange={(e) => updateMutation.mutate({ order_number: order.order_number, status: e.target.value })}
                              disabled={updatingId === order.order_number}
                            >
                              <option value="pending">Pending</option>
                              <option value="processing">Processing</option>
                              <option value="printing">Printing</option>
                              <option value="shipped">Shipped</option>
                              <option value="delivered">Delivered</option>
                              <option value="cancelled">Cancelled</option>
                            </select>
                            <button
                              type="button"
                              onClick={() => setDeletingOrder(order.order_number)}
                              className="text-xs px-2.5 py-1.5 rounded-lg bg-danger/10 text-danger hover:bg-danger/20 transition-colors border border-danger/20 font-medium"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "inquiries" && <InquiriesTab />}
        {activeTab === "printers" && <PrintersTab />}
        {activeTab === "filaments" && <FilamentsTab />}

        <PinConfirmModal
          isOpen={!!deletingOrder}
          onClose={() => setDeletingOrder(null)}
          onConfirm={(pin) => {
            if (deletingOrder) {
              deleteMutation.mutate({ order_number: deletingOrder, pin });
            }
          }}
          isLoading={deleteMutation.isPending}
        />

        {activeTab === "payments" && <PaymentOptionsTab />}
        {activeTab === "settings" && <SettingsTab />}
        {activeTab === "notifications" && <NotificationsTab />}
        {activeTab === "faqs" && <FaqsTab />}
        {activeTab === "admin-team" && <AdminTeamTab />}
        {activeTab === "admin-profile" && <AdminProfileTab />}
        {activeTab === "users" && <UsersTab orders={orders} />}

        {activeTab === "products" && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-semibold">Products</h2>
                <p className="text-muted mt-1 text-sm">Manage the products available in the shop.</p>
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-border bg-surface">
              <ProductsTable />
            </div>
          </div>
        )}

        {activeTab === "inventory" && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-semibold">Inventory</h2>
                <p className="text-muted mt-1 text-sm">Manage stock counts and view low-stock warnings.</p>
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-border bg-surface">
              <InventoryTable />
            </div>
          </div>
        )}

        {activeTab === "coupons" && (
          <CouponsTab />
        )}

        {activeTab === "analytics" && (
          <AnalyticsTab />
        )}

        {activeTab === "materials" && (
          <MaterialsTab />
        )}
      </main>

      {selectedOrder && (
        <OrderDetailsDialog
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onUpdateStatus={(newStatus) => {
            updateMutation.mutate({ order_number: selectedOrder.order_number, status: newStatus });
            setSelectedOrder((prev: any) => (prev ? { ...prev, status: newStatus } : null));
          }}
        />
      )}
    </div>
  );
}

function PinConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  isLoading
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (pin: string) => void;
  isLoading: boolean;
}) {
  const [pin, setPin] = useState("");

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 sm:p-6 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-150">
      <div className="relative w-full max-w-md max-h-[min(88vh,calc(100dvh-4rem))] flex flex-col rounded-2xl sm:rounded-3xl border border-border bg-surface shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between border-b border-border p-5 bg-surface shrink-0">
          <h2 className="text-lg font-bold">Confirm Deletion</h2>
          <button onClick={onClose} className="rounded-full p-2 hover:bg-surface-2 transition-colors text-muted hover:text-ink">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto flex-1">
          <p className="text-sm text-muted mb-4">
            Are you sure you want to permanently delete this order? This action cannot be undone.
            Please enter your 6-digit Admin PIN to confirm.
          </p>
          <input
            type="password"
            maxLength={6}
            placeholder="6-digit PIN"
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
            className="w-full rounded border border-border bg-surface-2 p-3 text-center text-xl tracking-widest"
          />
          <div className="mt-6 flex justify-end gap-3">
            <button
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 rounded-lg border border-border hover:bg-surface-2 text-sm font-medium"
            >
              Cancel
            </button>
            <button
              onClick={() => onConfirm(pin)}
              disabled={isLoading || pin.length !== 6}
              className="px-4 py-2 rounded-lg bg-danger text-white hover:opacity-90 text-sm font-medium disabled:opacity-50"
            >
              {isLoading ? "Deleting..." : "Delete Permanently"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProductsTable() {
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

function TagInput({ 
  tags, 
  setTags, 
  placeholder = "Type and press Enter...",
  className = "",
  suggestions = [],
  isColor = false
}: { 
  tags: string[], 
  setTags: (tags: string[]) => void, 
  placeholder?: string,
  className?: string,
  suggestions?: string[],
  isColor?: boolean
}) {
  const [input, setInput] = useState("");
  const datalistId = useId();
  return (
    <div className={className}>
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          list={suggestions.length > 0 ? datalistId : undefined}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              const newTag = input.trim();
              if (newTag && !tags.includes(newTag)) {
                setTags([...tags, newTag]);
                setInput("");
              }
            }
          }}
          placeholder={placeholder}
          className="flex-1 rounded-xl border border-border/50 bg-surface-2/50 backdrop-blur-sm px-4 py-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
        />
        {suggestions.length > 0 && (
          <datalist id={datalistId}>
            {suggestions.map(s => <option key={s} value={s} />)}
          </datalist>
        )}
        <button
          type="button"
          onClick={() => {
            const newTag = input.trim();
            if (newTag && !tags.includes(newTag)) {
              setTags([...tags, newTag]);
              setInput("");
            }
          }}
          className="rounded-xl bg-surface-2/80 px-5 py-2.5 text-sm font-medium border border-border/50 hover:bg-surface-3 transition-colors active:scale-95"
        >
          Add
        </button>
      </div>
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-3">
          {tags.map((t, i) => (
            <span key={i} className="flex items-center gap-1 rounded-full bg-accent/10 pl-3 pr-1 py-1 text-xs font-medium text-accent border border-accent/20">
              {isColor && (
                <span 
                  className="w-2.5 h-2.5 rounded-full border border-black/20 inline-block mr-1"
                  style={{ backgroundColor: t.toLowerCase().replace(/\s/g, "") }} 
                />
              )}
              {t}
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setTags(tags.filter((_, idx) => idx !== i));
                }}
                className="ml-1 flex size-5 items-center justify-center rounded-full hover:bg-accent/20 transition-colors"
              >
                <X className="size-3" />
              </button>
            </span>
          ))}
        </div>
      )}
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
    ? settings.product_categories.split(",").map(c => c.trim())
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

function SettingsTab() {
  const queryClient = useQueryClient();
  const router = useRouter();

  const { data: settings, isLoading, error } = useQuery({
    queryKey: ["adminSiteSettings"],
    queryFn: () => getAdminSiteSettings(),
    staleTime: 60_000,
  });

  const { data: products } = useQuery({
    queryKey: ["adminProducts"],
    queryFn: () => getAllProductsAdmin(),
    staleTime: 60_000,
  });

  const [heroSlots, setHeroSlots] = useState<{ slug: string; image?: string }[]>(() => {
    try {
      if (settings?.hero_featured_slots) {
        const parsed = JSON.parse(settings.hero_featured_slots);
        if (Array.isArray(parsed) && parsed.length === 4) return parsed;
      }
    } catch (_e) {
      // Fallback to default slots on parse error
    }
    return [
      { slug: "catch-bowl", image: "/products/catch-bowl.jpg" },
      { slug: "desk-tray", image: "/products/desk-tray.jpg" },
      { slug: "geo-planter", image: "/products/geo-planter.jpg" },
      { slug: "hex-coasters", image: "/products/hex-coasters.jpg" },
    ];
  });

  const [maintenanceStatus, setMaintenanceStatus] = useState<string | null>(null);
  const [isCleaning, setIsCleaning] = useState(false);

  useEffect(() => {
    if (settings?.hero_featured_slots) {
      try {
        const parsed = JSON.parse(settings.hero_featured_slots);
        if (Array.isArray(parsed) && parsed.length === 4) {
          setHeroSlots(parsed);
        }
      } catch (_e) {
        // Ignore JSON parse error on setting update
      }
    }
  }, [settings?.hero_featured_slots]);

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      await updateSiteSettings({ data });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["siteSettings"] });
      void router.invalidate();
      toast.success("Site settings updated!");
    },
    onError: (err: any) => {
      console.error("Failed to update site settings:", err);
      toast.error(err?.message || "Failed to update site settings");
    }
  });

  if (isLoading) return <div className="p-8">Loading settings...</div>;
  if (error || !settings) return <div className="p-8 text-danger">Failed to load settings</div>;

  const handleQuickSavePricing = async (pricingData: Record<string, string>) => {
    try {
      await updateMutation.mutateAsync(pricingData);
    } catch (err: any) {
      console.error("Failed to quick save custom pricing settings:", err);
    }
  };

  const handleRunMaintenance = async () => {
    setIsCleaning(true);
    try {
      const res = await triggerDatabaseMaintenance();
      if (res.report) {
        toast.success(
          `Storage cleanup complete! Pruned ${res.report.cartSessionsDeleted} carts, ${res.report.customFilesDeleted} temporary files, and ${res.report.recentlyViewedDeleted} logs.`
        );
        setMaintenanceStatus(
          `Last cleaned: ${new Date().toLocaleTimeString()} (Pruned ${res.report.customFilesDeleted} temp files, ${res.report.cartSessionsDeleted} carts)`
        );
      } else {
        toast.success("Storage is healthy and up-to-date.");
      }
    } catch (err: any) {
      toast.error("Cleanup failed: " + (err.message || String(err)));
    } finally {
      setIsCleaning(false);
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const data: Record<string, any> = {
      tagline: (fd.get("tagline") as string)?.trim(),
      email: (fd.get("email") as string)?.trim(),
      instagram: (fd.get("instagram") as string)?.trim(),
      copyright: (fd.get("copyright") as string)?.trim(),
      bottom_text: (fd.get("bottom_text") as string)?.trim(),
      hero_tagline: (fd.get("hero_tagline") as string)?.trim(),
      hero_description: (fd.get("hero_description") as string)?.trim(),
      about_story: (fd.get("about_story") as string)?.trim(),
      contact_email: (fd.get("contact_email") as string)?.trim() || "",
      contact_instagram: (fd.get("contact_instagram") as string)?.trim() || "",
      contact_address: (fd.get("contact_address") as string)?.trim() || "",
      contact_phone: (fd.get("contact_phone") as string)?.trim() || "",
      shipping_policy: (fd.get("shipping_policy") as string)?.trim(),
      returns_policy: (fd.get("returns_policy") as string)?.trim(),
      product_categories: ((fd.get("product_categories") as string) || settings?.product_categories || "Desk, Home, Bath").trim(),
      free_shipping_threshold: ((fd.get("free_shipping_threshold") as string) || settings?.free_shipping_threshold || "799").trim(),
      standard_shipping_fee: ((fd.get("standard_shipping_fee") as string) || settings?.standard_shipping_fee || "49").trim(),
      express_shipping_fee: ((fd.get("express_shipping_fee") as string) || settings?.express_shipping_fee || "129").trim(),
      cod_fee: ((fd.get("cod_fee") as string) || settings?.cod_fee || "40").trim(),
      promo_banner: ((fd.get("promo_banner") as string) || settings?.promo_banner || "").trim(),
      hero_featured_slots: JSON.stringify(heroSlots),
      custom_pricing_upload_formula: ((fd.get("custom_pricing_upload_formula") as string) || settings?.custom_pricing_upload_formula || "").trim(),
      custom_pricing_idea_formula: ((fd.get("custom_pricing_idea_formula") as string) || settings?.custom_pricing_idea_formula || "").trim(),
      custom_pricing_setup_fee: ((fd.get("custom_pricing_setup_fee") as string) || settings?.custom_pricing_setup_fee || "49").trim(),
      custom_pricing_min_print: ((fd.get("custom_pricing_min_print") as string) || settings?.custom_pricing_min_print || "99").trim(),
      custom_pricing_materials: ((fd.get("custom_pricing_materials") as string) || settings?.custom_pricing_materials || "").trim(),
      custom_pricing_qualities: ((fd.get("custom_pricing_qualities") as string) || settings?.custom_pricing_qualities || "").trim(),
      custom_pricing_infills: ((fd.get("custom_pricing_infills") as string) || settings?.custom_pricing_infills || "").trim(),
      custom_pricing_size_presets: ((fd.get("custom_pricing_size_presets") as string) || settings?.custom_pricing_size_presets || "").trim(),
      custom_pricing_complexities: ((fd.get("custom_pricing_complexities") as string) || settings?.custom_pricing_complexities || "").trim(),
      lithophane_price_medium: ((fd.get("lithophane_price_medium") as string) || settings?.lithophane_price_medium || "399").trim(),
      lithophane_price_standard: ((fd.get("lithophane_price_standard") as string) || settings?.lithophane_price_standard || "549").trim(),
      lithophane_price_large: ((fd.get("lithophane_price_large") as string) || settings?.lithophane_price_large || "749").trim(),
      lithophane_lightbox_addon_medium: ((fd.get("lithophane_lightbox_addon_medium") as string) || settings?.lithophane_lightbox_addon_medium || "249").trim(),
      lithophane_lightbox_addon_standard: ((fd.get("lithophane_lightbox_addon_standard") as string) || settings?.lithophane_lightbox_addon_standard || "299").trim(),
      lithophane_lightbox_addon_large: ((fd.get("lithophane_lightbox_addon_large") as string) || settings?.lithophane_lightbox_addon_large || "399").trim(),
      lithophane_gift_packaging_fee: ((fd.get("lithophane_gift_packaging_fee") as string) || settings?.lithophane_gift_packaging_fee || "99").trim(),
      lithophane_bulk_discount_5: ((fd.get("lithophane_bulk_discount_5") as string) || settings?.lithophane_bulk_discount_5 || "5").trim(),
      lithophane_bulk_discount_10: ((fd.get("lithophane_bulk_discount_10") as string) || settings?.lithophane_bulk_discount_10 || "10").trim(),
      lithophane_bulk_discount_20: ((fd.get("lithophane_bulk_discount_20") as string) || settings?.lithophane_bulk_discount_20 || "15").trim(),
      brand_name: ((fd.get("brand_name") as string) || settings?.brand_name || "prynth!").trim(),
      announcement_enabled: fd.get("announcement_enabled") === "on" ? "true" : "false",
      about_headline: ((fd.get("about_headline") as string) || settings?.about_headline || "").trim(),
      about_pillar1_title: ((fd.get("about_pillar1_title") as string) || settings?.about_pillar1_title || "").trim(),
      about_pillar1_desc: ((fd.get("about_pillar1_desc") as string) || settings?.about_pillar1_desc || "").trim(),
      about_pillar2_title: ((fd.get("about_pillar2_title") as string) || settings?.about_pillar2_title || "").trim(),
      about_pillar2_desc: ((fd.get("about_pillar2_desc") as string) || settings?.about_pillar2_desc || "").trim(),
      about_pillar3_title: ((fd.get("about_pillar3_title") as string) || settings?.about_pillar3_title || "").trim(),
      about_pillar3_desc: ((fd.get("about_pillar3_desc") as string) || settings?.about_pillar3_desc || "").trim(),
      contact_hours: ((fd.get("contact_hours") as string) || settings?.contact_hours || "").trim(),
      contact_whatsapp: ((fd.get("contact_whatsapp") as string) || settings?.contact_whatsapp || "").trim(),
      social_twitter: ((fd.get("social_twitter") as string) || settings?.social_twitter || "").trim(),
      social_youtube: ((fd.get("social_youtube") as string) || settings?.social_youtube || "").trim(),
      pegboard_hero_title: ((fd.get("pegboard_hero_title") as string) || settings?.pegboard_hero_title || "").trim(),
      pegboard_hero_subtitle: ((fd.get("pegboard_hero_subtitle") as string) || settings?.pegboard_hero_subtitle || "").trim(),
      pegboard_badge: ((fd.get("pegboard_badge") as string) || settings?.pegboard_badge || "").trim(),
      pegboard_size_presets: ((fd.get("pegboard_size_presets") as string) || settings?.pegboard_size_presets || "").trim(),
      pegboard_price_compact: ((fd.get("pegboard_price_compact") as string) || settings?.pegboard_price_compact || "699").trim(),
      pegboard_price_studio: ((fd.get("pegboard_price_studio") as string) || settings?.pegboard_price_studio || "999").trim(),
      pegboard_price_executive: ((fd.get("pegboard_price_executive") as string) || settings?.pegboard_price_executive || "1499").trim(),
      pegboard_price_duo: ((fd.get("pegboard_price_duo") as string) || settings?.pegboard_price_duo || "1799").trim(),
      pegboard_addon_tech_price: ((fd.get("pegboard_addon_tech_price") as string) || settings?.pegboard_addon_tech_price || "299").trim(),
      pegboard_addon_desk_price: ((fd.get("pegboard_addon_desk_price") as string) || settings?.pegboard_addon_desk_price || "249").trim(),
      pegboard_addon_botanical_price: ((fd.get("pegboard_addon_botanical_price") as string) || settings?.pegboard_addon_botanical_price || "279").trim(),
      pegboard_story: ((fd.get("pegboard_story") as string) || settings?.pegboard_story || "").trim(),
      payment_online_enabled: fd.get("payment_online_enabled") === "on" ? "true" : "false",
      payment_cod_enabled: fd.get("payment_cod_enabled") === "on" ? "true" : "false",
      payment_upi_enabled: fd.get("payment_upi_enabled") === "on" ? "true" : "false",
      payment_upi_id: ((fd.get("payment_upi_id") as string) || "").trim(),
      resend_from_email: ((fd.get("resend_from_email") as string) || "").trim(),
      razorpay_key_id: ((fd.get("razorpay_key_id") as string) || "").trim(),
    };
    const secretInput = ((fd.get("razorpay_key_secret") as string) || "").trim();
    if (secretInput && !secretInput.includes("•")) {
      data.razorpay_key_secret = secretInput;
    }
    updateMutation.mutate(data);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div>
        <h2 className="text-2xl font-semibold">Site Settings</h2>
        <p className="text-muted mt-1 text-sm">Update the global content across your site.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-12 max-w-3xl">
        {/* HOMEPAGE SECTION */}
        <section className="space-y-5">
          <h3 className="text-lg font-semibold border-b border-border pb-2">Homepage & Hero Showcase</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Brand Name / Store Name</label>
              <input name="brand_name" defaultValue={settings.brand_name || "prynth!"} required className="w-full rounded border border-border bg-surface p-2 text-sm" />
            </div>
            <div className="flex items-center pt-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  name="announcement_enabled"
                  defaultChecked={settings.announcement_enabled !== "false"}
                  className="size-4 rounded border-border accent-accent"
                />
                <span className="text-sm font-medium">Show Announcement Promo Pill on Homepage</span>
              </label>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Hero Tagline</label>
            <input name="hero_tagline" defaultValue={settings.hero_tagline} required className="w-full rounded border border-border bg-surface p-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Hero Description</label>
            <textarea name="hero_description" defaultValue={settings.hero_description} required rows={3} className="w-full rounded border border-border bg-surface p-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Floating Promo Pill / Free Delivery Banner</label>
            <input
              name="promo_banner"
              defaultValue={settings.promo_banner || `Free delivery across India on orders over ₹${settings.free_shipping_threshold || "799"}`}
              className="w-full rounded border border-border bg-surface p-2 text-sm"
              placeholder="Free delivery across India on orders over ₹799"
            />
            <p className="text-xs text-muted mt-1">Badge shown above hero on the homepage. (Leave empty to auto-update based on the free delivery threshold below).</p>
          </div>

          {/* 4-SLOT HERO SHOWCASE SELECTOR */}
          <div className="rounded-xl border border-border bg-surface-2/40 p-5 space-y-4">
            <div>
              <h4 className="font-semibold text-base text-fg">Hero 2×2 Showcase Products & Images</h4>
              <p className="text-xs text-muted mt-0.5">Select the 4 products to show in the 2×2 grid on the homepage hero, and pick which photo from their gallery to display.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { title: "Slot 1 (Top Left)", index: 0 },
                { title: "Slot 2 (Top Right)", index: 1 },
                { title: "Slot 3 (Bottom Left)", index: 2 },
                { title: "Slot 4 (Bottom Right)", index: 3 },
              ].map(({ title, index }) => {
                const currentSlot = heroSlots[index] || { slug: products?.[index]?.slug || "", image: products?.[index]?.image || "" };
                const currentProduct = products?.find((p: any) => p.slug === currentSlot.slug) || products?.[index];

                const productImages = currentProduct
                  ? Array.from(new Set([
                      currentProduct.image,
                      ...(currentProduct.gallery || []).map((g: any) => typeof g === "string" ? g : g.url),
                    ].filter(Boolean)))
                  : [];

                const activeImage = currentSlot.image || currentProduct?.image || "";

                return (
                  <div key={index} className="rounded-xl border border-border bg-surface p-4 space-y-3 shadow-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold uppercase tracking-wider text-accent">{title}</span>
                      {activeImage && (
                        <img src={activeImage} alt="Preview" className="w-10 h-10 rounded-lg object-cover border border-border shrink-0" />
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-muted mb-1">Choose Product</label>
                      <select
                        className="w-full rounded border border-border bg-surface-2 p-2 text-xs text-fg focus:ring-1 focus:ring-accent"
                        value={currentSlot.slug || currentProduct?.slug || ""}
                        onChange={(e) => {
                          const newSlug = e.target.value;
                          const chosen = products?.find((p: any) => p.slug === newSlug);
                          const next = [...heroSlots];
                          next[index] = {
                            slug: newSlug,
                            image: chosen?.image || "",
                          };
                          setHeroSlots(next);
                        }}
                      >
                        {products?.map((p: any) => (
                          <option key={p.slug} value={p.slug}>
                            {p.name} ({p.slug})
                          </option>
                        ))}
                      </select>
                    </div>

                    {productImages.length > 0 && (
                      <div>
                        <label className="block text-xs font-medium text-muted mb-1.5">Select Display Image</label>
                        <div className="flex flex-wrap gap-2">
                          {productImages.map((imgUrl, imgIdx) => {
                            const isSelected = activeImage === imgUrl;
                            return (
                              <button
                                key={imgIdx}
                                type="button"
                                onClick={() => {
                                  const next = [...heroSlots];
                                  next[index] = {
                                    slug: currentSlot.slug || currentProduct?.slug || "",
                                    image: imgUrl,
                                  };
                                  setHeroSlots(next);
                                }}
                                className={cn(
                                  "relative rounded-lg overflow-hidden border-2 transition-all p-0.5",
                                  isSelected ? "border-accent ring-2 ring-accent/30" : "border-transparent opacity-65 hover:opacity-100 hover:border-border"
                                )}
                              >
                                <img src={imgUrl} alt={`Option ${imgIdx + 1}`} className="w-12 h-12 object-cover rounded-md" />
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="block text-xs font-medium text-muted mb-1">Image URL (or custom link)</label>
                      <input
                        type="text"
                        value={currentSlot.image || ""}
                        onChange={(e) => {
                          const next = [...heroSlots];
                          next[index] = {
                            slug: currentSlot.slug || currentProduct?.slug || "",
                            image: e.target.value.trim(),
                          };
                          setHeroSlots(next);
                        }}
                        placeholder="e.g. /products/catch-bowl.jpg"
                        className="w-full rounded border border-border bg-surface-2 p-1.5 text-xs text-fg"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* SHIPPING & DELIVERY RATES SECTION */}
        <section className="space-y-4">
          <h3 className="text-lg font-semibold border-b border-border pb-2">Shipping & Delivery Rates</h3>
          <p className="text-xs text-muted">Configure shipping thresholds and courier fees used across the homepage, cart calculation, and checkout.</p>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Free Delivery Threshold (₹)</label>
              <input
                type="number"
                min="0"
                step="1"
                name="free_shipping_threshold"
                defaultValue={settings.free_shipping_threshold || "799"}
                required
                className="w-full rounded border border-border bg-surface p-2 text-sm"
                placeholder="799"
              />
              <p className="text-xs text-muted mt-1">Orders at or above this cart amount unlock free standard delivery.</p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Standard Shipping Fee (₹)</label>
              <input
                type="number"
                min="0"
                step="1"
                name="standard_shipping_fee"
                defaultValue={settings.standard_shipping_fee || "49"}
                required
                className="w-full rounded border border-border bg-surface p-2 text-sm"
                placeholder="49"
              />
              <p className="text-xs text-muted mt-1">Standard 3–5 day delivery fee charged for orders below threshold.</p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Express Shipping Fee (₹)</label>
              <input
                type="number"
                min="0"
                step="1"
                name="express_shipping_fee"
                defaultValue={settings.express_shipping_fee || "129"}
                required
                className="w-full rounded border border-border bg-surface p-2 text-sm"
                placeholder="129"
              />
              <p className="text-xs text-muted mt-1">Faster 1–2 day courier fee.</p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Cash on Delivery (COD) Fee (₹)</label>
              <input
                type="number"
                min="0"
                step="1"
                name="cod_fee"
                defaultValue={settings.cod_fee || "40"}
                required
                className="w-full rounded border border-border bg-surface p-2 text-sm"
                placeholder="40"
              />
              <p className="text-xs text-muted mt-1">Collection fee added when customer selects Cash on Delivery.</p>
            </div>
          </div>
        </section>

        {/* CUSTOM PRINT PRICING & FORMULAS SECTION */}
        <CustomPricingSettings
          settings={settings}
          onQuickSave={handleQuickSavePricing}
          isSaving={updateMutation.isPending}
        />

        {/* LITHOPHANE STUDIO & LIGHT BOX PRICING SECTION */}
        <LithophanePricingSettings
          settings={settings}
          onQuickSave={handleQuickSavePricing}
          isSaving={updateMutation.isPending}
        />

        {/* STAR PRODUCT: MODULAR PEGBOARD SETTINGS */}
        <PegboardSettings
          settings={settings}
          onQuickSave={handleQuickSavePricing}
          isSaving={updateMutation.isPending}
        />

        {/* SHOP & CATEGORIES SECTION */}
        <section className="space-y-4">
          <h3 className="text-lg font-semibold border-b border-border pb-2">Shop & Categories</h3>
          <div>
            <label className="block text-sm font-medium mb-1">Product Categories (comma-separated)</label>
            <input
              name="product_categories"
              defaultValue={settings.product_categories || "Desk, Home, Bath"}
              required
              className="w-full rounded border border-border bg-surface p-2 text-sm"
              placeholder="Desk, Home, Bath"
            />
            <p className="text-xs text-muted mt-1">Categories displayed on the shop filters and product creation forms.</p>
          </div>
        </section>

        {/* ABOUT SECTION */}
        <section className="space-y-4">
          <h3 className="text-lg font-semibold border-b border-border pb-2">About Us</h3>
          <div>
            <label className="block text-sm font-medium mb-1">About Page Headline</label>
            <input
              name="about_headline"
              defaultValue={settings.about_headline || "Honest prices. Good prints. For people who just need the thing."}
              required
              className="w-full rounded border border-border bg-surface p-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Our Story (paragraphs separated by blank lines)</label>
            <textarea name="about_story" defaultValue={settings.about_story} required rows={8} className="w-full rounded border border-border bg-surface p-2 text-sm" />
          </div>

          <div className="rounded-xl border border-border bg-surface-2/40 p-4 space-y-4">
            <h4 className="text-sm font-semibold text-fg">Three Core Value Pillars</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="space-y-2 p-3 rounded-lg border border-border bg-surface">
                <span className="text-xs font-semibold text-accent uppercase">Pillar 1</span>
                <input
                  name="about_pillar1_title"
                  defaultValue={settings.about_pillar1_title || "The price is the price"}
                  placeholder="Pillar 1 Title"
                  className="w-full rounded border border-border bg-surface-2 p-1.5 text-xs font-medium"
                />
                <textarea
                  name="about_pillar1_desc"
                  defaultValue={settings.about_pillar1_desc || "No setup surprises, no colour upcharge on the listed palette, no 'from' pricing."}
                  placeholder="Pillar 1 Description"
                  rows={3}
                  className="w-full rounded border border-border bg-surface-2 p-1.5 text-xs"
                />
              </div>

              <div className="space-y-2 p-3 rounded-lg border border-border bg-surface">
                <span className="text-xs font-semibold text-accent uppercase">Pillar 2</span>
                <input
                  name="about_pillar2_title"
                  defaultValue={settings.about_pillar2_title || "Everyday, not exclusive"}
                  placeholder="Pillar 2 Title"
                  className="w-full rounded border border-border bg-surface-2 p-1.5 text-xs font-medium"
                />
                <textarea
                  name="about_pillar2_desc"
                  defaultValue={settings.about_pillar2_desc || "Built for people who want a stand or a hook, not a lecture on nozzles."}
                  placeholder="Pillar 2 Description"
                  rows={3}
                  className="w-full rounded border border-border bg-surface-2 p-1.5 text-xs"
                />
              </div>

              <div className="space-y-2 p-3 rounded-lg border border-border bg-surface">
                <span className="text-xs font-semibold text-accent uppercase">Pillar 3</span>
                <input
                  name="about_pillar3_title"
                  defaultValue={settings.about_pillar3_title || "If it's wrong, we redo it"}
                  placeholder="Pillar 3 Title"
                  className="w-full rounded border border-border bg-surface-2 p-1.5 text-xs font-medium"
                />
                <textarea
                  name="about_pillar3_desc"
                  defaultValue={settings.about_pillar3_desc || "Prints are checked. Returns are simple. See the returns page for the details."}
                  placeholder="Pillar 3 Description"
                  rows={3}
                  className="w-full rounded border border-border bg-surface-2 p-1.5 text-xs"
                />
              </div>
            </div>
          </div>
        </section>

        {/* CONTACT SECTION */}
        <section className="space-y-4">
          <h3 className="text-lg font-semibold border-b border-border pb-2">Contact Page</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Support Email</label>
              <input type="email" name="contact_email" defaultValue={settings.contact_email} className="w-full rounded border border-border bg-surface p-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Instagram Handle</label>
              <input name="contact_instagram" defaultValue={settings.contact_instagram} className="w-full rounded border border-border bg-surface p-2 text-sm" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Phone Number</label>
              <input name="contact_phone" defaultValue={settings.contact_phone} className="w-full rounded border border-border bg-surface p-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">WhatsApp Number / Direct Chat</label>
              <input name="contact_whatsapp" defaultValue={settings.contact_whatsapp || "+91 98765 43210"} placeholder="+91 98765 43210" className="w-full rounded border border-border bg-surface p-2 text-sm" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Operating Business Hours</label>
              <input name="contact_hours" defaultValue={settings.contact_hours || "Monday – Saturday: 10:00 AM – 7:00 PM IST"} className="w-full rounded border border-border bg-surface p-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Physical Operating Address</label>
              <input name="contact_address" defaultValue={settings.contact_address} placeholder="City, State, India" className="w-full rounded border border-border bg-surface p-2 text-sm" />
            </div>
          </div>
        </section>

        {/* POLICIES SECTION */}
        <section className="space-y-4">
          <h3 className="text-lg font-semibold border-b border-border pb-2">Policies</h3>
          <div>
            <label className="block text-sm font-medium mb-1">Shipping Policy</label>
            <textarea name="shipping_policy" defaultValue={settings.shipping_policy} required rows={4} className="w-full rounded border border-border bg-surface p-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Returns Policy</label>
            <textarea name="returns_policy" defaultValue={settings.returns_policy} required rows={4} className="w-full rounded border border-border bg-surface p-2 text-sm" />
          </div>
        </section>

        {/* PAYMENT & EMAIL LIVE GATEWAYS SECTION */}
        <section className="space-y-6 rounded-2xl border border-border bg-surface-2/40 p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
            <div>
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <span>💳</span> Payment Gateway & Email Verification (Live Setup)
              </h3>
              <p className="text-xs text-muted mt-0.5">
                Configure Razorpay credentials and Resend sender email to transition out of test modes.
              </p>
            </div>
            {/* Live status badge */}
            <div className="flex items-center gap-2">
              {(settings.razorpay_key_id?.startsWith("rzp_live_")) ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                  <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Razorpay Live Mode
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-500 border border-amber-500/20">
                  <span className="size-1.5 rounded-full bg-amber-500" />
                  Razorpay Test Mode
                </span>
              )}
            </div>
          </div>

          {/* Resend Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <span>✉️</span> Resend Custom Domain & Sender Email
              </h4>
              <span className="text-xs font-mono text-muted">
                {settings.resend_from_email && !settings.resend_from_email.includes("resend.dev") ? "Verified Domain Mode" : "Sandbox Test Mode (onboarding@resend.dev)"}
              </span>
            </div>
            <div>
              <label className="block text-xs font-medium text-subtle mb-1">
                From Sender Email (e.g. Prynth &lt;orders@prynth.in&gt; or hello@prynth.in)
              </label>
              <input
                name="resend_from_email"
                defaultValue={settings.resend_from_email || "Prynth <orders@prynth.in>"}
                placeholder="Prynth <orders@prynth.in>"
                className="w-full rounded border border-border bg-surface p-2 text-sm font-mono"
              />
              <p className="text-xs text-muted mt-1.5 leading-relaxed">
                💡 To send from your email without Resend test restrictions, add your domain at <a href="https://resend.com/domains" target="_blank" rel="noreferrer" className="text-accent underline font-medium">resend.com/domains</a> and add the 3 DNS records (DKIM, SPF, DMARC) at your domain host.
              </p>
            </div>
          </div>

          {/* Razorpay Section */}
          <div className="space-y-4 pt-4 border-t border-border">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <span>⚡</span> Razorpay Live Credentials
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-subtle mb-1">
                  Razorpay Key ID (rzp_live_... or rzp_test_...)
                </label>
                <input
                  name="razorpay_key_id"
                  defaultValue={settings.razorpay_key_id}
                  placeholder="rzp_live_..."
                  className="w-full rounded border border-border bg-surface p-2 text-sm font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-subtle mb-1">
                  Razorpay Key Secret
                </label>
                <input
                  type="password"
                  name="razorpay_key_secret"
                  defaultValue=""
                  placeholder={settings.has_razorpay_secret ? "•••••••••••••••• (Configured — leave blank to keep)" : "Enter Razorpay Secret"}
                  className="w-full rounded border border-border bg-surface p-2 text-sm font-mono"
                  autoComplete="new-password"
                />
              </div>
            </div>
            <p className="text-xs text-muted">
              Once your Razorpay KYC verification is approved, toggle to <strong>Live Mode</strong> in your Razorpay dashboard, generate Live API keys, and paste them here or in your Vercel environment variables.
            </p>
          </div>

          {/* Payment Toggles */}
          <div className="space-y-3 pt-4 border-t border-border">
            <h4 className="text-sm font-semibold">Store Checkout Payment Methods</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <label className="flex items-center gap-2 rounded-xl border border-border bg-surface p-3 cursor-pointer hover:bg-surface-2 transition-colors">
                <input
                  type="checkbox"
                  name="payment_online_enabled"
                  defaultChecked={settings.payment_online_enabled !== "false"}
                  className="size-4 rounded border-border accent-accent cursor-pointer"
                />
                <div className="text-xs">
                  <span className="font-medium block text-fg">Razorpay Online</span>
                  <span className="text-muted">UPI, Cards, Netbanking</span>
                </div>
              </label>

              <label className="flex items-center gap-2 rounded-xl border border-border bg-surface p-3 cursor-pointer hover:bg-surface-2 transition-colors">
                <input
                  type="checkbox"
                  name="payment_cod_enabled"
                  defaultChecked={settings.payment_cod_enabled !== "false"}
                  className="size-4 rounded border-border accent-accent cursor-pointer"
                />
                <div className="text-xs">
                  <span className="font-medium block text-fg">Cash on Delivery</span>
                  <span className="text-muted">Pay on courier delivery</span>
                </div>
              </label>

              <label className="flex items-center gap-2 rounded-xl border border-border bg-surface p-3 cursor-pointer hover:bg-surface-2 transition-colors">
                <input
                  type="checkbox"
                  name="payment_upi_enabled"
                  defaultChecked={settings.payment_upi_enabled !== "false"}
                  className="size-4 rounded border-border accent-accent cursor-pointer"
                />
                <div className="text-xs">
                  <span className="font-medium block text-fg">Direct UPI / QR</span>
                  <span className="text-muted">Scan QR & enter UTR</span>
                </div>
              </label>
            </div>

            <div>
              <label className="block text-xs font-medium text-subtle mb-1">
                Direct UPI ID (for manual QR payments)
              </label>
              <input
                name="payment_upi_id"
                defaultValue={settings.payment_upi_id}
                placeholder="e.g. prynth@okhdfcbank"
                className="w-full rounded border border-border bg-surface p-2 text-sm font-mono"
              />
            </div>
          </div>

          {/* Razorpay Merchant Compliance Status Checklist */}
          <div className="pt-4 border-t border-border">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-subtle mb-2">
              Razorpay KYC Compliance Checklist (Audit Ready)
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-2 text-emerald-500">
                <span>✓</span> <span>Contact Us page (Email, Phone, Operating Address)</span>
              </div>
              <div className="flex items-center gap-2 text-emerald-500">
                <span>✓</span> <span>Terms & Conditions (Governing Law & Razorpay clause)</span>
              </div>
              <div className="flex items-center gap-2 text-emerald-500">
                <span>✓</span> <span>Refund & Cancellation (5–7 days timeline & mode)</span>
              </div>
              <div className="flex items-center gap-2 text-emerald-500">
                <span>✓</span> <span>Shipping Policy (Estimated 3–5 days across India)</span>
              </div>
            </div>
          </div>
        </section>

        {/* FOOTER SECTION */}
        <section className="space-y-4">
          <h3 className="text-lg font-semibold border-b border-border pb-2">Global Footer</h3>
          <div>
            <label className="block text-sm font-medium mb-1">Footer Tagline</label>
            <input name="tagline" defaultValue={settings.tagline} required className="w-full rounded border border-border bg-surface p-2 text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Footer Email</label>
              <input type="email" name="email" defaultValue={settings.email} required className="w-full rounded border border-border bg-surface p-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Footer Instagram</label>
              <input name="instagram" defaultValue={settings.instagram} required className="w-full rounded border border-border bg-surface p-2 text-sm" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Twitter / X Handle</label>
              <input name="social_twitter" defaultValue={settings.social_twitter || "@prynth"} placeholder="@prynth" className="w-full rounded border border-border bg-surface p-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">YouTube Channel URL</label>
              <input name="social_youtube" defaultValue={settings.social_youtube || ""} placeholder="https://youtube.com/@prynth" className="w-full rounded border border-border bg-surface p-2 text-sm" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Copyright Text</label>
              <input name="copyright" defaultValue={settings.copyright} required className="w-full rounded border border-border bg-surface p-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Bottom Text</label>
              <input name="bottom_text" defaultValue={settings.bottom_text} required className="w-full rounded border border-border bg-surface p-2 text-sm" />
            </div>
          </div>
        </section>

        {/* DATABASE STORAGE & PERFORMANCE MAINTENANCE */}
        <section className="space-y-4 rounded-2xl border border-border bg-surface-2/40 p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold flex items-center gap-2">
                <span>🧹</span> Database Storage &amp; Cache Maintenance
              </h3>
              <p className="text-xs text-muted mt-0.5">
                Automatically prunes expired guest carts, stale visitor history, and abandoned 3D files to keep your Neon PostgreSQL database lean and responsive.
              </p>
            </div>
            <button
              type="button"
              onClick={handleRunMaintenance}
              disabled={isCleaning}
              className="shrink-0 px-4 py-2 rounded-xl bg-surface hover:bg-surface-2 border border-border text-xs font-semibold text-fg transition-all shadow-xs cursor-pointer flex items-center gap-2"
            >
              <span>{isCleaning ? "Optimizing Storage..." : "⚡ Run Storage Cleanup Now"}</span>
            </button>
          </div>
          {maintenanceStatus && (
            <p className="text-xs text-emerald-500 font-medium bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-lg">
              {maintenanceStatus}
            </p>
          )}
        </section>

        <div className="pt-6 border-t border-border flex items-center justify-between">
          <button type="submit" disabled={updateMutation.isPending} className="px-6 py-3 rounded-lg bg-accent text-ink hover:opacity-90 text-sm font-medium cursor-pointer shadow-xs">
            {updateMutation.isPending ? "Saving..." : "Save All Settings"}
          </button>
        </div>
      </form>
    </div>
  );
}

function AnalyticsTab() {
  const { data: analytics, isLoading, error } = useQuery({
    queryKey: ["adminAnalytics"],
    queryFn: () => getAnalyticsAdmin(),
    refetchInterval: 15000,
  });

  if (isLoading) return <div className="p-8 text-center text-muted">Loading analytics...</div>;
  if (error || !analytics) return <div className="p-8 text-danger">Failed to load analytics</div>;

  const CustomTooltip = ({ active, payload, label, formatter }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-xl border border-white/20 dark:border-white/10 bg-surface/50 backdrop-blur-2xl backdrop-saturate-150 p-4 shadow-2xl shadow-black/10">
          <p className="text-sm text-muted mb-1">{label}</p>
          <p className="text-sm font-semibold text-accent">
            {formatter ? formatter(payload[0].value) : payload[0].value}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div>
        <h2 className="text-2xl font-semibold bg-gradient-to-r from-ink to-ink/60 bg-clip-text text-transparent">Analytics Dashboard</h2>
        <p className="text-muted mt-1 text-sm font-mono tracking-tight">Real-time metrics & telemetry.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-white/20 dark:border-white/10 bg-surface/30 backdrop-blur-2xl backdrop-saturate-150 p-6 shadow-xl shadow-black/5 transition-all hover:bg-surface/40">
          <div className="text-xs font-medium text-muted uppercase tracking-wider">Total Revenue</div>
          <div className="mt-2 text-2xl font-bold">{formatINR(analytics.revenue)}</div>
        </div>
        <div className="rounded-2xl border border-white/20 dark:border-white/10 bg-surface/30 backdrop-blur-2xl backdrop-saturate-150 p-6 shadow-xl shadow-black/5 transition-all hover:bg-surface/40">
          <div className="text-xs font-medium text-muted uppercase tracking-wider">Total Orders</div>
          <div className="mt-2 text-2xl font-bold">{analytics.ordersCount}</div>
        </div>
        <div className="rounded-2xl border border-white/20 dark:border-white/10 bg-surface/30 backdrop-blur-2xl backdrop-saturate-150 p-6 shadow-xl shadow-black/5 transition-all hover:bg-surface/40">
          <div className="text-xs font-medium text-muted uppercase tracking-wider">Total Users</div>
          <div className="mt-2 text-2xl font-bold">{analytics.usersCount}</div>
        </div>
        <div className="rounded-2xl border border-accent/30 bg-accent/10 backdrop-blur-2xl backdrop-saturate-150 p-6 shadow-xl shadow-accent/5 transition-all hover:bg-accent/15">
          <div className="text-xs font-medium text-accent uppercase tracking-wider flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-accent"></span>
            </span>
            Active Now (10 min)
          </div>
          <div className="mt-2 text-2xl font-bold text-accent">{analytics.activeUsers10m}</div>
          <div className="mt-1 text-xs text-muted">Last 24h: {analytics.activeUsers24h}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Trend */}
        <div className="rounded-3xl border border-white/20 dark:border-white/10 bg-surface/30 backdrop-blur-2xl backdrop-saturate-150 p-6 shadow-xl shadow-black/5 flex flex-col h-[350px]">
          <h3 className="text-sm font-medium text-muted mb-6 uppercase tracking-wider">Revenue Trend</h3>
          <div className="flex-1 w-full min-h-0">
            {analytics.revenueOverTime?.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={analytics.revenueOverTime} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-border/30" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'currentColor', opacity: 0.5 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'currentColor', opacity: 0.5 }} tickFormatter={(val) => `₹${val/1000}k`} />
                  <Tooltip content={<CustomTooltip formatter={(val: number) => formatINR(val)} />} cursor={{ stroke: 'currentColor', strokeOpacity: 0.1, strokeWidth: 2 }} />
                  <Area type="monotone" dataKey="value" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorRevenue)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted">No data yet</div>
            )}
          </div>
        </div>

        {/* Order Volume */}
        <div className="rounded-3xl border border-white/20 dark:border-white/10 bg-surface/30 backdrop-blur-2xl backdrop-saturate-150 p-6 shadow-xl shadow-black/5 flex flex-col h-[350px]">
          <h3 className="text-sm font-medium text-muted mb-6 uppercase tracking-wider">Order Volume</h3>
          <div className="flex-1 w-full min-h-0">
            {analytics.ordersOverTime?.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.ordersOverTime} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-border/30" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'currentColor', opacity: 0.5 }} dy={10} />
                  <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'currentColor', opacity: 0.5 }} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'currentColor', opacity: 0.05 }} />
                  <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted">No data yet</div>
            )}
          </div>
        </div>

        {/* User Growth */}
        <div className="rounded-3xl border border-white/20 dark:border-white/10 bg-surface/30 backdrop-blur-2xl backdrop-saturate-150 p-6 shadow-xl shadow-black/5 flex flex-col h-[350px] lg:col-span-2">
          <h3 className="text-sm font-medium text-muted mb-6 uppercase tracking-wider">User Growth (Signups)</h3>
          <div className="flex-1 w-full min-h-0">
            {analytics.usersJoinedOverTime?.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={analytics.usersJoinedOverTime} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-border/30" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'currentColor', opacity: 0.5 }} dy={10} />
                  <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'currentColor', opacity: 0.5 }} />
                  <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'currentColor', strokeOpacity: 0.1, strokeWidth: 2 }} />
                  <Line type="stepAfter" dataKey="value" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, strokeWidth: 2, fill: "var(--color-surface)" }} activeDot={{ r: 6, fill: "#3b82f6" }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted">No data yet</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function CouponsTab() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { data: coupons, isLoading } = useQuery({
    queryKey: ["adminCoupons"],
    queryFn: () => getCouponsAdmin(),
  });

  const deleteMutation = useMutation({
    mutationFn: async (code: string) => {
      await deleteCoupon({ data: code });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminCoupons"] });
      toast.success("Coupon deleted successfully");
    },
    onError: (err: any) => toast.error(err?.message || "Failed to delete coupon")
  });

  if (isLoading) {
    return <div className="p-8 text-center text-muted">Loading coupons...</div>;
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-semibold">Coupons</h2>
          <p className="text-muted mt-1 text-sm">Manage discount codes for the store.</p>
        </div>
        <button
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-ink hover:opacity-90"
          onClick={() => setIsModalOpen(true)}
        >
          Add Coupon
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-surface">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-surface-2 text-muted">
            <tr>
              <th className="p-4 font-medium">Code</th>
              <th className="p-4 font-medium">Discount</th>
              <th className="p-4 font-medium">Uses</th>
              <th className="p-4 font-medium">Created</th>
              <th className="p-4 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {!coupons || coupons.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-muted">No coupons found.</td>
              </tr>
            ) : (
              coupons.map((c: any) => (
                <tr key={c.code} className="hover:bg-surface-2/50 transition-colors">
                  <td className="p-4 font-medium text-accent">{c.code}</td>
                  <td className="p-4">{c.discount_percent}% OFF</td>
                  <td className="p-4">{c.current_uses} / {c.max_uses ? c.max_uses : "∞"}</td>
                  <td className="p-4 text-muted">{new Date(c.created_at).toLocaleDateString()}</td>
                  <td className="p-4 text-right">
                    <button
                      onClick={() => {
                        if (confirm(`Are you sure you want to delete coupon ${c.code}?`)) {
                          deleteMutation.mutate(c.code);
                        }
                      }}
                      className="text-xs px-2 py-1 rounded bg-danger/10 text-danger hover:bg-danger/20 transition-colors border border-danger/20"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <CouponModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
}

function CouponModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);

  const mutation = useMutation({
    mutationFn: async (data: { code: string; discount_percent: number; max_uses?: number }) => {
      await createCoupon({ data });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminCoupons"] });
      toast.success("Coupon created!");
      onClose();
    },
    onError: (err) => toast.error(err.message),
    onSettled: () => setBusy(false)
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-surface border border-border rounded-xl shadow-xl w-full max-w-md flex flex-col overflow-hidden">
        <div className="flex items-center justify-between border-b border-border p-6 bg-surface shrink-0">
          <h2 className="text-xl font-bold">Add Coupon</h2>
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
              mutation.mutate({
                code: fd.get("code") as string,
                discount_percent: parseInt(fd.get("discount_percent") as string, 10),
                max_uses: fd.get("max_uses") ? parseInt(fd.get("max_uses") as string, 10) : undefined,
              });
            }}
            className="space-y-4"
          >
            <div>
              <label className="block text-sm font-medium mb-1">Coupon Code</label>
              <input name="code" required className="w-full rounded border border-border bg-surface-2 p-2 text-sm uppercase" placeholder="e.g. SUMMER10" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Discount Percent (%)</label>
              <input name="discount_percent" type="number" min="1" max="100" required className="w-full rounded border border-border bg-surface-2 p-2 text-sm" placeholder="e.g. 10" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Max Uses (Optional)</label>
              <input name="max_uses" type="number" min="1" className="w-full rounded border border-border bg-surface-2 p-2 text-sm" placeholder="Leave empty for unlimited" />
            </div>

            <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-border">
              <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border border-border hover:bg-surface-2 text-sm font-medium">Cancel</button>
              <button type="submit" disabled={busy} className="px-4 py-2 rounded-lg bg-accent text-ink hover:opacity-90 text-sm font-medium">
                {busy ? "Saving..." : "Create Coupon"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function InventoryTable() {
  const queryClient = useQueryClient();
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const { data: products, isLoading } = useQuery({
    queryKey: ["adminProducts"],
    queryFn: () => getAllProductsAdmin(),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ slug, stockCount }: { slug: string, stockCount: number }) => {
      await updateProductInventory({ data: { slug, stockCount } });
    },
    onMutate: ({ slug }) => setUpdatingId(slug),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminProducts"] });
      toast.success("Inventory updated");
      setUpdatingId(null);
    },
    onError: () => {
      toast.error("Failed to update inventory");
      setUpdatingId(null);
    }
  });

  if (isLoading) {
    return <div className="p-8 text-center text-muted">Loading inventory...</div>;
  }

  if (!products || products.length === 0) {
    return <div className="p-8 text-center text-muted">No products found.</div>;
  }

  return (
    <table className="w-full text-left text-sm">
      <thead className="border-b border-border bg-surface-2 text-muted">
        <tr>
          <th className="p-4 font-medium">Product</th>
          <th className="p-4 font-medium text-center">Status</th>
          <th className="p-4 font-medium text-right">Stock Count</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-border">
        {products.map((p) => {
          const stockCount = p.stockCount ?? -1;
          const isLowStock = stockCount !== -1 && stockCount <= 5;
          const isOutOfStock = stockCount === 0 || !p.inStock;
          
          return (
            <tr key={p.slug} className="hover:bg-surface-2/50 transition-colors">
              <td className="p-4">
                <div className="flex items-center gap-3">
                  <img src={p.image} alt={p.name} className="size-10 rounded-lg object-cover bg-surface-2" />
                  <div>
                    <div className="font-medium">{p.name}</div>
                    <div className="text-xs text-muted">{p.category}</div>
                  </div>
                </div>
              </td>
              <td className="p-4 text-center">
                {isOutOfStock ? (
                  <Badge className="bg-danger text-white">Out of Stock</Badge>
                ) : isLowStock ? (
                  <Badge className="bg-warning text-black">Low Stock</Badge>
                ) : (
                  <Badge className="bg-success text-white">In Stock</Badge>
                )}
              </td>
              <td className="p-4 text-right">
                <input
                  type="number"
                  disabled={updatingId === p.slug}
                  className="w-24 rounded border border-border bg-surface p-1 text-right text-sm focus:ring-1 focus:ring-accent"
                  defaultValue={stockCount}
                  onBlur={(e) => {
                    const val = parseInt(e.target.value, 10);
                    if (!isNaN(val) && val !== stockCount) {
                      updateMutation.mutate({ slug: p.slug, stockCount: val });
                    }
                  }}
                />
                <div className="text-[10px] text-muted mt-1">(-1 for infinite)</div>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function AdminTeamTab() {
  const queryClient = useQueryClient();
  const [newEmail, setNewEmail] = useState("");

  const { data: team, isLoading, error } = useQuery({
    queryKey: ["adminTeam"],
    queryFn: () => getAdminTeam(),
  });

  const addMutation = useMutation({
    mutationFn: async (email: string) => {
      await addAdmin({ data: { email } });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminTeam"] });
      toast.success("Admin added successfully");
      setNewEmail("");
    },
    onError: (err) => toast.error(err.message)
  });

  const removeMutation = useMutation({
    mutationFn: async (email: string) => {
      await removeAdmin({ data: { email } });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminTeam"] });
      toast.success("Admin removed");
    },
    onError: (err) => toast.error(err.message)
  });

  if (isLoading) return <div className="p-8 text-center text-muted">Loading team...</div>;
  if (error) return <div className="p-8 text-danger">{error.message || "Unauthorized. Super Admin only."}</div>;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div>
        <h2 className="text-2xl font-semibold">Admin Team</h2>
        <p className="text-muted mt-1 text-sm">Manage who has access to this dashboard.</p>
      </div>

      <div className="bg-surface border border-border rounded-xl p-6">
        <h3 className="text-lg font-medium mb-4">Add New Admin</h3>
        <form 
          onSubmit={(e) => {
            e.preventDefault();
            if (newEmail) addMutation.mutate(newEmail);
          }}
          className="flex gap-4 max-w-md"
        >
          <input
            type="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            placeholder="admin@example.com"
            required
            className="flex-1 rounded border border-border bg-surface-2 p-2 text-sm"
          />
          <button
            type="submit"
            disabled={addMutation.isPending}
            className="px-4 py-2 rounded-lg bg-accent text-ink hover:opacity-90 text-sm font-medium whitespace-nowrap"
          >
            {addMutation.isPending ? "Adding..." : "Add Admin"}
          </button>
        </form>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-surface">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-surface-2 text-muted">
            <tr>
              <th className="p-4 font-medium">Email</th>
              <th className="p-4 font-medium">Role</th>
              <th className="p-4 font-medium">Added On</th>
              <th className="p-4 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {team?.map((admin: any) => (
              <tr key={admin.email} className="hover:bg-surface-2/50 transition-colors">
                <td className="p-4 font-medium">{admin.email}</td>
                <td className="p-4 capitalize">
                  <Badge className={admin.role === 'super_admin' ? 'bg-primary' : 'bg-secondary'}>
                    {admin.role.replace('_', ' ')}
                  </Badge>
                </td>
                <td className="p-4 text-muted">{new Date(admin.created_at).toLocaleDateString()}</td>
                <td className="p-4 text-right">
                  {admin.role !== 'super_admin' && (
                    <button
                      onClick={() => {
                        if (confirm(`Remove ${admin.email} from admin team?`)) {
                          removeMutation.mutate(admin.email);
                        }
                      }}
                      className="text-xs px-3 py-1.5 rounded bg-danger/10 text-danger hover:bg-danger/20 transition-colors border border-danger/20"
                    >
                      Remove
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AdminProfileTab() {
  const queryClient = useQueryClient();
  const [pin, setPin] = useState("");
  const [step, setStep] = useState<"view" | "create" | "reset_otp" | "reset_new">("view");
  const [otp, setOtp] = useState("");
  const [newPin, setNewPin] = useState("");

  const { data: profile, isLoading } = useQuery({
    queryKey: ["adminProfile"],
    queryFn: () => getAdminProfile(),
  });

  const setPinMutation = useMutation({
    mutationFn: async (newPin: string) => {
      await setAdminPin({ data: { pin: newPin } });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminProfile"] });
      toast.success("PIN set successfully!");
      setStep("view");
      setPin("");
    },
    onError: (err) => toast.error(err.message)
  });

  const requestOtpMutation = useMutation({
    mutationFn: async () => {
      await requestPinResetOTP();
    },
    onSuccess: () => {
      toast.success("OTP sent to your email!");
      setStep("reset_otp");
    },
    onError: (err) => toast.error(err.message)
  });

  const resetPinMutation = useMutation({
    mutationFn: async () => {
      await resetAdminPinWithOTP({ data: { otp, newPin } });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminProfile"] });
      toast.success("PIN reset successfully!");
      setStep("view");
      setOtp("");
      setNewPin("");
    },
    onError: (err) => toast.error(err.message)
  });

  if (isLoading) return <div className="p-8 text-center text-muted">Loading profile...</div>;
  if (!profile) return null;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300 max-w-2xl">
      <div>
        <h2 className="text-2xl font-semibold">Admin Profile</h2>
        <p className="text-muted mt-1 text-sm">Manage your personal admin security settings.</p>
      </div>

      <div className="bg-surface border border-border rounded-xl p-6 space-y-6">
        <div>
          <h3 className="text-sm font-medium text-muted">Email</h3>
          <p className="text-lg font-medium">{profile.email}</p>
        </div>
        <div>
          <h3 className="text-sm font-medium text-muted">Role</h3>
          <Badge className="mt-1">{profile.role.replace('_', ' ')}</Badge>
        </div>

        <div className="pt-6 border-t border-border">
          <h3 className="text-lg font-medium mb-4">Security PIN</h3>
          
          {step === "view" && (
            <div>
              {profile.hasPin ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-primary">
                    <Shield className="w-5 h-5" />
                    <span className="font-medium">6-Digit PIN is active</span>
                  </div>
                  <p className="text-sm text-muted">Your PIN is required for sensitive actions like deleting orders.</p>
                  <button
                    onClick={() => requestOtpMutation.mutate()}
                    disabled={requestOtpMutation.isPending}
                    className="px-4 py-2 rounded-lg border border-border hover:bg-surface-2 text-sm font-medium"
                  >
                    {requestOtpMutation.isPending ? "Requesting..." : "Reset PIN"}
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-danger">
                    <Shield className="w-5 h-5" />
                    <span className="font-medium">No PIN set</span>
                  </div>
                  <p className="text-sm text-muted">We strongly recommend setting a 6-digit PIN to protect sensitive actions.</p>
                  <button
                    onClick={() => setStep("create")}
                    className="px-4 py-2 rounded-lg bg-accent text-ink hover:opacity-90 text-sm font-medium"
                  >
                    Create PIN
                  </button>
                </div>
              )}
            </div>
          )}

          {step === "create" && (
            <div className="space-y-4 max-w-sm animate-in fade-in slide-in-from-bottom-2">
              <label className="block text-sm font-medium">Enter 6-Digit PIN</label>
              <input
                type="password"
                maxLength={6}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="w-full rounded border border-border bg-surface-2 p-3 text-center text-xl tracking-widest"
                placeholder="••••••"
              />
              <div className="flex gap-3">
                <button
                  onClick={() => { setStep("view"); setPin(""); }}
                  className="flex-1 px-4 py-2 rounded-lg border border-border hover:bg-surface-2 text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={() => setPinMutation.mutate(pin)}
                  disabled={pin.length !== 6 || setPinMutation.isPending}
                  className="flex-1 px-4 py-2 rounded-lg bg-accent text-ink hover:opacity-90 text-sm font-medium disabled:opacity-50"
                >
                  {setPinMutation.isPending ? "Saving..." : "Save PIN"}
                </button>
              </div>
            </div>
          )}

          {step === "reset_otp" && (
            <div className="space-y-4 max-w-sm animate-in fade-in slide-in-from-bottom-2">
              <p className="text-sm text-muted">An OTP has been sent to {profile.email}.</p>
              
              <div>
                <label className="block text-sm font-medium mb-1">Enter OTP</label>
                <input
                  type="text"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="w-full rounded border border-border bg-surface-2 p-3 text-center text-xl tracking-widest"
                  placeholder="123456"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">New 6-Digit PIN</label>
                <input
                  type="password"
                  maxLength={6}
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="w-full rounded border border-border bg-surface-2 p-3 text-center text-xl tracking-widest"
                  placeholder="••••••"
                />
              </div>

              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => { setStep("view"); setOtp(""); setNewPin(""); }}
                  className="flex-1 px-4 py-2 rounded-lg border border-border hover:bg-surface-2 text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={() => resetPinMutation.mutate()}
                  disabled={otp.length !== 6 || newPin.length !== 6 || resetPinMutation.isPending}
                  className="flex-1 px-4 py-2 rounded-lg bg-accent text-ink hover:opacity-90 text-sm font-medium disabled:opacity-50"
                >
                  {resetPinMutation.isPending ? "Resetting..." : "Reset PIN"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


function FaqsTab() {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  const { data: faqs = [], isLoading } = useQuery({
    queryKey: ["faqsAdmin"],
    queryFn: () => getFaqsAdmin(),
  });

  const createMutation = useMutation({
    mutationFn: async (data: { question: string; answer: string }) => {
      await createFaq({ data });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["faqsAdmin"] });
      queryClient.invalidateQueries({ queryKey: ["faqs"] });
      toast.success("FAQ created");
      setIsAdding(false);
      setQuestion("");
      setAnswer("");
    },
    onError: (err) => toast.error(err.message)
  });

  const updateMutation = useMutation({
    mutationFn: async (data: { id: number; question: string; answer: string }) => {
      await updateFaq({ data });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["faqsAdmin"] });
      queryClient.invalidateQueries({ queryKey: ["faqs"] });
      toast.success("FAQ updated");
      setEditingId(null);
      setQuestion("");
      setAnswer("");
    },
    onError: (err) => toast.error(err.message)
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await deleteFaq({ data: { id } });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["faqsAdmin"] });
      queryClient.invalidateQueries({ queryKey: ["faqs"] });
      toast.success("FAQ deleted");
    },
    onError: (err) => toast.error(err.message)
  });

  const reorderMutation = useMutation({
    mutationFn: async (orderedIds: number[]) => {
      await reorderFaqs({ data: { orderedIds } });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["faqsAdmin"] });
      queryClient.invalidateQueries({ queryKey: ["faqs"] });
    }
  });

  const moveFaq = (index: number, direction: 'up' | 'down') => {
    if (
      (direction === 'up' && index === 0) || 
      (direction === 'down' && index === faqs.length - 1)
    ) return;
    
    const newFaqs = [...faqs];
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    const temp = newFaqs[index];
    newFaqs[index] = newFaqs[swapIndex];
    newFaqs[swapIndex] = temp;
    
    reorderMutation.mutate(newFaqs.map(f => f.id));
  };

  const startEdit = (faq: any) => {
    setEditingId(faq.id);
    setQuestion(faq.question);
    setAnswer(faq.answer);
    setIsAdding(false);
  };

  if (isLoading) return <div className="p-8 text-center text-muted">Loading FAQs...</div>;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">FAQs</h2>
          <p className="text-muted mt-1 text-sm">Manage the Frequently Asked Questions displayed on the site.</p>
        </div>
        {!isAdding && editingId === null && (
          <button
            onClick={() => { setIsAdding(true); setQuestion(""); setAnswer(""); }}
            className="px-4 py-2 rounded-lg bg-ink text-bg hover:opacity-90 text-sm font-medium"
          >
            Add New FAQ
          </button>
        )}
      </div>

      {(isAdding || editingId !== null) && (
        <div className="bg-surface border border-border rounded-xl p-6 mb-6">
          <h3 className="text-lg font-medium mb-4">{isAdding ? "Add FAQ" : "Edit FAQ"}</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Question</label>
              <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                className="w-full rounded border border-border bg-surface-2 p-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Answer</label>
              <textarea
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                rows={4}
                className="w-full rounded border border-border bg-surface-2 p-2 text-sm resize-y"
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => { setIsAdding(false); setEditingId(null); }}
                className="px-4 py-2 rounded-lg border border-border hover:bg-surface-2 text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (isAdding) {
                    createMutation.mutate({ question, answer });
                  } else if (editingId !== null) {
                    updateMutation.mutate({ id: editingId, question, answer });
                  }
                }}
                disabled={!question || !answer || createMutation.isPending || updateMutation.isPending}
                className="px-4 py-2 rounded-lg bg-accent text-ink hover:opacity-90 text-sm font-medium disabled:opacity-50"
              >
                {createMutation.isPending || updateMutation.isPending ? "Saving..." : "Save FAQ"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {faqs.map((faq: any, index: number) => (
          <div key={faq.id} className="bg-surface border border-border rounded-xl p-4 flex gap-4 items-start group transition-colors hover:bg-surface-2/30">
            <div className="flex flex-col gap-1 shrink-0 pt-1">
              <button 
                onClick={() => moveFaq(index, 'up')}
                disabled={index === 0 || reorderMutation.isPending}
                className="text-muted hover:text-ink disabled:opacity-30 disabled:hover:text-muted transition-colors"
              >
                ↑
              </button>
              <button 
                onClick={() => moveFaq(index, 'down')}
                disabled={index === faqs.length - 1 || reorderMutation.isPending}
                className="text-muted hover:text-ink disabled:opacity-30 disabled:hover:text-muted transition-colors"
              >
                ↓
              </button>
            </div>
            
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-lg mb-1">{faq.question}</h4>
              <p className="text-sm text-muted">{faq.answer}</p>
            </div>
            
            <div className="flex items-center gap-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => startEdit(faq)}
                className="px-3 py-1.5 rounded-lg border border-border hover:bg-surface-2 text-sm font-medium"
              >
                Edit
              </button>
              <button
                onClick={() => {
                  if (confirm("Are you sure you want to delete this FAQ?")) {
                    deleteMutation.mutate(faq.id);
                  }
                }}
                className="px-3 py-1.5 rounded-lg border border-danger/20 text-danger hover:bg-danger/10 text-sm font-medium"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
        {faqs.length === 0 && !isLoading && (
          <div className="text-center p-8 text-muted border border-dashed border-border rounded-xl">
            No FAQs found. Create one to get started!
          </div>
        )}
      </div>
    </div>
  );
}

function UsersTab({ orders }: { orders: any[] | undefined }) {
  const [searchQuery, setSearchQuery] = useState("");
  const { data: users, isLoading, error } = useQuery({
    queryKey: ["adminUsers"],
    queryFn: () => getAllUsersAdmin(),
  });

  if (isLoading) return <div className="p-8 text-center text-muted">Loading users...</div>;
  if (error) return <div className="p-8 text-center text-danger">Failed to load users</div>;

  const filteredUsers = users?.filter((user: any) => {
    const q = searchQuery.toLowerCase().replace(/^#/, '').trim();
    
    const hasMatchingOrder = orders?.some((order: any) => 
      order.user_id === user.id && order.order_number?.toLowerCase().includes(q)
    );

    return (
      (user.name?.toLowerCase().includes(q) ?? false) ||
      (user.email?.toLowerCase().includes(q) ?? false) ||
      hasMatchingOrder
    );
  });

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-semibold">Registered Users</h2>
          <p className="text-muted mt-1 text-sm">View all registered accounts on your platform.</p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted" />
          <input
            type="text"
            placeholder="Search name, email, or order #..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-border bg-surface-2 pl-9 pr-4 py-2 text-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent transition-colors"
          />
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-surface">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-surface-2 text-muted">
            <tr>
              <th className="p-4 font-medium">User</th>
              <th className="p-4 font-medium">Status</th>
              <th className="p-4 font-medium">Joined</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {!filteredUsers || filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={3} className="p-8 text-center text-muted">No users found.</td>
              </tr>
            ) : (
              filteredUsers.map((user: any) => (
                <tr key={user.id} className="hover:bg-surface-2/50 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent/20 text-accent font-medium">
                        {user.name ? user.name.slice(0, 2).toUpperCase() : user.email.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-medium">{user.name || "Unnamed"}</div>
                        <div className="text-xs text-muted">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <Badge className={user.emailVerified ? "bg-primary/20 text-primary border-primary/20" : "bg-warning/20 text-warning border-warning/20"}>
                      {user.emailVerified ? "Verified" : "Unverified"}
                    </Badge>
                  </td>
                  <td className="p-4 text-muted">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MaterialsTab() {
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

