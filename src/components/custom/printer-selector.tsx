import React, { type ReactNode } from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";
import type { Printer } from "@/lib/printers-fns";

export function FieldSelect({
  id,
  label,
  value,
  onChange,
  children,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  children: ReactNode;
}) {
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 w-full rounded-xl border border-border bg-surface px-3.5 text-sm text-fg shadow-[var(--shadow-border)] focus:border-accent focus:ring-2 focus:ring-ring/30 focus:outline-none"
      >
        {children}
      </select>
    </div>
  );
}

export function PrinterSelector({
  printers,
  selectedPrinterId,
  onSelect,
}: {
  printers: Printer[];
  selectedPrinterId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Select 3D Printer</Label>
        <span className="text-xs text-muted">Bambu Lab Fleet</span>
      </div>
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {printers.map((p) => {
          const isSelected = p.id === selectedPrinterId;
          const isUnavailable = p.status === "maintenance" || p.status === "offline";

          let statusBadge = (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
              <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Available
            </span>
          );
          if (p.status === "busy") {
            statusBadge = (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-600 dark:text-amber-400">
                <span className="size-1.5 rounded-full bg-amber-500" />
                In Queue
              </span>
            );
          } else if (p.status === "maintenance") {
            statusBadge = (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/10 px-2 py-0.5 text-[11px] font-medium text-rose-600 dark:text-rose-400">
                <span className="size-1.5 rounded-full bg-rose-500" />
                Maintenance
              </span>
            );
          } else if (p.status === "offline") {
            statusBadge = (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-3 px-2 py-0.5 text-[11px] font-medium text-muted">
                Offline
              </span>
            );
          }

          return (
            <button
              key={p.id}
              type="button"
              disabled={isUnavailable}
              onClick={() => onSelect(p.id)}
              className={cn(
                "relative flex flex-col justify-between rounded-xl border p-3.5 text-left transition-all",
                isSelected
                  ? "border-accent bg-accent-soft/40 shadow-sm ring-1 ring-accent"
                  : isUnavailable
                    ? "border-border/60 bg-surface-2/40 opacity-60 cursor-not-allowed"
                    : "border-border bg-surface hover:border-border-hover hover:bg-surface-2/50 cursor-pointer"
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-semibold text-fg">{p.name}</p>
                    {isSelected && <Check className="size-3.5 text-accent" strokeWidth={2.5} />}
                  </div>
                  <p className="text-xs text-muted">{p.model}</p>
                </div>
                {statusBadge}
              </div>
              <div className="mt-2.5 flex items-center justify-between text-[11px] text-muted border-t border-border/40 pt-2">
                <span>{p.build_volume}</span>
                <span>{p.nozzle_size}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
