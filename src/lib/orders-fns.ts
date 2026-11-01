import { createServerFn } from "@tanstack/react-start";
import { getSql } from "./db";
import { authMiddleware, optionalAuthMiddleware } from "./auth/middleware";
import { verifyAdminRole, verifyAdminPIN } from "./admin-fns";
import { createRazorpayOrder as rzpCreateOrder, verifyRazorpaySignature, getRazorpayCredentials, refundRazorpayPayment } from "./razorpay.server";
import { sendOrderConfirmationEmail, sendOrderStatusUpdateEmail } from "./email.server";
import { notifyNewOrder } from "./notifications.server";
import { DEFAULT_MIN_PRINT } from "./quote";
import { getBulkDiscount, shippingFee, hasNonCodItems, type CartItem } from "./cart-store";
import { getSiteSettings, fetchSiteSettings, calculateSettledProfit } from "./settings-fns";
import type { Address } from "./orders-store";
import {
  createShiprocketOrder,
  assignShiprocketAWB,
  shiprocketTrackingUrl,
  type ShiprocketOrderPayload,
} from "./shiprocket.server";

/**
 * Protects Neon DB (512 MB free tier) against oversized base64 blobs in orders.items JSONB.
 *
 * Lightweight compressed photos (~30-50 KB) are PRESERVED in the DB so the admin can
 * view customer reference photos and generate lithophane STLs directly from the order.
 *
 * Only excessively large raw blobs (> 250,000 characters, ~180 KB+) are stripped as a fail-safe.
 */
