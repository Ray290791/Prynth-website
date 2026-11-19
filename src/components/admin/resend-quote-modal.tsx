import { useState, useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Mail, Send, Eye, Edit3, X, CheckCircle2, Sparkles, Clock, IndianRupee, AlertCircle, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ModalPortal } from "@/components/ui/modal-portal";
import { replyToTicketAdmin, type Ticket } from "@/lib/contact-fns";
import { generateQuoteEmailFullHtml } from "@/lib/quote-email-formatter";

export interface ResendQuoteModalProps {
  ticket: Ticket;
  isOpen: boolean;
  onClose: () => void;
  customerName: string;
  customerEmail: string;
  isCustomRequest: boolean;
  payload?: any;
}

export function ResendQuoteModal({
  ticket,
  isOpen,
  onClose,
  customerName,
  customerEmail,
  isCustomRequest,
  payload,
}: ResendQuoteModalProps) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"compose" | "preview">("compose");

  // Form State
  const [toEmail, setToEmail] = useState(customerEmail || "");
  const [subject, setSubject] = useState(() => {
    const productName = payload?.idea?.match(/\*\*Product Name:\*\*\s*(.+)/i)?.[1]?.trim();
    if (isCustomRequest) {
      return `Quotation: Custom 3D Request #${ticket.id} — ${productName || "Prynth Studio"}`;
    }
    return `Re: Your inquiry to Prynth! [#${ticket.id}]`;
  });
  const [quoteAmount, setQuoteAmount] = useState<string>("");
  const [turnaround, setTurnaround] = useState("2–3 Business Days");
  const [newStatus, setNewStatus] = useState("quoted");

  // Initial pre-filled message tailored to the inquiry
  const [replyMessage, setReplyMessage] = useState(() => {
    if (isCustomRequest && payload) {
      const specs: string[] = [];
      if (payload.sizeName) specs.push(`• Approx Size: ${payload.sizeName}`);
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

      const ideaSnippet = payload.idea ? payload.idea.trim() : "Custom 3D Printing Request";

      return `Hi ${customerName},

Thank you for reaching out to Prynth! We have reviewed your custom 3D printing project and requirements.

### Project Specifications:
${specs.join("\n")}

### Customer Concept & Details:
"${ideaSnippet}"

### Studio Fabrication Estimate:
• Production & Delivery Timeline: 2–3 business days from design confirmation
• Shipping: Tracked pan-India doorstep delivery with shock-proof protective packaging
• Material Quality: Premium industrial-grade filament, 0.08mm micro-layer calibration

### How to Confirm:
Simply reply directly to this email to confirm your quotation or ask for any material/finish adjustments. We will reserve printer capacity on our CoreXY fleet and share your secure payment link.

Best regards,
Ray Kapadia & The Prynth Engineering Team
Prynth! — Precision 3D Printing Studio
Mumbai, India | https://prynth.in`;
    }

    return `Hi ${customerName},

Thank you for contacting Prynth!

Regarding your message:
"${ticket.description?.trim() || "Your inquiry"}"

We'd love to help you with this project. Please find our response and specifications above.

Please let us know if you have any questions or would like to proceed.

Best regards,
The Prynth Team
https://prynth.in | orders@prynth.in`;
  });

  // Generate live email HTML for preview and server dispatch
  const previewHtml = useMemo(() => {
    return generateQuoteEmailFullHtml({
      customerName,
      replyMessage,
      originalMessage: isCustomRequest ? payload?.idea : ticket.description,
      quoteAmount: quoteAmount ? parseFloat(quoteAmount) : undefined,
      turnaround: turnaround.trim() || undefined,
      ticketId: ticket.id,
      brandEmail: "prynth07@gmail.com",
      brandWebsite: "https://prynth.in",
    });
  }, [customerName, replyMessage, isCustomRequest, payload, quoteAmount, turnaround, ticket.id, ticket.description]);

  // Mutation to send email via Resend
  const sendMutation = useMutation({
    mutationFn: async () => {
      if (!toEmail.trim() || !toEmail.includes("@")) {
        throw new Error("Please enter a valid recipient email address.");
      }
      if (!replyMessage.trim()) {
        throw new Error("Please enter an email message.");
      }

      return replyToTicketAdmin({
        data: {
          id: ticket.id,
          toEmail: toEmail.trim(),
          customerName: customerName || "Customer",
          originalMessage: isCustomRequest ? (payload?.idea || "") : (ticket.description || ""),
          replyMessage: replyMessage.trim(),
          subject: subject.trim(),
          quoteAmount: quoteAmount ? parseFloat(quoteAmount) : undefined,
          turnaround: turnaround.trim() || undefined,
          newStatus,
        },
      });
    },
    onSuccess: () => {
      toast.success(`Official quote sent to ${toEmail} via Resend!`, {
        description: `Dispatched from orders@prynth.in. Inquiry moved to "${newStatus}".`,
      });
      queryClient.invalidateQueries({ queryKey: ["adminTickets"] });
      onClose();
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to send email via Resend. Please check RESEND_API_KEY.");
    },
  });

  if (!isOpen) return null;

  return (
    <ModalPortal isOpen={isOpen}>
      <div
        role="dialog"
        aria-modal="true"
        className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/85 p-3 sm:p-6 backdrop-blur-md overflow-y-auto animate-in fade-in"
      >
      <div className="relative w-full max-w-3xl rounded-3xl border border-glass-border-liquid bg-surface/95 backdrop-blur-2xl shadow-2xl p-5 sm:p-7 space-y-5 text-fg my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-border/80 pb-4 shrink-0">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="flex size-8 items-center justify-center rounded-xl bg-accent/15 text-accent">
                <Mail className="size-4" />
              </span>
              <h2 className="font-display text-lg sm:text-xl font-bold tracking-tight">
                Send Official Quote via Resend
              </h2>
              <Badge className="bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30 text-[11px] px-2 py-0.5 font-medium">
                From: orders@prynth.in
              </Badge>
            </div>
            <p className="text-xs text-muted">
              Sends an official luxury branded HTML email via Resend API to <strong>{toEmail}</strong> (Reply-To: prynth07@gmail.com).
            </p>
          </div>

          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-muted hover:bg-surface-2 hover:text-fg transition-colors cursor-pointer tactile-btn"
            aria-label="Close modal"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Tab Switcher: Compose vs Preview */}
        <div className="flex items-center justify-between gap-2 border-b border-border/60 pb-2 shrink-0">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setActiveTab("compose")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all tactile-btn ${
                activeTab === "compose"
                  ? "bg-accent text-ink shadow-xs"
                  : "text-muted hover:text-fg hover:bg-surface-2"
              }`}
            >
              <Edit3 className="size-3.5" />
              <span>Compose Message</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("preview")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all tactile-btn ${
                activeTab === "preview"
                  ? "bg-accent text-ink shadow-xs"
                  : "text-muted hover:text-fg hover:bg-surface-2"
              }`}
            >
              <Eye className="size-3.5" />
              <span>Live Template Preview</span>
              {quoteAmount && (
                <span className="rounded bg-black/20 px-1 text-[10px] font-mono">
                  ₹{Number(quoteAmount).toLocaleString("en-IN")}
                </span>
              )}
            </button>
          </div>

          <span className="text-[11px] text-muted hidden sm:inline">
            Request #{ticket.id} · {customerName}
          </span>
        </div>

        {/* Main Body */}
        {activeTab === "compose" ? (
          <div className="space-y-4 overflow-y-auto pr-1 flex-1">
            {/* Row 1: Recipient & Subject */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              <div className="sm:col-span-5 space-y-1">
                <Label className="text-xs font-medium text-muted">Recipient (To Email)</Label>
                <Input
                  type="email"
                  value={toEmail}
                  onChange={(e) => setToEmail(e.target.value)}
                  placeholder="customer@example.com"
                  className="h-9 text-xs"
                />
              </div>
              <div className="sm:col-span-7 space-y-1">
                <Label className="text-xs font-medium text-muted">Email Subject</Label>
                <Input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Quotation: Custom 3D Printing"
                  className="h-9 text-xs font-medium"
                />
              </div>
            </div>

            {/* Row 2: Quotation Hero Box Inputs (Amount & Turnaround) */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 p-3.5 rounded-xl border border-accent/25 bg-accent/5">
              <div className="sm:col-span-4 space-y-1">
                <Label className="text-xs font-semibold text-accent flex items-center gap-1">
                  <IndianRupee className="size-3.5" />
                  <span>Quotation Amount (₹)</span>
                </Label>
                <Input
                  type="number"
                  min="0"
                  step="50"
                  value={quoteAmount}
                  onChange={(e) => setQuoteAmount(e.target.value)}
                  placeholder="e.g. 450"
                  className="h-9 text-xs font-bold text-fg bg-surface"
                />
                <span className="text-[10px] text-muted">Renders prominent price banner in email</span>
              </div>

              <div className="sm:col-span-4 space-y-1">
                <Label className="text-xs font-semibold text-accent flex items-center gap-1">
                  <Clock className="size-3.5" />
                  <span>Turnaround Timeline</span>
                </Label>
                <Input
                  type="text"
                  value={turnaround}
                  onChange={(e) => setTurnaround(e.target.value)}
                  placeholder="e.g. 2–3 Business Days"
                  className="h-9 text-xs text-fg bg-surface"
                />
                <span className="text-[10px] text-muted">Renders turnaround pill in banner</span>
              </div>

              <div className="sm:col-span-4 space-y-1">
                <Label className="text-xs font-semibold text-accent flex items-center gap-1">
                  <Sparkles className="size-3.5" />
                  <span>Pipeline Stage After Send</span>
                </Label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="h-9 w-full rounded-md border border-border bg-surface px-2.5 text-xs text-fg font-medium cursor-pointer"
                >
                  <option value="quoted">Stage: Quoted (Recommended)</option>
                  <option value="discussion">Stage: In Discussion</option>
                  <option value="in_production">Stage: In Production</option>
                  <option value="resolved">Stage: Completed / Resolved</option>
                  <option value="open">Keep as: New Request</option>
                </select>
                <span className="text-[10px] text-muted">Automatically moves request</span>
              </div>
            </div>

            {/* Row 3: Email Content Textarea */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium text-fg">
                  Email Message Body (Markdown &amp; plain text supported)
                </Label>
                <span className="text-[11px] text-muted">
                  Use <strong>**bold**</strong>, <strong>### Headers</strong>, and <strong>• bullets</strong>
                </span>
              </div>

              <textarea
                value={replyMessage}
                onChange={(e) => setReplyMessage(e.target.value)}
                rows={9}
                className="w-full rounded-xl border border-border bg-surface-2/40 p-3 text-xs leading-relaxed font-mono text-fg focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent transition-colors"
                placeholder="Type your message to the customer..."
              />
            </div>
          </div>
        ) : (
          /* Live Template Preview */
          <div className="flex-1 overflow-hidden flex flex-col space-y-2 border border-border/80 rounded-2xl bg-slate-100 dark:bg-slate-900 p-2">
            <div className="flex items-center justify-between px-2 text-[11px] text-muted">
              <span>Previewing email as rendered by recipient's email client:</span>
              <span className="font-mono text-accent font-semibold">From: orders@prynth.in</span>
            </div>
            <div className="flex-1 rounded-xl overflow-hidden bg-white shadow-inner border border-slate-300 dark:border-slate-800">
              <iframe
                title="Email Preview"
                srcDoc={previewHtml}
                className="w-full h-full min-h-[360px] border-none"
              />
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3 border-t border-border/80 shrink-0">
          <div className="text-[11px] text-muted flex items-center gap-1.5">
            <CheckCircle2 className="size-3.5 text-emerald-500" />
            <span>Sends via Resend API directly from orders@prynth.in</span>
          </div>

          <div className="flex items-center gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={sendMutation.isPending}
              className="text-xs h-9 cursor-pointer tactile-btn"
            >
              Cancel
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={() => sendMutation.mutate()}
              disabled={sendMutation.isPending || !toEmail.trim() || !replyMessage.trim()}
              className="h-9 text-xs px-4 gap-2 bg-accent text-ink font-semibold hover:opacity-90 cursor-pointer shadow-xs tactile-btn"
            >
              {sendMutation.isPending ? (
                <>
                  <span className="size-3.5 animate-spin rounded-full border-2 border-ink border-t-transparent" />
                  <span>Dispatching via Resend...</span>
                </>
              ) : (
                <>
                  <Send className="size-3.5" />
                  <span>Send via Resend</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
    </ModalPortal>
  );
}
