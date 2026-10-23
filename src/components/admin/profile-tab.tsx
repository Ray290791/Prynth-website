import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getAdminProfile, setAdminPin, requestPinResetOTP, resetAdminPinWithOTP } from "@/lib/admin-fns";
import { Badge } from "@/components/ui/badge";
import { Shield } from "lucide-react";

export function AdminProfileTab() {
  const queryClient = useQueryClient();
  const [pin, setPin] = useState("");
  const [step, setStep] = useState<"view" | "create" | "reset_otp" | "reset_new">("view");
  const [otp, setOtp] = useState("");
  const [newPin, setNewPin] = useState("");

  const { data: profile, isLoading } = useQuery({
    queryKey: ["adminProfile"],
    queryFn: () => getAdminProfile(),
  });

  const setPinMutation = useMutation({
    mutationFn: async (newPin: string) => {
      await setAdminPin({ data: { pin: newPin } });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminProfile"] });
      toast.success("PIN set successfully!");
      setStep("view");
      setPin("");
    },
    onError: (err) => toast.error(err.message)
  });

  const requestOtpMutation = useMutation({
    mutationFn: async () => {
      await requestPinResetOTP();
    },
    onSuccess: () => {
      toast.success("OTP sent to your email!");
      setStep("reset_otp");
    },
    onError: (err) => toast.error(err.message)
  });

  const resetPinMutation = useMutation({
    mutationFn: async () => {
      await resetAdminPinWithOTP({ data: { otp, newPin } });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminProfile"] });
      toast.success("PIN reset successfully!");
      setStep("view");
      setOtp("");
      setNewPin("");
    },
    onError: (err) => toast.error(err.message)
  });

  if (isLoading) return <div className="p-8 text-center text-muted">Loading profile...</div>;
  if (!profile) return null;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300 max-w-2xl">
      <div>
        <h2 className="text-2xl font-semibold">Admin Profile</h2>
        <p className="text-muted mt-1 text-sm">Manage your personal admin security settings.</p>
      </div>

      <div className="bg-surface border border-border rounded-xl p-6 space-y-6">
        <div>
          <h3 className="text-sm font-medium text-muted">Email</h3>
          <p className="text-lg font-medium">{profile.email}</p>
        </div>
        <div>
          <h3 className="text-sm font-medium text-muted">Role</h3>
          <Badge className="mt-1">{profile.role.replace('_', ' ')}</Badge>
        </div>

        <div className="pt-6 border-t border-border">
          <h3 className="text-lg font-medium mb-4">Security PIN</h3>
          
          {step === "view" && (
            <div>
              {profile.hasPin ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-primary">
                    <Shield className="w-5 h-5" />
                    <span className="font-medium">6-Digit PIN is active</span>
                  </div>
                  <p className="text-sm text-muted">Your PIN is required for sensitive actions like deleting orders.</p>
                  <button
                    onClick={() => requestOtpMutation.mutate()}
                    disabled={requestOtpMutation.isPending}
                    className="px-4 py-2 rounded-lg border border-border hover:bg-surface-2 text-sm font-medium"
                  >
                    {requestOtpMutation.isPending ? "Requesting..." : "Reset PIN"}
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-danger">
                    <Shield className="w-5 h-5" />
                    <span className="font-medium">No PIN set</span>
                  </div>
                  <p className="text-sm text-muted">We strongly recommend setting a 6-digit PIN to protect sensitive actions.</p>
                  <button
                    onClick={() => setStep("create")}
                    className="px-4 py-2 rounded-lg bg-accent text-ink hover:opacity-90 text-sm font-medium"
                  >
                    Create PIN
                  </button>
                </div>
              )}
            </div>
          )}

          {step === "create" && (
            <div className="space-y-4 max-w-sm animate-in fade-in slide-in-from-bottom-2">
              <label className="block text-sm font-medium">Enter 6-Digit PIN</label>
              <input
                type="password"
                maxLength={6}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="w-full rounded border border-border bg-surface-2 p-3 text-center text-xl tracking-widest"
                placeholder="••••••"
              />
              <div className="flex gap-3">
                <button
                  onClick={() => { setStep("view"); setPin(""); }}
                  className="flex-1 px-4 py-2 rounded-lg border border-border hover:bg-surface-2 text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={() => setPinMutation.mutate(pin)}
                  disabled={pin.length !== 6 || setPinMutation.isPending}
                  className="flex-1 px-4 py-2 rounded-lg bg-accent text-ink hover:opacity-90 text-sm font-medium disabled:opacity-50"
                >
                  {setPinMutation.isPending ? "Saving..." : "Save PIN"}
                </button>
              </div>
            </div>
          )}

          {step === "reset_otp" && (
            <div className="space-y-4 max-w-sm animate-in fade-in slide-in-from-bottom-2">
              <p className="text-sm text-muted">An OTP has been sent to {profile.email}.</p>
              
              <div>
                <label className="block text-sm font-medium mb-1">Enter OTP</label>
                <input
                  type="text"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="w-full rounded border border-border bg-surface-2 p-3 text-center text-xl tracking-widest"
                  placeholder="123456"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">New 6-Digit PIN</label>
                <input
                  type="password"
                  maxLength={6}
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="w-full rounded border border-border bg-surface-2 p-3 text-center text-xl tracking-widest"
                  placeholder="••••••"
                />
              </div>

              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => { setStep("view"); setOtp(""); setNewPin(""); }}
                  className="flex-1 px-4 py-2 rounded-lg border border-border hover:bg-surface-2 text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={() => resetPinMutation.mutate()}
                  disabled={otp.length !== 6 || newPin.length !== 6 || resetPinMutation.isPending}
                  className="flex-1 px-4 py-2 rounded-lg bg-accent text-ink hover:opacity-90 text-sm font-medium disabled:opacity-50"
                >
                  {resetPinMutation.isPending ? "Resetting..." : "Reset PIN"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


