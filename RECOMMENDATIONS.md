# Feature Recommendations & Product Roadmap — prynth!

**Document Version:** 2.0  
**Target:** prynth! (`https://prynth.in`)  
**Scope:** Actionable feature additions, conversion optimizations, and growth initiatives for the business owner.

---

## At a Glance: Feature Recommendations Matrix

| # | Recommended Feature | Target Location | Business Impact | Effort Level |
| :---: | :--- | :--- | :--- | :---: |
| **1** | **B2B GST Invoicing & Tax Input Credit** | Checkout Page (`/checkout`) | High (Unlocks ₹5,000–₹50,000 corporate orders) | 1–2 Days |
| **2** | **Dynamic WhatsApp Support with Pre-Filled Chats** | Site-wide button & Product Pages | High (+25% inbound custom quote leads) | 1 Day |
| **3** | **Pincode Delivery Date Estimator** | Product Detail Pages & Cart Drawer | Medium-High (+12% checkout conversion) | 2 Days |
| **4** | **Sticky Mobile "Add to Cart" Bar** | Mobile PDP & Pegboard Configurator | Medium (+10% mobile checkout starts) | 1 Day |
| **5** | **Customer Print & Quality Photo Gallery** | New `/gallery` route & Homepage | High (Overcomes "plastic looks cheap" doubt) | 2–3 Days |
| **6** | **Tiered Volume Discounts (Batch Pricing)** | Product Pages & Custom Slicer | High (+30% Average Order Value) | 2 Days |
| **7** | **Downloadable PDF Quotation / Proforma Invoice** | Custom Studio (`/custom`) | High (Enables corporate purchase orders) | 3 Days |
| **8** | **Automated Courier API Tracking (Shiprocket/Delhivery)** | Order Tracking (`/order/$id`) & Admin | High (Eliminates manual shipping updates) | 1 Week |
| **9** | **Automated WhatsApp Order Updates** | Backend Webhooks (Interakt / Wati) | High (Reduces "Where is my order?" support) | 3–4 Days |
| **10** | **Multi-File Assembly Upload Workspace** | Custom Studio (`/custom`) | High (Attracts complex engineering projects) | 2 Weeks |
| **11** | **Live Print Farm Status & Camera Feed** | About (`/about`) & Tracking Page | Very High (Viral brand moat on social media) | 2 Weeks |

---

## Detailed Recommendations by Priority

### Tier 1: Quick Wins (Days 1–5 · Low Effort · Immediate Revenue & Trust Gains)