function sanitizeItemsForDb(items: CartItem[]): CartItem[] {
  return items.map((item) => {
    const sanitized = { ...item };
    // Keep item image thumbnail if lightweight (< 150 KB); strip only if excessively large
    if (sanitized.image && sanitized.image.startsWith("data:") && sanitized.image.length > 200000) {
      sanitized.image = undefined;
    }
    // Retain reference photos for lithophanes / custom prints if under size ceiling
    if (sanitized.custom?.referencePhotos) {
      sanitized.custom = {
        ...sanitized.custom,
        referencePhotos: sanitized.custom.referencePhotos.map((p) =>
          p.startsWith("data:") && p.length > 250000 ? "[photo-stripped]" : p
        ),
      };
    }
    return sanitized;
  });
}

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
      utm?: {
        source?: string;
        medium?: string;
        campaign?: string;
        content?: string;
      };
    }) => data,
  )
  .handler(async ({ data, context }) => {
    const sql = await getSql();

    // Opportunistic database maintenance: auto-prunes stale temporary files & guest carts (throttled to once per 4h)
    import("./maintenance.server").then(({ runDatabaseMaintenance }) => runDatabaseMaintenance(sql)).catch(() => {});

    const settings = await fetchSiteSettings(sql);

    // Gate A1: Master Checkout Switch
    if (settings.checkout_enabled !== "true") {
      const err: any = new Error("Customer checkout is currently closed. Join our waitlist to be notified when orders reopen.");
      err.status = 403;
      throw err;
    }

    // Gate A4: Profit Target Auto-Pause
    const profitTarget = parseFloat(settings.profit_target_inr || "10000");
    const profitData = await calculateSettledProfit(sql);
    if (profitData.settledProfit >= profitTarget) {
      await sql`UPDATE site_settings SET value = 'false' WHERE key = 'checkout_enabled'`;
      const logId = "log_" + Date.now().toString(36);
      await sql`
        INSERT INTO admin_audit_logs (id, admin_email, action, details)
        VALUES (${logId}, 'system:profit_target', 'AUTO_PAUSE_PROFIT_TARGET_REACHED', ${JSON.stringify({
          settledProfit: profitData.settledProfit,
          profitTarget,
          timestamp: new Date().toISOString(),
        })})
      `;
      const err: any = new Error("We have reached our production target for this batch. Orders are temporarily paused.");
      err.status = 403;
      throw err;
    }

    // Gate A3: Rolling Daily & Weekly Order Caps in IST
    const maxPerDay = parseInt(settings.max_orders_per_day || "3", 10);
    const maxPerWeek = parseInt(settings.max_orders_per_week || "10", 10);

    const dayRows = await sql<{ count: string }>`
      SELECT COUNT(*)::text as count FROM orders 
      WHERE (payment_status = 'paid' OR payment_method = 'cod') 
        AND status != 'cancelled' 
        AND created_at >= (NOW() - INTERVAL '24 hours')
    `;
    const ordersToday = parseInt(dayRows[0]?.count || "0", 10);
    if (ordersToday >= maxPerDay) {
      const err: any = new Error("Daily order capacity reached. Please join the waitlist for the next release window.");
      err.status = 429;
      throw err;
    }

    const weekRows = await sql<{ count: string }>`
      SELECT COUNT(*)::text as count FROM orders 
      WHERE (payment_status = 'paid' OR payment_method = 'cod') 
        AND status != 'cancelled' 
        AND (created_at AT TIME ZONE 'Asia/Kolkata') >= date_trunc('week', NOW() AT TIME ZONE 'Asia/Kolkata')
    `;
    const ordersThisWeek = parseInt(weekRows[0]?.count || "0", 10);
    if (ordersThisWeek >= maxPerWeek) {
      const err: any = new Error("Weekly order capacity reached. Please join the waitlist for the next release window.");
      err.status = 429;
      throw err;
    }

    // Gate C3: Cash on Delivery Off
    if (data.paymentMethod === "cod" && settings.cod_enabled !== "true") {
      throw new Error("Cash on Delivery is currently unavailable.");
    }

    // Gate C4: Maharashtra Delivery Only (or Allowed Delivery States)
    let allowedStates: string[] = ["Maharashtra"];
    try {
      if (settings.allowed_delivery_states) {
        allowedStates = JSON.parse(settings.allowed_delivery_states);
      }
    } catch {
      allowedStates = ["Maharashtra"];
    }
    const isAllIndia = allowedStates.some((s) => s.toLowerCase() === "all india");
    if (!isAllIndia) {
      const userState = (data.address.state || "").trim().toLowerCase();
      const isStateAllowed = allowedStates.some((s) => s.trim().toLowerCase() === userState);
      if (!isStateAllowed) {
        throw new Error("We currently deliver within Maharashtra only. More states are opening soon.");
      }
    }

    // 0. Payload & Input Integrity Validation
    if (!data.items || !Array.isArray(data.items) || data.items.length === 0) {
      throw new Error("Order must contain at least one item.");
    }
    if (data.items.length > 50) {
      throw new Error("Order cannot contain more than 50 distinct items.");
    }
    if (!data.address || !data.address.name || !data.address.phone || !data.address.line1) {
      throw new Error("Shipping address is incomplete. Please fill out all required fields.");
    }
    if (data.paymentMethod === "cod" && hasNonCodItems(data.items)) {
      throw new Error("Cash on Delivery is unavailable for made-to-order custom prints, lithophanes, or configured pegboards.");
    }

    // 1. Inventory & Price Validation from Database
    let serverSubtotal = 0;
    for (const item of data.items) {
      const qty = Math.max(1, Math.min(1000, Math.floor(Number(item.qty) || 1)));

      // Gate C2: Made-to-order services check
      const isLithophaneItem = item.name?.toLowerCase().includes("lithophane") || item.productSlug?.includes("lithophane") || Boolean((item as any).custom?.isLithophane);
      if (item.kind === "custom") {
        if (isLithophaneItem) {
          if (settings.lithophane_enabled !== "true") {
            throw new Error("Lithophane orders are temporarily closed. Join the waitlist to be notified.");
          }
        } else if (settings.custom_orders_enabled !== "true") {
          throw new Error("Custom 3D printing orders are temporarily closed. Join the waitlist to be notified.");
        }
      }
      if (item.productSlug === "modular-pegboard") {
        if (settings.pegboard_checkout_enabled !== "true") {
          throw new Error("Pegboard orders are temporarily closed. Join the waitlist to be notified.");
        }
      }

      if (item.kind === "product" && item.productSlug) {
        const productRes = await sql`SELECT price, stock_count, in_stock, sellable FROM products WHERE slug = ${item.productSlug}`;
        const product = productRes[0] as { price: number; stock_count: number; in_stock: boolean; sellable?: boolean } | undefined;
        if (!product) throw new Error(`Product ${item.name} not found`);

        // Gate C1: Sellable product allowlist
        if (product.sellable === false) {
          throw new Error(`Product "${item.name}" is not currently available for purchase in this phase.`);
        }

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
        // Custom print item: enforce minimum print threshold to prevent client price tampering
        const unitPrice = Math.max(DEFAULT_MIN_PRINT, Math.round(Number(item.unitPrice) || DEFAULT_MIN_PRINT));
        serverSubtotal += unitPrice * qty;
      }
    }

    // 2. Validate Coupon & Discount Server-Side
    const isOnline = data.paymentMethod === "razorpay" || data.paymentMethod === "online";

    // 2. Validate Bulk Volume & Coupon Discount Server-Side
    const bulkDiscountInfo = getBulkDiscount(data.items);
    const bulkDiscount = Math.round((serverSubtotal * bulkDiscountInfo.percent) / 100);

    let couponDiscount = 0;
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
        couponDiscount = Math.round(((serverSubtotal - bulkDiscount) * Number(c.discount_percent)) / 100);
        // Atomically increment coupon usage only for COD/UPI immediately. For online, increment on verified payment.
        if (!isOnline) {
          await sql`
            UPDATE coupons 
            SET current_uses = current_uses + 1 
            WHERE code = ${c.code}
          `;
        }
      }
    }

    const discount = bulkDiscount + couponDiscount;

    // settings already loaded at top of handler
    const freeThreshold = Number(settings.free_shipping_threshold || 399);
    const standardFee = Number(settings.standard_shipping_fee || 79);
    const expressFee = Number(settings.express_shipping_fee || 189);
    const codFee = Number(settings.cod_fee || 39);
    const shippingRates = {
      freeThreshold,
      standardFee,
      expressFee,
      codFee,
      pincode: (data.address as any)?.pincode || (data.address as any)?.pin,
    };

    const shipping = shippingFee(serverSubtotal - discount, data.shippingMethod as "standard" | "express", shippingRates);
    const extra = data.paymentMethod === "cod" ? codFee : 0;
    const verifiedTotal = Math.max(0, serverSubtotal - discount + shipping + extra);

    if (verifiedTotal > 500000) {
      throw new Error("Order exceeds maximum single checkout limit (₹5,00,000).");
    }

    // Prevent client-side price tampering
    if (Math.abs(verifiedTotal - Number(data.total)) > 2 && Number(data.total) < verifiedTotal) {
      throw new Error("Price mismatch detected. Please refresh your cart and try again.");
    }

    const finalTotal = verifiedTotal;
    const finalSubtotal = serverSubtotal;
    const orderNumber = `PRY-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`;

    if (isOnline) {
      const amountInPaise = Math.round(finalTotal * 100);

      const rzpOrder = await rzpCreateOrder({
        amount: amountInPaise,
        currency: "INR",
        receipt: `receipt_${Date.now()}`,
        notes: {
          internal_order_number: orderNumber,
        },
      });

      // Insert order in 'pending' status so that if the customer completes payment
      // and closes the tab, the Razorpay webhook can immediately match and fulfill it.
      const dbItems = sanitizeItemsForDb(data.items);
      await sql`
        INSERT INTO orders (
          user_id, guest_email, order_number, status, total, subtotal, shipping, extra, 
          items, shipping_address, shipping_method, payment_method, 
          razorpay_order_id, payment_status, notes,
          utm_source, utm_medium, utm_campaign, utm_content
        ) VALUES (
          ${context.userId || null}, ${!context.userId ? data.address.email : null}, ${orderNumber}, 'pending', ${finalTotal}, ${finalSubtotal}, ${shipping}, ${extra},
          ${JSON.stringify(dbItems)}, ${JSON.stringify(data.address)}, ${data.shippingMethod}, 'razorpay',
          ${rzpOrder.id}, 'pending', ${data.notes || null},
          ${data.utm?.source || null}, ${data.utm?.medium || null}, ${data.utm?.campaign || null}, ${data.utm?.content || null}
        )
      `;

      const { keyId: rzpKeyId, checkoutConfigId } = await getRazorpayCredentials();

      return {
        orderId: rzpOrder.id,
        amount: rzpOrder.amount,
        internalOrderNumber: orderNumber,
        keyId: rzpKeyId,
        checkoutConfigId,
      };
    } else {
      // COD or UPI
      const dbItems = sanitizeItemsForDb(data.items);
      await sql`
        INSERT INTO orders (
          user_id, guest_email, order_number, status, total, subtotal, shipping, extra, 
          items, shipping_address, shipping_method, payment_method, 
          payment_status, notes,
          utm_source, utm_medium, utm_campaign, utm_content
        ) VALUES (
          ${context.userId || null}, ${!context.userId ? data.address.email : null}, ${orderNumber}, 'pending', ${finalTotal}, ${finalSubtotal}, ${shipping}, ${extra},
          ${JSON.stringify(dbItems)}, ${JSON.stringify(data.address)}, ${data.shippingMethod}, ${data.paymentMethod},
          'pending', ${data.notes || null},
          ${data.utm?.source || null}, ${data.utm?.medium || null}, ${data.utm?.campaign || null}, ${data.utm?.content || null}
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

      // Dispatch phone/WhatsApp/Telegram/Email notification to store owner
      try {
        await notifyNewOrder({
          orderNumber,
          name: data.address.name,
          email: data.address.email,
          phone: data.address.phone,
          total: data.total,
          paymentMethod: data.paymentMethod,
          items: data.items.map((i) => ({
            name: i.name,
            qty: i.qty,
            color: i.color,
            size: i.size,
            custom: i.custom,
          })),
          shippingAddress: `${data.address.line1}, ${data.address.city}, ${data.address.state} - ${data.address.pincode}`,
        });
      } catch (notifyErr) {
        console.error("Order placed, but admin notification failed:", notifyErr);
      }

      return { orderId: null, amount: 0, internalOrderNumber: orderNumber };
    }
  });

export const verifyRazorpayPayment = createServerFn({ method: "POST" })
  .middleware([optionalAuthMiddleware])
  .validator((data: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
    internalOrderNumber?: string;
    orderPayload?: {
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
    };
  }) => data)
  .handler(async ({ data, context }) => {
    const sql = await getSql();
    
    const isValid = await verifyRazorpaySignature(
      data.razorpay_order_id,
      data.razorpay_payment_id,
      data.razorpay_signature,
    );
    if (!isValid) {
      throw new Error("Invalid signature");
    }

    let orderNumber = data.internalOrderNumber;

    // Check if order exists in DB
    const orderRes = await sql`
      SELECT * FROM orders 
      WHERE (razorpay_order_id = ${data.razorpay_order_id} AND razorpay_order_id IS NOT NULL)
         OR (order_number = ${orderNumber} AND order_number IS NOT NULL)
      LIMIT 1
    `;

    // Fallback: If pending order was not pre-inserted, insert it now from orderPayload
    if (orderRes.length === 0 && data.orderPayload) {
      const p = data.orderPayload;
      orderNumber = orderNumber || `PRY-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`;
      const dbItems = sanitizeItemsForDb(p.items);
      await sql`
        INSERT INTO orders (
          user_id, guest_email, order_number, status, total, subtotal, shipping, extra, 
          items, shipping_address, shipping_method, payment_method, 
          razorpay_order_id, razorpay_payment_id, payment_status, notes
        ) VALUES (
          ${context.userId || null}, ${!context.userId ? p.address.email : null}, ${orderNumber}, 'pending', ${p.total}, ${p.subtotal}, ${p.shipping}, ${p.extra},
          ${JSON.stringify(dbItems)}, ${JSON.stringify(p.address)}, ${p.shippingMethod}, 'razorpay',
          ${data.razorpay_order_id}, ${data.razorpay_payment_id}, 'pending', ${p.notes || null}
        )
      `;

      // Atomically consume coupon if used
      if (p.couponCode) {
        try {
          await sql`
            UPDATE coupons 
            SET current_uses = current_uses + 1 
            WHERE code = ${p.couponCode.toUpperCase()}
          `;
        } catch (cErr) {
          console.warn("Coupon increment skipped:", cErr);
        }
      }
    }

    // Idempotently confirm payment via server helper
    const { confirmOrderPaymentIdempotent } = await import("./order-confirmation.server");
    const result = await confirmOrderPaymentIdempotent({
      razorpayOrderId: data.razorpay_order_id,
      razorpayPaymentId: data.razorpay_payment_id,
      orderNumber,
      sqlInstance: sql,
    });

    return { success: true, orderNumber: result.orderNumber || orderNumber };
  });

export const getUserOrders = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const res = await sql`
      SELECT * FROM orders 
      WHERE user_id = ${context.userId} 
        AND NOT (payment_method IN ('razorpay', 'online') AND payment_status = 'pending')
      ORDER BY created_at DESC
    `;
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
      } catch {
        // Ignore json parse error and proceed with available fields
      }
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

    // Clean up any failed or abandoned pending Razorpay checkout attempts older than 2 hours
    try {
      await sql`
        DELETE FROM orders 
        WHERE payment_method IN ('razorpay', 'online') 
          AND payment_status = 'pending'
          AND created_at < NOW() - INTERVAL '2 hours'
      `;
    } catch (e) {
      console.warn("Failed to cleanup pending razorpay orders:", e);
    }

    const res = await sql`
      SELECT orders.*, "user".email as user_email, "user".name as user_name 
      FROM orders 
      LEFT JOIN "user" ON orders.user_id = "user".id 
      WHERE NOT (orders.payment_method IN ('razorpay', 'online') AND orders.payment_status = 'pending')
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

    // Fetch customer email to send update — supports both registered users and guests
    const orderRes = await sql`
      SELECT orders.guest_email, orders.shipping_address, "user".email as user_email, "user".name as user_name 
      FROM orders 
      LEFT JOIN "user" ON orders.user_id = "user".id 
      WHERE orders.order_number = ${data.order_number}
    `;
    
    if (orderRes.length > 0) {
      const row = orderRes[0];
      let addressEmail = "";
      let addressName = "";
      try {
        const addr = typeof row.shipping_address === "string" ? JSON.parse(row.shipping_address) : row.shipping_address;
        addressEmail = addr?.email || "";
        addressName = addr?.name || "";
      } catch {
        // Ignore parse error
      }

      const recipientEmail = String(row.user_email || row.guest_email || addressEmail || "").trim();
      const recipientName = String(row.user_name || addressName || "Customer").trim();

      if (recipientEmail) {
        try {
          await sendOrderStatusUpdateEmail(data.order_number, recipientEmail, data.status);
          console.log(`[Status Email] Notification sent to ${recipientName} (${recipientEmail}): Your order ${data.order_number} is now ${data.status}.`);
        } catch (emailErr) {
          console.error("Failed to send order status update email:", emailErr);
        }
      }
    }

    return { success: true };
  });

