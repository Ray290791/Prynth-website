import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { getAllOrdersAdmin, updateOrderStatus, deleteOrderAdmin } from "@/lib/orders-fns";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { formatINR } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  Package,
  Box,
  Settings,
  Image as ImageIcon,
  BarChart3,
  Tag,
  ClipboardList,
  Shield,
  UserCog,
  HelpCircle,
  Users,
  Search,
  Trash2,
  Layers,
  Printer as PrinterIcon,
  Disc,
  CreditCard,
  Mail,
  Bell,
  DraftingCompass,
  MessageSquareQuote,
} from "lucide-react";
import { InquiriesTab } from "@/components/inquiries-tab";
import { PrintersTab } from "@/components/printers-tab";
import { FilamentsTab } from "@/components/filaments-tab";
import { PaymentOptionsTab } from "@/components/payment-options-tab";
import { NotificationsTab } from "@/components/notifications-tab";
import { ServicesTab } from "@/components/services-tab";
import { TestimonialsTab } from "@/components/testimonials-tab";
import { GalleryTab } from "@/components/gallery-tab";
import { OrderDetailsDialog } from "@/components/order-details-dialog";
import { PinConfirmModal } from "@/components/admin/pin-confirm-modal";
import { ProductsTable } from "@/components/admin/products-tab";
import { InventoryTable } from "@/components/admin/inventory-tab";
import { SettingsTab } from "@/components/admin/settings-tab";
import { AnalyticsTab } from "@/components/admin/analytics-tab";
import { CouponsTab } from "@/components/admin/coupons-tab";
import { AdminTeamTab } from "@/components/admin/team-tab";
import { AdminProfileTab } from "@/components/admin/profile-tab";
import { FaqsTab } from "@/components/admin/faqs-tab";
import { UsersTab } from "@/components/admin/users-tab";
import { MaterialsTab } from "@/components/admin/materials-tab";

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
    { id: "services", label: "Services", icon: DraftingCompass },
    { id: "printers", label: "Printers", icon: PrinterIcon },
    { id: "filaments", label: "Filaments", icon: Disc },
    { id: "products", label: "Products", icon: Box },
    { id: "inventory", label: "Inventory", icon: ClipboardList },
    { id: "gallery", label: "Showcase & Gallery", icon: ImageIcon },
    { id: "testimonials", label: "Testimonials", icon: MessageSquareQuote },
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
        {activeTab === "services" && <ServicesTab />}
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

        {activeTab === "gallery" && <GalleryTab />}
        {activeTab === "testimonials" && <TestimonialsTab />}
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
