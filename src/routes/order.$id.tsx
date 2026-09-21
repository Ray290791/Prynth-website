import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, Package, Truck, Receipt, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDate, formatINR } from "@/lib/format";
import { getOrderById } from "@/lib/orders-fns";
import { productColor } from "@/lib/products";
import { useQuery } from "@tanstack/react-query";
import { useHydrated } from "@/lib/use-hydrated";
import type { CartItem } from "@/lib/cart-store";
import type { Address } from "@/lib/orders-store";
import { useCart } from "@/lib/cart-store";
import { useNavigate } from "@tanstack/react-router";

export const Route = createFileRoute("/order/$id")({ component: OrderPage });

function OrderPage() {
  const { id } = Route.useParams();
  const hydrated = useHydrated();
  const add = useCart(s => s.add);
  const navigate = useNavigate();

  const { data: order, isLoading } = useQuery({
    queryKey: ["order", id],
    queryFn: () => getOrderById({ data: { id } }),
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
            <li key={item.id} className="flex justify-between gap-3 py-3 text-sm">
              <span>
                {item.name}
                <span className="block text-muted">
                  {productColor(item.color).name} {item.size && `· ${item.size}`} · ×{item.qty}
                </span>
              </span>
              <span className="tabular-nums">{formatINR(item.unitPrice * item.qty)}</span>
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
          <p className="mt-2 text-sm">
            {address?.name}
            <br />
            {address?.line1}
            {address?.line2 ? (
              <>
                <br />
                {address.line2}
              </>
            ) : null}
            <br />
            {address?.city}, {address?.state} {address?.pincode}
            <br />
            {address?.phone}
          </p>
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
    </div>
  );
}