export const triggerDatabaseMaintenance = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const admin = await verifyAdminRole(context.userId, sql);
    if (!admin) throw new Error("Unauthorized");

    const { runDatabaseMaintenance } = await import("./maintenance.server");
    const report = await runDatabaseMaintenance(sql, true);
    return { success: true, report };
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

// ─── Shiprocket: create shipment & assign AWB ─────────────────────────────────
export const shipWithShiprocket = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    (data: {
      order_number: string;
      /** Name of the pickup location configured in your Shiprocket account */
      pickup_location: string;
      /** Dimensional weight details */
      length_cm: number;
      breadth_cm: number;
      height_cm: number;
      weight_kg: number;
      /** Optional: force a specific courier company ID */
      courier_id?: number;
    }) => data
  )
  .handler(async ({ data, context }) => {
    const sql = await getSql();

    // Verify admin
    const admin = await verifyAdminRole(context.userId, sql);
    if (!admin) throw new Error("Unauthorized");

    // Gate D4: Check dispatch address from settings
    const settings = await fetchSiteSettings(sql);
    const pickupLocation = (data.pickup_location || settings.shiprocket_pickup_location)?.trim();
    const pickupAddress = settings.shiprocket_pickup_address?.trim();
    if (!pickupAddress && !pickupLocation) {
      throw new Error(
        "Courier booking blocked: Shiprocket pickup dispatch address is not configured. Please set your studio pickup dispatch address in Admin Settings before booking courier dispatch."
      );
    }

    // Fetch order
    const orderRes = await sql`SELECT * FROM orders WHERE order_number = ${data.order_number}`;
    if (orderRes.length === 0) throw new Error("Order not found");
    const order = orderRes[0] as any;

    if (order.tracking_number) {
      throw new Error(
        `This order already has a tracking number: ${order.tracking_number}. ` +
        "Cancel the existing shipment in Shiprocket first if you need to re-ship."
      );
    }

    const addr: Address =
      typeof order.shipping_address === "string"
        ? JSON.parse(order.shipping_address)
        : order.shipping_address;

    const items: CartItem[] =
      typeof order.items === "string" ? JSON.parse(order.items) : order.items;

    // Build order_items for Shiprocket
    const shiprocketItems = items.map((item) => ({
      name: item.name,
      sku: item.productSlug || `custom-${item.id}`,
      units: item.qty,
      selling_price: item.unitPrice,
    }));

    const payload: ShiprocketOrderPayload = {
      order_id: order.order_number,
      order_date: new Date(order.created_at || Date.now()).toISOString().replace("T", " ").slice(0, 19),
      pickup_location: data.pickup_location,

      billing_customer_name: addr.name,
      billing_address: addr.line1,
      billing_address_2: addr.line2 || "",
      billing_city: addr.city,
      billing_pincode: addr.pincode,
      billing_state: addr.state,
      billing_country: "India",
      billing_email: addr.email,
      billing_phone: addr.phone,

      shipping_is_billing: true,

      order_items: shiprocketItems,
      payment_method:
        order.payment_method === "cod" ? "COD" : "Prepaid",
      sub_total: Number(order.subtotal),

      length: data.length_cm,
      breadth: data.breadth_cm,
      height: data.height_cm,
      weight: data.weight_kg,
    };

    // 1. Create forward order in Shiprocket
    const srOrder = await createShiprocketOrder(payload);

    // 2. Assign AWB (auto-assign best courier unless caller specifies one)
    const awbRes = await assignShiprocketAWB(
      srOrder.shipment_id,
      data.courier_id
    );

    const awbData = awbRes.response?.data;
    const awbCode = awbData?.awb_code || awbRes.response?.awb_code || srOrder.awb_code || "";
    const courierName = awbData?.courier_name || awbRes.response?.courier_name || "";
    const trackingUrl = awbCode ? shiprocketTrackingUrl(awbCode) : "";

    // 3. Persist tracking info + auto-mark as shipped
    await sql`
      UPDATE orders
      SET
        shiprocket_order_id  = ${String(srOrder.order_id)},
        shiprocket_shipment_id = ${String(srOrder.shipment_id)},
        tracking_number      = ${awbCode || null},
        tracking_url         = ${trackingUrl || null},
        courier_name         = ${courierName || null},
        status               = 'shipped'
      WHERE order_number = ${data.order_number}
    `;

    // 4. Notify the customer
    try {
      const customerEmail =
        order.guest_email ||
        (typeof order.shipping_address === "string"
          ? JSON.parse(order.shipping_address)?.email
          : order.shipping_address?.email);
      if (customerEmail) {
        await sendOrderStatusUpdateEmail(data.order_number, customerEmail, "shipped");
      }
    } catch (emailErr) {
      console.warn("Shiprocket: customer notification failed:", emailErr);
    }

    return {
      success: true,
      shiprocket_order_id: srOrder.order_id,
      shipment_id: srOrder.shipment_id,
      awb_code: awbCode,
      courier_name: courierName,
      tracking_url: trackingUrl,
    };
  });

