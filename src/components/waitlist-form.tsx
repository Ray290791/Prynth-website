import React, { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { joinWaitlist } from "@/lib/waitlist-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Bell, CheckCircle2, ShieldCheck } from "lucide-react";

interface WaitlistFormProps {
  interest?: string;
  title?: string;
  description?: string;
  placeholder?: string;
  className?: string;
  compact?: boolean;
}

export function WaitlistForm({
  interest = "launch",
  title = "Orders open soon",
  description = "We are preparing for our next batch of studio production. Leave your email to receive direct notification the moment ordering opens.",
  placeholder = "Enter your email address",
  className = "",
  compact = false,
}: WaitlistFormProps) {
  const [email, setEmail] = useState("");
  const [hasConsent, setHasConsent] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const consentText = "Email me when this opens. I can unsubscribe any time.";

  const mutation = useMutation({
    mutationFn: async () => {
      if (!email.trim() || !email.includes("@")) {
        throw new Error("Please enter a valid email address.");
      }
      if (!hasConsent) {
        throw new Error("Please check the consent box to receive opening notifications.");
      }
      return await joinWaitlist({
        data: {
          email: email.trim(),
          interest,
          consentText,
          hasConsent: true,
        },
      });
    },
    onSuccess: () => {
      setSubmitted(true);
      toast.success("You're on the waitlist! We'll notify you when orders open.");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to join waitlist. Please try again.");
    },
  });

  if (submitted) {
    return (
      <div className={`rounded-2xl border border-accent/40 bg-accent/5 p-6 text-center space-y-2.5 animate-in fade-in duration-300 ${className}`}>
        <div className="inline-flex size-10 items-center justify-center rounded-full bg-accent text-ink mx-auto shadow-xs">
          <CheckCircle2 className="size-5" />
        </div>
        <h4 className="font-display text-lg font-bold text-fg">You're on the list!</h4>
        <p className="text-xs text-muted max-w-sm mx-auto leading-relaxed">
          We've registered <strong className="text-fg">{email}</strong> for <em>{interest}</em> updates. You will be among the first notified when ordering opens.
        </p>
      </div>
    );
  }

  return (
    <div className={`rounded-2xl border border-border/80 bg-surface/80 p-5 sm:p-7 shadow-sm backdrop-blur-md space-y-4 ${className}`}>
      {!compact && (
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold bg-accent/15 text-accent border border-accent/25">
            <Bell className="size-3" />
            <span>INTERIM WAITLIST</span>
          </div>
          <h3 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-fg">
            {title}
          </h3>
          <p className="text-xs sm:text-sm text-muted leading-relaxed">
            {description}
          </p>
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          mutation.mutate();
        }}
        className="space-y-3 pt-1"
      >
        <div className="flex flex-col sm:flex-row gap-2.5">
          <Input
            type="email"
            placeholder={placeholder}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="h-10 text-sm bg-surface-2/60 border-border"
          />
          <Button
            type="submit"
            disabled={mutation.isPending}
            className="h-10 px-5 bg-accent text-ink font-semibold shrink-0 cursor-pointer shadow-xs hover:opacity-90"
          >
            {mutation.isPending ? "Joining..." : "Notify Me"}
          </Button>
        </div>

        <label className="flex items-start gap-2 text-xs text-muted cursor-pointer select-none pt-0.5">
          <input
            type="checkbox"
            checked={hasConsent}
            onChange={(e) => setHasConsent(e.target.checked)}
            required
            className="mt-0.5 size-3.5 rounded border-border text-accent focus:ring-accent cursor-pointer"
          />
          <span className="leading-snug">
            {consentText}
          </span>
        </label>
      </form>
    </div>
  );
}
