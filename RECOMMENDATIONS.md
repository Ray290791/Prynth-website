# Feature Recommendations & Product Roadmap — prynth!

**Document Version:** 2.1 (Tailored for Unregistered Micro-Enterprise / Independent Studio)  
**Target:** prynth! (`https://prynth.in`)  
**Scope:** Actionable feature additions, conversion optimizations, and growth initiatives for the business owner.

---

## Tax & Regulatory Context (Important)

> [!NOTE]
> **Current Business Status: Non-GST Registered Independent Studio**  
> Under Section 32 of the Central Goods & Services Tax (CGST) Act, an unregistered business **cannot collect GST, charge tax line items (CGST/SGST/IGST), or issue a "Tax Invoice" for Input Tax Credit (ITC)**.  
> 
> **Advantages for prynth!:**
> - **100% Flat & Transparent Pricing:** What customers see on product cards and in the custom quote tool is the exact amount they pay. Zero surprise taxes added at checkout.
> - **Simpler Compliance:** No monthly GSTR-1/GSTR-3B filings or reverse-charge reconciliation needed while annual turnover remains below the ₹40 Lakh threshold for goods.
> - **Commercial Expense Receipts:** Businesses and college labs can still purchase from you and claim payments as allowable business expenses using a standard Commercial Bill / Receipt bearing your trade name and PAN.
>
> *(When your business crosses ₹40 Lakhs annual turnover or voluntarily registers for GST in the future, formal GSTIN collection and B2B tax invoicing can be enabled at that time.)*

---

## At a Glance: Feature Recommendations Matrix

| # | Recommended Feature | Target Location | Business Impact | Effort Level |
| :---: | :--- | :--- | :--- | :---: |
| **1** | **Dynamic WhatsApp Support with Pre-Filled Inquiries** | Site-wide button & Product Pages | High (+25% inbound custom quote leads) | 1 Day |
| **2** | **Pincode Delivery Date Estimator** | Product Detail Pages & Cart Drawer | Medium-High (+12% checkout conversion) | 2 Days |
| **3** | **Sticky Mobile "Add to Cart" Bar** | Mobile PDP & Pegboard Configurator | Medium (+10% mobile checkout starts) | 1 Day |
| **4** | **Company / Institution Name on Commercial Receipts** | Checkout Page (`/checkout`) | Medium (Allows company expense reimbursement) | 1 Day |
| **5** | **Customer Print & Quality Photo Gallery** | New `/gallery` route & Homepage | High (Overcomes "plastic looks cheap" doubt) | 2–3 Days |
| **6** | **Tiered Volume Discounts (Batch Pricing)** | Product Pages & Custom Slicer | High (+30% Average Order Value) | 2 Days |
| **7** | **Instant Commercial PDF Quote / Estimate Generator** | Custom Studio (`/custom`) | High (Allows corporate & college budget approval) | 3 Days |
| **8** | **Verified Customer Reviews with Photo Uploads** | Product Detail Pages (`/shop/$slug`) | High (Builds social proof & review count) | 3 Days |
| **9** | **Automated Courier API Tracking (Shiprocket/Delhivery)** | Order Tracking (`/order/$id`) & Admin | High (Eliminates manual shipping updates) | 1 Week |
| **10** | **Automated WhatsApp Order Notifications** | Backend Webhooks (Interakt / Wati) | High (Reduces "Where is my order?" support) | 3–4 Days |
| **11** | **Multi-File Project Workspace for Custom 3D Printing** | Custom Studio (`/custom`) | High (Attracts complete mechanical assemblies) | 2 Weeks |
| **12** | **Live Print Farm Status & Camera Feed** | About (`/about`) & Tracking Page | Very High (Viral brand moat on social media) | 2 Weeks |

---

## Detailed Recommendations by Priority

### Tier 1: Quick Wins (Days 1–5 · Low Effort · High Conversion Impact)

#### 1. Dynamic WhatsApp Button with Context Pre-Filling
- **What it is:** Upgrade the site-wide WhatsApp link so that clicking it automatically opens a chat with a pre-written message based on what page the user is currently viewing:
  - On a product page: *"Hi Prynth! I'm interested in the [Catch Bowl in Matte Bone]. Do you have this ready to ship?"*
  - On the Custom Studio: *"Hi Prynth! I'm looking at 3D printing a [PETG] part (~[45] cm³). Can I share the model for a quick feasibility check?"*
  - On the Pegboard page: *"Hi Prynth! I need a custom pegboard setup for my desk (size: [30x30 cm]). How many tiles do you recommend?"*