export const updateOrderTrackingAdmin = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    (data: {
      order_number: string;
      tracking_number: string;
      courier_name?: string;
      tracking_url?: string;
      mark_as_shipped?: boolean;
    }) => data
  )
  .handler(async ({ data, context }) => {
    const sql = await getSql();
    const admin = await verifyAdminRole(context.userId, sql);
    if (!admin) throw new Error("Unauthorized");

    const trackUrl =
      data.tracking_url?.trim() ||
      (data.courier_name?.toLowerCase().includes("delhivery")
        ? `https://www.delhivery.com/track/package/${data.tracking_number.trim()}`
        : data.courier_name?.toLowerCase().includes("bluedart")
        ? `https://www.bluedart.com/tracking?trackNumber=${data.tracking_number.trim()}`
        : data.courier_name?.toLowerCase().includes("indiapost") || data.courier_name?.toLowerCase().includes("speed post")
        ? `https://www.indiapost.gov.in/_layouts/15/dop.portal.tracking/trackconsignment.aspx`
        : null);

    if (data.mark_as_shipped) {
      await sql`
        UPDATE orders
        SET
          tracking_number = ${data.tracking_number.trim()},
          courier_name    = ${data.courier_name?.trim() || null},
          tracking_url    = ${trackUrl},
          status          = 'shipped'
        WHERE order_number = ${data.order_number}
      `;
    } else {
      await sql`
        UPDATE orders
        SET
          tracking_number = ${data.tracking_number.trim()},
          courier_name    = ${data.courier_name?.trim() || null},
          tracking_url    = ${trackUrl}
        WHERE order_number = ${data.order_number}
      `;
    }

    if (data.mark_as_shipped) {
      try {
        const orderRows = await sql<{ guest_email?: string; shipping_address?: any }>`
          SELECT guest_email, shipping_address FROM orders WHERE order_number = ${data.order_number}
        `;
        const order = orderRows[0];
        const customerEmail =
          order?.guest_email ||
          (typeof order?.shipping_address === "string"
            ? JSON.parse(order.shipping_address)?.email
            : order?.shipping_address?.email);
        if (customerEmail) {
          await sendOrderStatusUpdateEmail(data.order_number, customerEmail, "shipped");
        }
      } catch (err) {
        console.warn("Manual tracking email notification skipped:", err);
      }
    }

    return {
      success: true,
      tracking_number: data.tracking_number.trim(),
      courier_name: data.courier_name?.trim() || null,
      tracking_url: trackUrl,
    };
  });

