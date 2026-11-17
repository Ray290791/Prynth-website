import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { getAllOrdersAdmin, updateOrderStatus, deleteOrderAdmin } from "@/lib/orders-fns";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { formatINR } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AuthModal } from "@/components/auth-modal";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { useIsAdmin } from "@/lib/auth/use-admin";
import { signOut } from "@/lib/auth/client";
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
  Scale,
  TrendingUp,
  Clock,
} from "lucide-react";
import { InquiriesTab } from "@/components/inquiries-tab";
import { GrievancesTab } from "@/components/admin/grievances-tab";
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
import { LaunchLedgerTab } from "@/components/admin/ledger-tab";
import { WaitlistTab } from "@/components/admin/waitlist-tab";
import { getTicketsAdmin } from "@/lib/contact-fns";
import { getWaitlistAdmin } from "@/lib/waitlist-fns";

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
  
  const { user, isPending: authPending } = useCurrentUserState();
  const { isAdmin, isLoading: adminCheckLoading } = useIsAdmin();

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
    enabled: Boolean(user) && isAdmin && (activeTab === "orders" || activeTab === "users"),
    staleTime: 60_000,
  });

  const { data: tickets } = useQuery({
    queryKey: ["adminTickets"],
    queryFn: () => getTicketsAdmin(),
    enabled: Boolean(user) && isAdmin,
    staleTime: 30_000,
  });

  const { data: waitlist } = useQuery({
    queryKey: ["waitlistAdmin"],
    queryFn: () => getWaitlistAdmin(),
    enabled: Boolean(user) && isAdmin,
    staleTime: 60_000,
  });

  const openTicketsCount = tickets?.filter((t: any) => t.status === "open").length || 0;
  const pendingOrdersCount = orders?.filter((o: any) => o.status === "pending" || o.status === "processing").length || 0;
  const waitlistCount = waitlist?.length || 0;

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  })();

  const firstName = user?.name?.split(" ")[0] || "Ray";
  const todayFormatted = new Date().toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });

  const getBadge = (itemId: string) => {
    if (itemId === "inquiries" && openTicketsCount > 0) {
      return (
        <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
          {openTicketsCount}
        </span>
      );
    }
    if (itemId === "orders" && pendingOrdersCount > 0) {
      return (
        <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/30">
          {pendingOrdersCount}
        </span>
      );
    }
    if (itemId === "waitlist" && waitlistCount > 0) {
      return (
        <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full bg-muted/20 text-muted border border-border/50">
          {waitlistCount}
        </span>
      );
    }
    return null;
  };

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

  // 1. Session is still loading
  if (authPending || adminCheckLoading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-24 text-center">
        <div className="inline-flex size-10 animate-spin items-center justify-center rounded-full border-2 border-accent border-t-transparent" />
        <p className="mt-4 text-sm text-muted font-medium">Verifying administrative access...</p>
      </div>
    );
  }

  // 2. User is not signed in
  if (!user) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center space-y-4">
        <div className="inline-flex size-14 items-center justify-center rounded-2xl bg-surface-2 border border-border text-accent">
          <Shield className="size-7" />
        </div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-fg">
          Admin Sign-In Required
        </h1>
        <p className="text-sm text-muted leading-relaxed">
          Please sign in with your administrative account to access the Prynth Admin Console.
        </p>
        <div className="pt-2 flex justify-center">
          <AuthModal
            trigger={
              <Button className="h-11 px-6 bg-accent text-ink font-semibold shadow-xs cursor-pointer">
                <span>Sign In as Admin</span>
              </Button>
            }
          />
        </div>
      </div>
    );
  }

  // 3. User is signed in, but does not have admin privileges
  if (!isAdmin || error) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center space-y-4">
        <div className="inline-flex size-14 items-center justify-center rounded-2xl bg-danger/10 border border-danger/20 text-danger">
          <Shield className="size-7" />
        </div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-fg">
          Access Restricted
        </h1>
        <p className="text-sm text-muted leading-relaxed">
          You are currently signed in as <strong className="text-fg">{user.primaryEmail}</strong>, but this account does not have administrative privileges.
        </p>
        <p className="text-xs text-subtle leading-relaxed">
          If this account was just granted admin rights, ask a Super Admin to ensure <code className="font-mono bg-surface-2 px-1.5 py-0.5 rounded text-fg">{user.primaryEmail}</code> is listed in the Admin Team settings.
        </p>
        <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
          <Button variant="outline" onClick={() => void signOut("/admin")}>
            Switch Account
          </Button>
          <Button asChild variant="ghost">
            <Link to="/">Back to Home</Link>
          </Button>
        </div>
      </div>
    );
  }

  const navSections = [
    {
      title: "Operations",
      items: [
        { id: "orders", label: "Orders", icon: Package },
        { id: "inquiries", label: "Inquiries & Quotes", icon: Mail },
        { id: "waitlist", label: "Waitlist", icon: Clock },
        { id: "ledger", label: "Launch Ledger", icon: TrendingUp },
        { id: "analytics", label: "Analytics", icon: BarChart3 },
      ],
    },
    {
      title: "Studio & Catalog",
      items: [
        { id: "products", label: "Products", icon: Box },
        { id: "inventory", label: "Inventory", icon: ClipboardList },
        { id: "services", label: "Services", icon: DraftingCompass },
        { id: "printers", label: "Printers", icon: PrinterIcon },
        { id: "filaments", label: "Filaments", icon: Disc },
        { id: "materials", label: "Materials", icon: Layers },
      ],
    },
    {
      title: "Storefront",
      items: [
        { id: "gallery", label: "Showcase & Gallery", icon: ImageIcon },
        { id: "testimonials", label: "Testimonials", icon: MessageSquareQuote },
        { id: "coupons", label: "Coupons", icon: Tag },
        { id: "faqs", label: "FAQs", icon: HelpCircle },
      ],
    },
    {
      title: "Settings & System",
      items: [
        { id: "settings", label: "Site Settings", icon: Settings },
        { id: "notifications", label: "Phone Alerts", icon: Bell },
        { id: "payments", label: "Payment Options", icon: CreditCard },
        { id: "admin-team", label: "Admin Team", icon: Shield },
        { id: "admin-profile", label: "Admin Profile", icon: UserCog },
        { id: "users", label: "Users", icon: Users },
        { id: "grievances", label: "Grievances & DPDP", icon: Scale },
      ],
    },
  ];

  return (
    <div className="relative min-h-[calc(100vh-4rem)] bg-cad-grid overflow-hidden">
      {/* Real iOS Ambient Backlight / Refraction Glows (Reel 3 & Reel 5 - enables genuine frosted glass refraction) */}
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        <div className="absolute -top-24 -left-20 size-[36rem] rounded-full bg-accent/25 blur-[100px] dark:bg-accent/20" />
        <div className="absolute top-1/4 -right-24 size-[40rem] rounded-full bg-sky-500/25 blur-[120px] dark:bg-sky-400/20" />
        <div className="absolute bottom-10 left-1/3 size-[42rem] rounded-full bg-teal-500/20 blur-[130px] dark:bg-teal-400/18" />
        <div className="absolute top-2/3 right-1/4 size-[30rem] rounded-full bg-indigo-500/18 blur-[110px] dark:bg-indigo-500/15" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-4 py-6 md:px-6 md:py-10 flex flex-col md:flex-row gap-6 lg:gap-8 items-start">
        {/* Responsive Navigation: horizontal swipeable ribbon on mobile, structured categorized sidebar on desktop */}
        <aside className="w-full shrink-0 md:w-60 md:sticky md:top-20 md:self-start md:z-20 md:max-h-[calc(100dvh-5.5rem)] md:overflow-y-auto no-scrollbar">
          <div className="flex items-center justify-between mb-2 md:mb-4 px-1">
            <div>
              <h1 className="font-display text-lg sm:text-xl font-bold tracking-tight text-fg">Admin Console</h1>
              <p className="text-[11px] text-muted hidden md:block">Studio Management Suite</p>
            </div>
            <span className="md:hidden text-[11px] text-muted font-medium bg-surface-2 px-2.5 py-1 rounded-full border border-border">
              Swipe tabs →
            </span>
          </div>

          <div className="sticky top-14 sm:top-16 z-30 md:static -mx-4 px-4 py-1.5 md:mx-0 md:px-0 md:py-0 bg-bg/85 md:bg-transparent backdrop-blur-xl md:backdrop-blur-none">
            <nav className="flex md:flex-col gap-1 md:gap-3 p-1.5 md:p-2.5 rounded-2xl glass-ios-card shadow-xs overflow-x-auto md:overflow-visible no-scrollbar">
              {navSections.map((section, sIdx) => (
                <div key={section.title} className="flex md:flex-col gap-0.5 shrink-0">
                  <div className="hidden md:flex items-center text-[10px] font-bold text-muted/70 uppercase tracking-wider px-2.5 pt-1 pb-1">
                    {section.title}
                  </div>
                  {section.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => setActiveTab(item.id)}
                        className={cn(
                          "flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium transition-all leading-none shrink-0 whitespace-nowrap cursor-pointer text-left w-full",
                          isActive
                            ? "bg-accent text-ink font-semibold shadow-xs"
                            : "text-muted hover:bg-white/10 hover:text-fg"
                        )}
                      >
                        <Icon className="size-3.5 shrink-0" />
                        <span className="truncate">{item.label}</span>
                        {getBadge(item.id)}
                      </button>
                    );
                  })}
                  {sIdx < navSections.length - 1 && <div className="hidden md:block my-1.5 border-t border-border/40" />}
                </div>
              ))}
            </nav>

            {/* Studio Capacity & Health Cockpit (Reel 2 & Zero-Bloat Architecture) */}
            <div className="hidden md:flex flex-col gap-2 p-3 mt-3 rounded-2xl glass-ios-card shadow-xs">
              <div className="flex items-center justify-between text-[11px] font-semibold text-fg">
                <span className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                  Fleet Online
                </span>
                <span className="text-muted font-mono text-[10px]">0.08mm</span>
              </div>
              <p className="text-[10px] text-muted leading-tight">
                Bambu Lab CoreXY calibrated
              </p>
              <div className="pt-1.5 border-t border-border/40 flex items-center justify-between text-[10px] text-muted">
                <span className="flex items-center gap-1">
                  <span>💾</span> Zero-Bloat DB
                </span>
                <span className="font-mono text-emerald-600 dark:text-emerald-400 font-semibold">Active</span>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 min-w-0">
          {/* Executive Briefing Cockpit (Reel 2 & Reel 3 Liquid Glass) */}
          <div className="mb-6 rounded-2xl glass-ios-card p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-lg sm:text-xl font-bold tracking-tight text-fg font-display">
                  {greeting}, {firstName} 👋
                </h2>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25">
                  <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Studio Active
                </span>
              </div>
              <p className="text-xs text-muted">
                {todayFormatted} · {openTicketsCount > 0 ? `${openTicketsCount} custom inquiries awaiting quotes` : "All custom inquiries up to date"} · Zero-bloat WhatsApp &amp; Gmail active
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setActiveTab("inquiries")}
                className={cn(
                  "h-8 text-xs px-3 gap-1.5 cursor-pointer rounded-lg font-medium",
                  activeTab === "inquiries" ? "bg-accent text-ink font-semibold" : "glass-ios-subtle hover:bg-white/10"
                )}
              >
                <Mail className="size-3.5" />
                <span>Inquiries {openTicketsCount > 0 ? `(${openTicketsCount})` : ""}</span>
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setActiveTab("orders")}
                className={cn(
                  "h-8 text-xs px-3 gap-1.5 cursor-pointer rounded-lg font-medium",
                  activeTab === "orders" ? "bg-accent text-ink font-semibold" : "glass-ios-subtle hover:bg-white/10"
                )}
              >
                <Package className="size-3.5" />
                <span>Orders {pendingOrdersCount > 0 ? `(${pendingOrdersCount})` : ""}</span>
              </Button>
            </div>
          </div>
        {activeTab === "orders" && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
              <div>
                <h2 className="text-2xl font-semibold">Orders</h2>
                <p className="text-muted mt-1 text-sm">Manage all incoming 3D printing orders.</p>
              </div>
              <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                <div className="relative w-full sm:w-72">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search by order #, name or email..."
                    value={orderSearchQuery}
                    onChange={(e) => setOrderSearchQuery(e.target.value)}
                    className="w-full h-9 rounded-lg glass-ios-subtle pl-9 pr-4 text-xs sm:text-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent transition-colors text-fg"
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
                  className="w-full sm:w-auto h-9 rounded-lg bg-accent px-4 text-xs sm:text-sm font-semibold text-ink hover:opacity-90 shrink-0 inline-flex items-center justify-center cursor-pointer shadow-xs"
                >
                  Export CSV
                </button>
              </div>
            </div>

            <div className="overflow-x-auto rounded-2xl glass-ios-card shadow-xs">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-white/10 bg-white/[0.03] text-muted text-xs">
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
                              className="h-8 text-xs px-3 rounded-lg bg-surface-2 hover:bg-surface-3 transition-colors border border-border font-medium shadow-2xs inline-flex items-center justify-center cursor-pointer"
                            >
                              Details
                            </button>
                            <select
                              className="h-8 text-xs rounded-lg border border-border bg-surface px-2.5 focus:ring-1 focus:ring-accent font-medium cursor-pointer"
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
                              <option value="refused_prohibited_item">Refused (Weapons/Hazard)</option>
                              <option value="refused_ip_infringement">Refused (IP Violation)</option>
                            </select>
                            <button
                              type="button"
                              onClick={() => setDeletingOrder(order.order_number)}
                              className="h-8 text-xs px-2.5 rounded-lg bg-danger/10 text-danger hover:bg-danger/20 transition-colors border border-danger/20 font-medium inline-flex items-center justify-center cursor-pointer"
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

        {activeTab === "grievances" && (
          <GrievancesTab />
        )}

        {activeTab === "ledger" && (
          <LaunchLedgerTab />
        )}

        {activeTab === "waitlist" && (
          <WaitlistTab />
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
    </div>
  );
}
