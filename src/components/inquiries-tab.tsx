import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getTicketsAdmin,
  updateTicketStatusAdmin,
  updateTicketMetadataAdmin,
  deleteTicketAdmin,
  type Ticket,
} from "@/lib/contact-fns";
import { ResendQuoteModal } from "@/components/admin/resend-quote-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Mail,
  Search,
  RefreshCw,
  Send,
  ExternalLink,
  Copy,
  Clock,
  Camera,
  Layers,
  Phone,
  X,
  FileText,
  Sparkles,
  Check,
  MessageCircle,
  Edit3,
  Save,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const PIPELINE_STAGES = [
  {
    id: "open",
    label: "New Request",
    badgeClass: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
    dotClass: "bg-amber-500",
  },
  {
    id: "discussion",
    label: "In Discussion",
    badgeClass: "bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30",
    dotClass: "bg-sky-500",
  },
  {
    id: "quoted",
    label: "Quoted",
    badgeClass: "bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30",
    dotClass: "bg-purple-500",
  },
  {
    id: "in_production",
    label: "In Production",
    badgeClass: "bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border-cyan-500/30",
    dotClass: "bg-cyan-500",
  },
  {
    id: "resolved",
    label: "Completed",
    badgeClass: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
    dotClass: "bg-emerald-500",
  },
] as const;

