import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getTicketsAdmin,
  updateTicketStatusAdmin,
  deleteTicketAdmin,
  type Ticket,
} from "@/lib/contact-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  ExternalLink,
  Copy,
  Clock,
  User,
  AlertCircle,
  Camera,
  Layers,
  Phone,
  X,
  FileText,
  Sparkles,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";

export function InquiriesTab() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "open" | "resolved">("all");
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);

  const [copiedTicketId, setCopiedTicketId] = useState<number | null>(null);

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

  const counts = useMemo(() => {
    const total = tickets.length;
    const open = tickets.filter((t) => t.status === "open").length;
    const resolved = tickets.filter((t) => t.status === "resolved").length;
    return { total, open, resolved };
  }, [tickets]);

  // Handle escape key for lightbox
  useEffect(() => {
    if (!previewPhoto) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setPreviewPhoto(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [previewPhoto]);

  const parseTicketSender = (ticket: Ticket) => {
    let email = ticket.user_id.replace(/^guest-/, "");
    let name = "Customer";
    let isCustom = false;
    let payload: any = null;

    try {
      const parsed = JSON.parse(ticket.description);
      if (parsed && typeof parsed === "object" && parsed.isCustomRequest) {
        isCustom = true;
        payload = parsed;
        if (parsed.customerEmail) email = parsed.customerEmail;
        if (parsed.customerName) name = parsed.customerName;
      }
    } catch {
      // Plain text description
    }

    if (!isCustom) {
      const nameMatch = ticket.title.match(/(?:Contact from|Custom 3D Request from) (.*)/i);
      if (nameMatch) name = nameMatch[1].trim();
      isCustom = ticket.title.toLowerCase().includes("custom 3d request");
    }

    return { name, email, isCustom, payload };
  };

  const generateSubject = (ticket: Ticket, name: string, isCustom: boolean) => {
    if (isCustom) {
      return `[Prynth Quotation #${ticket.id}] Custom 3D Fabrication — ${name}`;
    }
    return `Re: [Prynth #${ticket.id}] Inquiry from ${name}`;
  };

  const generateQuoteTemplate = ({
    ticket,
    name,
    isCustom,
    payload,
  }: {
    ticket: Ticket;
    name: string;
    isCustom: boolean;
    payload: any;
  }) => {
    if (isCustom && payload) {
      const specs: string[] = [];
      if (payload.sizeName) specs.push(`• Approx Size / Scope: ${payload.sizeName}`);
      if (payload.materialName) {
        const mat = payload.materialName.toUpperCase();
        const col = payload.colorName ? ` (${payload.colorName})` : "";
        specs.push(`• Material & Finish: ${mat}${col}`);
      }
      if (payload.quantity) {
        specs.push(`• Quantity: ${payload.quantity} unit${payload.quantity > 1 ? "s" : ""}`);
      }
      if (payload.printerName) {
        specs.push(`• Production Technology: ${payload.printerName}`);
      }

      const ideaText = payload.idea ? payload.idea.trim() : "Custom 3D Fabrication";

      return `Hi ${name},

Thank you for reaching out to Prynth! We have reviewed your custom 3D printing project and requirements.

Here is your studio quotation and fabrication estimate:

────────────────────────────────────────────
PROJECT SPECIFICATIONS
────────────────────────────────────────────
${specs.join("\n")}

Customer Requirements & Concept:
"${ideaText}"

────────────────────────────────────────────
QUOTATION & PRODUCTION ESTIMATE
────────────────────────────────────────────
• Estimated Investment: ₹[Type Price Here] (incl. GST)
• Production & Delivery Timeline: [e.g. 3-5 business days]
• Shipping: Pan-India tracked doorstep delivery

────────────────────────────────────────────
HOW TO CONFIRM YOUR ORDER
────────────────────────────────────────────
To confirm this quotation and initiate production:
1. Reply directly to this email with your preferred shipping address and contact number (plus any design adjustments).
2. We will provide your secure payment link and schedule your print immediately on our production queue.

If you have 3D CAD files (.STL, .STEP, .OBJ) or design drawings, feel free to attach them in your reply!

Warm regards,
The Prynth Engineering Team
Prynth! — Precision 3D Printing Studio
https://prynth.in | hello@prynth.in`;
    }

    return `Hi ${name},

Thank you for contacting Prynth!

Regarding your message:
"${ticket.description?.trim() || "Your inquiry"}"

[Type your reply here]

Please let us know if you have any questions or if we can assist you with anything else.

Warm regards,
The Prynth Team
Prynth! Studio
https://prynth.in | hello@prynth.in`;
  };

  const handleOpenGmail = (ticket: Ticket) => {
    const { name, email, isCustom, payload } = parseTicketSender(ticket);
    const subject = generateSubject(ticket, name, isCustom);
    const body = generateQuoteTemplate({ ticket, name, isCustom, payload });

    // Copy formatted template to clipboard
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(body).catch(() => {});
    }

    // Direct Gmail compose link
    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(
      email
    )}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

    window.open(gmailUrl, "_blank", "noopener,noreferrer");

    toast.success(`Opening Gmail quotation for ${name}...`, {
      description: "Quotation template pre-filled. Enter your price in Gmail and send!",
      action:
        ticket.status === "open"
          ? {
              label: "Mark Resolved",
              onClick: () =>
                updateStatusMutation.mutate({ id: ticket.id, status: "resolved" }),
            }
          : undefined,
    });
  };

  const handleCopyTemplate = (ticket: Ticket) => {
    const { name, isCustom, payload } = parseTicketSender(ticket);
    const body = generateQuoteTemplate({ ticket, name, isCustom, payload });

    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(body);
      setCopiedTicketId(ticket.id);
      setTimeout(() => setCopiedTicketId(null), 2500);
      toast.success("Quotation template copied to clipboard!");
    }
  };

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
            Messages and custom 3D printing requests submitted by customers through the website.
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
              "px-3.5 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer",
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
              "px-3.5 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer",
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
              "px-3.5 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer",
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
        <div className="rounded-xl border border-dashed border-border p-12 text-center bg-surface/40">
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
            const { name, email, isCustom, payload } = parseTicketSender(ticket);
            const isOpen = ticket.status === "open";
            const dateStr = new Date(ticket.created_at).toLocaleString("en-IN", {
              day: "numeric",
              month: "short",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            });

            const quoteSubject = generateSubject(ticket, name, isCustom);
            const quoteBody = generateQuoteTemplate({ ticket, name, isCustom, payload });
            const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(
              email
            )}&su=${encodeURIComponent(quoteSubject)}&body=${encodeURIComponent(quoteBody)}`;
            const mailtoUrl = `mailto:${email}?subject=${encodeURIComponent(
              quoteSubject
            )}&body=${encodeURIComponent(quoteBody)}`;

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
                      <span className="text-xs font-mono text-muted">#{ticket.id}</span>
                      {isCustom && (
                        <Badge className="bg-accent/15 text-accent border-accent/30 text-[11px] px-2 py-0.5 font-medium rounded-full flex items-center gap-1">
                          <Layers className="size-3" />
                          <span>Custom 3D Request</span>
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
                        className="p-1 hover:text-accent transition-colors cursor-pointer"
                        title="Copy email address"
                      >
                        <Copy className="size-3" />
                      </button>

                      <span className="text-subtle">·</span>

                      {/* Direct email links */}
                      <span className="text-subtle">Email directly:</span>
                      <a
                        href={gmailUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-accent/10 hover:bg-accent/20 text-accent font-medium text-[11px] transition-colors cursor-pointer"
                        title="Open Gmail compose with quote template pre-filled"
                      >
                        <ExternalLink className="size-3" />
                        <span>Gmail</span>
                      </a>

                      <a
                        href={mailtoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => {
                          try {
                            window.location.href = mailtoUrl;
                          } catch { }
                        }}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-surface-2 hover:bg-surface-3 text-muted hover:text-fg font-medium text-[11px] border border-border/50 transition-colors cursor-pointer"
                        title="Open in your default desktop mail app (Outlook, Apple Mail, etc.)"
                      >
                        <Mail className="size-3" />
                        <span>Mail App</span>
                      </a>

                      {payload?.customerPhone && (
                        <>
                          <span className="text-subtle">·</span>
                          <span className="flex items-center gap-1 text-fg/80">
                            <Phone className="size-3 text-accent" />
                            <span>{payload.customerPhone}</span>
                          </span>
                        </>
                      )}

                      <span className="text-subtle">·</span>

                      <span className="flex items-center gap-1 text-subtle">
                        <Clock className="size-3" />
                        <span>{dateStr}</span>
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons */}
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
                      className="h-8 text-xs gap-1.5 cursor-pointer"
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
                      variant="ghost"
                      onClick={() => handleCopyTemplate(ticket)}
                      className="h-8 text-xs gap-1.5 text-muted hover:text-fg cursor-pointer hidden md:inline-flex border border-border/50"
                      title="Copy formatted quotation template to clipboard"
                    >
                      {copiedTicketId === ticket.id ? (
                        <>
                          <Check className="size-3.5 text-emerald-500" />
                          <span>Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="size-3.5" />
                          <span>Copy Template</span>
                        </>
                      )}
                    </Button>

                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => handleOpenGmail(ticket)}
                      className="h-8 text-xs gap-1.5 cursor-pointer shadow-xs bg-accent text-white hover:bg-accent/90"
                      title="Opens Gmail compose in a new tab with customer email, subject, and quote template pre-filled"
                    >
                      {isCustom ? (
                        <>
                          <ExternalLink className="size-3.5" />
                          <span>Send Quote</span>
                        </>
                      ) : (
                        <>
                          <Send className="size-3.5" />
                          <span>Reply</span>
                        </>
                      )}
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
                      className="size-8 text-muted hover:text-danger cursor-pointer"
                      title="Delete message"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>

                {/* Message Body */}
                <div className="p-4 sm:p-5">
                  {payload && payload.isCustomRequest ? (
                    <div className="space-y-4">
                      <div>
                        <div className="text-xs font-semibold text-subtle uppercase tracking-wider mb-1.5">
                          Customer Idea &amp; Requirements
                        </div>
                        <div className="p-3.5 rounded-xl bg-surface-2/40 border border-border/50 text-sm text-fg whitespace-pre-wrap leading-relaxed">
                          {payload.idea}
                        </div>
                      </div>

                      {/* Specifications Summary Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                        <div className="rounded-xl border border-border/60 bg-surface p-2.5">
                          <span className="text-muted block text-[11px]">Approx Size</span>
                          <span className="font-semibold text-fg capitalize">{payload.sizeName}</span>
                        </div>
                        <div className="rounded-xl border border-border/60 bg-surface p-2.5">
                          <span className="text-muted block text-[11px]">Material</span>
                          <span className="font-semibold text-fg uppercase">{payload.materialName}</span>
                        </div>
                        <div className="rounded-xl border border-border/60 bg-surface p-2.5">
                          <span className="text-muted block text-[11px]">Colour</span>
                          <span className="font-semibold text-fg capitalize">{payload.colorName}</span>
                        </div>
                        <div className="rounded-xl border border-border/60 bg-surface p-2.5">
                          <span className="text-muted block text-[11px]">Quantity</span>
                          <span className="font-semibold text-fg">
                            {payload.quantity} unit{payload.quantity > 1 ? "s" : ""}
                          </span>
                        </div>
                      </div>

                      {/* Reference Photos Gallery */}
                      {payload.photos && payload.photos.length > 0 && (
                        <div className="space-y-2 pt-1 border-t border-border/40">
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-subtle uppercase tracking-wider pt-1">
                            <Camera className="size-3.5 text-accent" />
                            <span>Attached Reference Photos ({payload.photos.length})</span>
                          </div>
                          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2.5">
                            {payload.photos.map((src: string, idx: number) => (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => setPreviewPhoto(src)}
                                className="group relative aspect-square rounded-xl overflow-hidden border border-border bg-surface-2 shadow-2xs hover:border-accent hover:ring-2 hover:ring-accent/30 transition-all cursor-pointer"
                                title="Click to view full photo"
                              >
                                <img
                                  src={src}
                                  alt={`Attachment ${idx + 1}`}
                                  className="size-full object-cover transition-transform duration-200 group-hover:scale-105"
                                />
                                <span className="absolute bottom-1 left-1 rounded bg-black/75 px-1.5 py-0.5 text-[10px] font-medium text-white">
                                  Photo {idx + 1}
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div>
                      <div className="text-xs font-semibold text-subtle uppercase tracking-wider mb-2">
                        Inquiry Details
                      </div>
                      <div className="p-3.5 rounded-xl bg-surface-2/40 border border-border/40 text-sm text-fg whitespace-pre-wrap leading-relaxed">
                        {ticket.description}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Lightbox Photo Preview Modal */}
      {previewPhoto && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md animate-in fade-in duration-200 cursor-pointer"
          onClick={() => setPreviewPhoto(null)}
        >
          <div
            className="relative max-h-[90vh] max-w-4xl overflow-hidden rounded-2xl bg-surface border border-border shadow-2xl cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            <img src={previewPhoto} alt="Reference Preview" className="max-h-[80vh] w-auto object-contain" />
            <div className="flex items-center justify-between p-3 border-t border-border bg-surface-2/60">
              <span className="text-xs font-medium text-muted">Customer Reference Photo</span>
              <Button size="sm" variant="outline" onClick={() => setPreviewPhoto(null)} className="text-xs h-8 cursor-pointer">
                Close Preview
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
