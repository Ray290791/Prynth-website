import { createServerFn } from "@tanstack/react-start";
import { getSql } from "./db";
import { authMiddleware, optionalAuthMiddleware } from "./auth/middleware";
import { verifyAdminRole, verifyAdminPIN } from "./admin-fns";
import { razorpay } from "./razorpay.server";
import crypto from "crypto";
import { sendOrderConfirmationEmail, sendOrderStatusUpdateEmail } from "./email.server";
import type { CartItem } from "./cart-store";
import type { Address } from "./orders-store";

export const createRazorpayOrder = createServerFn({ method: "POST" })
  .middleware([optionalAuthMiddleware])
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
      couponCode?: string;
    }) => data,
  )
  .handler(async ({ data, context }) => {
    const sql = await getSql();

    // 1. Inventory & Price Validation from Database
    let serverSubtotal = 0;
    for (const item of data.items) {
      const qty = Math.max(1, Math.floor(Number(item.qty) || 1));
      if (item.kind === "product" && item.productSlug) {
        const productRes = await sql`SELECT price, stock_count, in_stock FROM products WHERE slug = ${item.productSlug}`;
        const product = productRes[0] as { price: number; stock_count: number; in_stock: boolean } | undefined;
        if (!product) throw new Error(`Product ${item.name} not found`);
        if (product.in_stock === false) throw new Error(`Product ${item.name} is currently out of stock`);
        
        const variants = await sql`SELECT * FROM product_variants WHERE product_slug = ${item.productSlug}`;
        const variant = variants.find((v: any) => 
          (v.size === item.size || (v.size === null && !item.size)) &&
          (v.color === item.color || (v.color === null && !item.color))
        );
        
        const stockToCheck = Number(variant ? variant.stock_count : product.stock_count);
        if (stockToCheck > -1 && stockToCheck < qty) {
          throw new Error(`Only ${stockToCheck} units left of ${item.name}`.trim());
        }

        const realUnitPrice = Number(variant ? variant.price : product.price);
        serverSubtotal += realUnitPrice * qty;
      } else {
        // Custom print item
        const unitPrice = Math.max(0, Number(item.unitPrice) || 0);
        serverSubtotal += unitPrice * qty;
      }
    }

    // 2. Validate Coupon & Discount Server-Side
    let discount = 0;
    if (data.couponCode) {
      const couponRes = await sql`
        SELECT code, discount_percent, max_uses, current_uses 
        FROM coupons 
        WHERE code = ${data.couponCode.toUpperCase()} 
        AND (expires_at IS NULL OR expires_at > now())
        AND (max_uses IS NULL OR current_uses < max_uses)
      `;
      if (couponRes.length > 0) {
        const c = couponRes[0];
        discount = Math.round((serverSubtotal * Number(c.discount_percent)) / 100);
        // Atomically increment coupon usage
        await sql`
          UPDATE coupons 
          SET current_uses = current_uses + 1 
          WHERE code = ${c.code}
        `;
      }
    }

    // 3. Verified Total Calculation
    const shipping = Math.max(0, Number(data.shipping) || 0);
    const extra = Math.max(0, Number(data.extra) || 0);
    const verifiedTotal = Math.max(0, serverSubtotal - discount + shipping + extra);

    // Prevent client-side price tampering
    if (Math.abs(verifiedTotal - Number(data.total)) > 2 && Number(data.total) < verifiedTotal) {
      throw new Error("Price mismatch detected. Please refresh your cart and try again.");
    }

    const finalTotal = verifiedTotal;
    const finalSubtotal = serverSubtotal;
    const orderNumber = `PRY-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`;

    if (data.paymentMethod === "razorpay" || data.paymentMethod === "online") {
      const amountInPaise = Math.round(finalTotal * 100);

      const rzpOrder = await razorpay.orders.create({
        amount: amountInPaise,
        currency: "INR",
        receipt: `receipt_${Date.now()}`,
      });

      await sql`
        INSERT INTO orders (
          user_id, guest_email, order_number, status, total, subtotal, shipping, extra, 
          items, shipping_address, shipping_method, payment_method, 
          razorpay_order_id, payment_status, notes
        ) VALUES (
          ${context.userId || null}, ${!context.userId ? data.address.email : null}, ${orderNumber}, 'pending', ${finalTotal}, ${finalSubtotal}, ${shipping}, ${extra},
          ${JSON.stringify(data.items)}, ${JSON.stringify(data.address)}, ${data.shippingMethod}, ${data.paymentMethod},
          ${rzpOrder.id}, 'pending', ${data.notes || null}
        )
      `;

      return { orderId: rzpOrder.id, amount: rzpOrder.amount, internalOrderNumber: orderNumber };
    } else {
      // COD or UPI
      await sql`
        INSERT INTO orders (
          user_id, guest_email, order_number, status, total, subtotal, shipping, extra, 
          items, shipping_address, shipping_method, payment_method, 
          payment_status, notes
        ) VALUES (
          ${context.userId || null}, ${!context.userId ? data.address.email : null}, ${orderNumber}, 'pending', ${finalTotal}, ${finalSubtotal}, ${shipping}, ${extra},
          ${JSON.stringify(data.items)}, ${JSON.stringify(data.address)}, ${data.shippingMethod}, ${data.paymentMethod},
          'pending', ${data.notes || null}
        )
      `;

      // Decrement stock for COD/UPI immediately
      for (const item of data.items) {
        if (item.kind === "product" && item.productSlug) {
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
        }
      }

      const email = data.address.email;
      const name = data.address.name;
      if (email) {
        try {
          await sendOrderConfirmationEmail(orderNumber, email, name, {
            items: data.items,
            subtotal: data.subtotal,
            shipping: data.shipping,
            extra: data.extra,
            total: data.total
          });
        } catch (emailErr) {
          console.error("Order placed, but confirmation email failed:", emailErr);
        }
      }

      return { orderId: null, amount: 0, internalOrderNumber: orderNumber };
    }
  });

