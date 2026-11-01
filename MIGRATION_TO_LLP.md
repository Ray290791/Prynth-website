# Runbook: Migrating Prynth! from Interim Selling Phase to LLP

*Prepared: November 2026 for prynth.in*
*Reference: Prynth! Interim Selling Phase — Agent Change List (Item F2)*

---

## 1. Objective & Trigger Conditions

During the interim phase, Prynth operates as an unregistered maker business run by two co-founders in Mumbai selling a constrained catalog within Maharashtra. Customer checkout auto-pauses when settled raw profit reaches the target (**₹10,000** by default) or when the founders choose to pause sales.

Once this milestone is reached:
1. Sales remain paused (`checkout_enabled = false`).
2. Pending orders are manufactured, quality checked, and delivered.
3. The co-founders complete the LLP incorporation process with the Ministry of Corporate Affairs (MCA) and obtain a GSTIN.
4. Execute this runbook to transition all systems from personal accounts to the new corporate entity.

---

## 2. Transition Checklist

### Phase 1: Corporate Incorporation & Banking
- [ ] **MCA Incorporation**: File FiLLiP form on MCA portal for LLP Name Reservation and Incorporation.
- [ ] **PAN & TAN**: Obtain PAN and TAN cards issued in the name of the LLP.
- [ ] **LLP Agreement**: Draft, execute on stamp paper, and file Form 3 with the Registrar of Companies (within 30 days).
- [ ] **Current Bank Account**: Open a commercial current bank account in the name of the LLP with net banking, debit card, and UPI ID.
- [ ] **GST Registration**: Register for Goods and Services Tax (GST) in Maharashtra. Receive GSTIN certificate.
- [ ] **Udyam Registration**: Register on MSME Udyam portal for manufacturing classification benefits.

---

### Phase 2: Payment Gateway & Financial Infrastructure

#### 2.1 Razorpay Business Account
> [!IMPORTANT]
> Do not attempt to re-use or re-verify a personal Razorpay account for the LLP. Create a fresh merchant account or initiate an official Account Ownership Transfer in the Razorpay Dashboard.

1. Sign up for a **Razorpay Business Account** under the LLP name.
2. Upload statutory documents:
   - Certificate of Incorporation (COI)
   - LLP Agreement
   - PAN card of the LLP
   - PAN & Aadhaar of both Designated Partners
   - Cancelled cheque or bank statement of the LLP current account
   - GSTIN Certificate
3. Once KYC is approved, switch to **Live Mode** in the Razorpay Dashboard.
4. Generate new **Live API Keys** (`Key ID` and `Key Secret`).
5. Configure the Webhook Endpoint:
   - URL: `https://prynth.in/api/razorpay/webhook`
   - Active Events: `order.paid`, `payment.captured`, `payment.failed`, `refund.processed`
   - Secret: Copy the generated Webhook Secret.
6. Update credentials in Cloudflare Workers and Site Settings:
   - `RAZORPAY_KEY_ID`: `rzp_live_...`
   - `RAZORPAY_KEY_SECRET`: Update in Admin Site Settings or via `npx wrangler secret put RAZORPAY_KEY_SECRET`.
   - `RAZORPAY_WEBHOOK_SECRET`: Update via `npx wrangler secret put RAZORPAY_WEBHOOK_SECRET`.

---

### Phase 3: Site Settings & Legal Identity Configuration

Navigate to **Admin Console → Site Settings** and update the following settings:

| Setting Key | Value for LLP Phase | Where It Appears |
| :--- | :--- | :--- |
| `legal_name` | Full registered LLP name (e.g., `Prynth 3D Creations LLP`) | `/legal`, receipts, footer, JSON-LD |
| `legal_entity_type` | `Limited Liability Partnership (LLP)` | `/legal`, statutory notices |
| `legal_director_name` | Names of Designated Partners (e.g., `Ray Kapadia & Supas Kumar, Designated Partners`) | `/legal`, public disclosures |
| `legal_registered_address` | Full official registered office address as per MCA | `/legal`, receipts, shipping policy |
| `legal_gstin` | 15-character GSTIN (e.g., `27AAAAA0000A1Z5`) | Tax invoices, `/legal`, receipts |
| `invoice_mode` | Change from `receipt` to `tax_invoice` | Order download button & customer emails |
| `seller_display_name` | `Prynth` or `Prynth 3D Creations LLP` | Storefront headers, metadata |
| `seller_city` | `Mumbai` | Receipts, shipping policy |
| `seller_state` | `Maharashtra` | Tax calculations, shipping policy |
| `seller_address` | Registered office or workshop operating address | Store disclosures |
| `seller_email` | Official domain email (e.g., `hello@prynth.in`) | Customer receipts & support |
| `grievance_officer_name` | Appointed Designated Partner or Grievance Officer | `/legal`, `/contact`, DPDP compliance |
| `grievance_officer_email` | `grievance@prynth.in` | Legal pages & grievance portal |
| `grievance_officer_phone` | Dedicated customer care / grievance phone number | `/legal`, statutory compliance |
| `allowed_delivery_states` | Update from `["Maharashtra"]` to `["All India"]` | Checkout address validation |

---

### Phase 4: Logistics & Courier Setup

1. **Shiprocket Business Account**:
   - Update Shiprocket account details to the LLP entity with GSTIN to claim Input Tax Credit on freight charges.
   - Configure pickup locations:
     - Setting `shiprocket_pickup_location`: Matches warehouse name in Shiprocket.
     - Setting `shiprocket_pickup_pincode`: Workshop PIN code.
     - Setting `shiprocket_pickup_address`: Physical studio dispatch address (unlocks automated courier booking).
2. Set courier rules and packaging dimensions in Shiprocket dashboard.

---

### Phase 5: Email & Domain Infrastructure

1. **Resend / Domain DNS**:
   - Verify billing in Resend is migrated to the LLP corporate card.
   - Verify SPF, DKIM, and DMARC records for `prynth.in` on your DNS provider (Cloudflare).
   - Ensure `resend_from_email` is set to `Prynth <orders@prynth.in>` or `Prynth <hello@prynth.in>`.
2. **Domain Ownership**:
   - Update domain WHOIS registrant contact at Cloudflare Registrar / Namecheap to the LLP name.

---

### Phase 6: Legal Pages & Public Disclosures

1. **Terms & Conditions (`/legal`)**:
   - Confirm governing law clause reflects Mumbai jurisdiction under the Limited Liability Partnership Act, 2008.
   - Ensure the entity name is updated in the preamble.
2. **Privacy Policy (`/privacy`)**:
   - Confirm Data Fiduciary name reflects the registered LLP.
   - Verify DPDP Act (2023) disclosures reference the Grievance Officer's official contact.
3. **Structured Data / JSON-LD (`src/routes/__root.tsx`)**:
   - Verify `Organization` schema references the LLP legal name, official address, and founders.

---

### Phase 7: Opening All-India Live Checkout

Once all previous steps are complete and verified in test mode:
1. Run full verification suite (`npm test`, `npm run typecheck`, `npm run build`).
2. Log in to the Admin Console as Super Admin.
3. Open **Site Settings → Customer Checkout Master Switch**.
4. Confirm Razorpay shows **Live Gateway Keys** with green badge.
5. Click **Open Customer Checkout**, type **`OPEN CHECKOUT`** into the confirmation modal, and submit.
6. Verify live customer checkout is accessible and orders flow into the new LLP bank account.