/**
 * Admin Refund Endpoint (D3)
 * Full or partial refund with Razorpay integration, notes timeline, and ledger update.
 */
export const refundOrderAdmin = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    (data: {
      order_id: number;
      amount_inr: number;
      reason: string;
      category?: "defect" | "delay" | "transit_damage" | "other";
    }) => data
  )
  .handler(async ({ data, context }) => {
    const sql = await getSql();
    const admin = await verifyAdminRole(context.userId, sql);
    if (!admin) throw new Error("Unauthorized");

    const orderRows = await sql<any>`SELECT * FROM orders WHERE id = ${data.order_id} LIMIT 1`;
    if (orderRows.length === 0) throw new Error("Order not found");
    const order = orderRows[0];

    const currentRefund = Number(order.refund_amount) || 0;
    const orderTotal = Number(order.total) || 0;
    const refundAmount = Number(data.amount_inr);

    if (isNaN(refundAmount) || refundAmount <= 0) {
      throw new Error("Refund amount must be greater than ₹0.");
    }

    if (currentRefund + refundAmount > orderTotal + 0.01) {
      throw new Error(
        `Refund exceeds maximum permissible amount. Order total is ₹${orderTotal}, already refunded ₹${currentRefund}.`
      );
    }

    let rzpRefundId: string | null = null;
    // Call Razorpay refund API if payment was online and has payment ID
    if (order.razorpay_payment_id) {
      try {
        const refundResult = await refundRazorpayPayment({
          paymentId: order.razorpay_payment_id,
          amountPaise: Math.round(refundAmount * 100),
          notes: {
            order_number: order.order_number,
            reason: data.reason,
            admin: admin.email || "admin",
          },
        });
        rzpRefundId = refundResult.id;
      } catch (err: any) {
        console.error("Razorpay refund error:", err);
        throw new Error(`Razorpay refund failed: ${err.message || String(err)}`);
      }
    }

    const newRefundTotal = currentRefund + refundAmount;
    const isFullRefund = newRefundTotal >= orderTotal - 0.5;

    const noteEntry = {
      id: "note_" + Date.now().toString(36),
      type: "refund",
      category: data.category || "other",
      amount: refundAmount,
      reason: data.reason,
      razorpay_refund_id: rzpRefundId,
      created_at: new Date().toISOString(),
      created_by: admin.email || "admin",
    };

    const currentTimeline = Array.isArray(order.notes_timeline) ? order.notes_timeline : [];
    const updatedTimeline = [...currentTimeline, noteEntry];

    await sql`
      UPDATE orders
      SET
        refund_amount = ${newRefundTotal},
        payment_status = ${isFullRefund ? "refunded" : order.payment_status},
        notes_timeline = ${JSON.stringify(updatedTimeline)}::jsonb
      WHERE id = ${order.id}
    `;

    // Audit log
    const auditId = "log_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 6);
    await sql`
      INSERT INTO admin_audit_logs (id, admin_email, action, details)
      VALUES (
        ${auditId},
        ${admin.email || "admin"},
        'ORDER_REFUND',
        ${JSON.stringify({
          order_number: order.order_number,
          amount: refundAmount,
          reason: data.reason,
          rzp_refund_id: rzpRefundId,
          timestamp: new Date().toISOString(),
        })}
      )
    `;

    // Send customer email update
    try {
      const customerEmail =
        order.guest_email ||
        (typeof order.shipping_address === "string"
          ? JSON.parse(order.shipping_address)?.email
          : order.shipping_address?.email);
      if (customerEmail) {
        await sendOrderStatusUpdateEmail(order.order_number, customerEmail, "refunded");
      }
    } catch (e) {
      console.warn("Refund customer email skipped:", e);
    }

    return {
      success: true,
      refundedAmount: refundAmount,
      totalRefunded: newRefundTotal,
      isFullRefund,
      razorpayRefundId: rzpRefundId,
    };
  });

