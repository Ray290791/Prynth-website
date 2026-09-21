import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/terms")({ component: TermsPage });

function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 md:px-6 md:py-16">
      <p className="text-[11px] font-medium tracking-[0.18em] text-subtle uppercase">
        Legal
      </p>
      <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight">Terms & Conditions</h1>
      
      <div className="mt-10 space-y-8 text-muted">
        <section>
          <h2 className="font-display text-2xl font-medium text-fg">1. Agreement to Terms</h2>
          <p className="mt-3 text-sm leading-relaxed">
            By viewing or using this website, you agree to be bound by these Terms and Conditions and our Privacy Policy. If you do not agree with any of these terms, you are prohibited from using or accessing this site.
          </p>
        </section>
        
        <section>
          <h2 className="font-display text-2xl font-medium text-fg">2. Products and Services</h2>
          <p className="mt-3 text-sm leading-relaxed">
            We reserve the right to modify or discontinue any product at any time without notice. We have made every effort to display as accurately as possible the colors and images of our products that appear on the store. We cannot guarantee that your computer monitor's display of any color will be accurate. All 3D printed items inherently feature layer lines and minor surface imperfections as part of the manufacturing process.
          </p>
        </section>
        
        <section>
          <h2 className="font-display text-2xl font-medium text-fg">3. Pricing and Payments</h2>
          <p className="mt-3 text-sm leading-relaxed">
            Prices for our products are subject to change without notice. We reserve the right at any time to modify or discontinue the Service (or any part or content thereof) without notice at any time. We process payments securely via Razorpay.
          </p>
        </section>
        
        <section>
          <h2 className="font-display text-2xl font-medium text-fg">4. Custom Orders</h2>
          <p className="mt-3 text-sm leading-relaxed">
            Custom orders are fulfilled based on the specifications provided by the customer. The customer is responsible for ensuring they have the legal right and intellectual property clearance to reproduce any designs or files submitted for 3D printing. We reserve the right to refuse printing any objects that are dangerous, illegal, or violate intellectual property rights.
          </p>
        </section>
        
        <section>
          <h2 className="font-display text-2xl font-medium text-fg">5. Limitation of Liability</h2>
          <p className="mt-3 text-sm leading-relaxed">
            In no case shall Prynth, our directors, officers, employees, affiliates, agents, contractors, interns, suppliers, service providers or licensors be liable for any injury, loss, claim, or any direct, indirect, incidental, punitive, special, or consequential damages of any kind.
          </p>
        </section>
      </div>
    </div>
  );
}
