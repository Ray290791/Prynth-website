import { createFileRoute, getRouteApi, Link } from "@tanstack/react-router";
import {
  Scale,
  ShieldCheck,
  Clock,
  Mail,
  Building2,
  CheckCircle2,
  Send,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { submitGrievanceComplaint } from "@/lib/grievance-fns";

const rootRoute = getRouteApi("__root__");

export const Route = createFileRoute("/legal")({
  component: LegalPage,
  head: () => ({
    links: [{ rel: "canonical", href: "https://prynth.in/legal" }],
    meta: [
      { title: "Legal Disclosures & Grievance Redressal | Prynth" },
      {
        name: "description",
        content:
          "Official legal entity disclosures, terms compliance, and statutory consumer grievance redressal mechanism for Prynth under Indian E-Commerce Rules.",
      },
    ],
  }),
});

function LegalPage() {
  const { settings } = rootRoute.useLoaderData();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [orderNumber, setOrderNumber] = useState("");
  const [category, setCategory] = useState<
    "product_defect" | "delayed_delivery" | "wrong_item" | "damaged_in_transit" | "refund_issue" | "privacy_data" | "customer_service" | "other"
  >("product_defect");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submittedTicket, setSubmittedTicket] = useState<{
    ticketNumber: string;
    acknowledgeDueAt: string;
    resolveDueAt: string;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !email.trim() || !subject.trim() || !description.trim()) {
      toast.error("Please fill in all required fields.");
      return;
    }

    try {
      setSubmitting(true);
      const res = await submitGrievanceComplaint({
        data: {
          name,
          email,
          phone: phone.trim() || undefined,
          orderNumber: orderNumber.trim() || undefined,
          category,
          subject,
          description,
        },
      });

      setSubmittedTicket(res);
      toast.success(`Complaint registered under Ticket #${res.ticketNumber}`);
    } catch (err: any) {
      console.error("Grievance submission error:", err);
      toast.error(err?.message || "Failed to submit grievance. Please try again or email grievance@prynth.in");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 md:px-6 md:py-16">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="mb-6 flex items-center gap-2 text-xs text-muted">
        <Link to="/" className="hover:text-fg transition-colors">Home</Link>
        <span>/</span>
        <span className="text-fg font-medium">Legal &amp; Grievance</span>
      </nav>

      {/* Header */}
      <div className="space-y-3">
        <div className="inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent-soft px-3 py-1 text-xs font-semibold text-accent">
          <Scale className="size-3.5" />
          Statutory Compliance &amp; Consumer Protection
        </div>
        <h1 className="font-display text-4xl font-semibold tracking-tight text-fg md:text-5xl">
          Legal Disclosures &amp; Grievance Redressal
        </h1>
        <p className="max-w-3xl text-base text-muted leading-relaxed">
          In compliance with the Consumer Protection (E-Commerce) Rules, 2020 and the Information Technology (Intermediary Guidelines) Rules, 2021, the following disclosures detail our legal identity, customer care, and binding dispute redressal workflow.
        </p>
      </div>

      <div className="mt-12 grid gap-10 md:grid-cols-12">
        {/* Left Column: Statutory Information & Identity */}
        <div className="space-y-8 md:col-span-5">
          {/* Business Entity Card */}
          <div className="rounded-2xl border border-border bg-surface p-6 shadow-xs space-y-4">
            <h2 className="font-display text-lg font-semibold flex items-center gap-2 text-fg">
              <Building2 className="size-4 text-accent" />
              Business Identity
            </h2>
            <dl className="space-y-3 text-xs leading-relaxed">
              <div>
                <dt className="text-muted">Legal Business Name</dt>
                <dd className="font-medium text-fg">{settings.legal_name || "Prynth"}</dd>
              </div>
              {settings.legal_entity_type ? (
                <div>
                  <dt className="text-muted">Entity Type</dt>
                  <dd className="font-medium text-fg">{settings.legal_entity_type}</dd>
                </div>
              ) : null}
              {settings.legal_director_name ? (
                <div>
                  <dt className="text-muted">Principal Maker / Founder</dt>
                  <dd className="font-medium text-fg">{settings.legal_director_name}</dd>
                </div>
              ) : null}
              {settings.legal_registered_address ? (
                <div>
                  <dt className="text-muted">Operating / Registered Address</dt>
                  <dd className="font-medium text-fg whitespace-pre-line">{settings.legal_registered_address}</dd>
                </div>
              ) : null}
              {settings.legal_gstin ? (
                <div>
                  <dt className="text-muted">Goods &amp; Services Tax (GSTIN)</dt>
                  <dd className="font-mono font-medium text-fg">{settings.legal_gstin}</dd>
                </div>
              ) : null}
              <div>
                <dt className="text-muted">Country of Origin</dt>
                <dd className="font-medium text-fg">{settings.legal_country_of_origin || "Made in India"}</dd>
              </div>
              <div>
                <dt className="text-muted">Governing Jurisdiction</dt>
                <dd className="font-medium text-fg">{settings.legal_jurisdiction_city || "Mumbai, Maharashtra, India"}</dd>
              </div>
            </dl>
          </div>

          {/* Grievance Officer Card */}
          <div className="rounded-2xl border border-border bg-surface p-6 shadow-xs space-y-4">
            <h2 className="font-display text-lg font-semibold flex items-center gap-2 text-fg">
              <ShieldCheck className="size-4 text-accent" />
              Statutory Grievance Officer
            </h2>
            <p className="text-xs text-muted">
              Appointed under Rule 5(9) of the Consumer Protection (E-Commerce) Rules, 2020.
            </p>
            <dl className="space-y-3 text-xs leading-relaxed">
              {settings.grievance_officer_name ? (
                <div>
                  <dt className="text-muted">Officer Name</dt>
                  <dd className="font-medium text-fg">{settings.grievance_officer_name}</dd>
                </div>
              ) : null}
              <div>
                <dt className="text-muted">Designation</dt>
                <dd className="font-medium text-fg">{settings.grievance_officer_designation || "Grievance Redressal Officer"}</dd>
              </div>
              <div>
                <dt className="text-muted">Grievance Desk Email</dt>
                <dd>
                  <a
                    href={`mailto:${settings.grievance_officer_email || "grievance@prynth.in"}`}
                    className="font-medium text-accent underline hover:text-accent-hover"
                  >
                    {settings.grievance_officer_email || "grievance@prynth.in"}
                  </a>
                </dd>
              </div>
              {settings.grievance_officer_phone ? (
                <div>
                  <dt className="text-muted">Dedicated Business Phone</dt>
                  <dd className="font-medium text-fg">{settings.grievance_officer_phone}</dd>
                </div>
              ) : null}
              {settings.grievance_officer_address ? (
                <div>
                  <dt className="text-muted">Physical Redressal Address</dt>
                  <dd className="font-medium text-fg">{settings.grievance_officer_address}</dd>
                </div>
              ) : null}
            </dl>

            <div className="rounded-xl border border-accent/20 bg-accent-soft p-3.5 space-y-2 text-xs">
              <div className="flex items-center gap-2 font-semibold text-accent">
                <Clock className="size-3.5" />
                Statutory Redressal Timeline Commitments
              </div>
              <ul className="space-y-1 text-muted list-disc list-inside">
                <li><strong className="text-fg">Immediate Acknowledgement:</strong> We issue a formal ticket number and written receipt within 48 hours.</li>
                <li><strong className="text-fg">Final Resolution:</strong> Every complaint is redressed within 30 days (1 calendar month) of receipt.</li>
              </ul>
            </div>
          </div>

          {/* Regular Customer Support */}
          <div className="rounded-2xl border border-border bg-surface p-6 shadow-xs space-y-3">
            <h2 className="font-display text-base font-semibold text-fg">General Customer Inquiries</h2>
            <p className="text-xs text-muted leading-relaxed">
              For order tracking, product recommendations, or standard return requests, write to our regular studio support desk:
            </p>
            <div className="flex items-center gap-2 text-xs font-medium text-fg">
              <Mail className="size-3.5 text-accent" />
              <a href={`mailto:${settings.legal_customer_email || "hello@prynth.in"}`} className="text-accent underline">
                {settings.legal_customer_email || "hello@prynth.in"}
              </a>
            </div>
            {settings.legal_customer_hours && (
              <p className="text-[11px] text-muted">
                Operating Hours: {settings.legal_customer_hours}
              </p>
            )}
          </div>
        </div>

        {/* Right Column: Grievance Submission Form */}
        <div className="md:col-span-7">
          <div className="rounded-2xl border border-border bg-surface p-6 sm:p-8 shadow-xs">
            {submittedTicket ? (
              <div className="text-center py-8 space-y-5">
                <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500">
                  <CheckCircle2 className="size-8" />
                </div>
                <div className="space-y-2">
                  <h2 className="font-display text-2xl font-semibold text-fg">
                    Complaint Successfully Logged
                  </h2>
                  <p className="text-sm text-muted max-w-md mx-auto">
                    Your formal grievance has been entered into our statutory tracking registry. An automated receipt has been dispatched to your email address.
                  </p>
                </div>

                <div className="mx-auto max-w-sm rounded-xl border border-border bg-surface-2 p-4 text-left space-y-2 text-xs">
                  <div className="flex justify-between items-center pb-2 border-b border-border">
                    <span className="text-muted">Ticket Identifier:</span>
                    <span className="font-mono font-bold text-sm text-accent">{submittedTicket.ticketNumber}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted">Acknowledgement SLA:</span>
                    <span className="font-medium text-emerald-600 dark:text-emerald-400">Immediate / Under 48 Hours</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted">Resolution Deadline:</span>
                    <span className="font-medium text-fg">{new Date(submittedTicket.resolveDueAt).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}</span>
                  </div>
                </div>

                <p className="text-xs text-muted max-w-md mx-auto">
                  Our Grievance Redressal Officer will review your submission and communicate updates directly via email. Please keep your ticket identifier for reference.
                </p>

                <Button
                  type="button"
                  onClick={() => {
                    setSubmittedTicket(null);
                    setSubject("");
                    setDescription("");
                    setOrderNumber("");
                  }}
                  variant="outline"
                  className="mt-4"
                >
                  Submit Another Grievance
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <h2 className="font-display text-2xl font-semibold text-fg">
                    File a Consumer Grievance
                  </h2>
                  <p className="mt-1 text-xs text-muted">
                    Submit a formal complaint regarding broken deliveries, defect claims, refund disputes, or privacy concerns.
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="name">Your Full Name *</Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Rahul Sharma"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email Address *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. rahul@example.com"
                      required
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="phone">Phone / Mobile (Optional)</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="e.g. +91 98765 43210"
                    />
                  </div>
                  <div>
                    <Label htmlFor="orderNumber">Order Number (If Applicable)</Label>
                    <Input
                      id="orderNumber"
                      value={orderNumber}
                      onChange={(e) => setOrderNumber(e.target.value)}
                      placeholder="e.g. PRY-ABCD-123"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="category">Complaint Category *</Label>
                  <select
                    id="category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-fg focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                  >
                    <option value="product_defect">Product Defect or Quality Failure</option>
                    <option value="damaged_in_transit">Damaged in Transit / Courier Box Broken</option>
                    <option value="wrong_item">Incorrect Item or Missing Parts</option>
                    <option value="delayed_delivery">Excessive Delivery Delay</option>
                    <option value="refund_issue">Refund / Payment Gateway Dispute</option>
                    <option value="privacy_data">Data Privacy or Personal Information Request</option>
                    <option value="customer_service">Customer Service Issue</option>
                    <option value="other">Other Grievance</option>
                  </select>
                </div>

                <div>
                  <Label htmlFor="subject">Subject / Brief Summary *</Label>
                  <Input
                    id="subject"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="e.g. Layer separation on catch bowl order #PRY-1234"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="description">Detailed Description of Grievance *</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Please explain the issue clearly, including dates, dimensions, and your desired resolution (reprint, replacement, or refund)..."
                    rows={5}
                    required
                  />
                  <p className="mt-1.5 text-[11px] text-muted">
                    After submission, you will receive an automated confirmation email with your ticket number. You can reply directly to that email with photographs or documents.
                  </p>
                </div>

                <div className="rounded-xl border border-border bg-surface-2/40 p-4 text-xs text-muted">
                  By submitting this form, you confirm that the facts stated above are accurate to the best of your knowledge. Your complaint will be processed in accordance with our{" "}
                  <Link to="/privacy" className="text-accent underline">Privacy Policy</Link> and{" "}
                  <Link to="/terms" className="text-accent underline">Terms of Service</Link>.
                </div>

                <Button
                  type="submit"
                  disabled={submitting}
                  size="lg"
                  className="w-full gap-2 font-semibold cursor-pointer shadow-xs"
                >
                  <Send className="size-4" />
                  {submitting ? "Submitting Formal Complaint..." : "Submit Formal Grievance"}
                </Button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
