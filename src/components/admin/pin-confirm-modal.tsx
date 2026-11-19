import React, { useState, useEffect, useRef } from "react";
import { X, ShieldAlert, Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { ModalPortal } from "@/components/ui/modal-portal";

export function PinConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  isLoading
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (pin: string) => void;
  isLoading: boolean;
}) {
  const [digits, setDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (!isOpen) return;
    setDigits(["", "", "", "", "", ""]);
    const timer = setTimeout(() => {
      inputRefs.current[0]?.focus();
    }, 100);

    return () => {
      clearTimeout(timer);
    };
  }, [isOpen]);

  const handleDigitChange = (index: number, val: string) => {
    const char = val.replace(/\D/g, "").slice(-1);
    const newDigits = [...digits];
    newDigits[index] = char;
    setDigits(newDigits);

    if (char && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit immediately upon entering the 6th digit (Reel 1: Anti-AI Slop pattern)
    if (char && index === 5) {
      const fullPin = newDigits.join("");
      if (fullPin.length === 6) {
        onConfirm(fullPin);
      }
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasteData) return;
    const newDigits = ["", "", "", "", "", ""];
    for (let i = 0; i < pasteData.length; i++) {
      newDigits[i] = pasteData[i];
    }
    setDigits(newDigits);
    const targetIdx = Math.min(pasteData.length, 5);
    inputRefs.current[targetIdx]?.focus();
    if (pasteData.length === 6) {
      onConfirm(pasteData);
    }
  };

  if (!isOpen) return null;

  const fullPin = digits.join("");
  const isComplete = fullPin.length === 6;

  return (
    <ModalPortal isOpen={isOpen}>
      <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/80 p-4 sm:p-6 backdrop-blur-md overflow-y-auto animate-in fade-in duration-150">
        <div className="relative w-full max-w-sm rounded-2xl sm:rounded-3xl border border-glass-border bg-surface/95 backdrop-blur-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
          <div className="flex items-center justify-between border-b border-border/60 p-4 sm:p-5 bg-surface-2/30 shrink-0">
            <div className="flex items-center gap-2">
              <div className="size-8 rounded-lg bg-danger/10 text-danger flex items-center justify-center">
                <ShieldAlert className="size-4" />
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-bold text-fg">Security Verification</h2>
                <p className="text-[11px] text-muted">Admin PIN authorization</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="rounded-full p-1.5 hover:bg-surface-2 transition-colors text-muted hover:text-fg cursor-pointer tactile-btn"
            >
              <X className="size-4" />
            </button>
          </div>

          <div className="p-5 sm:p-6 space-y-5">
            <p className="text-xs text-muted leading-relaxed text-center">
              Permanent deletion requires your 6-digit administrative security PIN.
            </p>

            {/* Segmented Auto-Advancing Digit Boxes with Tactile Micro-Physics */}
            <div className="flex items-center justify-center gap-2 sm:gap-2.5" onPaste={handlePaste}>
              {digits.map((digit, idx) => (
                <input
                  key={idx}
                  ref={(el) => {
                    inputRefs.current[idx] = el;
                  }}
                  type="password"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  disabled={isLoading}
                  onChange={(e) => handleDigitChange(idx, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(idx, e)}
                  className={cn(
                    "size-11 sm:size-12 text-center text-lg font-bold rounded-xl border bg-surface-2/60 text-fg transition-all focus:outline-none",
                    digit
                      ? "border-accent ring-2 ring-accent/20 bg-accent/5 pin-pop-active"
                      : "border-border/80 focus:border-accent focus:ring-2 focus:ring-accent/20"
                  )}
                />
              ))}
            </div>

            {/* Auto-Submitting Status Indicator */}
            <div className="h-6 flex items-center justify-center text-xs">
              {isLoading ? (
                <span className="inline-flex items-center gap-1.5 text-accent font-medium animate-pulse">
                  <Loader2 className="size-3.5 animate-spin" />
                  <span>Verifying credentials…</span>
                </span>
              ) : isComplete ? (
                <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium animate-in zoom-in-90 duration-150">
                  <Check className="size-3.5" />
                  <span>PIN entered — submitting…</span>
                </span>
              ) : (
                <span className="text-[11px] text-muted">Auto-verifies upon 6th digit</span>
              )}
            </div>

            <div className="pt-2 flex items-center justify-end gap-2 border-t border-border/40">
              <button
                type="button"
                onClick={onClose}
                disabled={isLoading}
                className="h-8 px-3 rounded-lg border border-border/70 hover:bg-surface-2 text-xs font-medium text-muted hover:text-fg cursor-pointer transition-colors tactile-btn"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => onConfirm(fullPin)}
                disabled={isLoading || !isComplete}
                className="h-8 px-4 rounded-lg bg-danger text-white hover:opacity-90 text-xs font-semibold disabled:opacity-40 cursor-pointer shadow-xs transition-all tactile-btn"
              >
                {isLoading ? "Verifying…" : "Confirm Delete"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}

