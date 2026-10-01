import { createFileRoute, Link, useNavigate, getRouteApi } from "@tanstack/react-router";
import { useState, useEffect, useMemo, type ChangeEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  cartSubtotal,
  COD_FEE,
  FREE_SHIPPING_AT,
  STANDARD_SHIPPING,
  EXPRESS_SHIPPING,
  shippingFee,
  getBulkDiscount,
  useCart,
} from "@/lib/cart-store";
import { formatINR } from "@/lib/format";
import { INDIAN_STATES } from "@/lib/india";
import type { Address } from "@/lib/orders-store";
import { productColor } from "@/lib/products";
import { useHydrated } from "@/lib/use-hydrated";
import { cn } from "@/lib/utils";
import { createRazorpayOrder, verifyRazorpayPayment } from "@/lib/orders-fns";
import { getAddresses, saveAddress } from "@/lib/user-profile-fns";
import { validateCoupon } from "@/lib/ecommerce-fns";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useCurrentUser } from "@/lib/auth/use-current-user";
import { loadRazorpay } from "@/lib/razorpay-client";

const rootRoute = getRouteApi("__root__");

export const Route = createFileRoute("/checkout")({ component: CheckoutPage });

type Pay = "online" | "cod" | "upi";
type Ship = "standard" | "express";

