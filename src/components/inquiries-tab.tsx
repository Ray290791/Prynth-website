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
  IndianRupee,
  ChevronDown,
  ChevronUp,
  Eye,
  PenLine,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { generateQuoteEmailFullHtml } from "@/lib/quote-email-formatter";

export function InquiriesTab() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "open" | "resolved">("all");
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);

  // Quote / Reply Modal State
  const [activeModalTicket, setActiveModalTicket] = useState<Ticket | null>(null);
  const [modalMode, setModalMode] = useState<"compose" | "preview">("compose");
  const [modalSubject, setModalSubject] = useState("");
  const [modalQuoteAmount, setModalQuoteAmount] = useState<string>("");
  const [modalTurnaround, setModalTurnaround] = useState("3-5 business days");
  const [modalMessage, setModalMessage] = useState("");
  const [autoResolve, setAutoResolve] = useState(true);
  const [showInquiryDetailsInModal, setShowInquiryDetailsInModal] = useState(true);

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
      subject?: string;
      quoteAmount?: number;
      turnaround?: string;
      markResolved?: boolean;
    }) => replyToTicketAdmin({ data: vars }),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["adminTickets"] });
      toast.success(`Quotation email sent successfully to ${vars.toEmail}!`);
      setActiveModalTicket(null);
    },
    onError: (err: any) => toast.error(err?.message || "Failed to send email"),
  });

  const counts = useMemo(() => {
    const total = tickets.length;
    const open = tickets.filter((t) => t.status === "open").length;
    const resolved = tickets.filter((t) => t.status === "resolved").length;
    return { total, open, resolved };
  }, [tickets]);

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

  const generateDefaultQuoteTemplate = (
    name: string,
    payload: any,
    quoteAmountStr: string,
    turnaroundStr: string
  ) => {
    const specs: string[] = [];
    if (payload?.sizeName) specs.push(`• Dimensions / Scope: ${payload.sizeName}`);
    if (payload?.materialName)
      specs.push(`• Material: ${payload.materialName.toUpperCase()}${payload.colorName ? ` (${payload.colorName})` : ""}`);
    if (payload?.quantity) specs.push(`• Quantity: ${payload.quantity} unit${payload.quantity > 1 ? "s" : ""}`);
    if (payload?.printerName) specs.push(`• Production Technology: ${payload.printerName}`);

    const priceText = quoteAmountStr ? `₹${Number(quoteAmountStr).toLocaleString("en-IN")}` : "[Price Quote]";
    const timelineText = turnaroundStr || "3-5 business days";

    return `Hi ${name},

Thank you for reaching out to Prynth! We have reviewed your custom 3D design specifications and reference materials.

Here is our official studio quotation:

${specs.length > 0 ? "Specifications:\n" + specs.join("\n") + "\n\n" : ""}Estimated Investment: ${priceText}
Production & Delivery Timeline: ${timelineText}

Next Steps:
To confirm this order and initiate studio production, simply reply directly to this email with your preferred shipping address or any design refinements, and we will send over your payment link to schedule your print.

Best regards,
The Prynth Engineering Team
https://prynth.in`;
  };

  const openQuoteModal = (ticket: Ticket) => {
    const { name, isCustom, payload } = parseTicketSender(ticket);
    setActiveModalTicket(ticket);
    setModalMode("compose");
    setAutoResolve(true);
    setShowInquiryDetailsInModal(true);

    if (isCustom && payload) {
      const defaultSubj = `[Prynth Quotation #${ticket.id}] Custom 3D Fabrication — ${name}`;
      setModalSubject(defaultSubj);
      setModalTurnaround("3-5 business days");
      setModalQuoteAmount("");
      setModalMessage(generateDefaultQuoteTemplate(name, payload, "", "3-5 business days"));
    } else {
      setModalSubject(`Re: Your inquiry to prynth! [#${ticket.id}]`);
      setModalTurnaround("");
      setModalQuoteAmount("");
      setModalMessage(
        `Hi ${name},\n\nThank you for getting in touch with us at Prynth!\n\nRegarding your inquiry:\n\n\n\nPlease let us know if you have any questions.\n\nBest regards,\nThe Prynth Team\nhttps://prynth.in`
      );
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

  const activeTicketDetails = activeModalTicket ? parseTicketSender(activeModalTicket) : null;

  const previewHtml = useMemo(() => {
    if (!activeModalTicket || !activeTicketDetails) return "";
    const quoteAmt = modalQuoteAmount ? parseFloat(modalQuoteAmount) : undefined;
    return generateQuoteEmailFullHtml({
      customerName: activeTicketDetails.name,
      replyMessage: modalMessage,
      originalMessage: activeTicketDetails.payload?.idea || activeModalTicket.description,
      quoteAmount: quoteAmt && !isNaN(quoteAmt) ? quoteAmt : undefined,
      turnaround: modalTurnaround || undefined,
      ticketId: activeModalTicket.id,
      brandEmail: "hello@prynth.in",
      brandWebsite: "https://prynth.in",
    });
  }, [activeModalTicket, activeTicketDetails, modalMessage, modalQuoteAmount, modalTurnaround]);

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
                        href={`https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(email)}&su=${encodeURIComponent(`Re: [Prynth #${ticket.id}] Inquiry from ${name}`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-accent/10 hover:bg-accent/20 text-accent font-medium text-[11px] transition-colors cursor-pointer"
                        title="Open Gmail compose in a new browser tab"
                      >
                        <ExternalLink className="size-3" />
                        <span>Gmail</span>
                      </a>

                      <a
                        href={`mailto:${email}?subject=${encodeURIComponent(`Re: [Prynth #${ticket.id}] Inquiry from ${name}`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => {
                          try {
                            window.location.href = `mailto:${email}?subject=${encodeURIComponent(`Re: [Prynth #${ticket.id}] Inquiry from ${name}`)}`;
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
                      variant="primary"
                      onClick={() => openQuoteModal(ticket)}
                      className="h-8 text-xs gap-1.5 cursor-pointer shadow-xs"
                    >
                      {isCustom ? (
                        <>
                          <IndianRupee className="size-3.5" />
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

      {/* Quote & Reply Modal Dialog */}
      {activeModalTicket && activeTicketDetails && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 sm:p-6 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => {
            if (!replyMutation.isPending) setActiveModalTicket(null);
          }}
        >
          <div
            className="relative w-full max-w-2xl max-h-[92vh] flex flex-col rounded-2xl bg-surface border border-border shadow-2xl overflow-hidden cursor-default animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-border/60 bg-surface-2/40 flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-fg text-lg">
                    {activeTicketDetails.isCustom ? "Send Quotation" : "Reply to Customer"}
                  </span>
                  <Badge className="bg-accent/15 text-accent border-accent/30 text-xs">
                    Ticket #{activeModalTicket.id}
                  </Badge>
                  {activeTicketDetails.isCustom && (
                    <Badge className="bg-emerald-500/15 text-emerald-500 border-emerald-500/30 text-xs">
                      Custom 3D Print
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted mt-1 flex items-center gap-1.5 flex-wrap">
                  <span>Recipient: <strong className="text-fg">{activeTicketDetails.name}</strong> &lt;{activeTicketDetails.email}&gt;</span>
                  <button
                    type="button"
                    onClick={() => copyEmail(activeTicketDetails.email)}
                    className="p-1 hover:text-accent transition-colors cursor-pointer"
                    title="Copy email address"
                  >
                    <Copy className="size-3" />
                  </button>
                  <span className="text-subtle">·</span>
                  <a
                    href={`https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(activeTicketDetails.email)}&su=${encodeURIComponent(modalSubject)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] text-accent hover:underline cursor-pointer"
                    title="Open in Gmail"
                  >
                    <ExternalLink className="size-3" />
                    <span>Open in Gmail</span>
                  </a>
                </p>
              </div>

              <button
                type="button"
                onClick={() => setActiveModalTicket(null)}
                disabled={replyMutation.isPending}
                className="rounded-lg p-1.5 text-muted hover:text-fg hover:bg-surface-2 transition-colors cursor-pointer"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Mode Switcher Tabs */}
            <div className="px-4 sm:px-6 pt-3 pb-0 border-b border-border/50 bg-surface-2/20 flex items-center justify-between gap-3">
              <div className="flex items-center gap-1.5 pb-2.5">
                <button
                  type="button"
                  onClick={() => setModalMode("compose")}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all cursor-pointer",
                    modalMode === "compose"
                      ? "bg-surface text-fg shadow-xs font-semibold border border-border"
                      : "text-muted hover:text-fg hover:bg-surface-2/50"
                  )}
                >
                  <PenLine className="size-3.5" />
                  <span>Compose Message</span>
                </button>
                <button
                  type="button"
                  onClick={() => setModalMode("preview")}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all cursor-pointer",
                    modalMode === "preview"
                      ? "bg-surface text-accent shadow-xs font-semibold border border-accent/30"
                      : "text-muted hover:text-fg hover:bg-surface-2/50"
                  )}
                >
                  <Eye className="size-3.5 text-accent" />
                  <span>Live Email Template Preview</span>
                </button>
              </div>
              <span className="text-[11px] text-muted hidden sm:inline-block pb-2.5">
                {modalMode === "compose" ? "Edit specs & text" : "Prynth Studio Branded View"}
              </span>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
              {modalMode === "preview" ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-muted px-1">
                    <span>This is the elegant template the customer will receive in their inbox:</span>
                    <Badge className="text-[10px] text-accent border-accent/30 bg-accent/5 gap-1">
                      <Sparkles className="size-3" />
                      <span>Auto-Formatted Studio Template</span>
                    </Badge>
                  </div>
                  <div className="rounded-xl border border-border overflow-hidden shadow-inner bg-slate-100">
                    <iframe
                      srcDoc={previewHtml}
                      title="Customer Email Preview"
                      className="w-full h-[520px] border-none bg-slate-100"
                    />
                  </div>
                </div>
              ) : (
                <>
                  {/* Collapsible Customer Specs / Request Summary */}
                  {activeTicketDetails.isCustom && activeTicketDetails.payload && (
                    <div className="rounded-xl border border-border/60 bg-surface-2/30 overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setShowInquiryDetailsInModal((prev) => !prev)}
                        className="w-full flex items-center justify-between p-3 text-xs font-medium text-muted hover:text-fg transition-colors"
                      >
                        <span className="flex items-center gap-1.5">
                          <FileText className="size-3.5 text-accent" />
                          <span>Customer Requirements &amp; Reference ({activeTicketDetails.payload.sizeName}, {activeTicketDetails.payload.materialName})</span>
                        </span>
                        {showInquiryDetailsInModal ? (
                          <ChevronUp className="size-4" />
                        ) : (
                          <ChevronDown className="size-4" />
                        )}
                      </button>

                      {showInquiryDetailsInModal && (
                        <div className="p-3 pt-0 space-y-3 border-t border-border/40 text-xs">
                          <div className="p-2.5 rounded-lg bg-surface border border-border/50 text-fg whitespace-pre-wrap leading-relaxed mt-2">
                            {activeTicketDetails.payload.idea}
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            <div className="bg-surface p-2 rounded-lg border border-border/50">
                              <span className="text-[10px] text-muted block">Size</span>
                              <span className="font-semibold capitalize text-fg">{activeTicketDetails.payload.sizeName}</span>
                            </div>
                            <div className="bg-surface p-2 rounded-lg border border-border/50">
                              <span className="text-[10px] text-muted block">Material</span>
                              <span className="font-semibold uppercase text-fg">{activeTicketDetails.payload.materialName}</span>
                            </div>
                            <div className="bg-surface p-2 rounded-lg border border-border/50">
                              <span className="text-[10px] text-muted block">Colour</span>
                              <span className="font-semibold capitalize text-fg">{activeTicketDetails.payload.colorName}</span>
                            </div>
                            <div className="bg-surface p-2 rounded-lg border border-border/50">
                              <span className="text-[10px] text-muted block">Quantity</span>
                              <span className="font-semibold text-fg">{activeTicketDetails.payload.quantity || 1} unit(s)</span>
                            </div>
                          </div>

                          {activeTicketDetails.payload.photos && activeTicketDetails.payload.photos.length > 0 && (
                            <div className="pt-2">
                              <span className="text-[11px] text-muted block mb-1.5">Customer Attached Photos ({activeTicketDetails.payload.photos.length}):</span>
                              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                                {activeTicketDetails.payload.photos.map((src: string, idx: number) => (
                                  <button
                                    key={idx}
                                    type="button"
                                    onClick={() => setPreviewPhoto(src)}
                                    className="relative size-12 shrink-0 rounded-lg overflow-hidden border border-border hover:border-accent"
                                    title="Click to enlarge"
                                  >
                                    <img src={src} alt="Thumb" className="size-full object-cover" />
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Subject Input */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-fg">Email Subject</label>
                    <Input
                      value={modalSubject}
                      onChange={(e) => setModalSubject(e.target.value)}
                      placeholder="Subject line..."
                      className="text-xs sm:text-sm bg-surface"
                    />
                  </div>

                  {/* Quote Parameters (for custom orders) */}
                  {activeTicketDetails.isCustom && (
                    <div className="rounded-xl border border-accent/25 bg-accent/5 p-3.5 space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-accent flex items-center gap-1.5">
                          <IndianRupee className="size-3.5" />
                          <span>Quotation Parameters</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            const newMsg = generateDefaultQuoteTemplate(
                              activeTicketDetails.name,
                              activeTicketDetails.payload,
                              modalQuoteAmount,
                              modalTurnaround
                            );
                            setModalMessage(newMsg);
                            toast.success("Applied parameters to email template!");
                          }}
                          className="text-[11px] font-medium text-accent hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <Sparkles className="size-3" />
                          <span>Update Template</span>
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[11px] font-medium text-muted">Estimated Price (₹ INR)</label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted">₹</span>
                            <Input
                              type="number"
                              value={modalQuoteAmount}
                              onChange={(e) => setModalQuoteAmount(e.target.value)}
                              placeholder="e.g. 750"
                              className="pl-7 text-xs sm:text-sm bg-surface h-9"
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[11px] font-medium text-muted">Turnaround Timeline</label>
                          <Input
                            value={modalTurnaround}
                            onChange={(e) => setModalTurnaround(e.target.value)}
                            placeholder="e.g. 3-5 business days"
                            className="text-xs sm:text-sm bg-surface h-9"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Email Body */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-fg">Message Content</label>
                      <span className="text-[11px] text-muted">Customer will receive this via email</span>
                    </div>
                    <Textarea
                      value={modalMessage}
                      onChange={(e) => setModalMessage(e.target.value)}
                      placeholder="Compose your reply or quotation details here..."
                      className="min-h-[200px] text-xs sm:text-sm bg-surface font-sans leading-relaxed resize-y"
                    />
                  </div>
                </>
              )}

              {/* Status resolution checkbox */}
              <label className="flex items-center gap-2 text-xs text-muted cursor-pointer select-none pt-1">
                <input
                  type="checkbox"
                  checked={autoResolve}
                  onChange={(e) => setAutoResolve(e.target.checked)}
                  className="rounded text-accent focus:ring-accent"
                />
                <span>Automatically mark ticket #{activeModalTicket.id} as resolved upon sending</span>
              </label>
            </div>

            {/* Modal Footer */}
            <div className="p-4 sm:p-5 border-t border-border/60 bg-surface-2/40 flex items-center justify-between gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setActiveModalTicket(null)}
                disabled={replyMutation.isPending}
                className="text-xs cursor-pointer"
              >
                Cancel
              </Button>

              <Button
                size="sm"
                variant="primary"
                onClick={() => {
                  if (!modalMessage.trim()) {
                    toast.error("Please enter a message to send.");
                    return;
                  }
                  const quoteAmt = modalQuoteAmount ? parseFloat(modalQuoteAmount) : undefined;
                  replyMutation.mutate({
                    id: activeModalTicket.id,
                    customerName: activeTicketDetails.name,
                    toEmail: activeTicketDetails.email,
                    originalMessage: activeTicketDetails.payload?.idea || activeModalTicket.description,
                    replyMessage: modalMessage,
                    subject: modalSubject,
                    quoteAmount: quoteAmt && !isNaN(quoteAmt) ? quoteAmt : undefined,
                    turnaround: modalTurnaround || undefined,
                    markResolved: autoResolve,
                  });
                }}
                disabled={replyMutation.isPending || !modalMessage.trim()}
                className="text-xs gap-1.5 cursor-pointer shadow-xs"
              >
                <Send className="size-3.5" />
                <span>{replyMutation.isPending ? "Sending Email..." : activeTicketDetails.isCustom ? "Send Official Quotation" : "Send Email Reply"}</span>
              </Button>
            </div>
          </div>
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