- **Where it goes:** Floating button on all pages, plus a *"Chat on WhatsApp"* button on product pages and [`/custom`](file:///c:/Users/raybe/Documents/Prynth!/Prynth!%20Website/src/routes/custom.tsx).
- **Why it matters:** In India, WhatsApp is the preferred shopping and consultation channel. Pre-filling the message removes typing friction and turns hesitant visitors into warm sales conversations.

---

#### 2. Pincode Delivery Date Estimator
- **What it is:** A simple input box on product pages: *"Enter PIN Code"* with a *"Check"* button. Once entered, it immediately displays the estimated delivery date:
  - E.g., `400001` (Mumbai) -> *"Delivering by Tomorrow (1–2 days)"*
  - E.g., `560001` (Bengaluru) / `110001` (Delhi) -> *"Delivering in 2–3 days"*
  - E.g., Rest of India -> *"Delivering in 3–5 days via Express Air"*
- **Where it goes:** Directly below the "Add to Cart" button on [`/shop/$slug`](file:///c:/Users/raybe/Documents/Prynth!/Prynth!%20Website/src/routes/shop.$slug.tsx) and [`/pegboard`](file:///c:/Users/raybe/Documents/Prynth!/Prynth!%20Website/src/routes/pegboard.tsx).
- **Why it matters:** Delivery date uncertainty is one of the top reasons shoppers hesitate to buy. Displaying clear timelines from your Mumbai hub gives customers confidence.

---

#### 3. Sticky Mobile "Add to Cart" Bar
- **What it is:** On mobile devices, when a customer scrolls down past the main product photos and option selectors, a compact sticky bar slides up from the bottom of the screen showing:
  - Small product thumbnail + Title
  - Selected variant / price (e.g. *"₹499"*)
  - A bright *"Add to Cart"* button
- **Where it goes:** Mobile viewports (`< 640px`) on product detail pages and the pegboard configurator.
- **Why it matters:** On long mobile pages, customers have to scroll all the way back up to add the item to cart once they finish reading specs. A sticky bottom bar eliminates that friction and lifts mobile checkout starts by 8–12%.

---

#### 4. Optional Company / Institution Name for Commercial Receipts
- **What it is:** Add an optional field at checkout: *"Company / College / Team Name (Optional — for expense receipt)"*.
- **Where it goes:** [`/checkout`](file:///c:/Users/raybe/Documents/Prynth!/Prynth!%20Website/src/routes/checkout.tsx) in the customer billing information step.
- **Why it matters:** Employees at tech companies, hardware startups, and engineering college students often pay with personal UPI or cards and get reimbursed by their finance department or lab budget. Having their company/lab name on the receipt allows their accounts team to approve the expense reimbursement.
- **Compliance note:** Generates a standard commercial receipt/invoice (no GST line item).

---

### Tier 2: Medium Effort (Weeks 2–4 · Moderate Effort · Differentiating Advantages)

#### 5. Real Customer Print & Quality Photo Gallery
- **What it is:** A dedicated visual gallery showing real, unedited photographs of 3D prints produced on Prynth's Bambu Lab printers:
  - Macro shots of layer lines (showing fine surface quality).
  - Customer desk setups featuring the Modular Pegboard, Catch Bowl, and Desk Tray.
  - Functional engineering enclosures, mechanical prototypes, and lithophane lamps lit up in dark rooms.
- **Where it goes:** A new `/gallery` route linked in the main header, plus a "Real Customer Prints" section on the homepage and product pages.
- **Why it matters:** First-time 3D printing buyers are afraid of receiving flimsy, rough plastic. High-resolution photos of real prints prove production quality and destroy purchase skepticism.

---

#### 6. Tiered Volume Discounts (Batch Pricing)
- **What it is:** An automatic tiered discount table displayed on product cards and in the custom slicer:
  - 1–4 units: Base price
  - 5–9 units: **10% OFF**
  - 10–24 units: **18% OFF**
  - 25+ units: **25% OFF**
  When the quantity counter increases, the unit price dynamically drops, and a green badge shows: *"You're saving ₹XXX!"*
- **Where it goes:** Quantity selector on product pages, [`/custom`](file:///c:/Users/raybe/Documents/Prynth!/Prynth!%20Website/src/routes/custom.tsx), and the cart drawer.
- **Why it matters:** Incentivizes corporate gifting orders, startup production batches, and multi-piece desk sets, substantially increasing Average Order Value (AOV).

---

#### 7. Downloadable Commercial PDF Quote / Estimate
- **What it is:** A *"Download Official Quote"* button on the Custom Studio page. When clicked, it instantly generates a formal PDF document containing:
  - Branded Prynth studio header & contact details
  - Unique Quote ID & 14-day price lock validity
  - Model dimensions, estimated volume, material, color, and layer profile
  - Clear total price (all-inclusive flat fee) and payment instructions (UPI / Bank transfer)
- **Where it goes:** [`/custom`](file:///c:/Users/raybe/Documents/Prynth!/Prynth!%20Website/src/routes/custom.tsx) quote summary panel.
- **Why it matters:** Hardware engineers, college project teams, and freelance designers often need a formal estimate to show their team lead or project guide before ordering.

---

#### 8. Customer Reviews with Photo Uploads
- **What it is:** Expand the existing product review system to allow customers to upload 1–3 photos of the print in their room or setup alongside their star rating and review.
- **Where it goes:** Reviews section on [`/shop/$slug`](file:///c:/Users/raybe/Documents/Prynth!/Prynth!%20Website/src/routes/shop.$slug.tsx).
- **Why it matters:** Verified buyer photos are the #1 highest-converting trust signal in modern e-commerce.

---

### Tier 3: Strategic Investments (Month 2+ · High Effort · Industry Leadership Moats)

#### 9. Automated Courier Shipping API (Shiprocket / Delhivery)
- **What it is:** Connect the backend directly to Shiprocket or Delhivery logistics APIs:
  - When an order is marked "Ready to Ship" in the admin dashboard, the system automatically books the courier, generates the shipping label (AWB), and schedules pickup from the Mumbai studio.
  - Automatically updates the order tracking page with live courier checkpoints (e.g. *"Picked up in Mumbai" -> "In transit to Pune" -> "Out for delivery"*).
- **Where it goes:** Order management backend and customer tracking page [`/order/$id`](file:///c:/Users/raybe/Documents/Prynth!/Prynth!%20Website/src/routes/order.$id.tsx).
- **Why it matters:** Saves hours of manual courier booking and copying tracking numbers into emails, enabling seamless scaling as daily order volume grows.

---

#### 10. Automated WhatsApp Order Notifications
- **What it is:** Integrate a WhatsApp Business API (via Interakt, Wati, or Gupshup) to automatically send short transactional updates:
  - *Order Confirmed:* "Hi [Name]! We received your order #PRY-1042. Printing starts shortly!"
  - *Print Completed:* "Your custom 3D print has cleared inspection and is being packaged."
  - *Shipped:* "Your package is on the way via Bluedart/Delhivery! Track here: [Link]"
- **Where it goes:** Automated background webhook triggered on order status changes.
- **Why it matters:** In India, WhatsApp messages have a 98% open rate compared to under 20% for email. Customers stay informed and support requests drop significantly.

---

#### 11. Multi-File Project Workspace for Custom 3D Printing
- **What it is:** Expand the custom slicer to allow users to drag-and-drop 10+ STL/3MF files simultaneously (e.g. an electronics enclosure consisting of top shell, bottom base, battery door, and buttons):
  - Shows an assembly tree with individual parts.
  - Allows assigning different colors or materials to each part (e.g., ASA for the outer shell, PETG for the internal clips).
  - Offers a project-level discount for multi-part printing on the same build plate.
- **Where it goes:** [`/custom`](file:///c:/Users/raybe/Documents/Prynth!/Prynth!%20Website/src/routes/custom.tsx).
- **Why it matters:** Hardware startups and makers rarely print one isolated file. A multi-part workspace makes Prynth the premier engineering partner in India.

---

#### 12. Live Print Farm Status & Camera Feed
- **What it is:** A dynamic dashboard showing live studio activity:
  - "Studio Farm Status: 6/8 CoreXY Printers Active · Current Materials: Matte Charcoal, Forest Green, Translucent Clear"
  - Optional: A customer portal feature where users with active print orders can view a live camera snapshot or automated timelapse of their part being 3D printed.
- **Where it goes:** [`/about`](file:///c:/Users/raybe/Documents/Prynth!/Prynth!%20Website/src/routes/about.tsx) and [`/order/$id`](file:///c:/Users/raybe/Documents/Prynth!/Prynth!%20Website/src/routes/order.$id.tsx).
- **Why it matters:** Transparency is the ultimate trust builder and marketing tool. Customers regularly share timelapses of their parts on social media (X, Instagram, LinkedIn), driving organic viral reach.
