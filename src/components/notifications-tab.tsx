import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getAdminNotificationSettings,
  updateAdminNotificationSettings,
  testAdminNotification,
  type NotificationSettingsData,
} from "@/lib/notifications-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Bell,
  Smartphone,
  Send,
  MessageSquare,
  CheckCircle2,
  XCircle,
  ExternalLink,
  ShieldCheck,
  Mail,
  Zap,
  Sparkles,
} from "lucide-react";

export function NotificationsTab() {
  const queryClient = useQueryClient();

  const { data: settings } = useQuery({
    queryKey: ["adminNotificationSettings"],
    queryFn: () => getAdminNotificationSettings(),
    retry: 1,
  });

  const [form, setForm] = useState<NotificationSettingsData>({
    phoneNumber: "+918369485272",
    whatsappEnabled: false,
    whatsappProvider: "twilio",
    whatsappApiKey: "",
    telegramEnabled: false,
    telegramBotToken: "",
    telegramChatId: "",
    smsEnabled: false,
    smsProvider: "fast2sms",
    twilioSid: "",
    twilioToken: "",
    twilioFrom: "PRYNTH",
    fast2smsApiKey: "",
    emailEnabled: true,
    adminEmail: "prynth07@gmail.com",
    notifyOnNewOrder: true,
    notifyOnFilamentOver: true,
    notifyOnLowStock: true,
    notifyOnInquiry: true,
  });

  const [testResults, setTestResults] = useState<
    Array<{ channel: string; success: boolean; error?: string }> | null
  >(null);

  useEffect(() => {
    if (settings) {
      setForm({
        ...settings,
        phoneNumber: settings.phoneNumber || "+918369485272",
        twilioFrom: settings.twilioFrom || "PRYNTH",
        smsProvider: settings.smsProvider || "fast2sms",
      });
    }
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: (data: NotificationSettingsData) =>
      updateAdminNotificationSettings({ data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminNotificationSettings"] });
      toast.success("Notification preferences saved successfully!");
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to save notification settings");
    },
  });

  const testMutation = useMutation({
    mutationFn: () => testAdminNotification(),
    onSuccess: (data) => {
      setTestResults(data.results || []);
      const anySuccess = data.results?.some((r) => r.success);
      if (anySuccess) {
        toast.success("Test notification sent! Check your phone.");
      } else {
        toast.warning(
          "Test alert dispatched. Check the diagnostic status badges below."
        );
      }
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to trigger test notification");
    },
  });

  // Native Browser / Device Push Permission Helper
  const requestBrowserPush = async () => {
    if (!("Notification" in window)) {
      toast.error("This browser does not support desktop/phone push notifications.");
      return;
    }
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      new Notification("Prynth Alert System", {
        body: "Instant phone & desktop alerts are now active for Prynth!",
        icon: "/icons/p-icon.png",
      });
      toast.success("Push notifications enabled!");
    } else {
      toast.error("Push notification permission was denied.");
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* Header Banner */}
      <div className="rounded-3xl border border-accent/20 bg-accent/5 p-6 sm:p-8 backdrop-blur-xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-accent text-ink shadow-sm">
              <Bell className="size-6" />
            </div>
            <div>
              <h2 className="font-display text-2xl font-bold text-fg">
                Instant Phone Alerts
              </h2>
              <p className="text-sm text-muted mt-1 max-w-xl">
                Get real-time alerts sent directly to your phone via{" "}
                <strong className="text-fg">SMS (From: PRYNTH)</strong> or{" "}
                <strong className="text-fg">WhatsApp</strong> whenever a customer submits a custom 3D request, places an order, or sends an inquiry.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
            <Button
              variant="outline"
              size="md"
              onClick={requestBrowserPush}
              className="gap-2 cursor-pointer text-xs"
              title="Enable native lock-screen / browser popups"
            >
              <Zap className="size-3.5 text-accent" />
              <span>Enable Browser Push</span>
            </Button>

            <Button
              variant="outline"
              size="md"
              onClick={() => testMutation.mutate()}
              disabled={testMutation.isPending}
              className="gap-2 cursor-pointer text-xs"
            >
              <Send className="size-3.5" />
              <span>{testMutation.isPending ? "Pinging Phone…" : "Send Test Alert"}</span>
            </Button>

            <Button
              size="md"
              onClick={() => saveMutation.mutate(form)}
              disabled={saveMutation.isPending}
              className="gap-2 cursor-pointer text-xs shadow-xs"
            >
              <ShieldCheck className="size-3.5" />
              <span>{saveMutation.isPending ? "Saving…" : "Save Preferences"}</span>
            </Button>
          </div>
        </div>

        {/* Live Test Results Card */}
        {testResults && (
          <div className="mt-6 rounded-2xl border border-border bg-surface p-4 animate-in fade-in duration-200">
            <p className="text-xs font-semibold text-fg uppercase tracking-wider mb-2">
              Notification Channel Diagnostics:
            </p>
            <div className="flex flex-wrap gap-2">
              {testResults.map((r, i) => (
                <Badge
                  key={i}
                  className={
                    r.success
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 gap-1.5"
                      : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30 gap-1.5"
                  }
                >
                  {r.success ? (
                    <CheckCircle2 className="size-3.5" />
                  ) : (
                    <XCircle className="size-3.5" />
                  )}
                  <span className="capitalize">{r.channel}</span>:{" "}
                  {r.success ? "Delivered" : r.error || "Failed"}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Main Grid: Channels & Triggers */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left Column: Notification Channels */}
        <div className="space-y-6 lg:col-span-8">
          {/* Admin Destination Mobile */}
          <div className="rounded-3xl border border-border bg-surface p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-surface-2 text-fg">
                <Smartphone className="size-5 text-accent" />
              </div>
              <div>
                <h3 className="font-semibold text-base text-fg">
                  Your Phone Number
                </h3>
                <p className="text-xs text-muted">
                  The destination phone where you want instant alerts to pop up.
                </p>
              </div>
            </div>

            <div>
              <Label htmlFor="admin-phone">Mobile Number (with +91 country code)</Label>
              <Input
                id="admin-phone"
                value={form.phoneNumber}
                onChange={(e) =>
                  setForm({ ...form, phoneNumber: e.target.value })
                }
                placeholder="+91 83694 85272"
                className="mt-1 max-w-md font-mono"
              />
            </div>
          </div>

          {/* CHANNEL 1: Direct SMS from PRYNTH */}
          <div className="rounded-3xl border border-border bg-surface p-6 shadow-xs space-y-5">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-xl bg-purple-500/15 text-purple-600 dark:text-purple-400">
                  <Smartphone className="size-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-base text-fg flex items-center gap-2">
                    SMS Alerts (Sender: PRYNTH)
                    <Badge className="bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20 text-[10px]">
                      Cellular Direct
                    </Badge>
                  </h3>
                  <p className="text-xs text-muted">
                    Text messages delivered straight to your SIM with sender header <strong className="text-fg">PRYNTH</strong>.
                  </p>
                </div>
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.smsEnabled}
                  onChange={(e) =>
                    setForm({ ...form, smsEnabled: e.target.checked })
                  }
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-surface-2 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-500" />
              </label>
            </div>

            {form.smsEnabled && (
              <div className="space-y-4 pt-2 border-t border-border/70 animate-in fade-in duration-150">
                {/* Provider Selector */}
                <div className="grid grid-cols-2 gap-3 max-w-md">
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, smsProvider: "fast2sms" })}
                    className={
                      form.smsProvider === "fast2sms"
                        ? "p-3 rounded-xl border border-purple-500/40 bg-purple-500/10 text-left cursor-pointer"
                        : "p-3 rounded-xl border border-border bg-surface-2/40 text-left text-muted hover:text-fg cursor-pointer"
                    }
                  >
                    <p className="font-semibold text-xs text-fg">Fast2SMS (India)</p>
                    <p className="text-[11px] text-muted mt-0.5">Instant Indian SMS gateway API</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setForm({ ...form, smsProvider: "twilio" })}
                    className={
                      form.smsProvider === "twilio"
                        ? "p-3 rounded-xl border border-purple-500/40 bg-purple-500/10 text-left cursor-pointer"
                        : "p-3 rounded-xl border border-border bg-surface-2/40 text-left text-muted hover:text-fg cursor-pointer"
                    }
                  >
                    <p className="font-semibold text-xs text-fg">Twilio SMS</p>
                    <p className="text-[11px] text-muted mt-0.5">Alphanumeric Sender ID: PRYNTH</p>
                  </button>
                </div>

                {form.smsProvider === "fast2sms" ? (
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="fast2sms-key">Fast2SMS API Key</Label>
                      <Input
                        id="fast2sms-key"
                        type="password"
                        value={form.fast2smsApiKey || ""}
                        onChange={(e) =>
                          setForm({ ...form, fast2smsApiKey: e.target.value })
                        }
                        placeholder="Paste your Fast2SMS Authorization API Key"
                        className="mt-1 font-mono text-xs max-w-md"
                      />
                      <p className="text-[11px] text-muted mt-1">
                        Sends immediate Quick SMS directly to {form.phoneNumber || "+91 8369485272"}.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <Label htmlFor="twilio-sid-sms">Twilio Account SID</Label>
                        <Input
                          id="twilio-sid-sms"
                          value={form.twilioSid}
                          onChange={(e) =>
                            setForm({ ...form, twilioSid: e.target.value })
                          }
                          placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxx"
                          className="mt-1 font-mono text-xs"
                        />
                      </div>
                      <div>
                        <Label htmlFor="twilio-token-sms">Twilio Auth Token</Label>
                        <Input
                          id="twilio-token-sms"
                          type="password"
                          value={form.twilioToken}
                          onChange={(e) =>
                            setForm({ ...form, twilioToken: e.target.value })
                          }
                          placeholder="••••••••••••••••"
                          className="mt-1 font-mono text-xs"
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="twilio-from-sms">Sender ID (Appears on your phone)</Label>
                      <Input
                        id="twilio-from-sms"
                        value={form.twilioFrom || "PRYNTH"}
                        onChange={(e) =>
                          setForm({ ...form, twilioFrom: e.target.value })
                        }
                        placeholder="PRYNTH"
                        className="mt-1 font-mono text-xs max-w-md"
                      />
                    </div>
                  </div>
                )}

                {/* SMS Live Message Preview */}
                <div className="p-3.5 rounded-xl bg-surface-2/40 border border-border/60 text-xs">
                  <span className="text-[10px] text-muted uppercase font-semibold block mb-1">
                    Sample SMS Alert Preview:
                  </span>
                  <div className="p-2.5 rounded-lg bg-surface border border-border/40 font-mono text-[11px] text-fg leading-relaxed">
                    🔔 PRYNTH: NEW CUSTOM 3D PRINT REQUEST #7<br />
                    From: Aditya Maurya (+91 98...)<br />
                    Specs: Standard · PETG · 1 unit(s)<br />
                    View &amp; Quote: https://prynth.in/admin?tab=inquiries
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* CHANNEL 2: WhatsApp Notifications */}
          <div className="rounded-3xl border border-border bg-surface p-6 shadow-xs space-y-5">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                  <MessageSquare className="size-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-base text-fg flex items-center gap-2">
                    WhatsApp Alerts
                    <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[10px]">
                      Prynth Studio
                    </Badge>
                  </h3>
                  <p className="text-xs text-muted">
                    Receive formatted messages directly in your WhatsApp app from your verified studio account.
                  </p>
                </div>
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.whatsappEnabled}
                  onChange={(e) =>
                    setForm({ ...form, whatsappEnabled: e.target.checked })
                  }
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-surface-2 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500" />
              </label>
            </div>

            {form.whatsappEnabled && (
              <div className="space-y-4 pt-2 border-t border-border/70 animate-in fade-in duration-150">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="twilio-sid-wa">Twilio Account SID</Label>
                    <Input
                      id="twilio-sid-wa"
                      value={form.twilioSid}
                      onChange={(e) =>
                        setForm({ ...form, twilioSid: e.target.value })
                      }
                      placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxx"
                      className="mt-1 font-mono text-xs"
                    />
                  </div>
                  <div>
                    <Label htmlFor="twilio-token-wa">Twilio Auth Token</Label>
                    <Input
                      id="twilio-token-wa"
                      type="password"
                      value={form.twilioToken}
                      onChange={(e) =>
                        setForm({ ...form, twilioToken: e.target.value })
                      }
                      placeholder="••••••••••••••••"
                      className="mt-1 font-mono text-xs"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="twilio-from-wa">Twilio WhatsApp Sender</Label>
                  <Input
                    id="twilio-from-wa"
                    value={form.twilioFrom.startsWith("whatsapp:") ? form.twilioFrom : `whatsapp:${form.twilioFrom}`}
                    onChange={(e) =>
                      setForm({ ...form, twilioFrom: e.target.value })
                    }
                    placeholder="whatsapp:+14155238886"
                    className="mt-1 font-mono text-xs max-w-md"
                  />
                </div>
              </div>
            )}
          </div>

          {/* CHANNEL 3: High-Priority Resend Email */}
          <div className="rounded-3xl border border-border bg-surface p-6 shadow-xs space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-xl bg-accent/15 text-accent">
                  <Mail className="size-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-base text-fg">
                    High-Priority Admin Email (Resend)
                  </h3>
                  <p className="text-xs text-muted">
                    Full HTML email with customer specs and photo links sent to your inbox.
                  </p>
                </div>
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.emailEnabled}
                  onChange={(e) =>
                    setForm({ ...form, emailEnabled: e.target.checked })
                  }
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-surface-2 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent" />
              </label>
            </div>

            {form.emailEnabled && (
              <div className="pt-2 border-t border-border/70 max-w-md">
                <Label htmlFor="admin-email-field">Admin Notification Email</Label>
                <Input
                  id="admin-email-field"
                  type="email"
                  value={form.adminEmail}
                  onChange={(e) =>
                    setForm({ ...form, adminEmail: e.target.value })
                  }
                  placeholder="prynth07@gmail.com"
                  className="mt-1 font-mono text-xs"
                />
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Trigger Controls */}
        <div className="space-y-6 lg:col-span-4">
          <div className="rounded-3xl border border-border bg-surface p-6 shadow-xs space-y-4">
            <h3 className="font-semibold text-base text-fg">Alert Triggers</h3>
            <p className="text-xs text-muted">
              Choose which studio events should instantly buzz your phone.
            </p>

            <div className="space-y-3 pt-2">
              <label className="flex items-start gap-3 p-3 rounded-2xl bg-surface-2/40 border border-border/60 cursor-pointer hover:bg-surface-2 transition-colors">
                <input
                  type="checkbox"
                  checked={form.notifyOnInquiry}
                  onChange={(e) =>
                    setForm({ ...form, notifyOnInquiry: e.target.checked })
                  }
                  className="mt-0.5 rounded text-accent focus:ring-accent"
                />
                <div className="text-xs">
                  <p className="font-semibold text-fg">Custom 3D Requests &amp; Inquiries</p>
                  <p className="text-muted mt-0.5">
                    Triggered the second a customer submits a design idea or contact message.
                  </p>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3 rounded-2xl bg-surface-2/40 border border-border/60 cursor-pointer hover:bg-surface-2 transition-colors">
                <input
                  type="checkbox"
                  checked={form.notifyOnNewOrder}
                  onChange={(e) =>
                    setForm({ ...form, notifyOnNewOrder: e.target.checked })
                  }
                  className="mt-0.5 rounded text-accent focus:ring-accent"
                />
                <div className="text-xs">
                  <p className="font-semibold text-fg">New Paid Orders</p>
                  <p className="text-muted mt-0.5">
                    Alerts with order total, customer details, and item list.
                  </p>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3 rounded-2xl bg-surface-2/40 border border-border/60 cursor-pointer hover:bg-surface-2 transition-colors">
                <input
                  type="checkbox"
                  checked={form.notifyOnFilamentOver}
                  onChange={(e) =>
                    setForm({ ...form, notifyOnFilamentOver: e.target.checked })
                  }
                  className="mt-0.5 rounded text-accent focus:ring-accent"
                />
                <div className="text-xs">
                  <p className="font-semibold text-fg">Spool Depletion ("Filament Over")</p>
                  <p className="text-muted mt-0.5">
                    Alerts when a spool hits 0 stock so you can change or restock.
                  </p>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3 rounded-2xl bg-surface-2/40 border border-border/60 cursor-pointer hover:bg-surface-2 transition-colors">
                <input
                  type="checkbox"
                  checked={form.notifyOnLowStock}
                  onChange={(e) =>
                    setForm({ ...form, notifyOnLowStock: e.target.checked })
                  }
                  className="mt-0.5 rounded text-accent focus:ring-accent"
                />
                <div className="text-xs">
                  <p className="font-semibold text-fg">Low Inventory Warnings</p>
                  <p className="text-muted mt-0.5">
                    Warns when ready-made catalog products reach 1 unit remaining.
                  </p>
                </div>
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
