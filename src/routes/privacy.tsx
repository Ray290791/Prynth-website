import { createFileRoute, Link, getRouteApi } from "@tanstack/react-router";
import {
  Shield,
  Lock,
  Eye,
  FileText,
  Mail,
  Globe,
  Scale,
  UserCheck,
  AlertCircle,
  Clock,
  MapPin,
  Phone,
  Cookie,
  Server,
  Trash2,
  Download,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { openCookiePreferences } from "@/components/cookie-consent";
import { generateBreadcrumbJsonLd } from "@/lib/jsonld";

const rootRoute = getRouteApi("__root__");

export const Route = createFileRoute("/privacy")({
  component: PrivacyPage,
  head: () => ({
    links: [{ rel: "canonical", href: "https://prynth.in/privacy" }],
    meta: [
      { title: "Privacy Policy & Statutory Disclosures | Prynth" },
      {
        name: "description",
        content:
          "Privacy Policy for Prynth. Explains data collection, processing, and rights under the Indian DPDP Act 2023 and Consumer Protection (E-Commerce) Rules.",
      },
      { property: "og:title", content: "Privacy Policy & Statutory Disclosures | Prynth" },
      {
        property: "og:description",
        content:
          "Privacy Policy for Prynth. Explains data collection, processing, and rights under the Indian DPDP Act 2023 and Consumer Protection (E-Commerce) Rules.",
      },
      { property: "og:url", content: "https://prynth.in/privacy" },
    ],
  }),
});

export function PrivacyPage() {
  const { settings } = rootRoute.useLoaderData();
  const legalName = settings.legal_name || "Prynth";
  const contactEmail = settings.contact_email || settings.email || "hello@prynth.in";
  // C9: Never fall back to placeholder "+91 98765 43210". Only display phone if configured.
  const contactPhone = settings.grievance_officer_phone || settings.contact_phone || "";
  const contactAddress =
    settings.legal_registered_address ||
    settings.contact_address ||
    "Prynth 3D Printing Studio, Mumbai, Maharashtra, India";

  const grievanceOfficerName = settings.grievance_officer_name || "Grievance Redressal Officer";
  const grievanceOfficerDesignation = settings.grievance_officer_designation || "Grievance Officer";
  const grievanceOfficerEmail = settings.grievance_officer_email || "grievance@prynth.in";
  const grievanceOfficerPhone = settings.grievance_officer_phone || "";
  const grievanceOfficerAddress = settings.grievance_officer_address || contactAddress;

  const sections = [
    {
      icon: Eye,
      title: "1. Information We Collect & Data Inventory",
      body: (
        <div className="space-y-3 text-sm text-muted leading-relaxed">
          <p>
            In compliance with Section 43A of the Information Technology Act, 2000 and the Digital Personal Data
            Protection Act, 2023 (DPDP Act), we collect only the minimum personal data required to manufacture,
            inspect, package, and courier your physical 3D prints, CAD designs, and studio products.
          </p>
          <div className="overflow-x-auto rounded-2xl border border-border/80 bg-surface-2/40 p-3 sm:p-4 my-3">
            <table className="w-full text-left text-xs text-muted">
              <thead>
                <tr className="border-b border-border/60 text-fg">
                  <th className="pb-2 font-semibold">Data Category</th>
                  <th className="pb-2 font-semibold">What is Collected</th>
                  <th className="pb-2 font-semibold">Purpose</th>
                  <th className="pb-2 font-semibold">Processors &amp; Storage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                <tr>
                  <td className="py-2.5 font-medium text-fg">Customer &amp; Dispatch</td>
                  <td className="py-2.5">Full name, delivery address, pincode, phone number, email</td>
                  <td className="py-2.5">Order fulfillment, shipping labels, dispatch SMS, tax receipts</td>
                  <td className="py-2.5">Neon (PostgreSQL, TLS 1.3), Shiprocket / couriers, Resend</td>
                </tr>
                <tr>
                  <td className="py-2.5 font-medium text-fg">3D CAD Models</td>
                  <td className="py-2.5">Uploaded .stl, .obj, .3mf, .step files, dimension preferences</td>
                  <td className="py-2.5">Slicing volume calculation, pricing, Bambu Lab CoreXY printing</td>
                  <td className="py-2.5">Private storage, SHA-256 deduplicated, admin-only access</td>
                </tr>
                <tr>
                  <td className="py-2.5 font-medium text-fg">Lithophane Imagery</td>
                  <td className="py-2.5">Photographs uploaded for 3D lithophane light keepsakes</td>
                  <td className="py-2.5">Client-side 3D relief generation &amp; physical manufacturing only</td>
                  <td className="py-2.5">Processed locally in browser; stored securely solely for print</td>
                </tr>
                <tr>
                  <td className="py-2.5 font-medium text-fg">Payment Identifiers</td>
                  <td className="py-2.5">Razorpay order ID, payment token, transaction status</td>
                  <td className="py-2.5">Payment settlement and financial bookkeeping</td>
                  <td className="py-2.5">Razorpay (PCI-DSS Level 1). Prynth never stores card or UPI credentials</td>
                </tr>
                <tr>
                  <td className="py-2.5 font-medium text-fg">Telemetry &amp; Preferences</td>
                  <td className="py-2.5">Theme choice, shopping cart token, session cookie, optional GA4</td>
                  <td className="py-2.5">Basic website functionality and optional anonymous analytics</td>
                  <td className="py-2.5">Browser localStorage, Cloudflare Web Analytics, Google Analytics (opt-in)</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      ),
    },
    {
      icon: FileText,
      title: "2. Lawful Grounds & Purposes of Processing",
      body: (
        <div className="space-y-2 text-sm text-muted leading-relaxed">
          <p>We process personal data strictly under valid lawful grounds recognized by Indian and global data statutes:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              <strong className="text-fg">Performance of Contract:</strong> Processing CAD files, slicing geometry, fabricating parts on Bambu Lab printers, packaging shipments, and booking couriers.
            </li>
            <li>
              <strong className="text-fg">Statutory Legal Obligation:</strong> Issuing invoices, maintaining financial and commercial records, and complying with consumer protection and tax laws.
            </li>
            <li>
              <strong className="text-fg">Legitimate Business Interests:</strong> Defending against payment fraud, rate-limiting abusive requests, and ensuring website uptime and edge resilience.
            </li>
            <li>
              <strong className="text-fg">Explicit User Consent:</strong> Optional anonymous traffic analytics initialized strictly after explicit consent via our Cookie Banner.
            </li>
          </ul>
        </div>
      ),
    },
    {
      icon: Shield,
      title: "3. Sharing with Trusted Service Providers",
      body: (
        <div className="space-y-2 text-sm text-muted leading-relaxed">
          <p>
            We never sell, rent, monetize, or trade your personal data or uploaded 3D designs to third-party data brokers or AI model trainers. Information is transferred strictly to operational subprocessors under confidentiality agreements:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              <strong className="text-fg">Logistics &amp; Courier Partners:</strong> Recipient name, address, and phone number are securely shared via Shiprocket with domestic delivery services (Delhivery, Blue Dart, DTDC, India Post) for parcel dispatch and tracking.
            </li>
            <li>
              <strong className="text-fg">Payment Aggregator:</strong> Transactions are handled through Razorpay Software Private Limited (RBI-authorized, PCI-DSS Level 1 compliant). We do not collect or store card numbers, CVVs, or UPI PINs.
            </li>
            <li>
              <strong className="text-fg">Transactional Communications:</strong> Automated order confirmation receipts and grievance acknowledgment emails are dispatched via encrypted SMTP/API through Resend.
            </li>
            <li>
              <strong className="text-fg">Edge Compute &amp; Database:</strong> Cloudflare Inc. (CDN, DDoS security, edge Worker execution) and Neon Inc. (serverless encrypted PostgreSQL database).
            </li>
          </ul>
        </div>
      ),
    },
    {
      icon: Lock,
      title: "4. Data Security & Storage Architecture",
      body: (
        <div className="space-y-2 text-sm text-muted leading-relaxed">
          <p>
            All website data transmissions are secured using TLS 1.3 encryption. Administrative console access is protected with session authentication and restricted origins.
          </p>
          <p>
            Customer 3D models and lithophane files are protected by randomized cryptographic identifiers (<code className="rounded bg-surface-2 px-1.5 py-0.5 text-xs text-fg">crypto.randomUUID()</code>) and SHA-256 byte deduplication. Model downloads require authenticated administrator sessions with <code className="rounded bg-surface-2 px-1.5 py-0.5 text-xs text-fg">Cache-Control: private, no-store</code> headers to prevent public scraping.
          </p>
        </div>
      ),
    },
    {
      icon: Scale,
      title: "5. Your Rights as a Data Principal (DPDP Act, 2023)",
      body: (
        <div className="space-y-3 text-sm text-muted leading-relaxed">
          <p>
            Under Section 11–14 of the Digital Personal Data Protection Act, 2023, you enjoy statutory rights regarding your personal information:
          </p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>
              <strong className="text-fg">Right to Access:</strong> You may request a plain-language summary of the personal data we process about you and the list of processors with whom it was shared.
            </li>
            <li>
              <strong className="text-fg">Right to Correction &amp; Erasure:</strong> You may request the correction of inaccurate data or the permanent erasure of your personal data and uploaded 3D models when no longer needed for fabrication or statutory tax retention.
            </li>
            <li>
              <strong className="text-fg">Right of Grievance Redressal:</strong> You have the right to swift grievance redressal through our designated Grievance Officer, with automated acknowledgement within 48 hours and resolution within 30 days.
            </li>
            <li>
              <strong className="text-fg">Right to Nominate:</strong> You may designate any individual who, in the event of death or incapacity, shall exercise your privacy rights.
            </li>
            <li>
              <strong className="text-fg">Right to Withdraw Consent:</strong> Where processing relies on consent, you may withdraw it at any time with immediate effect.
            </li>
          </ul>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            <Link
              to="/legal"
              search={{ category: "data_deletion" }}
              className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-xs font-semibold text-ink hover:opacity-90 transition-opacity"
            >
              <Trash2 className="size-3.5" />
              <span>Submit Data Erasure / Access Request</span>
            </Link>
            <button
              type="button"
              onClick={openCookiePreferences}
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-2 text-xs font-semibold text-fg hover:bg-surface-2 transition-colors cursor-pointer"
            >
              <Cookie className="size-3.5 text-accent" />
              <span>Manage Cookie &amp; Analytics Preferences</span>
            </button>
          </div>
        </div>
      ),
    },
    {
      icon: Globe,
      title: "6. European Union & International Visitors (GDPR)",
      body: (
        <div className="space-y-2 text-sm text-muted leading-relaxed">
          <p>
            Although our fabrication studio and dispatches operate exclusively in India, international visitors enjoy statutory rights under the EU General Data Protection Regulation (GDPR):
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              <strong className="text-fg">Access &amp; Portability (Arts. 15 &amp; 20):</strong> Right to obtain confirmation and a copy of your personal data in a structured, machine-readable format.
            </li>
            <li>
              <strong className="text-fg">Rectification &amp; Erasure (Arts. 16 &amp; 17):</strong> Right to correct errors and request complete erasure (&quot;Right to be Forgotten&quot;) subject to statutory tax record retention.
            </li>
            <li>
              <strong className="text-fg">Withdrawal of Consent:</strong> Revocation of non-essential analytics cookies at any time via our Cookie Preferences modal.
            </li>
          </ul>
        </div>
      ),
    },
    {
      icon: Eye,
      title: "7. Cookies & Analytics Consent Management",
      body: (
        <div className="space-y-3 text-sm text-muted leading-relaxed">
          <p>
            We use strictly necessary session cookies and browser storage to maintain your active shopping cart, preserve light/dark theme choices, and secure user sessions.
          </p>
          <p>
            Optional traffic analytics (Google Analytics 4) are configured via Google Consent Mode v2. All tracking cookies are set to <code className="rounded bg-surface-2 px-1.5 py-0.5 text-xs text-fg">denied</code> by default and are never loaded unless you explicitly select &quot;Accept&quot; on our Cookie Banner.
          </p>
          <div>
            <button
              type="button"
              onClick={openCookiePreferences}
              className="inline-flex items-center gap-2 text-xs font-semibold text-accent underline hover:text-accent-hover cursor-pointer"
            >
              <span>Click here to review or change your cookie preferences</span>
              <ExternalLink className="size-3" />
            </button>
          </div>
        </div>
      ),
    },
    {
      icon: Clock,
      title: "8. Data Retention Periods & Automated Purging",
      body: (
        <div className="space-y-3 text-sm text-muted leading-relaxed">
          <p>
            In accordance with the Purpose Limitation &amp; Storage Limitation principles of the DPDP Act, 2023, personal data and files are retained strictly for the duration necessary to fulfill fabrication, courier transit, warranty support, and statutory tax obligations:
          </p>
          <div className="overflow-x-auto rounded-2xl border border-border/80 bg-surface-2/40 p-3 sm:p-4 my-3">
            <table className="w-full text-left text-xs text-muted">
              <thead>
                <tr className="border-b border-border/60 text-fg">
                  <th className="pb-2 font-semibold">Data Category</th>
                  <th className="pb-2 font-semibold">Retention Duration</th>
                  <th className="pb-2 font-semibold">Statutory / Operational Purpose</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                <tr>
                  <td className="py-2.5 font-medium text-fg">Customer 3D CAD Files &amp; Lithophane Photos</td>
                  <td className="py-2.5 text-accent font-mono font-semibold">30 Days Post-Fulfillment</td>
                  <td className="py-2.5">Retained solely to support defect inspection, warranty reprints, and material matching; permanently deleted from R2 storage and database after 30 days unless saved in your user account.</td>
                </tr>
                <tr>
                  <td className="py-2.5 font-medium text-fg">Uncompleted / Abandoned File Uploads</td>
                  <td className="py-2.5 text-accent font-mono font-semibold">72 Hours (3 Days)</td>
                  <td className="py-2.5">Files uploaded to the instant quoting engine that do not proceed to checkout are automatically purged after 3 days.</td>
                </tr>
                <tr>
                  <td className="py-2.5 font-medium text-fg">Tax Invoices &amp; Transaction Ledgers</td>
                  <td className="py-2.5 text-accent font-mono font-semibold">8 Years</td>
                  <td className="py-2.5">Mandatory statutory retention under Section 44AA of the Indian Income Tax Act, 1961 and Rule 6F of Income Tax Rules.</td>
                </tr>
                <tr>
                  <td className="py-2.5 font-medium text-fg">Grievance &amp; Consumer Dispute Files</td>
                  <td className="py-2.5 text-accent font-mono font-semibold">3 Years</td>
                  <td className="py-2.5">Audit trail maintenance under the Consumer Protection (E-Commerce) Rules, 2020.</td>
                </tr>
                <tr>
                  <td className="py-2.5 font-medium text-fg">Customer Account Profile Data</td>
                  <td className="py-2.5 text-accent font-mono font-semibold">Until Deletion Request</td>
                  <td className="py-2.5">Retained while account is active; erased within 30 days of written deletion request under DPDP Act rights.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      ),
    },
  ];

  const breadcrumbJsonLd = generateBreadcrumbJsonLd([
    { name: "Home", url: "/" },
    { name: "Privacy Policy", url: "/privacy" },
  ]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 md:px-6 md:py-20 animate-in fade-in duration-300 space-y-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <div>
        <div className="inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/10 px-3.5 py-1 text-xs font-semibold text-accent">
          <Shield className="size-3.5" />
          <span>Statutory Privacy &amp; Data Governance</span>
        </div>
        <h1 className="mt-4 font-display text-4xl sm:text-5xl font-semibold tracking-tight text-fg">
          Privacy Policy
        </h1>
        <p className="mt-2 text-sm text-muted">
          Last updated: October 2026 · Compliant with the Indian DPDP Act 2023, Consumer Protection (E-Commerce) Rules 2020, Information Technology Act 2000, EU GDPR, and US CCPA/COPPA.
        </p>
      </div>

      <div className="space-y-5">
        {sections.map((sec) => {
          const Icon = sec.icon;
          return (
            <div
              key={sec.title}
              className="rounded-3xl border border-border bg-surface p-6 sm:p-7 shadow-xs space-y-3"
            >
              <h2 className="font-display text-lg font-semibold text-fg flex items-center gap-2.5">
                <Icon className="size-4.5 text-accent shrink-0" />
                <span>{sec.title}</span>
              </h2>
              {sec.body}
            </div>
          );
        })}

        {/* Statutory Grievance Redressal Card — Mandatory under Rule 5(9) of Consumer Protection (E-Commerce) Rules, 2020 */}
        <div className="rounded-3xl border border-accent/30 bg-accent/5 p-6 sm:p-8 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2.5">
              <Scale className="size-5 text-accent shrink-0" />
              <h2 className="font-display text-xl font-semibold text-fg">
                8. Statutory Grievance Redressal Officer (India)
              </h2>
            </div>
            <Link
              to="/legal"
              className="text-xs font-semibold text-accent hover:underline inline-flex items-center gap-1"
            >
              <span>File a Grievance Ticket Online</span>
              <ExternalLink className="size-3" />
            </Link>
          </div>
          <p className="text-sm text-muted leading-relaxed">
            In accordance with the Information Technology Act, 2000, Rule 3(2) of the Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021, and Rule 5(9) of the Consumer Protection (E-Commerce) Rules, 2020, the designated Grievance Officer for {legalName} is provided below:
          </p>

          <div className="grid gap-3 sm:grid-cols-2 pt-2 text-xs sm:text-sm">
            <div className="rounded-2xl border border-border/80 bg-surface p-4 space-y-1">
              <span className="text-[11px] font-semibold text-muted uppercase tracking-wider block">
                Designated Officer
              </span>
              <p className="font-semibold text-fg">{grievanceOfficerName}</p>
              <p className="text-xs text-muted">{grievanceOfficerDesignation} · {legalName}</p>
            </div>

            <div className="rounded-2xl border border-border/80 bg-surface p-4 space-y-1">
              <span className="text-[11px] font-semibold text-muted uppercase tracking-wider block">
                Direct Contact Email
              </span>
              <a href={`mailto:${grievanceOfficerEmail}`} className="font-semibold text-accent underline block">
                {grievanceOfficerEmail}
              </a>
              <p className="text-xs text-muted">Customer Desk: {contactEmail}</p>
            </div>

            <div className="rounded-2xl border border-border/80 bg-surface p-4 space-y-1">
              <span className="text-[11px] font-semibold text-muted uppercase tracking-wider block">
                Studio Address
              </span>
              <p className="font-medium text-fg flex items-start gap-1.5">
                <MapPin className="size-3.5 text-accent shrink-0 mt-0.5" />
                <span>{grievanceOfficerAddress}</span>
              </p>
            </div>

            <div className="rounded-2xl border border-border/80 bg-surface p-4 space-y-1">
              <span className="text-[11px] font-semibold text-muted uppercase tracking-wider block">
                Statutory Redressal Timeline
              </span>
              <p className="font-medium text-fg flex items-center gap-1.5">
                <Clock className="size-3.5 text-accent shrink-0" />
                <span>Acknowledgment: within 48 hours</span>
              </p>
              <p className="text-xs text-muted">Full Resolution: within 30 days of receipt</p>
              {grievanceOfficerPhone ? (
                <p className="text-xs font-medium text-fg pt-1 flex items-center gap-1.5">
                  <Phone className="size-3 text-accent shrink-0" />
                  <span>{grievanceOfficerPhone}</span>
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
