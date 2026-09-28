import React from "react";
import { BAMBU_SUPPORT_TYPES, BAMBU_SUPPORT_FILAMENTS } from "@/lib/quote";
import { RotateCcw, ChevronDown } from "lucide-react";

export interface BambuSupportState {
  enabled: boolean;
  type: string;
  thresholdAngle: number;
  onBuildPlateOnly: boolean;
  baseFilament: string;
  interfaceFilament: string;
}

interface BambuSupportSettingsProps {
  value: BambuSupportState;
  onChange: (val: BambuSupportState) => void;
  className?: string;
}

// Bambu Studio Custom Overhang Support Icon
function SupportIcon({ className = "size-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      {/* Top overhang plate */}
      <path d="M3 5h18v4H3z" fill="currentColor" fillOpacity="0.15" />
      {/* Support pillars / hatching */}
      <path d="M7 9v10M12 9v10M17 9v10" strokeDasharray="2 2" />
      <path d="M4 19h16" />
    </svg>
  );
}

// Bambu Studio Filament Spool / Coil Icon
function FilamentSpoolIcon({ className = "size-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M6 7c0-2.2 2.7-4 6-4s6 1.8 6 4v10c0 2.2-2.7 4-6 4s-6-1.8-6-4V7z" />
      <path d="M6 12c0 2.2 2.7 4 6 4s6-1.8 6-4" />
      <path d="M9 10c0 1.1 1.3 2 3 2s3-.9 3-2" strokeDasharray="1 1" />
    </svg>
  );
}