/**
 * Admin Timeline Note Endpoint (D3)
 * Adds an issue or operational note (defect, delay, transit damage, general) to order.
 */
export const addOrderNoteAdmin = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    (data: {
      order_id: number;
      category: "defect" | "delay" | "transit_damage" | "general";
      note: string;
    }) => data
  )
  .handler(async ({ data, context }) => {
    const sql = await getSql();
    const admin = await verifyAdminRole(context.userId, sql);
    if (!admin) throw new Error("Unauthorized");

    const orderRows = await sql<any>`SELECT notes_timeline FROM orders WHERE id = ${data.order_id} LIMIT 1`;
    if (orderRows.length === 0) throw new Error("Order not found");

    const currentTimeline = Array.isArray(orderRows[0].notes_timeline) ? orderRows[0].notes_timeline : [];
    const noteEntry = {
      id: "note_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 6),
      type: "note",
      category: data.category,
      note: data.note,
      created_at: new Date().toISOString(),
      created_by: admin.email || "admin",
    };

    const updatedTimeline = [...currentTimeline, noteEntry];

    await sql`
      UPDATE orders
      SET notes_timeline = ${JSON.stringify(updatedTimeline)}::jsonb
      WHERE id = ${data.order_id}
    `;

    return { success: true, note: noteEntry };
  });

