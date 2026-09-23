import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, Package, Truck, Receipt, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDate, formatINR } from "@/lib/format";
import { getOrderById } from "@/lib/orders-fns";
import { productColor } from "@/lib/products";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useHydrated } from "@/lib/use-hydrated";
import type { CartItem } from "@/lib/cart-store";
import type { Address } from "@/lib/orders-store";
import { useCart } from "@/lib/cart-store";
import { useNavigate } from "@tanstack/react-router";
import { useCurrentUser } from "@/lib/auth/use-current-user";
import { createReview } from "@/lib/products-fns";
import { useState } from "react";
import { Star } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/order/$id")({ component: OrderPage });

function OrderPage() {
  const { id } = Route.useParams();
  const hydrated = useHydrated();
  const add = useCart(s => s.add);
  const navigate = useNavigate();
  const user = useCurrentUser();

  const [reviewProduct, setReviewProduct] = useState<{ slug: string; name: string } | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [guestEmailInput, setGuestEmailInput] = useState("");
  const [verifiedEmail, setVerifiedEmail] = useState("");
  
  const createReviewMutation = useMutation({
    mutationFn: createReview,
    onSuccess: () => {
      toast.success("Review submitted!");
      setReviewProduct(null);
      setRating(5);
      setComment("");
    },
    onError: () => toast.error("Failed to submit review"),
  });

  const { data: order, isLoading } = useQuery({
    queryKey: ["order", id, verifiedEmail],
    queryFn: () => getOrderById({ data: { id, email: verifiedEmail || undefined } }),
  });

  if (!hydrated || isLoading) {
    return <div className="mx-auto max-w-3xl px-4 py-16 md:px-6">Loading order…</div>;
  }

  if (!order) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-24 text-center md:px-6">
        <h1 className="font-display text-3xl font-semibold">Order not found</h1>
        <p className="mt-2 text-muted">
          We couldn't find this order. Make sure you are logged into the correct account.
        </p>
        <Button asChild className="mt-6">
          <Link to="/shop">Back to shop</Link>
        </Button>
      </div>
    );
  }

  const items = (typeof order.items === 'string' ? JSON.parse(order.items) : order.items) as CartItem[];
  const address = (typeof order.shipping_address === 'string' ? JSON.parse(order.shipping_address) : order.shipping_address) as Address;

  const handleReorder = () => {
    items.forEach(({ id: _id, ...item }) => add(item));
    navigate({ to: "/cart" });
  };

  const handlePrintInvoice = () => {
    window.print();
  };

  // Timeline logic
  const statuses = [
    { id: 'pending', label: 'Order Placed', icon: Receipt },
    { id: 'processing', label: order.status === 'printing' ? 'Printing' : 'Processing', icon: Package },
    { id: 'shipped', label: 'Shipped', icon: Truck },
    { id: 'delivered', label: 'Delivered', icon: Check },
  ];
  
  const normalizedStatus = order.status === 'printing' ? 'processing' : order.status;
  const currentStatusIndex = statuses.findIndex(s => s.id === normalizedStatus) >= 0 
    ? statuses.findIndex(s => s.id === normalizedStatus) 
    : 0;

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 md:px-6 md:py-16">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex size-12 items-center justify-center rounded-full bg-accent-soft text-accent">
            <Check className="size-6" strokeWidth={2} />
          </div>
          <h1 className="mt-5 font-display text-4xl font-semibold tracking-tight">
            Order details
          </h1>
          <p className="mt-2 text-muted">
            {order.order_number} · {formatDate(order.created_at)}
          </p>
          <p className="mt-4 text-muted">
            We'll print this to order and email {address?.email} when it ships.
            Typical ready-made turnaround is 3–5 days before the courier has it.
          </p>
        </div>
        <div className="hidden sm:flex flex-col gap-2">
          <Button variant="outline" size="sm" onClick={handlePrintInvoice} className="print:hidden">
            <Receipt className="mr-2 size-4" /> Download Invoice
          </Button>
          <Button variant="outline" size="sm" onClick={handleReorder} className="print:hidden">
            <RotateCcw className="mr-2 size-4" /> Order Again
          </Button>
        </div>
      </div>

      {/* Tracking Timeline */}
      <section className="mt-12 mb-8 print:hidden">
        <h2 className="font-display text-lg font-semibold mb-6">Tracking Status</h2>
        <div className="relative">
          <div className="absolute top-1/2 left-0 h-0.5 w-full -translate-y-1/2 bg-border"></div>
          <div className="absolute top-1/2 left-0 h-0.5 -translate-y-1/2 bg-primary transition-all duration-500" 
               style={{ width: `${(currentStatusIndex / (statuses.length - 1)) * 100}%` }}></div>
          
          <div className="relative flex justify-between">
            {statuses.map((step, idx) => {
              const isCompleted = idx <= currentStatusIndex;
              const isCurrent = idx === currentStatusIndex;
              const Icon = step.icon;
              
              return (
                <div key={step.id} className="flex flex-col items-center">
                  <div className={`flex size-10 items-center justify-center rounded-full border-2 transition-colors duration-500 bg-background
                    ${isCompleted ? 'border-primary text-primary' : 'border-border text-muted-foreground'}`}>
                    <Icon className="size-5" />
                  </div>
                  <span className={`mt-3 text-sm font-medium ${isCurrent ? 'text-foreground' : 'text-muted-foreground'}`}>
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
        {order.tracking_number && (
          <div className="mt-8 rounded-lg bg-secondary p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Tracking Number</p>
              <p className="font-mono mt-1">{order.tracking_number}</p>
            </div>
            {order.tracking_url && (
              <Button asChild size="sm">
                <a href={order.tracking_url} target="_blank" rel="noreferrer">Track Package</a>
              </Button>
            )}
          </div>
        )}
      </section>

      <section className="mt-10 rounded-3xl bg-surface p-6 shadow-[var(--shadow-border)]">
        <h2 className="font-display text-lg font-semibold">Items</h2>
        <ul className="mt-4 divide-y divide-border">
          {items?.map((item) => (
            <li key={item.id} className="flex justify-between gap-3 py-4 text-sm flex-col sm:flex-row sm:items-center">
              <div>
                <span className="block font-medium">{item.name}</span>
                <span className="block text-muted mt-1">
                  {productColor(item.color).name}
                  {item.size && ` · ${item.size}`}
                  {item.custom?.printerName && ` · ${item.custom.printerName}`}
                  {item.custom?.material && ` · ${item.custom.material}`}
                  {item.custom?.quality && ` · ${item.custom.quality}`}
                  {item.custom?.infillPercentage != null && ` · ${item.custom.infillPercentage}% infill`}
                  {" · "}×{item.qty}
                </span>
                {item.custom ? (
                  <div className="mt-2 flex flex-wrap gap-1.5 text-xs text-muted">
                    {item.custom.printerName ? (
                      <span className="rounded bg-accent/10 px-1.5 py-0.5 font-medium text-accent">
                        Machine: {item.custom.printerName}
                      </span>
                    ) : null}
                    {item.custom.infillPattern ? (
                      <span className="rounded bg-surface-2 px-1.5 py-0.5">
                        Pattern: {item.custom.infillPattern}
                      </span>
                    ) : null}
                    {item.custom.wallLoops ? (
                      <span className="rounded bg-surface-2 px-1.5 py-0.5">
                        {item.custom.wallLoops} walls
                      </span>
                    ) : null}
                    {item.custom.supports && item.custom.supports !== "none" ? (
                      <span className="rounded bg-surface-2 px-1.5 py-0.5">
                        {item.custom.supports === "tree" ? "Tree supports" : "Supports"}
                      </span>
                    ) : null}
                    {item.custom.surfaceFinish && item.custom.surfaceFinish !== "standard" ? (
                      <span className="rounded bg-surface-2 px-1.5 py-0.5 capitalize">
                        {item.custom.surfaceFinish}
                      </span>
                    ) : null}
                    {item.custom.brim && item.custom.brim !== "none" ? (
                      <span className="rounded bg-surface-2 px-1.5 py-0.5">
                        {item.custom.brim === "outer" ? "Outer brim" : item.custom.brim}
                      </span>
                    ) : null}
                    {item.custom.fileName ? (
                      <span className="truncate rounded bg-surface-2 px-1.5 py-0.5 font-mono text-[11px]">
                        File: {item.custom.fileName}
                      </span>
                    ) : null}
                  </div>
                ) : null}
                {user && order.status === 'delivered' && (
                  <button 
                    onClick={() => setReviewProduct({ slug: item.productSlug!, name: item.name })}
                    className="text-brand font-medium hover:underline mt-2 inline-block print:hidden"
                  >
                    Write a review
                  </button>
                )}
              </div>
              <span className="tabular-nums font-medium sm:self-start">{formatINR(item.unitPrice * item.qty)}</span>
            </li>
          ))}
        </ul>
        <dl className="mt-4 space-y-2 border-t border-border pt-4 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted">Subtotal</dt>
            <dd className="tabular-nums">{formatINR(order.subtotal)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted">Shipping ({order.shipping_method})</dt>
            <dd className="tabular-nums">
              {Number(order.shipping) === 0 ? "Free" : formatINR(order.shipping)}
            </dd>
          </div>
          {Number(order.extra) > 0 ? (
            <div className="flex justify-between">
              <dt className="text-muted">COD fee / Extra</dt>
              <dd className="tabular-nums">{formatINR(order.extra)}</dd>
            </div>
          ) : null}
          <div className="flex justify-between text-base font-medium border-t border-border pt-2 mt-2">
            <dt>Total</dt>
            <dd className="tabular-nums">{formatINR(order.total)}</dd>
          </div>
        </dl>
      </section>

      <section className="mt-6 grid gap-6 rounded-3xl bg-surface p-6 shadow-[var(--shadow-border)] sm:grid-cols-2">
        <div>
          <h2 className="text-sm font-medium text-subtle">Ship to</h2>
          {address ? (
            <p className="mt-2 text-sm">
              {address.name}
              <br />
              {address.line1}
              {address.line2 ? (
                <>
                  <br />
                  {address.line2}
                </>
              ) : null}
              <br />
              {address.city}, {address.state} {address.pincode}
              <br />
              {address.phone}
            </p>
          ) : (
            <div className="mt-2 text-sm text-muted">
              <p className="text-xs">For customer privacy, address details are protected.</p>
              <div className="mt-2.5 flex items-center gap-2">
                <Input
                  type="email"
                  placeholder="Verify order email"
                  value={guestEmailInput}
                  onChange={(e) => setGuestEmailInput(e.target.value)}
                  className="h-8 text-xs max-w-[200px]"
                />
                <Button
                  size="sm"
                  variant="secondary"
                  className="h-8 text-xs"
                  onClick={() => setVerifiedEmail(guestEmailInput)}
                >
                  Verify
                </Button>
              </div>
            </div>
          )}
        </div>
        <div>
          <h2 className="text-sm font-medium text-subtle">Payment</h2>
          <p className="mt-2 text-sm">
            {order.payment_method === 'cod' ? 'Cash on Delivery' : order.payment_method === 'upi' ? 'UPI / QR Code' : 'Razorpay (Online)'}
          </p>
        </div>
      </section>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row print:hidden">
        <Button asChild>
          <Link to="/shop">Continue shopping</Link>
        </Button>
        <Button variant="secondary" className="sm:hidden" onClick={handlePrintInvoice}>
          Download Invoice
        </Button>
        <Button variant="secondary" className="sm:hidden" onClick={handleReorder}>
          Order Again
        </Button>
        <Button asChild variant="secondary">
          <Link to="/contact">Need help?</Link>
        </Button>
      </div>
      
      {/* Print only footer */}
      <div className="hidden print:block mt-16 text-center text-sm text-muted">
        <p>Thank you for shopping with Prynth!</p>
        <p>Questions? Contact us at support@prynth.com</p>
      </div>

      {/* Review Dialog */}
      {reviewProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm print:hidden">
          <div className="w-full max-w-md rounded-2xl bg-surface p-6 shadow-xl relative">
            <button 
              onClick={() => setReviewProduct(null)}
              className="absolute right-4 top-4 text-muted hover:text-foreground"
            >
              ✕
            </button>
            <h3 className="font-display text-xl font-semibold">Review {reviewProduct.name}</h3>
            
            <div className="mt-6 flex justify-center gap-2 text-brand">
              {[1, 2, 3, 4, 5].map((s) => (
                <button key={s} type="button" onClick={() => setRating(s)} className="hover:scale-110 transition-transform">
                  <Star className="size-8" fill={s <= rating ? "currentColor" : "none"} strokeWidth={1.5} />
                </button>
              ))}
            </div>

            <textarea 
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="What did you think?"
              className="mt-6 w-full rounded-lg border border-border bg-background p-3 text-sm placeholder:text-muted focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand min-h-[100px]"
            />

            <Button 
              className="w-full mt-4" 
              onClick={() => createReviewMutation.mutate({ data: { product_slug: reviewProduct.slug, rating, comment } })}
              disabled={createReviewMutation.isPending}
            >
              {createReviewMutation.isPending ? "Submitting..." : "Submit Review"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