export const verifyRazorpayPayment = createServerFn({ method: "POST" })
  .middleware([optionalAuthMiddleware])
  .validator((data: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string; internalOrderNumber: string }) => data)
  .handler(async ({ data, context }) => {
    const sql = await getSql();
    
    const hmac = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET || "");
    hmac.update(data.razorpay_order_id + "|" + data.razorpay_payment_id);
    const generatedSignature = hmac.digest("hex");

    if (generatedSignature !== data.razorpay_signature) {
      throw new Error("Invalid signature");
    }

    const orderRes = await sql`SELECT * FROM orders WHERE order_number = ${data.internalOrderNumber}`;
    const order = orderRes[0] as any;
    if (!order) throw new Error("Order not found");

    // Decrement stock upon successful payment
    if (order.items && Array.isArray(order.items)) {
      for (const item of order.items) {
        if (item.kind === "product" && item.productSlug) {
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
        }
      }
    }

    // Update order status to paid
    await sql`
      UPDATE orders 
      SET payment_status = 'paid', razorpay_payment_id = ${data.razorpay_payment_id}, status = 'processing'
      WHERE order_number = ${data.internalOrderNumber}
    `;

    // Fetch user email to send confirmation
    let email = order.guest_email;
    let name = "Customer";

    if (order.shipping_address) {
      email = order.shipping_address.email || email;
      name = order.shipping_address.name || name;
    }

    if (email) {
      await sendOrderConfirmationEmail(data.internalOrderNumber, email, name, {
        items: typeof order.items === 'string' ? JSON.parse(order.items) : order.items,
        subtotal: Number(order.subtotal),
        shipping: Number(order.shipping),
        extra: Number(order.extra),
        total: Number(order.total)
      });
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
  .middleware([optionalAuthMiddleware])
  .validator((data: { id: string; email?: string }) => data)
  .handler(async ({ data, context }) => {
    const sql = await getSql();
    // Assuming 'id' in the route is the order_number
    const res = await sql`SELECT * FROM orders WHERE order_number = ${data.id}`;
    if (res.length === 0) return null;
    const order = res[0] as any;
    
    // 1. If admin, allow full access
    const admin = context.userId ? await verifyAdminRole(context.userId, sql) : null;
    if (admin) {
      return order;
    }

    // 2. If order belongs to an authenticated user
    if (order.user_id) {
      if (order.user_id === context.userId) {
        return order;
      }
      return null;
    }
    
    // 3. Guest order: allow full access if email matches guest email or shipping address
    if (data.email) {
      const inputEmail = data.email.trim().toLowerCase();
      const guestEmail = (order.guest_email || "").trim().toLowerCase();
      let addressEmail = "";
      try {
        const addr = typeof order.shipping_address === "string" ? JSON.parse(order.shipping_address) : order.shipping_address;
        addressEmail = (addr?.email || "").trim().toLowerCase();
      } catch {}
      if (inputEmail === guestEmail || inputEmail === addressEmail) {
        return order;
      }
    }

    // 4. Return sanitized summary without exposing customer PII (address, phone, email)
    return {
      id: order.id,
      order_number: order.order_number,
      status: order.status,
      created_at: order.created_at,
      payment_status: order.payment_status,
      shipping_method: order.shipping_method,
      total: order.total,
      subtotal: order.subtotal,
      shipping: order.shipping,
      extra: order.extra,
      items: order.items,
      is_guest: true,
      requires_email_verification: true,
    };
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