function CheckoutPage() {
  const { settings } = rootRoute.useLoaderData();
  const freeThreshold = Number(settings?.free_shipping_threshold) || FREE_SHIPPING_AT;
  const standardFee = Number(settings?.standard_shipping_fee) || STANDARD_SHIPPING;
  const expressFee = Number(settings?.express_shipping_fee) || EXPRESS_SHIPPING;
  const codFee = Number(settings?.cod_fee) || COD_FEE;
  const shippingRates = { freeThreshold, standardFee, expressFee, codFee };

  const hydrated = useHydrated();
  const items = useCart((s) => s.items);
  const clear = useCart((s) => s.clear);
  const navigate = useNavigate();
  const user = useCurrentUser();

  const [address, setAddress] = useState<Address>({
    name: "",
    phone: "",
    email: user?.primaryEmail || "",
    line1: "",
    line2: "",
    city: "",
    state: "Karnataka",
    pincode: "",
  });
  
  const [saveAddressToProfile, setSaveAddressToProfile] = useState(true);
  const [isB2B, setIsB2B] = useState(false);
  const [companyName, setCompanyName] = useState("");
  const [gstin, setGstin] = useState("");
  const [whatsappOptIn, setWhatsappOptIn] = useState(true);
  
  const [ship, setShip] = useState<Ship>("standard");
  const [pay, setPay] = useState<Pay>("online");
  const [notes, setNotes] = useState("");
  const [upiRef, setUpiRef] = useState("");
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{code: string, discount_percent: number} | null>(null);

  const availablePaymentOptions = useMemo(() => {
    const options: { id: Pay; label: string }[] = [];
    if (settings?.payment_online_enabled !== "false") {
      options.push({ id: "online", label: "Online" });
    }
    if (settings?.payment_cod_enabled !== "false") {
      options.push({ id: "cod", label: "Cash on delivery" });
    }
    if (settings?.payment_upi_enabled !== "false") {
      options.push({ id: "upi", label: "UPI / QR Code" });
    }
    return options.length > 0 ? options : [{ id: "online" as const, label: "Online" }];
  }, [settings?.payment_online_enabled, settings?.payment_cod_enabled, settings?.payment_upi_enabled]);

  useEffect(() => {
    if (availablePaymentOptions.length > 0 && !availablePaymentOptions.some((o: { id: Pay; label: string }) => o.id === pay)) {
      setPay(availablePaymentOptions[0].id);
    }
  }, [availablePaymentOptions, pay]);

  // Preload Razorpay checkout script when visiting checkout
  useEffect(() => {
    if (settings?.payment_online_enabled !== "false") {
      void loadRazorpay();
    }
  }, [settings?.payment_online_enabled]);

  useEffect(() => {
    return () => {
      document.body.style.overflow = "";
      document.body.style.position = "";
      document.body.style.height = "";
      document.body.style.width = "";
      document.documentElement.style.overflow = "";
      document.documentElement.style.position = "";
    };
  }, []);

  const { data: savedAddresses } = useQuery({
    queryKey: ["userAddresses"],
    queryFn: () => getAddresses(),
    enabled: !!user,
  });

  // Track if we've auto-filled once to avoid overwriting user edits
  const [hasAutoFilled, setHasAutoFilled] = useState(false);

  useEffect(() => {
    if (savedAddresses && savedAddresses.length > 0 && !hasAutoFilled) {
      const defaultAddr = savedAddresses.find(a => a.is_default) || savedAddresses[0];
      setAddress({
        name: defaultAddr.name,
        phone: defaultAddr.phone,
        email: user?.primaryEmail || "",
        line1: defaultAddr.line1,
        line2: defaultAddr.line2 || "",
        city: defaultAddr.city,
        state: defaultAddr.state,
        pincode: defaultAddr.pin,
      });
      setHasAutoFilled(true);
    }
  }, [savedAddresses, hasAutoFilled, user]);

  const saveAddressMutation = useMutation({
    mutationFn: saveAddress,
  });

  const couponMutation = useMutation({
    mutationFn: validateCoupon,
    onSuccess: (data) => {
      setAppliedCoupon(data);
      toast.success(`Coupon ${data.code} applied!`);
    },
    onError: (err) => {
      toast.error(err.message);
      setAppliedCoupon(null);
    }
  });

  const subtotal = cartSubtotal(items);
  const bulk = getBulkDiscount(items);
  const bulkDiscountAmount = bulk.percent > 0 ? Math.round((subtotal * bulk.percent) / 100) : 0;
  const discountedSubtotal = subtotal - bulkDiscountAmount;
  const discountAmount = appliedCoupon ? Math.round((discountedSubtotal * appliedCoupon.discount_percent) / 100) : 0;
  const totalDiscount = bulkDiscountAmount + discountAmount;
  const shipping = shippingFee(subtotal - totalDiscount, ship, shippingRates);
  const extra = pay === "cod" ? codFee : 0;
  const total = Math.max(0, subtotal - totalDiscount + shipping + extra);

  const empty = hydrated && items.length === 0;

  const field = (key: keyof Address) => ({
    value: address[key] ?? "",
    onChange: (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const val = e.target.value;
      setAddress((a) => ({ ...a, [key]: val }));
      
      // If they type an email and it looks valid, store it for abandoned cart tracking
      if (key === "email" && !user && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
        if (localStorage.getItem("prynth-guest-email") !== val) {
          localStorage.setItem("prynth-guest-email", val);
          window.dispatchEvent(new Event("prynth-sync-cart"));
        }
      }
    }
  });

  function validate() {
    const next: Record<string, string> = {};
    if (address.name.trim().length < 2) next.name = "Name is required.";
    if (!/^[6-9]\d{9}$/.test(address.phone.replace(/\s/g, "")))
      next.phone = "Enter a 10-digit mobile number.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address.email))
      next.email = "Enter a valid email.";
    if (address.line1.trim().length < 4) next.line1 = "Address is required.";
    if (address.city.trim().length < 2) next.city = "City is required.";
    if (!/^\d{6}$/.test(address.pincode)) next.pincode = "PIN code must be 6 digits.";

    if (isB2B) {
      if (companyName.trim().length < 2) {
        next.companyName = "Company / organization name is required for B2B invoice.";
      }
      if (!/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/i.test(gstin.trim())) {
        next.gstin = "Please enter a valid 15-character GSTIN (e.g. 29AAAAA0000A1Z5).";
      }
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSelectSavedAddress(e: React.ChangeEvent<HTMLSelectElement>) {
    if (!e.target.value) return;
    const selected = savedAddresses?.find(a => a.id.toString() === e.target.value);
    if (selected) {
      setAddress({
        name: selected.name,
        phone: selected.phone,
        email: user?.primaryEmail || "",
        line1: selected.line1,
        line2: selected.line2 || "",
        city: selected.city,
        state: selected.state,
        pincode: selected.pin,
      });
    }
  }

  function restoreScrollAndCleanup() {
    setBusy(false);
    document.body.style.overflow = "";
    document.body.style.position = "";
    document.body.style.height = "";
    document.body.style.width = "";
    document.documentElement.style.overflow = "";
    document.documentElement.style.position = "";
    
    // Clean up any empty/closed Razorpay containers that might remain
    const containers = document.querySelectorAll(".razorpay-container");
    containers.forEach((el) => {
      const iframe = el.querySelector("iframe");
      if (!iframe || iframe.style.display === "none") {
        el.remove();
      }
    });
  }

  async function handleRazorpayPayment(
    orderData: any,
    internalOrderNumber: string,
    orderPayload: any
  ) {
    const res = await loadRazorpay();
    if (!res) {
      toast.error("Razorpay SDK failed to load. Are you online?");
      restoreScrollAndCleanup();
      return;
    }

    const razorpayKey =
      orderData.keyId ||
      import.meta.env.VITE_RAZORPAY_KEY_ID ||
      "";

    const configId =
      orderData.checkoutConfigId ||
      import.meta.env.VITE_RAZORPAY_CHECKOUT_CONFIG_ID ||
      "";

    const options: any = {
      key: razorpayKey,
      amount: orderData.amount,
      currency: "INR",
      name: "Prynth!",
      description: "3D Printing Order",
      order_id: orderData.orderId,
      checkout_config_id: configId,
      config_id: configId,
      handler: async function (response: any) {
        try {
          const verifyRes = await verifyRazorpayPayment({
            data: {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              internalOrderNumber,
              orderPayload,
            }
          });
          toast.success("Payment successful! Order confirmed.");
          clear();
          restoreScrollAndCleanup();
          const targetNumber = (verifyRes as any)?.orderNumber || internalOrderNumber;
          void navigate({ to: "/order/$id", params: { id: targetNumber } });
        } catch (err: any) {
          console.error("Payment verification failed:", err);
          restoreScrollAndCleanup();
          const paymentId = response?.razorpay_payment_id ? ` (Payment Ref: ${response.razorpay_payment_id})` : "";
          toast.error(
            (err?.message ? `Verification error: ${err.message}.` : "Payment verification failed.") +
            ` If money was debited from your account, please contact hello@prynth.in${paymentId}.`,
            { duration: 10000 }
          );
        }
      },
      modal: {
        ondismiss: function () {
          restoreScrollAndCleanup();
          toast.info("Payment cancelled. You can change payment method or retry whenever you're ready.");
        },
        escape: true,
        backdropclose: true,
      },
      prefill: {
        name: address.name,
        email: address.email,
        contact: address.phone,
      },
      theme: {
        color: "#00B8A9",
      },
    };

    try {
      const rzp1 = new window.Razorpay(options);
      rzp1.on("payment.failed", function (response: any) {
        restoreScrollAndCleanup();
        const reason = response?.error?.description || response?.error?.reason || "Payment declined or failed.";
        toast.error(`Payment failed: ${reason}. Please try again or choose another payment method.`, { duration: 7000 });
      });
      rzp1.open();
    } catch (err: any) {
      restoreScrollAndCleanup();
      toast.error(err?.message || "Failed to initialize payment gateway. Please check your connection.");
    }
  }

  async function placeOrder(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) {
      toast.error("Please fix the highlighted fields.");
      return;
    }
    setBusy(true);

    try {
      if (user && saveAddressToProfile && !savedAddresses?.some(a => a.line1 === address.line1 && a.city === address.city)) {
        try {
          await saveAddressMutation.mutateAsync({ data: {
            name: address.name,
            phone: address.phone,
            line1: address.line1,
            line2: address.line2 || null,
            city: address.city,
            state: address.state,
            pin: address.pincode,
            is_default: savedAddresses?.length === 0,
          }});
        } catch (addrErr) {
          console.warn("Address save to profile skipped:", addrErr);
        }
      }

      const formattedNotes = [
        notes.trim(),
        isB2B && gstin.trim() ? `B2B Tax Invoice | Company: ${companyName.trim()} | GSTIN: ${gstin.trim().toUpperCase()}` : "",
        whatsappOptIn ? "WhatsApp Updates: Opted In" : "WhatsApp Updates: Opted Out",
        bulk.percent > 0 ? `Volume Tier: ${bulk.tier} (${bulk.percent}% off)` : "",
        pay === "upi" && upiRef ? `UTR: ${upiRef.trim()}` : "",
      ].filter(Boolean).join(" | ") || undefined;

      if (pay === "online") {
        const orderPayload = {
          items,
          total,
          subtotal,
          shipping,
          extra,
          address: { ...address, phone: address.phone.replace(/\s/g, "") },
          shippingMethod: ship,
          paymentMethod: "razorpay",
          notes: formattedNotes,
          couponCode: appliedCoupon?.code,
        };

        const { orderId, amount, internalOrderNumber, keyId } = await createRazorpayOrder({
          data: orderPayload
        });
        await handleRazorpayPayment({ orderId, amount, keyId }, internalOrderNumber, orderPayload);
      } else {
        const { internalOrderNumber } = await createRazorpayOrder({
          data: {
            items,
            total,
            subtotal,
            shipping,
            extra,
            address: { ...address, phone: address.phone.replace(/\s/g, "") },
            shippingMethod: ship,
            paymentMethod: pay,
            notes: formattedNotes,
          }
        });
        clear();
        restoreScrollAndCleanup();
        toast.success(`Order confirmed via ${pay === "upi" ? "UPI" : "Cash on Delivery"}`);
        void navigate({ to: "/order/$id", params: { id: internalOrderNumber } });
      }
    } catch (err: any) {
      console.error("Order creation failed:", err);
      toast.error(err?.message || "Error creating order.");
      restoreScrollAndCleanup();
    }
  }

  const applyCoupon = () => {
    if (!couponCode.trim()) return;
    couponMutation.mutate({ data: couponCode });
  };

  if (!hydrated) {
    return <div className="mx-auto max-w-6xl px-4 py-16 md:px-6">Loading checkout…</div>;
  }

  if (empty) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-24 text-center md:px-6">
        <h1 className="font-display text-3xl font-semibold">Nothing to check out</h1>
        <p className="mt-2 text-muted">Add something from the shop first.</p>
        <Button asChild className="mt-6">
          <Link to="/shop">Go to shop</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 md:px-6 md:py-16">
      <h1 className="font-display text-4xl font-semibold tracking-tight">Checkout</h1>
      <form onSubmit={placeOrder} className="mt-10 grid gap-10 md:grid-cols-12">
        <div className="space-y-8 md:col-span-7">
          <section>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="font-display text-xl font-semibold">Contact & shipping</h2>
              {savedAddresses && savedAddresses.length > 0 && (
                <div className="flex items-center gap-2 text-sm">
                  <Label htmlFor="saved_addr" className="text-xs text-muted whitespace-nowrap">Saved Addresses:</Label>
                  <select
                    id="saved_addr"
                    className="h-9 rounded-xl border border-border bg-surface px-3 text-xs text-fg focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none cursor-pointer max-w-[200px] truncate"
                    onChange={handleSelectSavedAddress}
                  >
                    <option value="">Select...</option>
                    {savedAddresses.map(a => (
                      <option key={a.id} value={a.id}>{a.name} - {a.line1}, {a.city}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label htmlFor="name">Full name</Label>
                <Input id="name" autoComplete="name" {...field("name")} />
                {errors.name ? <p className="mt-1 text-xs text-danger">{errors.name}</p> : null}
              </div>
              <div>
                <Label htmlFor="phone">Mobile</Label>
                <Input id="phone" inputMode="numeric" autoComplete="tel" placeholder="10-digit number" {...field("phone")} />
                {errors.phone ? <p className="mt-1 text-xs text-danger">{errors.phone}</p> : null}
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" autoComplete="email" {...field("email")} />
                {errors.email ? <p className="mt-1 text-xs text-danger">{errors.email}</p> : null}
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="line1">Address</Label>
                <Input id="line1" autoComplete="address-line1" {...field("line1")} />
                {errors.line1 ? <p className="mt-1 text-xs text-danger">{errors.line1}</p> : null}
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="line2">Apartment, landmark (optional)</Label>
                <Input id="line2" autoComplete="address-line2" {...field("line2")} />
              </div>
              <div>
                <Label htmlFor="city">City</Label>
                <Input id="city" autoComplete="address-level2" {...field("city")} />
                {errors.city ? <p className="mt-1 text-xs text-danger">{errors.city}</p> : null}
              </div>
              <div>
                <Label htmlFor="pincode">PIN code</Label>
                <Input id="pincode" inputMode="numeric" autoComplete="postal-code" {...field("pincode")} />
                {errors.pincode ? <p className="mt-1 text-xs text-danger">{errors.pincode}</p> : null}
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="state">State</Label>
                <select
                  id="state"
                  className="h-11 w-full rounded-xl border border-border bg-surface px-3.5 text-sm shadow-[var(--shadow-border)] focus:border-accent focus:ring-2 focus:ring-ring/30 focus:outline-none"
                  value={address.state}
                  onChange={(e) => setAddress((a) => ({ ...a, state: e.target.value }))}
                >
                  {INDIAN_STATES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              
              {user && (
                <div className="sm:col-span-2 mt-2 flex items-center gap-2">
                  <input 
                    type="checkbox" 
                    id="save_addr" 
                    checked={saveAddressToProfile} 
                    onChange={(e) => setSaveAddressToProfile(e.target.checked)}
                    className="size-4 rounded border-border accent-accent cursor-pointer"
                  />
                  <Label htmlFor="save_addr" className="text-sm cursor-pointer select-none">Save this address to my profile</Label>
                </div>
              )}

              <div className="sm:col-span-2 mt-2 flex items-start gap-2.5 rounded-xl border border-border/80 bg-surface-2/40 p-3">
                <input 
                  type="checkbox" 
                  id="whatsapp_opt" 
                  checked={whatsappOptIn} 
                  onChange={(e) => setWhatsappOptIn(e.target.checked)}
                  className="mt-0.5 size-4 rounded border-border accent-accent cursor-pointer"
                />
                <div className="flex-1 text-xs">
                  <Label htmlFor="whatsapp_opt" className="text-xs font-semibold cursor-pointer select-none text-fg block">
                    Receive tracking & order updates on WhatsApp
                  </Label>
                  <p className="text-[11px] text-muted mt-0.5">
                    We will send dispatch alerts and live courier tracking links directly to your mobile number.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold">Shipping method</h2>
            <div className="mt-4 grid gap-3">
              {(
                [
                  {
                    id: "standard" as const,
                    title: "Standard",
                    detail: "3–5 days after we print",
                    price: shippingFee(subtotal - totalDiscount, "standard", shippingRates),
                  },
                  {
                    id: "express" as const,
                    title: "Express",
                    detail: "1–2 days after we print",
                    price: shippingFee(subtotal - totalDiscount, "express", shippingRates),
                  },
                ]
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setShip(opt.id)}
                  className={cn(
                    "flex items-center justify-between rounded-2xl p-4 text-left shadow-[var(--shadow-border)] transition-colors border",
                    ship === opt.id ? "border-accent bg-accent-soft ring-1 ring-accent" : "border-border/60 bg-surface hover:border-accent/40",
                  )}
                >
                  <span>
                    <span className="block font-medium">{opt.title}</span>
                    <span className="text-sm text-muted">{opt.detail}</span>
                  </span>
                  <span className="tabular-nums font-semibold">
                    {opt.price === 0 ? "Free" : formatINR(opt.price)}
                  </span>
                </button>
              ))}
            </div>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold">Payment</h2>
            <div className={cn(
              "mt-4 grid gap-3",
              availablePaymentOptions.length === 1 ? "grid-cols-1" : availablePaymentOptions.length === 2 ? "sm:grid-cols-2" : "sm:grid-cols-3"
            )}>
              {availablePaymentOptions.map((opt: { id: Pay; label: string }) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setPay(opt.id)}
                  className={cn(
                    "h-12 rounded-2xl text-sm font-medium shadow-[var(--shadow-border)] transition-colors leading-none flex items-center justify-center border",
                    pay === opt.id ? "border-accent bg-accent text-ink font-semibold" : "border-border/60 bg-surface text-fg hover:bg-surface-2",
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {pay === "cod" && (
              <p className="mt-4 text-sm text-muted">
                Pay the courier in cash. A {formatINR(codFee)} collection fee is added.
              </p>
            )}
            {pay === "upi" && (
              <div className="mt-4 rounded-xl border border-border p-4 bg-surface text-center">
                <p className="text-sm font-medium">Scan QR code using any UPI app</p>
                {settings?.payment_upi_id && (
                  <p className="mt-1 text-xs text-muted">
                    UPI ID: <span className="font-semibold text-fg font-mono">{settings.payment_upi_id}</span>
                  </p>
                )}
                <div className="mx-auto mt-4 mb-4 flex size-40 items-center justify-center rounded border-2 border-dashed border-border bg-secondary">
                  <span className="text-xs text-muted">[ UPI QR Placeholder ]</span>
                </div>
                <Label htmlFor="upi_ref">Enter UTR Reference Number</Label>
                <Input id="upi_ref" placeholder="12-digit UTR" className="mt-2 text-center" value={upiRef} onChange={e => setUpiRef(e.target.value)} />
              </div>
            )}
          </section>
          
          <section className="rounded-2xl border border-border bg-surface p-4 sm:p-5 shadow-xs space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-display text-base font-semibold">Business Tax Invoicing (B2B / GST)</h2>
                <p className="text-xs text-muted mt-0.5">Need a formal GST tax invoice with Input Tax Credit (ITC) for your company?</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={isB2B}
                  onChange={(e) => setIsB2B(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-surface-2 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent"></div>
              </label>
            </div>

            {isB2B && (
              <div className="grid gap-3 sm:grid-cols-2 pt-3 border-t border-border animate-in fade-in duration-200">
                <div>
                  <Label htmlFor="companyName">Registered Company Name</Label>
                  <Input
                    id="companyName"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="e.g. Acme Technologies Pvt Ltd"
                    className="mt-1"
                  />
                  {errors.companyName ? <p className="mt-1 text-xs text-danger">{errors.companyName}</p> : null}
                </div>
                <div>
                  <Label htmlFor="gstin">GST Identification Number (GSTIN)</Label>
                  <Input
                    id="gstin"
                    value={gstin}
                    onChange={(e) => setGstin(e.target.value.toUpperCase())}
                    maxLength={15}
                    placeholder="29AAAAA0000A1Z5"
                    className="mt-1 uppercase font-mono"
                  />
                  {errors.gstin ? <p className="mt-1 text-xs text-danger">{errors.gstin}</p> : null}
                </div>
                <p className="sm:col-span-2 text-[11px] text-muted">
                  Your official 18% GST tax invoice with HSN code 8477 will be attached to your order and available for instant download.
                </p>
              </div>
            )}
          </section>

          <div>
            <Label htmlFor="notes">Order notes (optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Gate code, preferred delivery window…"
            />
          </div>
        </div>

        <aside className="h-fit rounded-3xl bg-surface p-4 sm:p-6 shadow-[var(--shadow-border)] md:sticky md:top-24 md:col-span-5">
          <h2 className="font-display text-xl font-semibold">Order</h2>
          <ul className="mt-4 divide-y divide-border">
            {items.map((item) => (
              <li key={item.id} className="flex gap-3 py-3">
                <Link
                  to={item.productSlug ? "/shop/$slug" : "/custom"}
                  params={item.productSlug ? { slug: item.productSlug } : {}}
                  className="shrink-0"
                >
                  {item.image ? (
                    <img src={item.image} alt="" loading="lazy" className="product-photo size-14 rounded-lg object-cover transition-opacity hover:opacity-80" />
                  ) : (
                    <div className="size-14 rounded-lg bg-accent-soft transition-opacity hover:opacity-80" />
                  )}
                </Link>
                <div className="min-w-0 flex-1">
                  <Link
                    to={item.productSlug ? "/shop/$slug" : "/custom"}
                    params={item.productSlug ? { slug: item.productSlug } : {}}
                    className="truncate text-sm font-medium hover:underline"
                  >
                    {item.name}
                  </Link>
                  <p className="text-xs text-muted">
                    {productColor(item.color).name}
                    {item.size && ` · ${item.size}`}
                    {item.custom?.printerName && ` · ${item.custom.printerName}`}
                    {item.custom?.material && ` · ${item.custom.material}`}
                    {item.custom?.quality && ` · ${item.custom.quality}`}
                    {item.custom?.infillPercentage != null && ` · ${item.custom.infillPercentage}% infill`}
                    {" · "}×{item.qty}
                  </p>
                </div>
                <p className="text-sm tabular-nums">{formatINR(item.unitPrice * item.qty)}</p>
              </li>
            ))}
          </ul>
          
          <div className="mt-6 flex items-center gap-2">
            <Input 
              placeholder="Coupon code" 
              value={couponCode} 
              onChange={e => setCouponCode(e.target.value)} 
              disabled={!!appliedCoupon || couponMutation.isPending}
              className="h-11"
            />
            {appliedCoupon ? (
              <Button type="button" variant="secondary" size="md" className="shrink-0 h-11 px-5" onClick={() => setAppliedCoupon(null)}>Remove</Button>
            ) : (
              <Button type="button" variant="secondary" size="md" className="shrink-0 h-11 px-5" onClick={applyCoupon} disabled={couponMutation.isPending || !couponCode}>Apply</Button>
            )}
          </div>
          
          <dl className="mt-6 space-y-2 border-t border-border pt-4 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted">Subtotal</dt>
              <dd className="tabular-nums">{formatINR(subtotal)}</dd>
            </div>
            {bulkDiscountAmount > 0 && (
              <div className="flex justify-between text-accent font-medium">
                <dt>Volume prototyping discount ({bulk.percent}%)</dt>
                <dd className="tabular-nums">−{formatINR(bulkDiscountAmount)}</dd>
              </div>
            )}
            {appliedCoupon && (
              <div className="flex justify-between text-primary font-medium">
                <dt>Coupon discount ({appliedCoupon.code} · {appliedCoupon.discount_percent}%)</dt>
                <dd className="tabular-nums">−{formatINR(discountAmount)}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-muted">Shipping</dt>
              <dd className="tabular-nums">{shipping === 0 ? "Free" : formatINR(shipping)}</dd>
            </div>
            {extra > 0 ? (
              <div className="flex justify-between">
                <dt className="text-muted">COD fee</dt>
                <dd className="tabular-nums">{formatINR(extra)}</dd>
              </div>
            ) : null}
            <div className="flex justify-between pt-2 text-base font-semibold border-t border-border">
              <dt>Total</dt>
              <dd className="tabular-nums text-lg text-accent">{formatINR(total)}</dd>
            </div>
          </dl>
          <Button type="submit" size="lg" className="mt-6 w-full" disabled={busy}>
            {busy ? "Placing order…" : `Pay ${formatINR(total)}`}
          </Button>
          {pay === "online" && (
            <p className="mt-3 text-xs text-subtle">
              You will be redirected to Razorpay securely.
            </p>
          )}
        </aside>
      </form>
    </div>
  );
}
