import { createFileRoute, getRouteApi } from "@tanstack/react-router";
import {
  Scale,
  ShieldCheck,
  CreditCard,
  Box,
  AlertTriangle,
  Globe,
  Truck,
  HelpCircle,
} from "lucide-react";

const rootRoute = getRouteApi("__root__");

export const Route = createFileRoute("/terms")({
  component: TermsPage,
  head: () => ({
    links: [{ rel: "canonical", href: "https://prynth.in/terms" }],
    meta: [
      { title: "Terms & Conditions & Safety Disclaimers | Prynth" },
      {
        name: "description",
        content:
          "Terms and Conditions governing orders, custom 3D printing manufacturing services, product safety disclaimers, and website usage at Prynth.",
      },
    ],
  }),
});

export function TermsPage() {
  const { settings } = rootRoute.useLoaderData();
  const contactEmail = settings.contact_email || settings.email || "hello@prynth.in";
  const brandName = settings.brand_name || "Prynth";

  const sections = [
    {
      icon: Scale,
      title: "1. Agreement to Terms & Eligibility",
      body: (
        <div className="space-y-2 text-sm text-muted leading-relaxed">
          <p>
            By accessing or browsing this website, submitting 3D design files, or placing an order with {brandName},
            you represent and warrant that you are at least 18 years of age (or possess legal parental/guardian consent)
            and agree to be legally bound by these Terms and Conditions, our Privacy Policy, and Returns Policy.
          </p>
        </div>
      ),
    },
    {
      icon: Truck,
      title: "2. Geographic Delivery Limitation (Domestic India Only)",
      body: (
        <div className="space-y-2 text-sm text-muted leading-relaxed">
          <p>
            <strong className="text-fg">Domestic Dispatch:</strong> Physical manufactured products and on-demand 3D printing services are strictly fulfilled and dispatched to delivery addresses located within the sovereign territory of the Republic of India.
          </p>
          <p>
            International visitors accessing this website from outside India acknowledge that contracts are formed within India, prices are settled in Indian Rupees (INR), and physical shipping is restricted to serviceable Indian domestic postal PIN codes.
          </p>
        </div>
      ),
    },
    {
      icon: Box,
      title: "3. 3D Printing Technology, Materials & Engineering Tolerances",
      body: (
        <div className="space-y-2 text-sm text-muted leading-relaxed">
          <p>
            All catalog goods and custom fabricated orders are produced using fused deposition modeling (FDM / FFF additive manufacturing).
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong className="text-fg">Physical Characteristics:</strong> Subtle layer lines, microscopic seam variations, and natural thermoplastic textures are inherent engineering traits of additive fabrication and do not constitute manufacturing defects.</li>
            <li><strong className="text-fg">Dimensional Tolerances:</strong> Unless higher-precision parameters are explicitly contracted in writing, standard manufacturing tolerances are approximately <code className="rounded bg-surface-2 px-1.5 py-0.5 text-xs text-fg">±0.2mm</code> or <code className="rounded bg-surface-2 px-1.5 py-0.5 text-xs text-fg">0.5%</code>, whichever is greater.</li>
            <li><strong className="text-fg">Thermal Limitations:</strong> Standard thermoplastic prints (PLA, PETG) have specific glass transition temperatures (softening above 55°C / 131°F). Do not expose prints to high heat environments, enclosed vehicle interiors under direct sunlight, microwaves, or dishwashers.</li>
          </ul>
        </div>
      ),
    },
    {
      icon: AlertTriangle,
      title: "4. Mandatory Product Safety & Health Disclaimers",
      body: (
        <div className="space-y-2 text-sm text-muted leading-relaxed">
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 space-y-1.5">
            <h4 className="font-semibold text-fg text-xs uppercase tracking-wider flex items-center gap-1.5 text-amber-500">
              <AlertTriangle className="size-4" />
              <span>Non-Food Contact Notice</span>
            </h4>
            <p className="text-xs text-muted">
              FDM 3D printed thermoplastic items inherently possess microscopic interlayer ridges that can collect organic residue and bacteria. Unless explicitly specified, post-treated, and sealed with food-grade epoxy barrier coatings, products are sold strictly as decorative home goods, functional desk organizers, and lifestyle accessories. They are <strong className="text-fg">NOT certified food-contact containers, tableware, or drinkware</strong>. Do not use for hot liquids or direct edible consumption.
            </p>
          </div>

          <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 space-y-1.5">
            <h4 className="font-semibold text-fg text-xs uppercase tracking-wider flex items-center gap-1.5 text-destructive">
              <AlertTriangle className="size-4" />
              <span>Choking Hazard &amp; Child Safety (Not Toys for Under 3)</span>
            </h4>
            <p className="text-xs text-muted">
              Certain products manufactured by Prynth incorporate small modular accessories (pegs, clips, cable hooks, silicone feet) or can fracture into small rigid fragments if dropped or subjected to excessive force. Products are intended for adult and supervised youth functional lifestyle usage and are <strong className="text-fg">NOT TOYS</strong>. They are not intended or certified for children under three (3) years of age. Keep small parts away from infants and pets to prevent choking hazards.
            </p>
          </div>
        </div>
      ),
    },
    {
      icon: AlertTriangle,
      title: "5. Custom Fabrication & Intellectual Property Warranties",
      body: (
        <div className="space-y-2 text-sm text-muted leading-relaxed">
          <p>
            When uploading 3D CAD files (.stl, .obj, .3mf, .step) or commissioning design models:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>You warrant that you own or possess all requisite copyrights, patent licenses, trademarks, or open-source commercial permissions to reproduce the design.</li>
            <li>You agree to indemnify and hold harmless {brandName} and its operators against any third-party claims, liabilities, or expenses arising from intellectual property infringement claims regarding files you provided.</li>
            <li>{brandName} reserves the unconditional right to decline fabrication of any file that infringes third-party rights, is hazardous, or depicts weapons/prohibited components under Indian law.</li>
          </ul>
        </div>
      ),
    },
    {
      icon: CreditCard,
      title: "6. Pricing, Invoicing & Razorpay Secure Payments",
      body: (
        <div className="space-y-2 text-sm text-muted leading-relaxed">
          <p>
            All catalog prices and custom quotation invoices are denominated in Indian Rupees (INR). Payments are processed through Razorpay Software Private Limited using RBI-authorized, PCI-DSS Level 1 compliant gateway infrastructure.
          </p>
          <p>
            Payment may be made via UPI, major Debit/Credit Cards, Netbanking, or Cash on Delivery (where serviceable by our courier partners).
          </p>
        </div>
      ),
    },
    {
      icon: ShieldCheck,
      title: "7. Order Cancellations & 7-Day Returns Policy",
      body: (
        <div className="space-y-2 text-sm text-muted leading-relaxed">
          <p>
            <strong className="text-fg">Ready-Made Catalog Items:</strong> Subject to our standard 7-day guarantee. If an item arrives damaged, defective, or incorrect, we will issue a free reprint or full refund within 5–7 business days upon receipt of photographic proof.
          </p>
          <p>
            <strong className="text-fg">Bespoke Custom Prints:</strong> Made-to-order custom manufacturing begins immediately upon file slicing and bed allocation. Custom prints cannot be cancelled or returned once printing commences, except where the finished piece fails to meet agreed CAD dimensions within our standard engineering tolerances.
          </p>
        </div>
      ),
    },
    {
      icon: Scale,
      title: "8. Limitation of Liability",
      body: (
        <div className="space-y-2 text-sm text-muted leading-relaxed">
          <p>
            To the maximum extent permitted by applicable Indian law, {brandName} and its directors, employees, or contractors shall not be liable for any indirect, incidental, punitive, or consequential damages resulting from the use or inability to use our manufactured products or website. In all circumstances, our maximum aggregate liability shall not exceed the net purchase price paid by the customer for the specific product or order giving rise to the claim.
          </p>
        </div>
      ),
    },
    {
      icon: Globe,
      title: "9. Governing Law, Exclusive Jurisdiction & Dispute Resolution",
      body: (
        <div className="space-y-2 text-sm text-muted leading-relaxed">
          <p>
            These Terms, commercial purchase agreements, and any disputes or claims arising out of or in connection with them shall be governed by and construed in accordance with the substantive laws of the Republic of India.
          </p>
          <p>
            The parties irrevocably submit to the exclusive territorial jurisdiction of the competent courts of <strong className="text-fg">Mumbai, Maharashtra, India</strong> for all legal disputes and proceedings.
          </p>
        </div>
      ),
    },
  ];

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 md:px-6 md:py-20 animate-in fade-in duration-300 space-y-10">
      <div>
        <div className="inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/10 px-3.5 py-1 text-xs font-semibold text-accent">
          <Scale className="size-3.5" />
          <span>Statutory Terms &amp; Conditions</span>
        </div>
        <h1 className="mt-4 font-display text-4xl sm:text-5xl font-semibold tracking-tight text-fg">
          Terms &amp; Conditions
        </h1>
        <p className="mt-2 text-sm text-muted">
          Governing manufactured goods, custom CAD engineering, shop orders, and mandatory consumer safety disclaimers.
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

        <div className="rounded-3xl border border-border bg-surface-2/60 p-6 sm:p-7 space-y-2">
          <h3 className="font-display text-base font-semibold text-fg flex items-center gap-2">
            <HelpCircle className="size-4.5 text-accent" />
            <span>Questions &amp; Grievances</span>
          </h3>
          <p className="text-sm text-muted leading-relaxed">
            Inquiries regarding our commercial terms, enterprise prototyping orders, or statutory compliance may be addressed directly to our team at{" "}
            <a href={`mailto:${contactEmail}`} className="text-accent underline font-medium">
              {contactEmail}
            </a>{" "}
            or to our designated Grievance Officer at{" "}
            <a href="mailto:grievance@prynth.in" className="text-accent underline font-medium">
              grievance@prynth.in
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  );
}