/**
 * Admin Machine-Time Production Logs (D2)
 */
export const getOrderItemProductionLogsAdmin = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator((orderId: number) => orderId)
  .handler(async ({ data: orderId, context }) => {
    const sql = await getSql();
    const admin = await verifyAdminRole(context.userId, sql);
    if (!admin) throw new Error("Unauthorized");

    const rows = await sql<any>`
      SELECT * FROM order_item_production_logs 
      WHERE order_id = ${orderId} 
      ORDER BY item_index ASC, created_at ASC
    `;
    return rows;
  });

export const saveOrderItemProductionLogAdmin = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    (data: {
      order_id: number;
      item_index: number;
      item_name?: string;
      printer_label?: string;
      print_minutes?: number;
      filament_grams?: number;
      printed_by?: string;
      qc_passed?: boolean;
      notes?: string;
    }) => data
  )
  .handler(async ({ data, context }) => {
    const sql = await getSql();
    const admin = await verifyAdminRole(context.userId, sql);
    if (!admin) throw new Error("Unauthorized");

    const logId = "prod_" + data.order_id + "_" + data.item_index;

    await sql`
      INSERT INTO order_item_production_logs (
        id, order_id, item_index, item_name, printer_label, print_minutes, 
        filament_grams, printed_by, qc_passed, notes
      ) VALUES (
        ${logId}, ${data.order_id}, ${data.item_index}, ${data.item_name || null},
        ${data.printer_label || null}, ${data.print_minutes || 0}, ${data.filament_grams || 0},
        ${data.printed_by || admin.email || "admin"}, ${data.qc_passed ?? true}, ${data.notes || null}
      )
      ON CONFLICT (id) DO UPDATE SET
        printer_label = EXCLUDED.printer_label,
        print_minutes = EXCLUDED.print_minutes,
        filament_grams = EXCLUDED.filament_grams,
        printed_by = EXCLUDED.printed_by,
        qc_passed = EXCLUDED.qc_passed,
        notes = EXCLUDED.notes
    `;

    return { success: true };
  });

