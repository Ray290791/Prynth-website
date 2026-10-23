import { getSql } from "./db";
import { sendOrderConfirmationEmail } from "./email.server";
import { notifyNewOrder } from "./notifications.server";

/**
 * Idempotently confirms an order payment (called from either browser verification or webhook).
 * Guards against double stock decrements, multiple email dispatches, or concurrent race conditions.
 */
export async function confirmOrderPaymentIdempotent(opts: {
  razorpayOrderId?: string;
  razorpayPaymentId: string;
  orderNumber?: string;
  sqlInstance?: any;
}): Promise<{ success: boolean; alreadyPaid: boolean; orderNumber?: string }> {
  const sql = opts.sqlInstance || (await getSql());

  let order: any = null;
  if (opts.razorpayOrderId) {
    const res = await sql`
      SELECT * FROM orders 
      WHERE razorpay_order_id = ${opts.razorpayOrderId}
      LIMIT 1
    `;
    if (res.length > 0) order = res[0];
  }

  if (!order && opts.orderNumber) {
    const res = await sql`
      SELECT * FROM orders 
      WHERE order_number = ${opts.orderNumber}
      LIMIT 1
    `;
    if (res.length > 0) order = res[0];
  }

  if (!order) {
    return { success: false, alreadyPaid: false };
  }

  const targetNumber = order.order_number;

  // Idempotency: if already confirmed as paid, do not repeat side effects
  if (order.payment_status === "paid") {
    return { success: true, alreadyPaid: true, orderNumber: targetNumber };
  }

  // Atomically transition from pending to paid
  const updated = await sql`
    UPDATE orders 
    SET payment_status = 'paid',
        razorpay_payment_id = COALESCE(razorpay_payment_id, ${opts.razorpayPaymentId}),
        status = 'processing'
    WHERE id = ${order.id} AND payment_status != 'paid'
    RETURNING id
  `;

  if (!updated || updated.length === 0) {
    return { success: true, alreadyPaid: true, orderNumber: targetNumber };
  }

  // Decrement stock upon successful payment
  const orderItems = typeof order.items === "string" ? JSON.parse(order.items) : order.items;
  if (orderItems && Array.isArray(orderItems)) {
    for (const item of orderItems) {
      if (item.kind === "product" && item.productSlug) {
        try {
          const variants = await sql`SELECT * FROM product_variants WHERE product_slug = ${item.productSlug}`;
          const variant = variants.find((v: any) =>
            (v.size === item.size || (v.size === null && !item.size)) &&
            (v.color === item.color || (v.color === null && !item.color))
          );
          if (variant) {
            await sql`UPDATE product_variants SET stock_count = stock_count - ${item.qty} WHERE id = ${variant.id} AND stock_count > -1`;
          } else {
            await sql`UPDATE products SET stock_count = stock_count - ${item.qty} WHERE slug = ${item.productSlug} AND stock_count > -1`;
          }
        } catch (stkErr) {
          console.warn("[confirmOrderPaymentIdempotent] Stock decrement error:", stkErr);
        }
      }
    }
  }

  // Send order confirmation email
  let email = order.guest_email;
  let name = "Customer";

  if (order.shipping_address) {
    const addr = typeof order.shipping_address === "string" ? JSON.parse(order.shipping_address) : order.shipping_address;
    email = addr?.email || email;
    name = addr?.name || name;
  }

  if (email) {
    try {
      await sendOrderConfirmationEmail(targetNumber, email, name, {
        items: orderItems,
        subtotal: Number(order.subtotal),
        shipping: Number(order.shipping),
        extra: Number(order.extra),
        total: Number(order.total),
      });
    } catch (emErr) {
      console.warn("[confirmOrderPaymentIdempotent] Email send error:", emErr);
    }
  }

  // Dispatch admin notification
  try {
    await notifyNewOrder({
      orderNumber: targetNumber,
      name,
      email,
      phone: (order.shipping_address as any)?.phone,
      total: Number(order.total),
      paymentMethod: "Razorpay (Online)",
      items: orderItems.map((i: any) => ({
        name: i.name,
        qty: i.qty,
        color: i.color,
        size: i.size,
        custom: i.custom,
      })),
      shippingAddress: order.shipping_address ? JSON.stringify(order.shipping_address) : undefined,
    });
  } catch (notifyErr) {
    console.error("[confirmOrderPaymentIdempotent] Admin notification error:", notifyErr);
  }

  return { success: true, alreadyPaid: false, orderNumber: targetNumber };
}
