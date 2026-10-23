import React, { useState, useEffect } from "react";
import { X } from "lucide-react";

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
  const [pin, setPin] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 sm:p-6 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-150">
      <div className="relative w-full max-w-md max-h-[min(88vh,calc(100dvh-4rem))] flex flex-col rounded-2xl sm:rounded-3xl border border-border bg-surface shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between border-b border-border p-5 bg-surface shrink-0">
          <h2 className="text-lg font-bold">Confirm Deletion</h2>
          <button onClick={onClose} className="rounded-full p-2 hover:bg-surface-2 transition-colors text-muted hover:text-ink">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto flex-1">
          <p className="text-sm text-muted mb-4">
            Are you sure you want to permanently delete this order? This action cannot be undone.
            Please enter your 6-digit Admin PIN to confirm.
          </p>
          <input
            type="password"
            maxLength={6}
            placeholder="6-digit PIN"
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
            className="w-full rounded border border-border bg-surface-2 p-3 text-center text-xl tracking-widest"
          />
          <div className="mt-6 flex justify-end gap-3">
            <button
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 rounded-lg border border-border hover:bg-surface-2 text-sm font-medium"
            >
              Cancel
            </button>
            <button
              onClick={() => onConfirm(pin)}
              disabled={isLoading || pin.length !== 6}
              className="px-4 py-2 rounded-lg bg-danger text-white hover:opacity-90 text-sm font-medium disabled:opacity-50"
            >
              {isLoading ? "Deleting..." : "Delete Permanently"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

