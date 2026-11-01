import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  getWaitlistAdmin,
  deleteWaitlistEntryAdmin,
  type WaitlistEntry,
} from "@/lib/waitlist-fns";
import {
  Users,
  Download,
  Trash2,
  Mail,
  ShieldCheck,
  Sparkles,
  Search,
} from "lucide-react";

export function WaitlistTab() {
  const queryClient = useQueryClient();
  const [selectedInterest, setSelectedInterest] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const { data, isLoading, error } = useQuery({
    queryKey: ["waitlistAdmin"],
    queryFn: () => getWaitlistAdmin(),
    staleTime: 30_000,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await deleteWaitlistEntryAdmin({ data: { id } });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["waitlistAdmin"] });
      toast.success("Waitlist entry deleted");
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to delete entry");
    },
  });

  if (isLoading) {
    return (
      <div className="p-8 text-center text-muted">
        <div className="inline-flex size-8 animate-spin items-center justify-center rounded-full border-2 border-accent border-t-transparent mb-3" />
        <p className="text-sm">Loading waitlist demand capture entries...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 text-center text-danger">
        Failed to load waitlist entries. Please verify admin privileges.
      </div>
    );
  }

  const entries = data.entries || [];
  const totalCount = entries.length;
  const activeCount = entries.filter((e) => !e.unsubscribed_at).length;
  const unsubscribedCount = totalCount - activeCount;

  // Extract unique interests for filter pills
  const availableInterests = Array.from(new Set(entries.map((e) => e.interest.toLowerCase())));

  const filteredEntries = entries.filter((entry) => {
    const matchesInterest =
      selectedInterest === "all" || entry.interest.toLowerCase() === selectedInterest;
    const matchesSearch =
      searchQuery === "" ||
      entry.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.interest.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesInterest && matchesSearch;
  });

  const handleExportCSV = () => {
    const headers = [
      "ID",
      "Email",
      "Interest",
      "Consent Text",
      "Consent At",
      "Created At",
      "Unsubscribed At",
      "Status",
    ];

    const rows = filteredEntries.map((e) => [
      e.id,
      `"${e.email}"`,
      `"${e.interest}"`,
      `"${(e.consent_text || "").replace(/"/g, '""')}"`,
      e.consent_at ? new Date(e.consent_at).toISOString() : "",
      e.created_at ? new Date(e.created_at).toISOString() : "",
      e.unsubscribed_at ? new Date(e.unsubscribed_at).toISOString() : "",
      e.unsubscribed_at ? "Unsubscribed" : "Active",
    ]);

    const csvContent = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `waitlist-demand-export-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold flex items-center gap-2">
            <span>📋</span> Waitlist &amp; Demand Capture (A5)
          </h2>
          <p className="text-muted mt-1 text-sm">
            Demand capture collected with explicit, unticked DPDP consent while services &amp; checkout are paused.
          </p>
        </div>
        <button
          onClick={handleExportCSV}
          disabled={filteredEntries.length === 0}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-accent text-ink text-xs sm:text-sm font-semibold hover:opacity-90 shadow-xs cursor-pointer disabled:opacity-50 self-start sm:self-auto"
        >
          <Download className="size-4" /> Export Waitlist CSV
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl border border-border bg-surface space-y-1">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted block">
            Total Captured Leads
          </span>
          <div className="text-2xl sm:text-3xl font-bold font-display text-fg">{totalCount}</div>
          <p className="text-xs text-muted">Across paused catalog &amp; services</p>
        </div>

        <div className="p-5 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 space-y-1">
          <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block">
            Active Consent Subscribers
          </span>
          <div className="text-2xl sm:text-3xl font-bold font-display text-emerald-600 dark:text-emerald-400">
            {activeCount}
          </div>
          <p className="text-xs text-muted">Verified notification permission</p>
        </div>

        <div className="p-5 rounded-2xl border border-border bg-surface space-y-1">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted block">
            Unsubscribed Leads
          </span>
          <div className="text-2xl sm:text-3xl font-bold font-display text-muted">{unsubscribedCount}</div>
          <p className="text-xs text-muted">Opted out from notifications</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 no-scrollbar">
          <button
            onClick={() => setSelectedInterest("all")}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer shrink-0",
              selectedInterest === "all"
                ? "bg-accent text-ink font-semibold"
                : "border border-border bg-surface text-muted hover:text-fg"
            )}
          >
            All Interests ({totalCount})
          </button>
          {availableInterests.map((interest) => {
            const count = entries.filter((e) => e.interest.toLowerCase() === interest).length;
            return (
              <button
                key={interest}
                onClick={() => setSelectedInterest(interest)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors cursor-pointer shrink-0",
                  selectedInterest === interest
                    ? "bg-accent text-ink font-semibold"
                    : "border border-border bg-surface text-muted hover:text-fg"
                )}
              >
                {interest} ({count})
              </button>
            );
          })}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search email or interest..."
            className="w-full rounded-lg border border-border bg-surface-2 pl-9 pr-3 py-1.5 text-xs focus:border-accent focus:outline-none"
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-2xl border border-border bg-surface shadow-xs">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-border bg-surface-2 text-muted">
            <tr>
              <th className="p-3.5 font-medium">Email</th>
              <th className="p-3.5 font-medium">Interest Category</th>
              <th className="p-3.5 font-medium">Consent Record</th>
              <th className="p-3.5 font-medium">Signup Date</th>
              <th className="p-3.5 font-medium text-center">Status</th>
              <th className="p-3.5 font-medium text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filteredEntries.length > 0 ? (
              filteredEntries.map((entry) => {
                const isUnsub = Boolean(entry.unsubscribed_at);
                return (
                  <tr key={entry.id} className="hover:bg-surface-2/40 transition-colors">
                    <td className="p-3.5 font-mono font-medium text-fg">{entry.email}</td>
                    <td className="p-3.5">
                      <span className="capitalize px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-surface-2 border border-border text-fg">
                        {entry.interest}
                      </span>
                    </td>
                    <td className="p-3.5 max-w-xs text-muted text-[11px] truncate" title={entry.consent_text}>
                      <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                        <ShieldCheck className="size-3" /> Unticked Consent Given
                      </span>
                      <span className="italic truncate block">{entry.consent_text}</span>
                    </td>
                    <td className="p-3.5 text-muted whitespace-nowrap">
                      {new Date(entry.created_at).toLocaleDateString()}
                    </td>
                    <td className="p-3.5 text-center whitespace-nowrap">
                      {isUnsub ? (
                        <Badge className="bg-muted/10 text-muted border border-border font-medium text-[10px]">
                          Unsubscribed
                        </Badge>
                      ) : (
                        <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 font-medium text-[10px]">
                          Active
                        </Badge>
                      )}
                    </td>
                    <td className="p-3.5 text-right whitespace-nowrap">
                      <button
                        onClick={() => {
                          if (confirm(`Remove waitlist entry for ${entry.email}?`)) {
                            deleteMutation.mutate(entry.id);
                          }
                        }}
                        disabled={deleteMutation.isPending}
                        className="text-danger hover:opacity-80 p-1.5 rounded hover:bg-danger/10 transition-colors cursor-pointer"
                        title="Delete entry"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={6} className="p-8 text-center text-muted">
                  No waitlist entries found matching your criteria.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
