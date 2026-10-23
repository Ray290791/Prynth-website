import { useState } from "react";
import { FileText, Download, Printer, X, CheckCircle2, Building, ShieldCheck } from "lucide-react";
import { formatINR } from "@/lib/format";
import { Button } from "@/components/ui/button";

export interface QuoteDetails {
  fileName?: string;
  total: number;
  qty: number;
  material?: string;
  color?: string;
  dimensions?: string;
  volumeCm3?: number;
  weightGrams?: number;
  layerHeight?: string;
  infill?: string;
  turnaroundDays?: string;
}

export function CommercialQuoteModal({
  quote,
  isOpen,
  onClose,
}: {
  quote: QuoteDetails;
  isOpen: boolean;
  onClose: () => void;
}) {
  const [quoteId] = useState(
    () => `PRY-Q-${Math.floor(100000 + Math.random() * 900000)}`
  );
  const [quoteDate] = useState(() => new Date().toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }));
  const [validUntil] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  });

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const unitPrice = quote.total;
  const totalPrice = unitPrice * (quote.qty || 1);

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-3 sm:p-6 backdrop-blur-md overflow-y-auto animate-in fade-in"
    >
      <div className="relative w-full max-w-2xl rounded-3xl border border-white/20 bg-surface shadow-2xl p-6 sm:p-8 space-y-6 text-fg my-auto">
        {/* Header Actions */}
        <div className="flex items-center justify-between border-b border-border pb-4 print:hidden">
          <div className="flex items-center gap-2">
            <FileText className="size-5 text-accent" />
            <h2 className="font-display text-lg font-bold">
              Official Commercial Estimate & Quotation
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={handlePrint}
              size="sm"
              className="bg-accent text-ink hover:opacity-90 font-semibold gap-1.5 cursor-pointer shadow-xs"
            >
              <Printer className="size-4" />
              <span>Print / Save PDF</span>
            </Button>
            <button
              onClick={onClose}
              className="rounded-full p-1.5 text-muted hover:bg-surface-2 hover:text-fg transition-colors"
              aria-label="Close quote modal"
            >
              <X className="size-5" />
            </button>
          </div>
        </div>

        {/* Printable Quotation Sheet */}
        <div id="printable-quote" className="space-y-6 text-sm">
          {/* Studio Header */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-border pb-6">
            <div>
              <h1 className="font-display text-2xl font-black tracking-tight text-accent">
                prynth!
              </h1>
              <p className="text-xs text-muted mt-0.5 font-medium">
                On-Demand 3D Printing & Additive Prototyping Studio
              </p>
              <p className="text-xs text-muted mt-2 leading-relaxed">
                Mumbai Studio, Maharashtra 400001, India<br />
                Web: <span className="font-mono text-fg">https://prynth.in</span> · Email: <span className="font-mono text-fg">hello@prynth.in</span>
              </p>
            </div>

            <div className="text-left sm:text-right text-xs space-y-1">
              <p className="font-mono font-bold text-sm text-fg">{quoteId}</p>
              <p className="text-muted">Issue Date: <span className="font-medium text-fg">{quoteDate}</span></p>
              <p className="text-muted">Price Lock Validity: <span className="font-medium text-emerald-600 dark:text-emerald-400">{validUntil} (14 Days)</span></p>
              <span className="inline-block mt-1 rounded-full bg-surface-2 border border-border px-2.5 py-0.5 text-[10px] font-semibold text-muted">
                Official Commercial Estimate
              </span>
            </div>
          </div>

          {/* Project Details */}
          <div>
            <h3 className="font-semibold text-xs uppercase tracking-wider text-muted mb-2">
              Project Specification
            </h3>
            <div className="rounded-2xl border border-border/80 bg-surface-2/40 p-4 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <span className="text-muted block text-[11px]">3D Model File</span>
                <span className="font-mono font-medium truncate block mt-0.5">
                  {quote.fileName || "Custom 3D CAD Component"}
                </span>
              </div>
              <div>
                <span className="text-muted block text-[11px]">Material & Filament</span>
                <span className="font-semibold text-fg block mt-0.5">
                  {quote.material || "PETG / Bambu Matte PLA"}
                </span>
              </div>
              <div>
                <span className="text-muted block text-[11px]">Selected Color</span>
                <span className="font-medium text-fg block mt-0.5">
                  {quote.color || "Studio Stock"}
                </span>
              </div>
              {quote.dimensions && (
                <div>
                  <span className="text-muted block text-[11px]">Bounding Dimensions</span>
                  <span className="font-mono font-medium text-fg block mt-0.5">
                    {quote.dimensions}
                  </span>
                </div>
              )}
              {quote.volumeCm3 != null && (
                <div>
                  <span className="text-muted block text-[11px]">Printed Volume</span>
                  <span className="font-mono font-medium text-fg block mt-0.5">
                    {quote.volumeCm3.toFixed(1)} cm³
                  </span>
                </div>
              )}
              {quote.layerHeight && (
                <div>
                  <span className="text-muted block text-[11px]">Layer Resolution</span>
                  <span className="font-medium text-fg block mt-0.5">
                    {quote.layerHeight}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Line Items Table */}
          <div className="overflow-hidden rounded-2xl border border-border">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border bg-surface-2 font-semibold text-muted">
                <tr>
                  <th className="py-2.5 px-3.5">Item Description</th>
                  <th className="py-2.5 px-3.5 text-center">Qty</th>
                  <th className="py-2.5 px-3.5 text-right">Unit Price</th>
                  <th className="py-2.5 px-3.5 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                <tr>
                  <td className="py-3 px-3.5">
                    <p className="font-medium text-fg">
                      Custom FDM 3D Printing Service
                    </p>
                    <p className="text-[11px] text-muted mt-0.5">
                      High-precision Bambu Lab CoreXY machine time, material allocation, automated preflight check, and manual quality deburring.
                    </p>
                  </td>
                  <td className="py-3 px-3.5 text-center font-mono font-semibold">
                    {quote.qty || 1}
                  </td>
                  <td className="py-3 px-3.5 text-right font-mono">
                    {formatINR(unitPrice)}
                  </td>
                  <td className="py-3 px-3.5 text-right font-mono font-semibold text-fg">
                    {formatINR(totalPrice)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Total & Pricing Compliance */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pt-2">
            <div className="max-w-sm space-y-1.5 text-xs text-muted">
              <div className="flex items-center gap-1.5 font-semibold text-fg">
                <ShieldCheck className="size-4 text-emerald-500" />
                <span>100% Flat & Transparent Pricing</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                Flat all-inclusive fee. Under Section 32 of CGST Act, no additional tax line items are added. Suitable for corporate reimbursement, college project expense vouchers, and freelance project budgets.
              </p>
            </div>

            <div className="rounded-2xl border border-border bg-surface-2/60 p-4 min-w-[200px] space-y-1.5 text-right">
              <div className="flex justify-between text-xs text-muted">
                <span>Subtotal:</span>
                <span className="font-mono">{formatINR(totalPrice)}</span>
              </div>
              <div className="flex justify-between text-xs text-muted">
                <span>Estimated Transit:</span>
                <span>{quote.turnaroundDays || "2–4 days"}</span>
              </div>
              <div className="border-t border-border/80 pt-2 flex justify-between text-sm font-bold text-fg">
                <span>Total Flat Fee:</span>
                <span className="font-mono text-accent text-base">{formatINR(totalPrice)}</span>
              </div>
            </div>
          </div>

          {/* Payment & Ordering Instructions */}
          <div className="rounded-2xl border border-dashed border-border p-4 text-xs text-muted space-y-1.5">
            <p className="font-semibold text-fg">How to proceed with this quote:</p>
            <p>
              1. Order directly online at <span className="font-mono text-fg">https://prynth.in/custom</span> using the quote specifications above.
            </p>
            <p>
              2. Or share this Quote Reference (<span className="font-mono text-accent font-semibold">{quoteId}</span>) with our studio team on WhatsApp for instant confirmation.
            </p>
          </div>
        </div>

        {/* Modal Bottom Buttons */}
        <div className="flex justify-end gap-2 pt-2 border-t border-border print:hidden">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button
            onClick={handlePrint}
            className="bg-accent text-ink hover:opacity-90 font-semibold gap-1.5"
          >
            <Printer className="size-4" />
            <span>Print / Save PDF</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
