import { createServerFn } from "@tanstack/react-start";
import { getSql } from "./db";
import { authMiddleware } from "./auth/middleware";
import { verifyAdminRole, verifyAdminPIN } from "./admin-fns";
import { razorpay } from "./razorpay.server";
import crypto from "crypto";
import { sendOrderConfirmationEmail, sendOrderStatusUpdateEmail } from "./email.server";
import type { CartItem } from "./cart-store";
import type { Address } from "./orders-store";

export const createRazorpayOrder = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    (data: {
      items: CartItem[];
      total: number;
      subtotal: number;
      shipping: number;
      extra: number;
      address: Address;
      shippingMethod: string;
      paymentMethod: string;
      notes?: string;
    }) => data,
  )
  .handler(async ({ data, context }) => {
    const sql = await getSql();

    const orderNumber = `PRY-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`;

    if (data.paymentMethod === "razorpay" || data.paymentMethod === "online") {
      // Convert total (INR) to paise (paise = INR * 100)
      const amountInPaise = Math.round(data.total * 100);

      const rzpOrder = await razorpay.orders.create({
        amount: amountInPaise,
        currency: "INR",
        receipt: `receipt_${Date.now()}`,
      });

      // Insert order into DB
      await sql`
        INSERT INTO orders (
          user_id, order_number, status, total, subtotal, shipping, extra, 
          items, shipping_address, shipping_method, payment_method, 
          razorpay_order_id, payment_status, notes
        ) VALUES (
          ${context.userId}, ${orderNumber}, 'pending', ${data.total}, ${data.subtotal}, ${data.shipping}, ${data.extra},
          ${JSON.stringify(data.items)}, ${JSON.stringify(data.address)}, ${data.shippingMethod}, ${data.paymentMethod},
          ${rzpOrder.id}, 'pending', ${data.notes || null}
        )
      `;

      return { orderId: rzpOrder.id, amount: rzpOrder.amount, internalOrderNumber: orderNumber };
    } else {
      // COD or UPI — no Razorpay involved
      await sql`
        INSERT INTO orders (
          user_id, order_number, status, total, subtotal, shipping, extra, 
          items, shipping_address, shipping_method, payment_method, 
          payment_status, notes
        ) VALUES (
          ${context.userId}, ${orderNumber}, 'pending', ${data.total}, ${data.subtotal}, ${data.shipping}, ${data.extra},
          ${JSON.stringify(data.items)}, ${JSON.stringify(data.address)}, ${data.shippingMethod}, ${data.paymentMethod},
          'pending', ${data.notes || null}
        )
      `;

      const userRes = await sql`SELECT email, name FROM "user" WHERE id = ${context.userId}`;
      const user = userRes[0] as { email: string; name: string } | undefined;
      if (user?.email) {
        await sendOrderConfirmationEmail(orderNumber, user.email, user.name);
      }

      return { orderId: null, amount: 0, internalOrderNumber: orderNumber };
    }
  });

export const verifyRazorpayPayment = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string; internalOrderNumber: string }) => data)
  .handler(async ({ data, context }) => {
    const sql = await getSql();
    
    const hmac = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET || "");
    hmac.update(data.razorpay_order_id + "|" + data.razorpay_payment_id);
    const generatedSignature = hmac.digest("hex");

    if (generatedSignature !== data.razorpay_signature) {
      throw new Error("Invalid signature");
    }

    // Update order status to paid
    await sql`
      UPDATE orders 
      SET payment_status = 'paid', razorpay_payment_id = ${data.razorpay_payment_id}, status = 'processing'
      WHERE order_number = ${data.internalOrderNumber} AND user_id = ${context.userId}
    `;

    // Fetch user email to send confirmation
    const userRes = await sql`SELECT email, name FROM "user" WHERE id = ${context.userId}`;
    const user = userRes[0] as { email: string; name: string } | undefined;
    
    if (user?.email) {
      await sendOrderConfirmationEmail(data.internalOrderNumber, user.email, user.name);
    }

    return { success: true };
  });

export const getUserOrders = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const res = await sql`SELECT * FROM orders WHERE user_id = ${context.userId} ORDER BY created_at DESC`;
    return res as any[];
  });

export const getOrderById = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator((data: { id: string }) => data)
  .handler(async ({ data, context }) => {
    const sql = await getSql();
    // Assuming 'id' in the route is the order_number
    const res = await sql`SELECT * FROM orders WHERE order_number = ${data.id} AND user_id = ${context.userId}`;
    if (res.length === 0) return null;
    return res[0] as any;
  });

export const getAllOrdersAdmin = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    
    // Verify admin
    const admin = await verifyAdminRole(context.userId, sql);
    if (!admin) {
      throw new Error(`Unauthorized`);
    }

    const res = await sql`
      SELECT orders.*, "user".email as user_email, "user".name as user_name 
      FROM orders 
      LEFT JOIN "user" ON orders.user_id = "user".id 
      ORDER BY created_at DESC
    `;
    return (res as any[]) || [];
  });


export const updateOrderStatus = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: { order_number: string; status: string }) => data)
  .handler(async ({ data, context }) => {
    const sql = await getSql();
    
    // Verify admin
    const admin = await verifyAdminRole(context.userId, sql);
    if (!admin) {
      throw new Error(`Unauthorized`);
    }

    await sql`UPDATE orders SET status = ${data.status} WHERE order_number = ${data.order_number}`;

    // Fetch customer email to send update
    const orderRes = await sql`
      SELECT "user".email, "user".name 
      FROM orders 
      JOIN "user" ON orders.user_id = "user".id 
      WHERE order_number = ${data.order_number}
    `;
    const orderUser = orderRes[0] as { email: string; name: string } | undefined;

    if (orderUser?.email) {
      await sendOrderStatusUpdateEmail(data.order_number, orderUser.email, data.status);
      console.log(`[Mock WhatsApp] Notification sent to ${orderUser.name} (${orderUser.email}): Your order ${data.order_number} is now ${data.status}.`);
    }

    return { success: true };
  });

export const deleteOrderAdmin = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: { order_number: string; pin?: string }) => data)
  .handler(async ({ data, context }) => {
    const sql = await getSql();
    
    // Verify admin
    const admin = await verifyAdminRole(context.userId, sql);
    if (!admin) {
      throw new Error(`Unauthorized`);
    }

    // Verify Admin PIN
    if (!data.pin) {
      throw new Error("PIN is required to delete an order.");
    }
    
    const isValidPin = await verifyAdminPIN(admin.email, data.pin, sql);
    if (!isValidPin) {
      throw new Error("Invalid Admin PIN");
    }

    // Delete order
    await sql`DELETE FROM orders WHERE order_number = ${data.order_number}`;
    return { success: true };
  });

