import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/privacy")({ component: PrivacyPage });

function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 md:px-6 md:py-16">
      <p className="text-[11px] font-medium tracking-[0.18em] text-subtle uppercase">
        Legal
      </p>
      <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight">Privacy Policy</h1>
      
      <div className="mt-10 space-y-8 text-muted">
        <section>
          <h2 className="font-display text-2xl font-medium text-fg">1. Information We Collect</h2>
          <p className="mt-3 text-sm leading-relaxed">
            We collect information you provide directly to us, such as when you create or modify your account, request on-demand services, contact customer support, or otherwise communicate with us. This information may include: name, email, phone number, postal address, profile picture, payment method, items requested (for delivery services), and other information you choose to provide.
          </p>
        </section>
        
        <section>
          <h2 className="font-display text-2xl font-medium text-fg">2. How We Use Information</h2>
          <p className="mt-3 text-sm leading-relaxed">
            We may use the information we collect about you to: Provide, maintain, and improve our services; Send you related information, including confirmations and invoices; Send you technical notices, updates, security alerts, and support and administrative messages; Respond to your comments, questions, and requests, and provide customer service.
          </p>
        </section>
        
        <section>
          <h2 className="font-display text-2xl font-medium text-fg">3. Sharing of Information</h2>
          <p className="mt-3 text-sm leading-relaxed">
            We may share the information we collect about you as described in this Statement or as described at the time of collection or sharing, including as follows: With third party service providers to enable them to provide the Services you request; With the general public if you submit content in a public forum, such as blog comments, social media posts, or other features of our Services that are viewable by the general public.
          </p>
        </section>
        
        <section>
          <h2 className="font-display text-2xl font-medium text-fg">4. Security</h2>
          <p className="mt-3 text-sm leading-relaxed">
            We take reasonable measures to help protect information about you from loss, theft, misuse and unauthorized access, disclosure, alteration and destruction. Our payment gateway (Razorpay) handles all credit card and UPI transactions securely; we do not store your raw payment details on our servers.
          </p>
        </section>
        
        <section>
          <h2 className="font-display text-2xl font-medium text-fg">5. Contact Us</h2>
          <p className="mt-3 text-sm leading-relaxed">
            If you have any questions about this Privacy Statement, please contact us at support@prynth.in.
          </p>
        </section>
      </div>
    </div>
  );
}