function parseInlineBold(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-semibold text-fg">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

function FormattedIdeaContent({ text }: { text: string }) {
  if (!text) return null;

  const lines = text.split("\n");

  return (
    <div className="space-y-1.5 text-xs sm:text-sm leading-relaxed">
      {lines.map((rawLine, idx) => {
        const line = rawLine.trim();
        if (!line) {
          return <div key={idx} className="h-1" />;
        }

        // Service badge or Custom 3D request header
        if (line.startsWith("[Service:") || line.startsWith("[Custom 3D Request]")) {
          return (
            <div key={idx} className="pb-1">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-accent/15 text-accent border border-accent/30">
                <Layers className="size-3" />
                <span>{line.replace(/^\[|\]$/g, "")}</span>
              </span>
            </div>
          );
        }

        // Markdown headings: ### or ##
        if (line.startsWith("###") || line.startsWith("##")) {
          const cleanHeading = line.replace(/^#+\s*/, "");
          return (
            <h4
              key={idx}
              className="text-xs font-bold text-accent uppercase tracking-wider pt-2.5 pb-0.5 flex items-center gap-1.5"
            >
              <Sparkles className="size-3 text-accent" />
              <span>{cleanHeading}</span>
            </h4>
          );
        }

        // Bullet point: •, -, *
        if (line.startsWith("•") || line.startsWith("- ") || line.startsWith("* ")) {
          const bulletContent = line.replace(/^[•\-*]\s*/, "");
          return (
            <div key={idx} className="flex items-start gap-2 pl-1 py-0.5 text-fg/90">
              <span className="text-accent font-bold leading-tight select-none">•</span>
              <div className="flex-1">{parseInlineBold(bulletContent)}</div>
            </div>
          );
        }

        // Standard line with potential **bold** segments
        return (
          <div key={idx} className="text-fg/90">
            {parseInlineBold(line)}
          </div>
        );
      })}
    </div>
  );
}

export function InquiriesTab() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "open" | "discussion" | "quoted" | "in_production" | "resolved">("all");
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);

  const [copiedTicketId, setCopiedTicketId] = useState<number | null>(null);

  // Inline studio notes editing
  const [editingNotesTicketId, setEditingNotesTicketId] = useState<number | null>(null);
  const [notesDraft, setNotesDraft] = useState("");

  // Phone number prompt for WhatsApp if missing
  const [phonePromptTicketId, setPhonePromptTicketId] = useState<number | null>(null);
  const [phoneDraft, setPhoneDraft] = useState("");

  // Official Resend Quote Modal state
  const [resendModalTicket, setResendModalTicket] = useState<Ticket | null>(null);

  const { data: tickets = [], isLoading, isFetching, refetch } = useQuery({
    queryKey: ["adminTickets"],
    queryFn: () => getTicketsAdmin(),
  });

  const updateStatusMutation = useMutation({
    mutationFn: (vars: { id: number; status: string }) => updateTicketStatusAdmin({ data: vars }),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["adminTickets"] });
      const stage = PIPELINE_STAGES.find((s) => s.id === vars.status);
      toast.success(`Request marked as: ${stage?.label || vars.status}`);
    },
    onError: (err: any) => toast.error(err?.message || "Failed to update status"),
  });

  const updateMetadataMutation = useMutation({
    mutationFn: (vars: { id: number; adminNotes?: string; customerPhone?: string }) =>
      updateTicketMetadataAdmin({ data: vars }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminTickets"] });
      toast.success("Studio details saved");
      setEditingNotesTicketId(null);
      setPhonePromptTicketId(null);
    },
    onError: (err: any) => toast.error(err?.message || "Failed to update studio details"),
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
    const discussion = tickets.filter((t) => t.status === "discussion").length;
    const quoted = tickets.filter((t) => t.status === "quoted").length;
    const in_production = tickets.filter((t) => t.status === "in_production").length;
    const resolved = tickets.filter((t) => t.status === "resolved" || t.status === "closed").length;
    return { total, open, discussion, quoted, in_production, resolved };
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
              label: "Mark In Discussion",
              onClick: () =>
                updateStatusMutation.mutate({ id: ticket.id, status: "discussion" }),
            }
          : undefined,
    });
  };

  const cleanPhoneForWhatsApp = (raw?: string) => {
    if (!raw) return "";
    const cleaned = raw.replace(/\D/g, "");
    if (cleaned.length === 10) return `91${cleaned}`;
    if (cleaned.length === 11 && cleaned.startsWith("0")) return `91${cleaned.slice(1)}`;
    return cleaned;
  };

  const handleOpenWhatsApp = (ticket: Ticket, overridePhone?: string) => {
    const { name, payload } = parseTicketSender(ticket);
    const phone = overridePhone || payload?.customerPhone;
    const clean = cleanPhoneForWhatsApp(phone);

    if (!clean || clean.length < 10) {
      setPhonePromptTicketId(ticket.id);
      setPhoneDraft(phone || "");
      return;
    }

    const ideaSnippet = payload?.idea ? ` ("${payload.idea.slice(0, 45)}...")` : "";
    const msg = `Hi ${name}! This is Ray from Prynth Studio 👋\n\nI'm reaching out regarding your Custom 3D Request #${ticket.id}${ideaSnippet}.\n\nI've reviewed your specifications and wanted to connect directly to discuss the dimensions, material finish, and tolerances.`;

    const url = `https://wa.me/${clean}?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank", "noopener,noreferrer");
    toast.success(`Opening WhatsApp chat with ${name}!`);

    // Auto-advance to discussion stage if new
    if (ticket.status === "open") {
      updateStatusMutation.mutate({ id: ticket.id, status: "discussion" });
    }
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
      if (statusFilter !== "all") {
        if (statusFilter === "resolved") {
          if (t.status !== "resolved" && t.status !== "closed") return false;
        } else if (t.status !== statusFilter) {
          return false;
        }
      }
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
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-fg">Customer Inquiries &amp; Custom Requests</h2>
            {counts.open > 0 && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                {counts.open} New
              </span>
            )}
          </div>
          <p className="text-muted mt-1 text-xs sm:text-sm">
            Live pipeline for custom 3D printing requests, services, and inquiries with zero-database WhatsApp &amp; Gmail chat.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
          className="h-8 text-xs self-start sm:self-auto gap-2 border-border/70 hover:bg-surface-2 cursor-pointer"
        >
          <RefreshCw className={cn("size-3.5", isFetching && "animate-spin")} />
          <span>Refresh</span>
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        {/* Status Pipeline Tabs */}
        <div className="flex items-center gap-1 p-1 bg-surface-2/60 rounded-xl border border-border/60 overflow-x-auto no-scrollbar max-w-full shrink-0">
          <button
            type="button"
            onClick={() => setStatusFilter("all")}
            className={cn(
              "h-8 px-3 text-xs font-medium rounded-lg transition-colors cursor-pointer shrink-0 whitespace-nowrap",
              statusFilter === "all"
                ? "bg-surface text-fg shadow-xs border border-border/40 font-semibold"
                : "text-muted hover:text-fg"
            )}
          >
            All ({counts.total})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("open")}
            className={cn(
              "h-8 px-3 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shrink-0 whitespace-nowrap",
              statusFilter === "open"
                ? "bg-surface text-fg shadow-xs border border-border/40 font-semibold"
                : "text-muted hover:text-fg"
            )}
          >
            <span className="size-2 rounded-full bg-amber-500" />
            New ({counts.open})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("discussion")}
            className={cn(
              "h-8 px-3 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shrink-0 whitespace-nowrap",
              statusFilter === "discussion"
                ? "bg-surface text-fg shadow-xs border border-border/40 font-semibold"
                : "text-muted hover:text-fg"
            )}
          >
            <span className="size-2 rounded-full bg-sky-500" />
            In Discussion ({counts.discussion})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("quoted")}
            className={cn(
              "h-8 px-3 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shrink-0 whitespace-nowrap",
              statusFilter === "quoted"
                ? "bg-surface text-fg shadow-xs border border-border/40 font-semibold"
                : "text-muted hover:text-fg"
            )}
          >
            <span className="size-2 rounded-full bg-purple-500" />
            Quoted ({counts.quoted})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("in_production")}
            className={cn(
              "h-8 px-3 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shrink-0 whitespace-nowrap",
              statusFilter === "in_production"
                ? "bg-surface text-fg shadow-xs border border-border/40 font-semibold"
                : "text-muted hover:text-fg"
            )}
          >
            <span className="size-2 rounded-full bg-cyan-500" />
            In Production ({counts.in_production})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("resolved")}
            className={cn(
              "h-8 px-3 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shrink-0 whitespace-nowrap",
              statusFilter === "resolved"
                ? "bg-surface text-fg shadow-xs border border-border/40 font-semibold"
                : "text-muted hover:text-fg"
            )}
          >
            <span className="size-2 rounded-full bg-emerald-500" />
            Completed ({counts.resolved})
          </button>
        </div>

        {/* Search */}
        <div className="relative w-full lg:w-72 shrink-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted pointer-events-none" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, keyword…"
            className="pl-9 text-xs sm:text-sm h-8 bg-surface border-border/70"
          />
        </div>
      </div>

      {/* Inquiries Content */}
      {isLoading ? (
        <div className="p-12 text-center text-muted animate-pulse text-sm">Loading inquiries…</div>
      ) : filteredTickets.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-12 text-center bg-surface/40">
          <Mail className="size-10 text-muted mx-auto mb-3 opacity-40" />
          <h3 className="font-semibold text-fg">No inquiries found</h3>
          <p className="text-xs sm:text-sm text-muted mt-1 max-w-sm mx-auto">
            {search
              ? "No messages match your search term. Try another keyword."
              : statusFilter === "open"
                ? "All caught up! There are no new inquiries needing initial review."
                : `No inquiries currently in stage "${statusFilter}".`}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredTickets.map((ticket) => {
            const { name, email, isCustom, payload } = parseTicketSender(ticket);
            const dateStr = new Date(ticket.created_at).toLocaleString("en-IN", {
              day: "numeric",
              month: "short",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            });

            const currentStage = PIPELINE_STAGES.find((s) => s.id === ticket.status) || {
              id: ticket.status,
              label: ticket.status === "open" ? "New Request" : ticket.status,
              badgeClass:
                ticket.status === "open"
                  ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30"
                  : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
              dotClass: ticket.status === "open" ? "bg-amber-500" : "bg-emerald-500",
            };

            return (
              <div
                key={ticket.id}
                className={cn(
                  "rounded-2xl border transition-all duration-200 overflow-hidden bg-surface shadow-xs",
                  ticket.status === "open"
                    ? "border-amber-500/30 hover:border-amber-500/50"
                    : ticket.status === "discussion"
                      ? "border-sky-500/30 hover:border-sky-500/50"
                      : ticket.status === "quoted"
                        ? "border-purple-500/30 hover:border-purple-500/50"
                        : ticket.status === "in_production"
                          ? "border-cyan-500/30 hover:border-cyan-500/50"
                          : "border-border/70 hover:border-border"
                )}
              >
                {/* Header row: Left metadata, Right action bar */}
                <div className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-3.5 border-b border-border/40 bg-surface-2/20">
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-fg text-base">{name}</span>
                      <span className="text-xs font-mono text-muted">#{ticket.id}</span>
                      {isCustom && (
                        <Badge className="bg-accent/15 text-accent border-accent/30 text-[11px] px-2 py-0.5 font-medium rounded-full flex items-center gap-1">
                          <Layers className="size-3" />
                          <span>Custom 3D Request</span>
                        </Badge>
                      )}

                      {/* Current Stage Badge */}
                      <Badge className={cn("text-[11px] px-2.5 py-0.5 font-medium rounded-full border flex items-center gap-1.5", currentStage.badgeClass)}>
                        <span className={cn("size-1.5 rounded-full", currentStage.dotClass)} />
                        <span>{currentStage.label}</span>
                      </Badge>
                    </div>

                    {/* Metadata line: Email · Phone · Time */}
                    <div className="flex items-center gap-2 text-xs text-muted flex-wrap">
                      <span className="flex items-center gap-1.5 text-fg/90 font-medium">
                        <Mail className="size-3.5 text-accent" />
                        <span>{email}</span>
                      </span>

                      <button
                        type="button"
                        onClick={() => copyEmail(email)}
                        className="p-1 hover:text-accent transition-colors cursor-pointer rounded hover:bg-surface-2"
                        title="Copy customer email"
                      >
                        <Copy className="size-3" />
                      </button>

                      {payload?.customerPhone && (
                        <>
                          <span className="text-subtle">·</span>
                          <button
                            type="button"
                            onClick={() => handleOpenWhatsApp(ticket)}
                            className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer font-medium"
                            title="Open WhatsApp chat with this phone number"
                          >
                            <Phone className="size-3 text-emerald-500" />
                            <span>{payload.customerPhone}</span>
                          </button>
                        </>
                      )}

                      <span className="text-subtle">·</span>

                      <span className="flex items-center gap-1 text-subtle">
                        <Clock className="size-3" />
                        <span>{dateStr}</span>
                      </span>
                    </div>
                  </div>

                  {/* Clean, Unified Action Bar (Standardized h-8 controls) */}
                  <div className="flex items-center gap-2 shrink-0 self-start lg:self-center flex-wrap sm:flex-nowrap">
                    {/* Status Pipeline Dropdown */}
                    <select
                      value={ticket.status === "closed" ? "resolved" : ticket.status}
                      onChange={(e) =>
                        updateStatusMutation.mutate({
                          id: ticket.id,
                          status: e.target.value,
                        })
                      }
                      disabled={updateStatusMutation.isPending}
                      className="h-8 text-xs rounded-lg border border-border/80 bg-surface px-2.5 text-fg font-medium cursor-pointer hover:border-accent focus:outline-none focus:ring-1 focus:ring-accent transition-colors"
                      title="Move request along the production pipeline"
                    >
                      <option value="open">Stage: New Request</option>
                      <option value="discussion">Stage: In Discussion</option>
                      <option value="quoted">Stage: Quoted</option>
                      <option value="in_production">Stage: In Production</option>
                      <option value="resolved">Stage: Completed</option>
                    </select>

                    {/* 1-Click WhatsApp Direct Chat */}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleOpenWhatsApp(ticket)}
                      className="h-8 text-xs px-3 gap-1.5 cursor-pointer bg-emerald-600/10 hover:bg-emerald-600 text-emerald-700 dark:text-emerald-300 hover:text-white border-emerald-600/30 font-medium transition-all"
                      title="Chat directly with customer on WhatsApp (Zero database storage)"
                    >
                      <MessageCircle className="size-3.5" />
                      <span>WhatsApp Chat</span>
                    </Button>

                    {/* Send via Resend (Primary Action: Official orders@prynth.in with luxury branded HTML template) */}
                    <Button
                      size="sm"
                      onClick={() => setResendModalTicket(ticket)}
                      className="h-8 text-xs px-3.5 gap-1.5 cursor-pointer shadow-xs bg-accent text-ink hover:opacity-90 font-semibold transition-all"
                      title="Type your reply and send an official branded quote email from orders@prynth.in via Resend"
                    >
                      <Mail className="size-3.5" />
                      <span>Send via Resend</span>
                    </Button>

                    {/* Direct Gmail Fallback */}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleOpenGmail(ticket)}
                      className="h-8 text-xs px-2.5 gap-1.5 cursor-pointer border-border/80 text-muted hover:text-fg hover:bg-surface-2 transition-all"
                      title="Opens Gmail compose in a new tab with customer email, subject, and quote template pre-filled"
                    >
                      <ExternalLink className="size-3.5" />
                      <span>Gmail</span>
                    </Button>

                    {/* Copy Template Button */}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleCopyTemplate(ticket)}
                      className="h-8 w-8 p-0 text-muted hover:text-fg cursor-pointer border border-border/60 hover:bg-surface-2 rounded-lg"
                      title={copiedTicketId === ticket.id ? "Copied!" : "Copy quotation template to clipboard"}
                    >
                      {copiedTicketId === ticket.id ? (
                        <Check className="size-3.5 text-emerald-500" />
                      ) : (
                        <Copy className="size-3.5" />
                      )}
                    </Button>

                    {/* Delete Ticket Button */}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        if (confirm(`Are you sure you want to delete message #${ticket.id}?`)) {
                          deleteMutation.mutate(ticket.id);
                        }
                      }}
                      disabled={deleteMutation.isPending}
                      className="h-8 w-8 p-0 text-muted hover:text-danger hover:bg-danger/10 cursor-pointer rounded-lg"
                      title="Delete message"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>

                {/* Message Body & Specifications */}
                <div className="p-4 sm:p-5">
                  {/* Compact WhatsApp Phone Number Prompt */}
                  {phonePromptTicketId === ticket.id && (
                    <div className="p-3.5 mb-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 space-y-2.5 animate-in fade-in duration-200">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5 font-semibold text-emerald-600 dark:text-emerald-400">
                          <MessageCircle className="size-3.5" />
                          <span>Enter WhatsApp Phone Number for {name}:</span>
                          <span className="text-[10px] font-normal text-muted bg-surface-2 px-2 py-0.5 rounded-full border border-border/60">
                            Zero DB Bloat
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setPhonePromptTicketId(null)}
                          className="text-muted hover:text-fg text-xs cursor-pointer flex items-center gap-1"
                        >
                          <X className="size-3.5" />
                          <span>Cancel</span>
                        </button>
                      </div>
                      <div className="flex items-center gap-2">
                        <Input
                          value={phoneDraft}
                          onChange={(e) => setPhoneDraft(e.target.value)}
                          placeholder="e.g. +91 9836948527 or 9836948527"
                          className="text-xs bg-surface h-8"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && phoneDraft.trim()) {
                              updateMetadataMutation.mutate({ id: ticket.id, customerPhone: phoneDraft });
                              handleOpenWhatsApp(ticket, phoneDraft);
                            }
                          }}
                        />
                        <Button
                          size="sm"
                          onClick={() => {
                            if (!phoneDraft.trim()) {
                              toast.error("Please enter a valid phone number.");
                              return;
                            }
                            updateMetadataMutation.mutate({ id: ticket.id, customerPhone: phoneDraft });
                            handleOpenWhatsApp(ticket, phoneDraft);
                          }}
                          disabled={updateMetadataMutation.isPending}
                          className="h-8 text-xs px-3 bg-emerald-600 hover:bg-emerald-700 text-white shrink-0 cursor-pointer font-medium"
                        >
                          Save &amp; Open Chat
                        </Button>
                      </div>
                    </div>
                  )}

                  {payload && payload.isCustomRequest ? (
                    <div className="space-y-4">
                      {/* Customer Idea & Requirements formatted cleanly */}
                      <div>
                        <div className="text-xs font-semibold text-subtle uppercase tracking-wider mb-1.5">
                          Customer Idea &amp; Requirements
                        </div>
                        <div className="p-4 rounded-xl bg-surface-2/40 border border-border/50 text-fg">
                          <FormattedIdeaContent text={payload.idea} />
                        </div>
                      </div>

                      {/* Specifications Summary Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                        <div className="rounded-xl border border-border/60 bg-surface p-2.5">
                          <span className="text-muted block text-[11px]">Approx Size</span>
                          <span className="font-semibold text-fg capitalize">{payload.sizeName || "Custom"}</span>
                        </div>
                        <div className="rounded-xl border border-border/60 bg-surface p-2.5">
                          <span className="text-muted block text-[11px]">Material</span>
                          <span className="font-semibold text-fg uppercase">{payload.materialName || "PLA"}</span>
                        </div>
                        <div className="rounded-xl border border-border/60 bg-surface p-2.5">
                          <span className="text-muted block text-[11px]">Colour</span>
                          <span className="font-semibold text-fg capitalize">{payload.colorName || "Standard"}</span>
                        </div>
                        <div className="rounded-xl border border-border/60 bg-surface p-2.5">
                          <span className="text-muted block text-[11px]">Quantity</span>
                          <span className="font-semibold text-fg">
                            {payload.quantity || 1} unit{(payload.quantity || 1) > 1 ? "s" : ""}
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
                      <div className="p-4 rounded-xl bg-surface-2/40 border border-border/40 text-sm text-fg whitespace-pre-wrap leading-relaxed">
                        {ticket.description}
                      </div>
                    </div>
                  )}

                  {/* Private Studio Note Section (Ultra-lightweight, 0 DB risk) */}
                  <div className="mt-4 pt-3 border-t border-border/40">
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="text-[11px] font-semibold text-subtle uppercase tracking-wider flex items-center gap-1.5">
                        <FileText className="size-3 text-accent" />
                        <span>Private Studio Notes</span>
                        <span className="text-[10px] font-normal text-muted/70">(Internal only · Free DB storage)</span>
                      </span>
                      {editingNotesTicketId !== ticket.id && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingNotesTicketId(ticket.id);
                            setNotesDraft(payload?.adminNotes || "");
                          }}
                          className="text-[11px] text-accent hover:underline flex items-center gap-1 cursor-pointer font-medium"
                        >
                          <Edit3 className="size-3" />
                          <span>{payload?.adminNotes ? "Edit Note" : "+ Add Note"}</span>
                        </button>
                      )}
                    </div>

                    {editingNotesTicketId === ticket.id ? (
                      <div className="space-y-2 animate-in fade-in duration-150">
                        <Input
                          value={notesDraft}
                          onChange={(e) => setNotesDraft(e.target.value)}
                          placeholder="e.g. Discussing on WhatsApp. Quoted ₹750, customer requested matte black PETG, waiting on STEP file..."
                          className="text-xs bg-surface h-8"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              updateMetadataMutation.mutate({ id: ticket.id, adminNotes: notesDraft });
                            }
                          }}
                        />
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            onClick={() => {
                              updateMetadataMutation.mutate({ id: ticket.id, adminNotes: notesDraft });
                            }}
                            disabled={updateMetadataMutation.isPending}
                            className="h-7 text-xs px-2.5 bg-accent text-ink hover:opacity-90 font-medium cursor-pointer"
                          >
                            <Save className="size-3 mr-1" />
                            <span>Save Note</span>
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditingNotesTicketId(null)}
                            className="h-7 text-xs px-2.5 cursor-pointer text-muted hover:text-fg"
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : payload?.adminNotes ? (
                      <div className="p-2.5 rounded-xl bg-accent/5 border border-accent/20 text-xs text-fg flex items-start gap-2">
                        <span className="text-muted text-[11px] select-none">📝</span>
                        <span className="flex-1 whitespace-pre-wrap leading-relaxed">{payload.adminNotes}</span>
                      </div>
                    ) : (
                      <p className="text-[11px] text-muted italic">
                        No studio notes saved yet. Click &quot;+ Add Note&quot; to log price quotes, CAD revisions, or WhatsApp chat summary without using database space.
                      </p>
                    )}
                  </div>
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

      {/* Resend Official Quotation Email Modal */}
      {resendModalTicket && (() => {
        const { name, email, isCustom, payload } = parseTicketSender(resendModalTicket);
        return (
          <ResendQuoteModal
            ticket={resendModalTicket}
            isOpen={true}
            onClose={() => setResendModalTicket(null)}
            customerName={name}
            customerEmail={email}
            isCustomRequest={isCustom}
            payload={payload}
          />
        );
      })()}
    </div>
  );
}
