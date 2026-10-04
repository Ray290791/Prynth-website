import { createServerFn } from "@tanstack/react-start";
import { getSql } from "./db";
import { authMiddleware, optionalAuthMiddleware } from "./auth/middleware";
import { verifyAdminRole, verifyAdminPIN } from "./admin-fns";
import { createRazorpayOrder as rzpCreateOrder, verifyRazorpaySignature, getRazorpayCredentials } from "./razorpay.server";
import { sendOrderConfirmationEmail, sendOrderStatusUpdateEmail } from "./email.server";
import { notifyNewOrder } from "./notifications.server";
import { DEFAULT_MIN_PRINT } from "./quote";
import { getBulkDiscount, type CartItem } from "./cart-store";
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
    }) => data,
  )
  .handler(async ({ data, context }) => {
    const sql = await getSql();

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

    // 1. Inventory & Price Validation from Database
    let serverSubtotal = 0;
    for (const item of data.items) {
      const qty = Math.max(1, Math.min(1000, Math.floor(Number(item.qty) || 1)));
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

    const shipping = Math.max(0, Number(data.shipping) || 0);
    const extra = Math.max(0, Number(data.extra) || 0);
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
      });

      // NOTE: We do NOT insert into `orders` table here!
      // The order is only created if and when the payment succeeds in `verifyRazorpayPayment`.
      // This prevents aborted, failed, or cancelled transactions from polluting the orders list.

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
          payment_status, notes
        ) VALUES (
          ${context.userId || null}, ${!context.userId ? data.address.email : null}, ${orderNumber}, 'pending', ${finalTotal}, ${finalSubtotal}, ${shipping}, ${extra},
          ${JSON.stringify(dbItems)}, ${JSON.stringify(data.address)}, ${data.shippingMethod}, ${data.paymentMethod},
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
    let order: any = null;

    if (orderNumber) {
      const orderRes = await sql`SELECT * FROM orders WHERE order_number = ${orderNumber}`;
      if (orderRes.length > 0) {
        order = orderRes[0];
      }
    }

    if (!order) {
      if (!data.orderPayload) {
        throw new Error("Order details missing for verification");
      }
      const p = data.orderPayload;
      orderNumber = orderNumber || `PRY-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`;

      // Insert order ONLY upon verified successful payment
      const dbItems = sanitizeItemsForDb(p.items);
      await sql`
        INSERT INTO orders (
          user_id, guest_email, order_number, status, total, subtotal, shipping, extra, 
          items, shipping_address, shipping_method, payment_method, 
          razorpay_order_id, razorpay_payment_id, payment_status, notes
        ) VALUES (
          ${context.userId || null}, ${!context.userId ? p.address.email : null}, ${orderNumber}, 'processing', ${p.total}, ${p.subtotal}, ${p.shipping}, ${p.extra},
          ${JSON.stringify(dbItems)}, ${JSON.stringify(p.address)}, ${p.shippingMethod}, 'razorpay',
          ${data.razorpay_order_id}, ${data.razorpay_payment_id}, 'paid', ${p.notes || null}
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

      order = {
        order_number: orderNumber,
        items: p.items,
        shipping_address: p.address,
        guest_email: p.address.email,
        subtotal: p.subtotal,
        shipping: p.shipping,
        extra: p.extra,
        total: p.total,
      };
    } else {
      // Existing row (if any) -> update to paid
      await sql`
        UPDATE orders 
        SET payment_status = 'paid', razorpay_payment_id = ${data.razorpay_payment_id}, status = 'processing'
        WHERE order_number = ${orderNumber}
      `;
    }

    // Decrement stock upon successful payment
    const orderItems = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
    if (orderItems && Array.isArray(orderItems)) {
      for (const item of orderItems) {
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

    // Fetch user email to send confirmation
    let email = order.guest_email;
    let name = "Customer";

    if (order.shipping_address) {
      const addr = typeof order.shipping_address === 'string' ? JSON.parse(order.shipping_address) : order.shipping_address;
      email = addr?.email || email;
      name = addr?.name || name;
    }

    if (email) {
      try {
        await sendOrderConfirmationEmail(orderNumber!, email, name, {
          items: orderItems,
          subtotal: Number(order.subtotal),
          shipping: Number(order.shipping),
          extra: Number(order.extra),
          total: Number(order.total)
        });
      } catch (emErr) {
        console.warn("Failed to send order email:", emErr);
      }
    }

    // Dispatch phone/WhatsApp/Telegram/Email notification to store owner
    try {
      await notifyNewOrder({
        orderNumber: orderNumber!,
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
      console.error("Order verified, but admin notification failed:", notifyErr);
    }

    return { success: true, orderNumber };
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
      } catch (_e) {
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

    // Clean up any failed or abandoned pending Razorpay checkout attempts
    try {
      await sql`
        DELETE FROM orders 
        WHERE payment_method IN ('razorpay', 'online') 
          AND payment_status = 'pending'
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
      } catch (_e) {}

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