export function BambuSupportSettings({
  value,
  onChange,
  className = "",
}: BambuSupportSettingsProps) {
  const handleResetDefaults = () => {
    onChange({
      enabled: true,
      type: "tree(auto)",
      thresholdAngle: 30,
      onBuildPlateOnly: false,
      baseFilament: "Default",
      interfaceFilament: "Default",
    });
  };

  const selectedTypeMeta = BAMBU_SUPPORT_TYPES.find((t) => t.id === value.type) ?? BAMBU_SUPPORT_TYPES[0];
  const selectedInterfaceMeta = BAMBU_SUPPORT_FILAMENTS.find((f) => f.id === value.interfaceFilament) ?? BAMBU_SUPPORT_FILAMENTS[0];

  return (
    <div className={`rounded-2xl border border-border/80 bg-surface/70 shadow-[var(--shadow-border)] overflow-hidden transition-all duration-200 ${className}`}>
      {/* Top Header / Primary Toggle */}
      <div className="p-4 sm:p-5 space-y-4">
        {/* Support Title Bar */}
        <div className="flex items-center justify-between border-b border-border/50 pb-3">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-accent-soft text-accent">
              <SupportIcon className="size-4" />
            </span>
            <span className="font-semibold text-sm text-fg tracking-tight">Support</span>
          </div>

          {value.enabled && (
            <button
              type="button"
              onClick={handleResetDefaults}
              title="Reset to Bambu Studio defaults (Tree Auto · 30°)"
              className="text-xs text-muted hover:text-accent flex items-center gap-1 transition-colors px-2 py-1 rounded hover:bg-surface-2"
            >
              <RotateCcw className="size-3" />
              <span>Reset</span>
            </button>
          )}
        </div>

        {/* Row 1: Enable support */}
        <div className="flex items-center justify-between">
          <label htmlFor="bambu-enable-support" className="text-sm font-medium text-fg cursor-pointer select-none">
            Enable support
          </label>
          <div className="flex items-center gap-2">
            <input
              id="bambu-enable-support"
              type="checkbox"
              checked={value.enabled}
              onChange={(e) => onChange({ ...value, enabled: e.target.checked })}
              className="size-5 rounded border-border text-emerald-600 focus:ring-emerald-500 accent-emerald-600 cursor-pointer transition-all"
            />
          </div>
        </div>

        {/* Detailed Slicer Controls when Enabled */}
        {value.enabled ? (
          <div className="space-y-3.5 pt-2 animate-in fade-in duration-200">
            {/* Row 2: Type */}
            <div className="grid grid-cols-1 sm:grid-cols-12 items-center gap-2">
              <label htmlFor="bambu-support-type" className="sm:col-span-5 text-xs font-medium text-muted">
                Type
              </label>
              <div className="sm:col-span-7 relative">
                <select
                  id="bambu-support-type"
                  value={value.type}
                  onChange={(e) => onChange({ ...value, type: e.target.value })}
                  className="h-9 w-full appearance-none rounded-xl border border-border bg-surface px-3 pr-8 text-xs text-fg shadow-sm focus:border-accent focus:outline-none cursor-pointer"
                >
                  {BAMBU_SUPPORT_TYPES.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2.5 top-2.5 size-3.5 text-muted pointer-events-none" />
              </div>
            </div>
            <p className="text-[11px] text-muted -mt-1 sm:ml-[41.666%] pl-0.5 leading-snug">
              {selectedTypeMeta?.hint}
            </p>

            {/* Row 3: Threshold angle */}
            <div className="grid grid-cols-1 sm:grid-cols-12 items-center gap-2">
              <label htmlFor="bambu-threshold-angle" className="sm:col-span-5 text-xs font-medium text-muted">
                Threshold angle
              </label>
              <div className="sm:col-span-7 relative flex items-center">
                <input
                  id="bambu-threshold-angle"
                  type="number"
                  min="10"
                  max="80"
                  step="1"
                  value={value.thresholdAngle}
                  onChange={(e) => {
                    const num = Math.max(10, Math.min(80, Number(e.target.value) || 30));
                    onChange({ ...value, thresholdAngle: num });
                  }}
                  className="h-9 w-full rounded-xl border border-border bg-surface px-3 pr-8 text-xs text-fg shadow-sm focus:border-accent focus:outline-none"
                />
                <span className="absolute right-3 text-xs text-muted pointer-events-none font-medium">°</span>
              </div>
            </div>
            <p className="text-[11px] text-muted -mt-1 sm:ml-[41.666%] pl-0.5 leading-snug">
              Overhangs steeper than {value.thresholdAngle}° will be automatically supported
            </p>

            {/* Row 4: On build plate only */}
            <div className="grid grid-cols-1 sm:grid-cols-12 items-center gap-2 pt-1">
              <label htmlFor="bambu-build-plate-only" className="sm:col-span-5 text-xs font-medium text-muted cursor-pointer select-none">
                On build plate only
              </label>
              <div className="sm:col-span-7 flex items-center">
                <input
                  id="bambu-build-plate-only"
                  type="checkbox"
                  checked={value.onBuildPlateOnly}
                  onChange={(e) => onChange({ ...value, onBuildPlateOnly: e.target.checked })}
                  className="size-4 rounded border-border accent-accent cursor-pointer"
                />
                <span className="text-[11px] text-muted ml-2">
                  Avoids placing supports on top of the model itself
                </span>
              </div>
            </div>

            {/* Section 2: Filament for Supports */}
            <div className="pt-4 mt-4 border-t border-border/50 space-y-3.5">
              <div className="flex items-center gap-2 pb-1">
                <span className="p-1 rounded-md bg-accent-soft text-accent">
                  <FilamentSpoolIcon className="size-3.5" />
                </span>
                <span className="font-semibold text-xs uppercase tracking-wider text-fg">
                  Filament for Supports
                </span>
              </div>

              {/* Support/raft base */}
              <div className="grid grid-cols-1 sm:grid-cols-12 items-center gap-2">
                <label htmlFor="bambu-support-base" className="sm:col-span-5 text-xs font-medium text-muted">
                  Support/raft base
                </label>
                <div className="sm:col-span-7 relative">
                  <select
                    id="bambu-support-base"
                    value={value.baseFilament}
                    onChange={(e) => onChange({ ...value, baseFilament: e.target.value })}
                    className="h-9 w-full appearance-none rounded-xl border border-border bg-surface px-3 pr-8 text-xs text-fg shadow-sm focus:border-accent focus:outline-none cursor-pointer"
                  >
                    {BAMBU_SUPPORT_FILAMENTS.map((f) => (
                      <option key={f.id} value={f.name}>
                        {f.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-2.5 size-3.5 text-muted pointer-events-none" />
                </div>
              </div>

              {/* Support/raft interface */}
              <div className="grid grid-cols-1 sm:grid-cols-12 items-center gap-2">
                <label htmlFor="bambu-support-interface" className="sm:col-span-5 text-xs font-medium text-muted">
                  Support/raft interface
                </label>
                <div className="sm:col-span-7 relative">
                  <select
                    id="bambu-support-interface"
                    value={value.interfaceFilament}
                    onChange={(e) => onChange({ ...value, interfaceFilament: e.target.value })}
                    className="h-9 w-full appearance-none rounded-xl border border-border bg-surface px-3 pr-8 text-xs text-fg shadow-sm focus:border-accent focus:outline-none cursor-pointer"
                  >
                    {BAMBU_SUPPORT_FILAMENTS.map((f) => (
                      <option key={f.id} value={f.name}>
                        {f.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-2.5 size-3.5 text-muted pointer-events-none" />
                </div>
              </div>
              <p className="text-[11px] text-muted sm:ml-[41.666%] pl-0.5 leading-snug">
                {selectedInterfaceMeta?.hint}
              </p>
            </div>
          </div>
        ) : (
          <p className="text-xs text-muted leading-relaxed">
            Clean overhangs up to 45° print cleanly without supports. Enable supports if your model features bridges, floating sections, or steep downward angles.
          </p>
        )}
      </div>
    </div>
  );
}