/**
 * Admin Settlement & Ledger Operations (D1)
 */
export const toggleOrderSettledAdmin = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    (data: {
      order_id: number;
      settled: boolean;
      courier_actual_cost?: number;
      payment_fee_actual?: number;
    }) => data
  )
  .handler(async ({ data, context }) => {
    const sql = await getSql();
    const admin = await verifyAdminRole(context.userId, sql);
    if (!admin) throw new Error("Unauthorized");

    const settledDate = data.settled ? new Date().toISOString() : null;

    await sql`
      UPDATE orders
      SET
        settled = ${data.settled},
        settled_date = ${settledDate},
        courier_actual_cost = COALESCE(${data.courier_actual_cost ?? null}, courier_actual_cost),
        payment_fee_actual = COALESCE(${data.payment_fee_actual ?? null}, payment_fee_actual)
      WHERE id = ${data.order_id}
    `;

    return { success: true };
  });

export const addOrderAdjustmentAdmin = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: { order_id?: number; reason: string; amount_inr: number }) => data)
  .handler(async ({ data, context }) => {
    const sql = await getSql();
    const admin = await verifyAdminRole(context.userId, sql);
    if (!admin) throw new Error("Unauthorized");

    const id = "adj_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 6);

    await sql`
      INSERT INTO order_adjustments (id, order_id, reason, amount_inr, created_by)
      VALUES (${id}, ${data.order_id || null}, ${data.reason}, ${data.amount_inr}, ${admin.email || "admin"})
    `;

    return { success: true, id };
  });

export const deleteOrderAdjustmentAdmin = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((id: string) => id)
  .handler(async ({ data: id, context }) => {
    const sql = await getSql();
    const admin = await verifyAdminRole(context.userId, sql);
    if (!admin) throw new Error("Unauthorized");

    await sql`DELETE FROM order_adjustments WHERE id = ${id}`;
    return { success: true };
  });

export const getLaunchLedgerAdmin = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const admin = await verifyAdminRole(context.userId, sql);
    if (!admin) throw new Error("Unauthorized");

    return calculateSettledProfit(sql);
  });



