import React, { useState } from "react";
import { formatINR } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { FileText } from "lucide-react";
import { CommercialQuoteModal } from "@/components/commercial-quote-modal";
import { VolumeDiscountBanner } from "@/components/volume-discount-banner";
import { WhatsAppInlineButton } from "@/components/whatsapp-support";

export function QuotePanel({
  total,
  print,
  modeling,
  days,
  volumeCm3,
  solidVolumeCm3,
  weightGrams,
  ready,
  specs,
  fileName,
  material,
  color,
  qty = 1,
}: {
  total: number;
  print: number;
  modeling: number;
  days: string;
  volumeCm3: number;
  solidVolumeCm3?: number;
  weightGrams?: number;
  ready: boolean;
  specs?: {
    printerName?: string;
    qualityName?: string;
    infillLabel?: string;
    wallLoops?: number;
    supports?: string;
    surfaceFinish?: string;
    orientation?: string;
    dimensions?: string;
    photosCount?: string;
  };
  fileName?: string;
  material?: string;
  color?: string;
  qty?: number;
}) {
  const [showQuoteModal, setShowQuoteModal] = useState(false);

  return (
    <aside className="h-fit rounded-2xl border border-border bg-surface p-6 shadow-xs md:sticky md:top-24 space-y-4">
      <div>
        <p className="text-[11px] font-medium tracking-[0.18em] text-subtle uppercase">
          Estimate
        </p>
        <p className="mt-3 font-display text-4xl font-semibold tabular-nums">
          {ready ? formatINR(total) : "—"}
        </p>
        <p className="mt-1 text-sm text-muted">
          {ready
            ? "Honest quote calculated for your specifications on our Bambu Lab fleet."
            : "Add a file or choose a size to preview your price."}
        </p>
      </div>

      {ready ? (
        <dl className="space-y-2 border-t border-border pt-4 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted">Print</dt>
            <dd className="tabular-nums">{formatINR(print)}</dd>
          </div>
          {modeling > 0 ? (
            <div className="flex justify-between">
              <dt className="text-muted">Modeling</dt>
              <dd className="tabular-nums">{formatINR(modeling)}</dd>
            </div>
          ) : null}
          <div className="flex justify-between">
            <dt className="text-muted">Typical print time</dt>
            <dd>{days}</dd>
          </div>
          {volumeCm3 > 0 ? (
            <div className="flex justify-between">
              <dt className="text-muted">Est. printed volume</dt>
              <dd className="tabular-nums font-mono">{volumeCm3.toFixed(1)} cm³</dd>
            </div>
          ) : null}
          {weightGrams ? (
            <div className="flex justify-between">
              <dt className="text-muted">Est. model weight</dt>
              <dd className="tabular-nums font-mono text-emerald-500 dark:text-emerald-400 font-medium">~{weightGrams.toFixed(0)} g</dd>
            </div>
          ) : null}
          {solidVolumeCm3 && solidVolumeCm3 > volumeCm3 * 1.15 ? (
            <div className="flex justify-between text-xs text-muted/70">
              <dt>Solid CAD volume</dt>
              <dd className="tabular-nums font-mono line-through">{solidVolumeCm3.toFixed(1)} cm³</dd>
            </div>
          ) : null}
          {specs?.dimensions ? (
            <div className="flex justify-between">
              <dt className="text-muted">Model dimensions</dt>
              <dd className="tabular-nums font-mono text-fg">{specs.dimensions}</dd>
            </div>
          ) : null}
          {specs ? (
            <div className="border-t border-border/70 pt-2.5 mt-2.5 space-y-1.5 text-xs text-muted">
              {specs.printerName && (
                <div className="flex justify-between">
                  <span>Selected Machine</span>
                  <span className="font-medium text-fg">{specs.printerName}</span>
                </div>
              )}
              {specs.qualityName && (
                <div className="flex justify-between">
                  <span>Layer Profile</span>
                  <span className="font-medium text-fg">{specs.qualityName}</span>
                </div>
              )}
              {specs.infillLabel && (
                <div className="flex justify-between">
                  <span>Infill Setup</span>
                  <span className="font-medium text-fg">{specs.infillLabel}</span>
                </div>
              )}
              {specs.wallLoops && (
                <div className="flex justify-between">
                  <span>Perimeter Walls</span>
                  <span className="font-medium text-fg">{specs.wallLoops} loops</span>
                </div>
              )}
              {specs.supports && specs.supports !== "none" && (
                <div className="flex justify-between">
                  <span>Support Structure</span>
                  <span className="font-medium text-accent">{specs.supports}</span>
                </div>
              )}
              {specs.surfaceFinish && specs.surfaceFinish !== "standard" && (
                <div className="flex justify-between">
                  <span>Surface Finish</span>
                  <span className="font-medium text-accent">{specs.surfaceFinish}</span>
                </div>
              )}
              {specs.orientation && (
                <div className="flex justify-between">
                  <span>Print Orientation</span>
                  <span className="font-medium text-accent">{specs.orientation}</span>
                </div>
              )}
              {specs.photosCount && (
                <div className="flex justify-between">
                  <span>Reference Photos</span>
                  <span className="font-medium text-accent">{specs.photosCount}</span>
                </div>
              )}
            </div>
          ) : null}
        </dl>
      ) : null}

      {ready && (
        <div className="space-y-3 pt-3 border-t border-border">
          <Button
            type="button"
            variant="outline"
            onClick={() => setShowQuoteModal(true)}
            className="w-full gap-2 border-accent/40 bg-accent/5 hover:bg-accent/15 text-fg text-xs font-semibold py-2.5 rounded-xl cursor-pointer"
          >
            <FileText className="size-4 text-accent" />
            <span>Download Official Quote (PDF)</span>
          </Button>

          <VolumeDiscountBanner
            basePrice={total}
            currentQty={qty}
          />

          <WhatsAppInlineButton
            text="Feasibility Check on WhatsApp"
            message={`Hi Prynth! I'm planning to 3D print a custom part (~${volumeCm3.toFixed(1)} cm³ in ${material || "PETG"}). Can you review my model specs?`}
            className="w-full"
          />

          <CommercialQuoteModal
            isOpen={showQuoteModal}
            onClose={() => setShowQuoteModal(false)}
            quote={{
              fileName,
              total,
              qty: qty || 1,
              material,
              color,
              dimensions: specs?.dimensions,
              volumeCm3,
              weightGrams,
              layerHeight: specs?.qualityName,
              infill: specs?.infillLabel,
              turnaroundDays: days,
            }}
          />
        </div>
      )}

      <p className="text-xs text-subtle">
        Setup is included. No extra fees for standard colour choices. Shipping added at checkout.
      </p>
    </aside>
  );
}
