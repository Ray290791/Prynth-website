import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getTicketsAdmin,
  updateTicketStatusAdmin,
  deleteTicketAdmin,
  replyToTicketAdmin,
  type Ticket,
} from "@/lib/contact-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Mail,
  CheckCircle2,
  RotateCcw,
  Trash2,
  Search,
  RefreshCw,
  Send,
  CornerDownRight,
  ExternalLink,
  Copy,
  Clock,
  User,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

export function InquiriesTab() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "open" | "resolved">("all");
  const [replyingTicketId, setReplyingTicketId] = useState<number | null>(null);
  const [replyText, setReplyText] = useState("");
  const [autoResolve, setAutoResolve] = useState(true);

  const { data: tickets = [], isLoading, isFetching, refetch } = useQuery({
    queryKey: ["adminTickets"],
    queryFn: () => getTicketsAdmin(),
  });

  const updateStatusMutation = useMutation({
    mutationFn: (vars: { id: number; status: string }) => updateTicketStatusAdmin({ data: vars }),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["adminTickets"] });
      toast.success(`Message marked as ${vars.status}`);
    },
    onError: (err: any) => toast.error(err?.message || "Failed to update status"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteTicketAdmin({ data: { id } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminTickets"] });
      toast.success("Message deleted");
    },
    onError: (err: any) => toast.error(err?.message || "Failed to delete message"),
  });

  const replyMutation = useMutation({
    mutationFn: (vars: {
      id: number;
      toEmail: string;
      customerName: string;
      originalMessage: string;
      replyMessage: string;
      markResolved?: boolean;
    }) => replyToTicketAdmin({ data: vars }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminTickets"] });
      toast.success("Reply sent successfully via email!");
      setReplyingTicketId(null);
      setReplyText("");
    },
    onError: (err: any) => toast.error(err?.message || "Failed to send email reply"),
  });

  const counts = useMemo(() => {
    const total = tickets.length;
    const open = tickets.filter((t) => t.status === "open").length;
    const resolved = tickets.filter((t) => t.status === "resolved").length;
    return { total, open, resolved };
  }, [tickets]);

  const filteredTickets = useMemo(() => {
    return tickets.filter((t) => {
      if (statusFilter !== "all" && t.status !== statusFilter) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      const name = (t.title || "").toLowerCase();
      const email = (t.user_id || "").toLowerCase();
      const msg = (t.description || "").toLowerCase();
      return name.includes(q) || email.includes(q) || msg.includes(q);
    });
  }, [tickets, statusFilter, search]);

  const parseTicketSender = (ticket: Ticket) => {
    const email = ticket.user_id.replace(/^guest-/, "");
    const nameMatch = ticket.title.match(/Contact from (.*)/i);
    const name = nameMatch ? nameMatch[1].trim() : "Customer";
    return { name, email };
  };

  const copyEmail = (email: string) => {
    navigator.clipboard.writeText(email);
    toast.success("Email copied to clipboard");
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-semibold tracking-tight">Customer Inquiries</h2>
            {counts.open > 0 && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                {counts.open} Open
              </span>
            )}
          </div>
          <p className="text-muted mt-1 text-sm">
            Messages and support tickets submitted by customers through the contact form.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
          className="self-start sm:self-auto gap-2"
        >
          <RefreshCw className={cn("size-3.5", isFetching && "animate-spin")} />
          <span>Refresh</span>
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Status Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-surface-2/60 rounded-xl border border-border/60 self-start">
          <button
            type="button"
            onClick={() => setStatusFilter("all")}
            className={cn(
              "px-3.5 py-1.5 text-xs font-medium rounded-lg transition-colors",
              statusFilter === "all"
                ? "bg-surface text-fg shadow-xs border border-border/40"
                : "text-muted hover:text-fg"
            )}
          >
            All ({counts.total})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("open")}
            className={cn(
              "px-3.5 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5",
              statusFilter === "open"
                ? "bg-surface text-fg shadow-xs border border-border/40"
                : "text-muted hover:text-fg"
            )}
          >
            <span className="size-2 rounded-full bg-amber-500" />
            Open ({counts.open})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("resolved")}
            className={cn(
              "px-3.5 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5",
              statusFilter === "resolved"
                ? "bg-surface text-fg shadow-xs border border-border/40"
                : "text-muted hover:text-fg"
            )}
          >
            <span className="size-2 rounded-full bg-emerald-500" />
            Resolved ({counts.resolved})
          </button>
        </div>

        {/* Search */}
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted pointer-events-none" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, keyword…"
            className="pl-9 text-xs sm:text-sm h-9 bg-surface"
          />
        </div>
      </div>

      {/* Inquiries Content */}
      {isLoading ? (
        <div className="p-12 text-center text-muted animate-pulse">Loading inquiries…</div>
      ) : filteredTickets.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border p-12 text-center bg-surface/40">
          <Mail className="size-10 text-muted mx-auto mb-3 opacity-40" />
          <h3 className="font-semibold text-fg">No inquiries found</h3>
          <p className="text-sm text-muted mt-1 max-w-sm mx-auto">
            {search
              ? "No messages match your search term. Try another keyword."
              : statusFilter === "open"
              ? "All caught up! There are no open inquiries needing attention."
              : "No messages currently in this view."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredTickets.map((ticket) => {
            const { name, email } = parseTicketSender(ticket);
            const isOpen = ticket.status === "open";
            const isReplying = replyingTicketId === ticket.id;
            const dateStr = new Date(ticket.created_at).toLocaleString("en-IN", {
              day: "numeric",
              month: "short",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            });

            return (
              <div
                key={ticket.id}
                className={cn(
                  "rounded-2xl border transition-all duration-200 overflow-hidden bg-surface shadow-xs",
                  isOpen
                    ? "border-amber-500/30 hover:border-amber-500/50"
                    : "border-border/70 hover:border-border"
                )}
              >
                {/* Header row */}
                <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-border/40 bg-surface-2/20">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-fg text-base">{name}</span>
                      <Badge
                        className={cn(
                          "capitalize text-[11px] px-2 py-0.5 font-medium rounded-full border",
                          isOpen
                            ? "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30"
                            : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                        )}
                      >
                        {ticket.status}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-muted flex-wrap">
                      <span className="flex items-center gap-1">
                        <Mail className="size-3.5 text-accent" />
                        <span className="text-fg/80">{email}</span>
                      </span>

                      <button
                        type="button"
                        onClick={() => copyEmail(email)}
                        className="p-1 hover:text-accent transition-colors"
                        title="Copy email address"
                      >
                        <Copy className="size-3" />
                      </button>

                      <a
                        href={`mailto:${email}?subject=Re:%20Inquiry%20to%20prynth!`}
                        className="inline-flex items-center gap-1 hover:text-accent transition-colors underline"
                        title="Open email in default client"
                      >
                        <ExternalLink className="size-3" />
                        <span>Email directly</span>
                      </a>

                      <span className="text-subtle">·</span>

                      <span className="flex items-center gap-1 text-subtle">
                        <Clock className="size-3" />
                        <span>{dateStr}</span>
                      </span>
                    </div>
                  </div>

                  {/* Quick Action Buttons */}
                  <div className="flex items-center gap-2 self-start sm:self-center">
                    <Button
                      size="sm"
                      variant={isOpen ? "outline" : "ghost"}
                      onClick={() =>
                        updateStatusMutation.mutate({
                          id: ticket.id,
                          status: isOpen ? "resolved" : "open",
                        })
                      }
                      disabled={updateStatusMutation.isPending}
                      className="h-8 text-xs gap-1.5"
                    >
                      {isOpen ? (
                        <>
                          <CheckCircle2 className="size-3.5 text-emerald-500" />
                          <span>Mark Resolved</span>
                        </>
                      ) : (
                        <>
                          <RotateCcw className="size-3.5 text-muted" />
                          <span>Reopen</span>
                        </>
                      )}
                    </Button>

                    <Button
                      size="sm"
                      variant={isReplying ? "secondary" : "primary"}
                      onClick={() => {
                        if (isReplying) {
                          setReplyingTicketId(null);
                        } else {
                          setReplyingTicketId(ticket.id);
                          setReplyText("");
                        }
                      }}
                      className="h-8 text-xs gap-1.5"
                    >
                      <CornerDownRight className="size-3.5" />
                      <span>{isReplying ? "Cancel" : "Reply"}</span>
                    </Button>

                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        if (confirm(`Are you sure you want to delete message #${ticket.id}?`)) {
                          deleteMutation.mutate(ticket.id);
                        }
                      }}
                      disabled={deleteMutation.isPending}
                      className="size-8 text-muted hover:text-danger"
                      title="Delete message"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>

                {/* Message Body */}
                <div className="p-4 sm:p-5">
                  <div className="text-xs font-semibold text-subtle uppercase tracking-wider mb-2">
                    Inquiry Details
                  </div>
                  <div className="p-3.5 rounded-xl bg-surface-2/40 border border-border/40 text-sm text-fg whitespace-pre-wrap leading-relaxed">
                    {ticket.description}
                  </div>
                </div>

                {/* Inline Email Reply Box */}
                {isReplying && (
                  <div className="p-4 sm:p-5 border-t border-border/60 bg-accent/5 animate-in fade-in duration-200">
                    <div className="flex items-center gap-2 mb-2">
                      <Send className="size-4 text-accent" />
                      <span className="text-sm font-semibold text-fg">
                        Send Reply to {email}
                      </span>
                    </div>
                    <Textarea
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder={`Write your response to ${name} here…`}
                      className="min-h-[100px] text-sm bg-surface resize-y"
                    />

                    <div className="mt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <label className="flex items-center gap-2 text-xs text-muted cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={autoResolve}
                          onChange={(e) => setAutoResolve(e.target.checked)}
                          className="rounded text-accent focus:ring-accent"
                        />
                        <span>Automatically mark as resolved upon sending</span>
                      </label>

                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setReplyingTicketId(null)}
                          className="text-xs h-8"
                        >
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          onClick={() =>
                            replyMutation.mutate({
                              id: ticket.id,
                              customerName: name,
                              toEmail: email,
                              originalMessage: ticket.description,
                              replyMessage: replyText,
                              markResolved: autoResolve,
                            })
                          }
                          disabled={replyMutation.isPending || !replyText.trim()}
                          className="text-xs h-8 gap-1.5"
                        >
                          <Send className="size-3" />
                          <span>{replyMutation.isPending ? "Sending…" : "Send Email"}</span>
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
