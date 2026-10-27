import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getAllGrievancesAdmin,
  updateGrievanceAdmin,
  type GrievanceComplaint,
} from "@/lib/grievance-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Scale,
  Search,
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Mail,
  Phone,
  Package,
  Calendar,
  Shield,
  Trash2,
  User,
  ExternalLink,
  ChevronRight,
  Filter,
} from "lucide-react";
import { cn } from "@/lib/utils";

export function GrievancesTab() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [adminNotes, setAdminNotes] = useState<Record<string, string>>({});
  const [resolutionNotes, setResolutionNotes] = useState<Record<string, string>>({});

  const { data: grievances = [], isLoading, isFetching, refetch } = useQuery({
    queryKey: ["adminGrievances"],
    queryFn: async () => {
      const data = await getAllGrievancesAdmin();
      return (data || []) as GrievanceComplaint[];
    },
  });

  const updateMutation = useMutation({
    mutationFn: (vars: {
      ticketNumber: string;
      status: "submitted" | "acknowledged" | "investigating" | "resolved" | "closed";
      adminNotes?: string;
      resolutionNotes?: string;
    }) => updateGrievanceAdmin({ data: vars }),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["adminGrievances"] });
      toast.success(`Ticket ${vars.ticketNumber} updated to ${vars.status}`);
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to update grievance record");
    },
  });

  const filtered = useMemo(() => {
    return grievances.filter((g) => {
      const q = search.toLowerCase().trim();
      const matchesSearch =
        !q ||
        g.ticket_number.toLowerCase().includes(q) ||
        g.name.toLowerCase().includes(q) ||
        g.email.toLowerCase().includes(q) ||
        g.subject.toLowerCase().includes(q) ||
        (g.order_number && g.order_number.toLowerCase().includes(q));

      const matchesStatus = statusFilter === "all" || g.status === statusFilter;

      let matchesCategory = true;
      if (categoryFilter === "dpdp") {
        matchesCategory = ["data_deletion", "data_access", "consent_withdrawal", "privacy_data"].includes(g.category);
      } else if (categoryFilter === "orders") {
        matchesCategory = ["product_defect", "delayed_delivery", "wrong_item", "damaged_in_transit", "refund_issue"].includes(g.category);
      } else if (categoryFilter !== "all") {
        matchesCategory = g.category === categoryFilter;
      }

      return matchesSearch && matchesStatus && matchesCategory;
    });
  }, [grievances, search, statusFilter, categoryFilter]);

  const stats = useMemo(() => {
    const total = grievances.length;
    const pendingAck = grievances.filter((g) => g.status === "submitted").length;
    const open = grievances.filter((g) => ["submitted", "acknowledged", "investigating"].includes(g.status)).length;
    const resolved = grievances.filter((g) => g.status === "resolved").length;
    const overdueAck = grievances.filter((g) => g.is_ack_overdue).length;
    const overdueResolve = grievances.filter((g) => g.is_resolve_overdue).length;
    const dpdpCount = grievances.filter((g) =>
      ["data_deletion", "data_access", "consent_withdrawal", "privacy_data"].includes(g.category)
    ).length;

    return { total, pendingAck, open, resolved, overdueAck, overdueResolve, dpdpCount };
  }, [grievances]);

  const categoryLabels: Record<string, { label: string; badge: string }> = {
    product_defect: { label: "Defect / Quality", badge: "bg-amber-500/10 text-amber-500 border-amber-500/20" },
    delayed_delivery: { label: "Delivery Delay", badge: "bg-blue-500/10 text-blue-500 border-blue-500/20" },
    wrong_item: { label: "Wrong Item", badge: "bg-orange-500/10 text-orange-500 border-orange-500/20" },
    damaged_in_transit: { label: "Damaged in Transit", badge: "bg-red-500/10 text-red-500 border-red-500/20" },
    refund_issue: { label: "Billing / Refund", badge: "bg-purple-500/10 text-purple-500 border-purple-500/20" },
    privacy_data: { label: "Privacy Grievance", badge: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" },
    data_deletion: { label: "DPDP Erasure Request", badge: "bg-rose-500/15 text-rose-500 border-rose-500/30" },
    data_access: { label: "DPDP Data Copy", badge: "bg-teal-500/15 text-teal-500 border-teal-500/30" },
    consent_withdrawal: { label: "Withdraw Consent", badge: "bg-indigo-500/15 text-indigo-500 border-indigo-500/30" },
    customer_service: { label: "Customer Service", badge: "bg-surface-2 text-muted border-border" },
    other: { label: "Other Grievance", badge: "bg-surface-2 text-muted border-border" },
  };

  const getSlaIndicator = (g: GrievanceComplaint) => {
    if (g.status === "resolved") {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-500">
          <CheckCircle2 className="size-3" /> Resolved
        </span>
      );
    }
    if (g.is_resolve_overdue) {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-destructive">
          <AlertTriangle className="size-3" /> 30-Day SLA Overdue
        </span>
      );
    }
    if (g.is_ack_overdue) {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-500">
          <AlertTriangle className="size-3" /> 48-Hour SLA Overdue
        </span>
      );
    }
    const daysLeft = Math.max(0, Math.ceil((new Date(g.resolve_due_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
    return (
      <span className="inline-flex items-center gap-1 text-[11px] text-muted">
        <Clock className="size-3 text-accent" /> {daysLeft}d left to resolve
      </span>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* Header and Summary stats */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-semibold">Grievances &amp; DPDP Requests</h2>
            <Badge className="text-xs font-mono border border-border bg-surface-2 text-muted">
              Statutory Queue
            </Badge>
          </div>
          <p className="text-muted mt-1 text-sm">
            Consumer Protection (E-Commerce) Rules 2020 &amp; DPDP Act 2023 compliance desk.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="cursor-pointer gap-1.5"
          >
            <RefreshCw className={cn("size-3.5", isFetching && "animate-spin")} />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-2xl border border-border bg-surface p-4 space-y-1">
          <span className="text-[11px] font-medium text-muted uppercase tracking-wider block">Active Queue</span>
          <p className="text-2xl font-bold font-display text-fg">{stats.open}</p>
          <span className="text-xs text-muted">of {stats.total} total tickets</span>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-4 space-y-1">
          <span className="text-[11px] font-medium text-muted uppercase tracking-wider block">DPDP Requests</span>
          <p className="text-2xl font-bold font-display text-accent">{stats.dpdpCount}</p>
          <span className="text-xs text-muted">Erasure &amp; data copy</span>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-4 space-y-1">
          <span className="text-[11px] font-medium text-muted uppercase tracking-wider block">Needs Ack (48h)</span>
          <p className={cn("text-2xl font-bold font-display", stats.overdueAck > 0 ? "text-destructive" : "text-fg")}>
            {stats.pendingAck}
          </p>
          <span className={cn("text-xs", stats.overdueAck > 0 ? "text-destructive font-semibold" : "text-muted")}>
            {stats.overdueAck > 0 ? `${stats.overdueAck} overdue!` : "On schedule"}
          </span>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-4 space-y-1">
          <span className="text-[11px] font-medium text-muted uppercase tracking-wider block">Resolved</span>
          <p className="text-2xl font-bold font-display text-emerald-500">{stats.resolved}</p>
          <span className="text-xs text-muted">Closed within 30-day SLA</span>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted" />
          <Input
            placeholder="Search by ticket #, name, email, or order #..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-10 rounded-xl border border-border bg-surface px-3 text-xs text-fg focus:border-accent focus:outline-none"
        >
          <option value="all">All Statuses</option>
          <option value="submitted">Submitted (Needs Ack)</option>
          <option value="acknowledged">Acknowledged</option>
          <option value="investigating">Investigating</option>
          <option value="resolved">Resolved</option>
          <option value="closed">Closed</option>
        </select>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="h-10 rounded-xl border border-border bg-surface px-3 text-xs text-fg focus:border-accent focus:outline-none"
        >
          <option value="all">All Categories</option>
          <option value="dpdp">DPDP Act (Erasure &amp; Data)</option>
          <option value="orders">Physical Orders &amp; Logistics</option>
          <option value="data_deletion">Data Deletion Requests</option>
          <option value="data_access">Data Copy Requests</option>
          <option value="product_defect">Product Quality Defect</option>
          <option value="delayed_delivery">Delayed Delivery</option>
          <option value="refund_issue">Refund / Billing</option>
        </select>
      </div>

      {/* Grievance Records List */}
      {isLoading ? (
        <div className="rounded-2xl border border-border bg-surface p-8 text-center text-muted">
          Loading statutory records...
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-border bg-surface p-8 text-center text-muted space-y-2">
          <Scale className="size-8 mx-auto text-muted/60" />
          <p className="font-medium text-fg">No grievances match your criteria</p>
          <p className="text-xs">All statutory consumer complaints and data requests will appear here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((g) => {
            const isSelected = selectedTicketId === g.ticket_number;
            const categoryMeta = categoryLabels[g.category] || categoryLabels.other;

            return (
              <div
                key={g.ticket_number}
                className={cn(
                  "rounded-2xl border transition-all bg-surface overflow-hidden",
                  isSelected ? "border-accent ring-1 ring-accent shadow-sm" : "border-border hover:border-accent/40"
                )}
              >
                <div
                  onClick={() => setSelectedTicketId(isSelected ? null : g.ticket_number)}
                  className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer select-none"
                >
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono font-bold text-sm text-fg tracking-tight">{g.ticket_number}</span>
                      <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-semibold border", categoryMeta.badge)}>
                        {categoryMeta.label}
                      </span>
                      <Badge
                        className={cn(
                          "text-[10px] uppercase font-semibold tracking-wider",
                          g.status === "resolved"
                            ? "bg-emerald-500/20 text-emerald-500 border border-emerald-500/30"
                            : g.status === "submitted"
                              ? "bg-destructive/15 text-destructive border border-destructive/30"
                              : "bg-surface-2 text-muted border border-border"
                        )}
                      >
                        {g.status}
                      </Badge>
                    </div>

                    <h4 className="text-sm font-semibold text-fg truncate">{g.subject}</h4>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
                      <span className="flex items-center gap-1 font-medium text-fg">
                        <User className="size-3 text-muted" /> {g.name}
                      </span>
                      <span className="flex items-center gap-1">
                        <Mail className="size-3 text-muted" /> {g.email}
                      </span>
                      {g.order_number && (
                        <span className="flex items-center gap-1 font-mono text-accent">
                          <Package className="size-3" /> {g.order_number}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Calendar className="size-3 text-muted" /> {new Date(g.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-0 border-border/60">
                    {getSlaIndicator(g)}
                    <span className="text-xs text-accent font-medium inline-flex items-center gap-0.5">
                      {isSelected ? "Collapse" : "Manage"} <ChevronRight className={cn("size-3.5 transition-transform", isSelected && "rotate-90")} />
                    </span>
                  </div>
                </div>

                {/* Expanded Action Panel */}
                {isSelected && (
                  <div className="border-t border-border bg-surface-2/40 p-4 sm:p-6 space-y-5 animate-in fade-in duration-200">
                    <div>
                      <h5 className="text-xs font-semibold text-muted uppercase tracking-wider mb-1.5">
                        Complainant Narrative
                      </h5>
                      <div className="rounded-xl border border-border bg-surface p-3.5 text-xs text-fg leading-relaxed whitespace-pre-wrap">
                        {g.description}
                      </div>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4">
                      {/* SLA Timestamps */}
                      <div className="rounded-xl border border-border/80 bg-surface p-3.5 space-y-2 text-xs">
                        <span className="font-semibold text-fg block">Statutory Timestamps</span>
                        <div className="flex justify-between text-muted">
                          <span>Received:</span>
                          <span className="font-mono text-fg">{new Date(g.created_at).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-muted">
                          <span>48h Ack SLA:</span>
                          <span className={cn("font-mono font-medium", g.is_ack_overdue ? "text-destructive" : "text-fg")}>
                            {new Date(g.acknowledge_due_at).toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between text-muted">
                          <span>30d Resolution SLA:</span>
                          <span className={cn("font-mono font-medium", g.is_resolve_overdue ? "text-destructive" : "text-fg")}>
                            {new Date(g.resolve_due_at).toLocaleDateString()}
                          </span>
                        </div>
                        {g.resolved_at && (
                          <div className="flex justify-between text-emerald-500 font-medium pt-1 border-t border-border">
                            <span>Resolved On:</span>
                            <span className="font-mono">{new Date(g.resolved_at).toLocaleString()}</span>
                          </div>
                        )}
                      </div>

                      {/* Contact Channels */}
                      <div className="rounded-xl border border-border/80 bg-surface p-3.5 space-y-2 text-xs">
                        <span className="font-semibold text-fg block">Complainant Contact Details</span>
                        <div className="flex items-center justify-between">
                          <span className="text-muted">Email:</span>
                          <a href={`mailto:${g.email}?subject=Regarding ticket ${g.ticket_number}`} className="text-accent underline font-medium">
                            {g.email}
                          </a>
                        </div>
                        {g.phone && (
                          <div className="flex items-center justify-between">
                            <span className="text-muted">Phone / WhatsApp:</span>
                            <span className="font-mono text-fg">{g.phone}</span>
                          </div>
                        )}
                        {g.order_number && (
                          <div className="flex items-center justify-between">
                            <span className="text-muted">Associated Order:</span>
                            <span className="font-mono font-semibold text-fg">{g.order_number}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Admin Workflow Management */}
                    <div className="rounded-xl border border-border bg-surface p-4 space-y-3">
                      <span className="text-xs font-semibold uppercase tracking-wider text-muted block">
                        Update Ticket Status &amp; Records
                      </span>

                      <div className="flex flex-wrap gap-2">
                        {(["acknowledged", "investigating", "resolved", "closed"] as const).map((s) => (
                          <Button
                            key={s}
                            size="sm"
                            variant={g.status === s ? "primary" : "outline"}
                            disabled={updateMutation.isPending}
                            onClick={() => {
                              updateMutation.mutate({
                                ticketNumber: g.ticket_number,
                                status: s,
                                adminNotes: adminNotes[g.ticket_number] ?? g.admin_notes ?? undefined,
                                resolutionNotes: resolutionNotes[g.ticket_number] ?? g.resolution_notes ?? undefined,
                              });
                            }}
                            className="capitalize cursor-pointer"
                          >
                            Mark as {s}
                          </Button>
                        ))}
                      </div>

                      <div className="grid sm:grid-cols-2 gap-3 pt-2">
                        <div>
                          <label className="text-[11px] font-medium text-muted block mb-1">
                            Internal Admin Notes (Private)
                          </label>
                          <Textarea
                            rows={2}
                            placeholder="e.g. Sent replacement tray via Delhivery awb #88412..."
                            defaultValue={g.admin_notes || ""}
                            onChange={(e) =>
                              setAdminNotes((prev) => ({ ...prev, [g.ticket_number]: e.target.value }))
                            }
                            className="text-xs"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-medium text-muted block mb-1">
                            Resolution Summary (Communicated to Consumer)
                          </label>
                          <Textarea
                            rows={2}
                            placeholder="e.g. Full refund processed via Razorpay ref #pay_xyz..."
                            defaultValue={g.resolution_notes || ""}
                            onChange={(e) =>
                              setResolutionNotes((prev) => ({ ...prev, [g.ticket_number]: e.target.value }))
                            }
                            className="text-xs"
                          />
                        </div>
                      </div>

                      <div className="flex justify-end pt-1">
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={updateMutation.isPending}
                          onClick={() => {
                            updateMutation.mutate({
                              ticketNumber: g.ticket_number,
                              status: g.status as any,
                              adminNotes: adminNotes[g.ticket_number] ?? g.admin_notes ?? undefined,
                              resolutionNotes: resolutionNotes[g.ticket_number] ?? g.resolution_notes ?? undefined,
                            });
                          }}
                          className="cursor-pointer text-xs"
                        >
                          Save Notes
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