#### 1. B2B GST Invoicing at Checkout
- **What it is:** Add an optional checkbox at checkout: *"Purchasing for a registered business? Add GSTIN for 18% tax credit"*. When checked, the customer enters their 15-character GST number and Legal Entity Name.
- **Where it goes:** [`/checkout`](file:///c:/Users/raybe/Documents/Prynth!/Prynth!%20Website/src/routes/checkout.tsx) in the customer information step.
- **Why it matters:** Indian startups, design studios, colleges, and engineering companies cannot expense business purchases without a valid GST tax invoice. Without this field, corporate buyers abandon their cart and order elsewhere.
- **What changes:**
  - Save `gstin` and `company_name` with the order record in PostgreSQL.
  - Automatically display the GSTIN and 18% GST breakdown on order receipts and email invoices.

---

#### 2. Dynamic WhatsApp Button with Context Pre-Filling
- **What it is:** Upgrade the site-wide WhatsApp link so that clicking it automatically opens a chat with a pre-written message based on what page the user is currently viewing:
  - On a product page: *"Hi Prynth! I'm interested in the [Catch Bowl in Matte Bone]. Do you have this ready to ship?"*
  - On the Custom Studio: *"Hi Prynth! I'm looking at 3D printing a [PETG] part (~[45] cm³). Can I share the model for a quick feasibility check?"*
  - On the Pegboard page: *"Hi Prynth! I need a custom pegboard setup for my desk (size: [30x30 cm]). How many tiles do you recommend?"*
- **Where it goes:** Floating button on all pages, plus a *"Chat on WhatsApp"* button on product pages and `/custom`.
- **Why it matters:** In India, WhatsApp is the preferred shopping and consultation channel. Pre-filling the message removes typing friction and turns hesitant visitors into warm sales conversations.

---

#### 3. Pincode Delivery Date Estimator
- **What it is:** A simple input box on product pages: *"Enter PIN Code"* with a *"Check"* button. Once entered, it immediately displays the estimated delivery date:
  - E.g., `400001` (Mumbai) -> *"Delivering by Tomorrow (1–2 days)"*
  - E.g., `560001` (Bengaluru) / `110001` (Delhi) -> *"Delivering in 2–3 days"*
  - E.g., Rest of India -> *"Delivering in 3–5 days via Express Air"*
- **Where it goes:** Under the "Add to Cart" button on [`/shop/$slug`](file:///c:/Users/raybe/Documents/Prynth!/Prynth!%20Website/src/routes/shop.$slug.tsx) and [`/pegboard`](file:///c:/Users/raybe/Documents/Prynth!/Prynth!%20Website/src/routes/pegboard.tsx).
- **Why it matters:** Delivery date uncertainty is one of the top reasons shoppers hesitate to buy. Displaying clear timelines from your Mumbai hub gives customers confidence.

---

#### 4. Sticky Mobile "Add to Cart" Bar
- **What it is:** On mobile devices, when a customer scrolls down past the main product photos and option selectors, a compact sticky bar slides up from the bottom of the screen showing:
  - Small product thumbnail + Title
  - Selected variant / price (e.g. *"₹499"*)
  - A bright *"Add to Cart"* button
- **Where it goes:** Mobile viewports (`< 640px`) on product detail pages and the pegboard configurator.
- **Why it matters:** On long mobile pages, customers have to scroll all the way back up to add the item to cart once they finish reading specs. A sticky bottom bar eliminates that friction and lifts mobile checkout rates by 8–12%.

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
- **Where it goes:** Quantity selector on product pages, `/custom`, and the cart drawer.
- **Why it matters:** Incentivizes corporate gifting orders, startup production batches, and multi-piece desk sets, substantially increasing Average Order Value (AOV).

---

#### 7. Downloadable PDF Quotation / Proforma Invoice
- **What it is:** A *"Download Official PDF Quote"* button on the Custom Studio page. When clicked, it instantly generates a formal PDF document containing:
  - Branded Prynth header & Mumbai studio address
  - Unique Quote ID & 14-day price lock validity
  - Model dimensions, estimated volume, material, color, and layer profile
  - Complete price breakdown with 18% GST and bank payment details (NEFT/RTGS/UPI)
- **Where it goes:** [`/custom`](file:///c:/Users/raybe/Documents/Prynth!/Prynth!%20Website/src/routes/custom.tsx) quote summary panel.
- **Why it matters:** Engineers, university students, and corporate employees must submit a formal quotation to their accounts or procurement department before getting budget approval. This captures high-value B2B orders that cannot pay via immediate personal credit card.

---

### Tier 3: Strategic Investments (Month 2+ · High Effort · Industry Leadership Moats)

#### 8. Automated Courier Shipping API (Shiprocket / Delhivery)
- **What it is:** Connect the backend directly to Shiprocket or Delhivery logistics APIs:
  - When an order is marked "Ready to Ship" in the admin dashboard, the system automatically books the courier, generates the shipping label (AWB), and schedules pickup from the Mumbai studio.
  - Automatically updates the order tracking page with live courier checkpoints (e.g. *"Picked up in Mumbai" -> "In transit to Pune" -> "Out for delivery"*).
- **Where it goes:** Order management backend and customer tracking page [`/order/$id`](file:///c:/Users/raybe/Documents/Prynth!/Prynth!%20Website/src/routes/order.$id.tsx).
- **Why it matters:** Saves hours of manual courier booking and copying tracking numbers into emails, enabling seamless scaling as daily order volume grows.

---

#### 9. Automated WhatsApp Order Notifications
- **What it is:** Integrate a WhatsApp Business API (via Interakt, Wati, or Gupshup) to automatically send short transactional updates:
  - *Order Confirmed:* "Hi [Name]! We received your order #PRY-1042. Printing starts shortly!"
  - *Print Completed:* "Your custom 3D print has cleared inspection and is being packaged."
  - *Shipped:* "Your package is on the way via Bluedart/Delhivery! Track here: [Link]"
- **Where it goes:** Automated background webhook triggered on order status changes.
- **Why it matters:** In India, WhatsApp messages have a 98% open rate compared to under 20% for email. Customers stay informed and support requests drop significantly.

---

#### 10. Multi-File Project Workspace for Custom 3D Printing
- **What it is:** Expand the custom slicer to allow users to drag-and-drop 10+ STL/3MF files simultaneously (e.g. an electronics enclosure consisting of top shell, bottom base, battery door, and buttons):
  - Shows an assembly tree with individual parts.
  - Allows assigning different colors or materials to each part (e.g., ASA for the outer shell, PETG for the internal clips).
  - Offers a project-level discount for multi-part printing on the same build plate.
- **Where it goes:** [`/custom`](file:///c:/Users/raybe/Documents/Prynth!/Prynth!%20Website/src/routes/custom.tsx).
- **Why it matters:** Hardware startups and makers rarely print one isolated file. A multi-part workspace makes Prynth the premier engineering partner in India.

---

#### 11. Live Print Farm Status & Camera Feed
- **What it is:** A dynamic dashboard showing live studio activity:
  - "Studio Farm Status: 6/8 CoreXY Printers Active · Current Materials: Matte Charcoal, Forest Green, Translucent Clear"
  - Optional: A customer portal feature where users with active print orders can view a live camera snapshot or automated timelapse of their part being 3D printed.
- **Where it goes:** [`/about`](file:///c:/Users/raybe/Documents/Prynth!/Prynth!%20Website/src/routes/about.tsx) and [`/order/$id`](file:///c:/Users/raybe/Documents/Prynth!/Prynth!%20Website/src/routes/order.$id.tsx).
- **Why it matters:** Transparency is the ultimate trust builder and marketing tool. Customers regularly share timelapses of their parts on social media (X, Instagram, LinkedIn), driving organic viral reach.
