import { createFileRoute, getRouteApi } from "@tanstack/react-router";
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
} from "lucide-react";

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
          "Statutory Privacy Policy for Prynth. Compliant with the Indian DPDP Act 2023, Consumer Protection (E-Commerce) Rules 2020, IT Act, GDPR, and US CCPA/COPPA regulations.",
      },
    ],
  }),
});

export function PrivacyPage() {
  const { settings } = rootRoute.useLoaderData();
  const contactEmail = settings.contact_email || settings.email || "hello@prynth.in";
  const contactPhone = settings.contact_phone || "+91 98765 43210";
  const contactAddress = settings.contact_address || "Prynth 3D Printing Studio, Bengaluru, Karnataka, India";

  const sections = [
    {
      icon: Eye,
      title: "1. Information We Collect & Sources",
      body: (
        <div className="space-y-2 text-sm text-muted leading-relaxed">
          <p>
            We collect personal data you provide directly when browsing our catalogue, creating an account,
            requesting custom CAD modelling or 3D fabrication quotes, and placing orders.
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong className="text-fg">Customer &amp; Delivery Information:</strong> Full name, shipping/billing address, postal code, phone number, and email address.</li>
            <li><strong className="text-fg">Manufacturing Specifications:</strong> 3D mesh files (.stl, .obj, .3mf, .step), project dimensions, color selections, and reference imagery.</li>
            <li><strong className="text-fg">Transactional Records:</strong> Order identification, itemized totals, date/time timestamps, and payment status (UPI, Netbanking, Card verification tokens).</li>
            <li><strong className="text-fg">Technical Telemetry:</strong> IP address, device type, and approximate geographic location collected through secure server logs for fraud prevention and network security.</li>
          </ul>
        </div>
      ),
    },
    {
      icon: FileText,
      title: "2. Lawful Grounds & Purposes of Processing",
      body: (
        <div className="space-y-2 text-sm text-muted leading-relaxed">
          <p>We process personal information under the following lawful grounds:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong className="text-fg">Performance of Contract:</strong> To manufacture, inspect, package, and courier physical 3D printed goods and deliver CAD engineering services.</li>
            <li><strong className="text-fg">Statutory Legal Obligation:</strong> Compliance with Indian GST invoicing, accounting audits, tax statutes, and mandatory consumer protection rules.</li>
            <li><strong className="text-fg">Legitimate Business Interests:</strong> Defending against payment fraud, maintaining website uptime, and optimizing studio manufacturing workflows.</li>
            <li><strong className="text-fg">Explicit Consent:</strong> Optional non-essential traffic analytics (Google Analytics) initialized strictly after explicit user opt-in.</li>
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
            We never sell, rent, or trade your personal information to third-party data brokers. Information is shared strictly with essential operational partners:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong className="text-fg">Logistics &amp; Courier Partners:</strong> Recipient name, postal delivery address, and phone number are securely shared with vetted domestic couriers (Delhivery, Blue Dart, DTDC, India Post via Shiprocket) for doorstep delivery and SMS tracking.</li>
            <li><strong className="text-fg">Payment Processing:</strong> Online transactions are handled through Razorpay Software Private Limited. Razorpay complies with PCI-DSS Level 1 standards with 256-bit encryption. We never see or store your payment card numbers, UPI PINs, or banking credentials.</li>
            <li><strong className="text-fg">Transactional Notifications:</strong> Order receipts and tracking links are dispatched via encrypted SMTP/API through Resend.</li>
          </ul>
        </div>
      ),
    },
    {
      icon: Lock,
      title: "4. Data Security & Retention Schedules",
      body: (
        <div className="space-y-2 text-sm text-muted leading-relaxed">
          <p>
            All website data transmissions are secured using TLS 1.3 encryption. Administrative access to databases is strictly restricted through multi-factor authentication.
          </p>
          <p>
            <strong className="text-fg">Retention Periods:</strong> Order transaction history and tax invoices are retained for the statutory period required by Indian law (typically 7 years for GST and tax audits). 
            Proprietary 3D model files uploaded for custom quotes are retained only as long as necessary to complete fabrication and quality inspection, and will be permanently deleted upon verified customer request.
          </p>
        </div>
      ),
    },
    {
      icon: Scale,
      title: "5. Rights Under the Indian Digital Personal Data Protection Act (DPDP Act, 2023)",
      body: (
        <div className="space-y-2 text-sm text-muted leading-relaxed">
          <p>
            As a Data Principal under the DPDP Act 2023, you are afforded comprehensive statutory rights:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong className="text-fg">Right to Access:</strong> You may request a summary of the personal data we process about you and the identities of any data processors with whom it was shared.</li>
            <li><strong className="text-fg">Right to Correction &amp; Erasure:</strong> You may request the correction of inaccurate or misleading data, the completion of incomplete data, or the deletion of data that is no longer required for the purpose it was collected.</li>
            <li><strong className="text-fg">Right of Grievance Redressal:</strong> You have the right to readily available grievance redressal through our designated Grievance Officer detailed below.</li>
            <li><strong className="text-fg">Right to Nominate:</strong> You may designate an individual who, in the event of death or incapacity, shall exercise your privacy rights.</li>
            <li><strong className="text-fg">Right to Withdraw Consent:</strong> Where processing is based on consent, you may withdraw it at any time with immediate effect.</li>
          </ul>
        </div>
      ),
    },
    {
      icon: Globe,
      title: "6. European Union & UK Privacy Rights (GDPR / UK GDPR)",
      body: (
        <div className="space-y-2 text-sm text-muted leading-relaxed">
          <p>
            Although our manufacturing studio and physical dispatches are based strictly in India, international visitors from the European Economic Area (EEA) and the United Kingdom enjoy statutory rights under the General Data Protection Regulation (GDPR):
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong className="text-fg">Rights of Access &amp; Portability (Arts. 15 &amp; 20):</strong> Right to obtain confirmation and a copy of your personal data in a structured, machine-readable format.</li>
            <li><strong className="text-fg">Right to Rectification &amp; Erasure (Arts. 16 &amp; 17):</strong> Right to correct errors and request complete erasure (&quot;Right to be Forgotten&quot;) subject to statutory tax record retention.</li>
            <li><strong className="text-fg">Right to Restrict or Object (Arts. 18 &amp; 21):</strong> Right to restrict processing or object to processing based on legitimate interests.</li>
            <li><strong className="text-fg">Supervisory Authority:</strong> You maintain the right to lodge a complaint with your local Data Protection Authority in your EU Member State or the Information Commissioner&apos;s Office (ICO) in the UK.</li>
          </ul>
        </div>
      ),
    },
    {
      icon: UserCheck,
      title: "7. United States Privacy Disclosures (CCPA / CPRA & COPPA)",
      body: (
        <div className="space-y-2 text-sm text-muted leading-relaxed">
          <p>
            <strong className="text-fg">California Consumer Privacy Act (CCPA / CPRA):</strong> We do not sell personal information, nor do we share personal information for cross-context behavioral advertising. We have not sold or shared any consumer personal data in the preceding 12 months. California residents have the right to know what personal data is collected, request deletion, correct inaccuracies, and not face discriminatory treatment for exercising their privacy rights.
          </p>
          <p>
            <strong className="text-fg">Children&apos;s Online Privacy Protection Act (COPPA):</strong> Our website and 3D printing services are directed to adults and adolescents. We do not knowingly collect personal identifiable information from children under 13 years of age. If a parent or guardian discovers that a child has provided us with personal information, contact us immediately and we will promptly delete the data from our active records.
          </p>
        </div>
      ),
    },
    {
      icon: Eye,
      title: "8. Cookies & Privacy-Preserving Analytics",
      body: (
        <div className="space-y-2 text-sm text-muted leading-relaxed">
          <p>
            We use strictly necessary cookies and local storage tokens to maintain your active shopping cart, remember dark/light theme choices, and secure user sessions.
          </p>
          <p>
            Optional traffic analytics (Google Analytics 4) are implemented using Google Consent Mode v2. All tracking cookies are set to <code className="rounded bg-surface-2 px-1.5 py-0.5 text-xs text-fg">denied</code> by default and are only initialized with IP anonymization if you explicitly select &quot;Accept&quot; on our Cookie Banner. You may revoke consent at any time by clearing your browser cache and cookies.
          </p>
        </div>
      ),
    },
  ];

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 md:px-6 md:py-20 animate-in fade-in duration-300 space-y-10">
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

        {/* Statutory Grievance Redressal Card — Mandatory under Rule 5(9) of the Consumer Protection (E-Commerce) Rules, 2020 */}
        <div className="rounded-3xl border border-accent/30 bg-accent/5 p-6 sm:p-8 space-y-4">
          <div className="flex items-center gap-2.5">
            <Scale className="size-5 text-accent shrink-0" />
            <h2 className="font-display text-xl font-semibold text-fg">
              9. Statutory Grievance Redressal Officer (India)
            </h2>
          </div>
          <p className="text-sm text-muted leading-relaxed">
            In accordance with the Information Technology Act, 2000, Rule 3(2) of the Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021, and Rule 5(9) of the Consumer Protection (E-Commerce) Rules, 2020, the designated Grievance Officer for Prynth is provided below:
          </p>

          <div className="grid gap-3 sm:grid-cols-2 pt-2 text-xs sm:text-sm">
            <div className="rounded-2xl border border-border/80 bg-surface p-4 space-y-1">
              <span className="text-[11px] font-semibold text-muted uppercase tracking-wider block">
                Designated Officer
              </span>
              <p className="font-semibold text-fg">Grievance Redressal Officer</p>
              <p className="text-xs text-muted">Prynth 3D Printing Studio</p>
            </div>

            <div className="rounded-2xl border border-border/80 bg-surface p-4 space-y-1">
              <span className="text-[11px] font-semibold text-muted uppercase tracking-wider block">
                Direct Contact Email
              </span>
              <a href={`mailto:grievance@prynth.in`} className="font-semibold text-accent underline block">
                grievance@prynth.in
              </a>
              <p className="text-xs text-muted">Alternative: {contactEmail}</p>
            </div>

            <div className="rounded-2xl border border-border/80 bg-surface p-4 space-y-1">
              <span className="text-[11px] font-semibold text-muted uppercase tracking-wider block">
                Studio Address
              </span>
              <p className="font-medium text-fg flex items-start gap-1.5">
                <MapPin className="size-3.5 text-accent shrink-0 mt-0.5" />
                <span>{contactAddress}</span>
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
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

