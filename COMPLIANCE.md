# Prynth — Statutory Legal Compliance Register (India)

*Created 27 Oct 2026 · Living documentation of statutory compliance for prynth.in*

This register records the Indian regulatory requirements applicable to Prynth, the official sources consulted, implementation status across the website, and items pending Chartered Accountant (tax) or legal counsel review.

---

## 1. Statutory Disclosures & Business Identity

**Governing Law:** Consumer Protection (E-Commerce) Rules, 2020 (under Consumer Protection Act, 2019)  
**Official Source:** [consumeraffairs.nic.in](https://consumeraffairs.nic.in) · Notification G.S.R. 464(E) dated 23 July 2020  
**Implementation Date:** 27 Oct 2026  

| Requirement | Statutory Rule | Implementation in Prynth | Status |
| :--- | :--- | :--- | :---: |
| **Legal Entity Name** | Rule 4(1)(a) | Displayed on `/legal`, footer, and invoice generation from `site_settings.legal_name`. | **Active** |
| **Registered Address** | Rule 4(1)(b) | Configured in Admin Settings; rendered on `/legal` and `/contact`. | **Active** |
| **Customer Care Contact** | Rule 4(1)(d) | Centralized customer care email (`hello@prynth.in`) & operating hours. | **Active** |
| **Grievance Redressal Officer** | Rule 5(9) | Appointed officer designation, desk email (`grievance@prynth.in`), and address displayed on `/legal`. | **Active** |
| **48-Hour Acknowledgement SLA** | Rule 5(9) | Automated ticket issuance and confirmation email dispatched immediately upon complaint submission. | **Active** |
| **30-Day Resolution SLA** | Rule 5(9) | Database due date calculation (`resolve_due_at = NOW() + 30 days`) with overdue alerts in admin. | **Active** |
| **Price Breakup** | Rule 6 | Total item price, shipping fee, COD collection fee, and discounts displayed itemized before payment. | **Active** |
| **Country of Origin** | Rule 6(5)(d) | "Made in India" declared on product pages, checkout, and `/legal`. | **Active** |

---

## 2. Grievance Workflow & Escalation Matrix

- **Public Endpoint:** `https://prynth.in/legal`
- **Ticket Format:** `PRY-GRV-YYYY-XXXXX`
- **Automated Email:** Sent immediately via Resend with ticket number and statutory deadlines.
- **Admin Management:** In `src/lib/grievance-fns.ts` and admin console.

### Statutory Escalation SLAs:
1. **Acknowledgement:** Within 48 hours of receipt.
2. **Resolution:** Within 30 calendar days (1 month) of receipt.

---

## 3. Data Protection & Privacy Inventory

**Governing Law:** Information Technology Act, 2000 (Section 43A) & Digital Personal Data Protection Act, 2023 (DPDP Act)  
**Official Source:** [meity.gov.in](https://meity.gov.in) · Gazette Notification dated 11 Aug 2023  

### Data Collected & Processing Purpose:
| Data Element | Purpose | Processing Vendor | Storage / Retention |
| :--- | :--- | :--- | :--- |
| **Customer Name, Email, Phone** | Order processing, courier notifications, tracking | Neon PostgreSQL, Resend | Retained for tax / accounting audit period |
| **Delivery Address** | Package logistics and dispatch | Shiprocket Logistics API, Courier | Retained for order fulfillment |
| **Payment References** | Payment capture and reconciliation | Razorpay (PCI-DSS Level 1) | No card/UPI credentials stored on Prynth |
| **Uploaded 3D Models (STL/3MF)** | Print slicing, material estimation, manufacturing | Neon / Cloudflare R2 | Secured under admin-only access; deduplicated via SHA-256 |
| **Lithophane Reference Photos** | Lithophane 3D conversion & verification | Neon / Cloudflare R2 | Retained with order record |

### Data Breach Response Protocol (DPDP Act 2023 & CERT-In):
1. **Incident Response Team & Contacts:**
   - **Internal Lead:** Lead Engineer / Studio Founder
   - **Statutory Officer:** Grievance Redressal Officer (`grievance@prynth.in`)
2. **Mandatory Breach Incident Register (What to Record):**
   - Exact timestamp of discovery and occurrence.
   - Nature of cybersecurity incident (e.g., unauthorized database access, credential stuffing, injection attempt).
   - Scope and volume: categories of personal data exposed and number of affected Data Principals.
   - Technical root cause analysis and compromised systems.
   - Immediate containment actions taken (API key revocation, IP blocking, secret rotation).
   - Long-term remedial controls deployed.
3. **Statutory Regulatory Notification:**
   - **CERT-In (Indian Computer Emergency Response Team):** Mandatory report within 6 hours of noticing cybersecurity incident under Section 70B of the IT Act (Directions dated 28 April 2022).
   - **Data Protection Board of India (DPBI):** Intimation under Section 8(6) of the Digital Personal Data Protection Act, 2023, without unreasonable delay.
4. **Data Principal Notification:**
   - Plain-language electronic notification (email) to all affected individuals describing the breach incident, potential security implications, measures taken by Prynth, and safety steps advised to the user.

---

## 4. Pending Owner Decisions (Blocked Items)

1. **R2 (Business Identity):** Confirmation of legal entity type (Sole Proprietorship, LLP, or Pvt Ltd) and appointment record for Grievance Redressal Officer.
2. **R4 (GST Readiness):** Formal written confirmation from Chartered Accountant regarding GST registration status for online interstate physical goods.
3. **R6 (Data Retention):** Policy on automatic purging of unlinked custom files after order delivery.
4. **R7 (Refund Policy):** Formalization of refund vs reprint policy for custom made-to-order items.
5. **R14 (Legal Review):** Review of compiled policies by legal counsel and CA before launch.
