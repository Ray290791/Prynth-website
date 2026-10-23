import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useRef } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  Sparkles,
  ShieldCheck,
  Send,
  Upload,
  Camera,
  X,
  FileCheck,
  HelpCircle,
  ChevronDown,
  Layers,
  ArrowLeft,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatINR } from "@/lib/format";
import { toast } from "sonner";
import {
  getServiceBySlug,
  getServicesPublic,
  type ServiceRecord,
  type ServiceProcessStep,
  type ServiceExample,
} from "@/lib/services-fns";
import { getServiceIcon } from "@/components/services-dropdown";
import { submitCustomDesignRequest } from "@/lib/contact-fns";
import { useCurrentUser } from "@/lib/auth/use-current-user";
import { compressImageDataUrl } from "@/lib/image-utils";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/services/$slug")({
  loader: async ({ params }) => {
    const service = await getServiceBySlug({ data: params.slug });
    if (!service) throw new Error("Service not found");
    const allServices = await getServicesPublic();
    return { service, allServices };
  },
  head: ({ loaderData }) => {
    if (!loaderData?.service) return { meta: [{ title: "Service Not Found | Prynth" }] };
    const s = loaderData.service;
    return {
      links: [
        { rel: "canonical", href: `https://prynth.in/services/${s.slug}` },
      ],
      meta: [
        { title: `${s.title} — 3D Printing & Design Services India | Prynth` },
        { name: "description", content: `${s.short_desc} Custom on-demand additive manufacturing and CAD services across India by Prynth.` },
        { property: "og:title", content: `${s.title} | Prynth 3D Services India` },
        { property: "og:description", content: s.short_desc },
        { property: "og:url", content: `https://prynth.in/services/${s.slug}` },
      ],
    };
  },
  component: ServiceDetailPage,
});

function ServiceDetailPage() {
  const { service, allServices } = Route.useLoaderData();
  const user = useCurrentUser();
  const formRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const serviceJsonLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    "name": service.title,
    "description": service.full_desc || service.short_desc,
    "provider": {
      "@type": "LocalBusiness",
      "name": "Prynth",
      "url": "https://prynth.in",
    },
    "serviceType": "3D Printing & Additive Manufacturing",
    "areaServed": "India",
    "offers": {
      "@type": "Offer",
      "priceCurrency": "INR",
      "price": service.starting_price,
      "url": `https://prynth.in/services/${service.slug}`,
    },
  };

  // Quote / Request Form State
  const [name, setName] = useState(user?.displayName || "");
  const [email, setEmail] = useState(user?.primaryEmail || "");
  const [phone, setPhone] = useState("");
  const [idea, setIdea] = useState("");
  const [material, setMaterial] = useState("PETG");
  const [quantity, setQuantity] = useState(1);
  const [photos, setPhotos] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedTicketId, setSubmittedTicketId] = useState<number | null>(null);

  if (!service) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-24 text-center">
        <h1 className="font-display text-3xl font-bold">Service Not Found</h1>
        <p className="mt-2 text-muted">The requested engineering service could not be located.</p>
        <Button asChild className="mt-6">
          <Link to="/services">View All Services</Link>
        </Button>
      </div>
    );
  }

  const Icon = getServiceIcon(service.icon);
  const otherServices = (allServices || []).filter((s: ServiceRecord) => s.slug !== service.slug).slice(0, 3);

  const scrollToForm = () => {
    formRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    if (photos.length + files.length > 5) {
      toast.error("You can attach up to 5 reference photos.");
      return;
    }

    const readers = files.map((file) => {
      return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async () => {
          try {
            const rawUrl = reader.result as string;
            // Compress photo to lightweight thumbnail
            const compressed = await compressImageDataUrl(rawUrl, 1024, 0.75);
            resolve(compressed);
          } catch {
            resolve(reader.result as string);
          }
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    });

    try {
      const newUrls = await Promise.all(readers);
      setPhotos((prev) => [...prev, ...newUrls].slice(0, 5));
      toast.success(`${files.length} photo(s) attached`);
    } catch {
      toast.error("Failed to process one or more photos.");
    }
  };

  const removePhoto = (idx: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes("@")) {
      toast.error("Please enter a valid email address.");
      return;
    }
    if (!idea.trim() && photos.length === 0) {
      toast.error("Please describe your requirements or attach at least one photo.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await submitCustomDesignRequest({
        data: {
          name: name.trim() || undefined,
          email: email.trim().toLowerCase(),
          phone: phone.trim() || undefined,
          idea: `[Service: ${service.title}]\n\n${idea.trim()}`,
          materialName: material,
          quantity,
          photos,
          specsSummary: `Service Inquiry: ${service.title} (From ₹${service.starting_price}, Est: ${service.turnaround})`,
        },
      });

      setSubmittedTicketId(res.ticketId);
      toast.success("Inquiry sent successfully! Our team will review and reply with an exact quotation.");
    } catch (err: any) {
      toast.error(err.message || "Failed to submit request. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="pb-24">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceJsonLd) }}
      />
      {/* ── Breadcrumb & Back Link ─────────────────────────── */}
      <div className="border-b border-border/50 bg-surface/30">
        <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-3 text-xs text-subtle md:px-6">
          <Link to="/services" className="hover:text-fg transition-colors">
            Services
          </Link>
          <span>/</span>
          <span className="text-fg font-medium">{service.title}</span>
        </div>
      </div>

      {/* ── Hero Section ───────────────────────────────────── */}
      <section className="relative overflow-hidden border-b border-border/60 bg-surface/40 py-12 md:py-20">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 md:px-6 md:grid-cols-12 lg:gap-14">
          <div className="md:col-span-7 lg:col-span-8">
            <div className="flex items-center gap-2 mb-3">
              <span className="rounded-full bg-accent/15 px-3 py-0.5 text-xs font-semibold text-accent">
                {service.badge || "Engineering Service"}
              </span>
              <span className="text-xs text-muted">·</span>
              <span className="text-xs text-muted flex items-center gap-1">
                <Clock className="size-3.5" />
                {service.turnaround} typical turnaround
              </span>
            </div>

            <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-fg">
              {service.title}
            </h1>
            <p className="mt-3 text-lg font-medium text-accent">
              {service.tagline}
            </p>
            <p className="mt-4 text-base text-muted leading-relaxed max-w-2xl">
              {service.full_desc}
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Button size="lg" onClick={scrollToForm} className="gap-2 shadow-xs cursor-pointer">
                <span>Inquire &amp; Get Quotation</span>
                <ArrowRight className="size-4" />
              </Button>
              <Button asChild variant="outline" size="lg" className="cursor-pointer">
                <Link to="/custom" search={{ path: "upload" }}>
                  <span>Upload Existing STL/STEP</span>
                </Link>
              </Button>
            </div>
          </div>

          {/* Service Snapshot Card */}
          <div className="md:col-span-5 lg:col-span-4">
            <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
              <div className="flex size-14 items-center justify-center rounded-xl border border-border bg-surface-2 text-accent mb-4">
                <Icon className="size-7" strokeWidth={1.8} />
              </div>
              <h3 className="text-sm font-semibold tracking-wider uppercase text-subtle">
                Service Parameters
              </h3>

              <div className="mt-4 space-y-3 divide-y divide-border/60 text-sm">
                <div className="pt-2 flex justify-between items-center">
                  <span className="text-muted">Starting Fee</span>
                  <strong className="text-fg font-bold text-base tabular-nums">
                    {formatINR(service.starting_price)}
                  </strong>
                </div>
                <div className="pt-2 flex justify-between items-center">
                  <span className="text-muted">Turnaround</span>
                  <span className="text-fg font-medium">{service.turnaround}</span>
                </div>
                <div className="pt-2 flex justify-between items-center">
                  <span className="text-muted">Layer Resolution</span>
                  <span className="text-fg font-mono font-medium">0.08mm – 0.28mm</span>
                </div>
                <div className="pt-2 flex justify-between items-center">
                  <span className="text-muted">Production Fleet</span>
                  <span className="text-fg font-medium">Bambu Lab CoreXY</span>
                </div>
                <div className="pt-2 flex justify-between items-center">
                  <span className="text-muted">Coverage</span>
                  <span className="text-fg font-medium">All India Delivery</span>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-border/80">
                <Button variant="secondary" className="w-full cursor-pointer" onClick={scrollToForm}>
                  <span>Request Assessment</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Key Deliverables & Engineering Features ────────── */}
      <section className="mx-auto max-w-6xl px-4 py-16 md:px-6">
        <div className="grid gap-12 lg:grid-cols-2">
          {/* Deliverables */}
          <div className="rounded-2xl border border-border bg-surface p-6 sm:p-8 shadow-xs">
            <div className="inline-flex items-center gap-2 rounded-lg bg-surface-2 px-3 py-1 text-xs font-semibold text-fg mb-4">
              <FileCheck className="size-4 text-accent" />
              <span>What You Receive</span>
            </div>
            <h2 className="font-display text-2xl font-bold tracking-tight text-fg">
              Included Deliverables
            </h2>
            <p className="mt-2 text-sm text-muted">
              Every project comes with full documentation, verified files, and manufacturing-ready assets:
            </p>

            <ul className="mt-6 space-y-3.5">
              {(service.deliverables || []).map((item: string) => (
                <li key={item} className="flex items-start gap-3">
                  <div className="size-5 shrink-0 rounded-full bg-accent/15 flex items-center justify-center text-accent mt-0.5">
                    <Check className="size-3" strokeWidth={2.5} />
                  </div>
                  <span className="text-sm font-medium text-fg">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Engineering Features */}
          <div className="rounded-2xl border border-border bg-surface p-6 sm:p-8 shadow-xs">
            <div className="inline-flex items-center gap-2 rounded-lg bg-surface-2 px-3 py-1 text-xs font-semibold text-fg mb-4">
              <ShieldCheck className="size-4 text-accent" />
              <span>Technical Standards</span>
            </div>
            <h2 className="font-display text-2xl font-bold tracking-tight text-fg">
              Design &amp; Quality Features
            </h2>
            <p className="mt-2 text-sm text-muted">
              Engineered according to rigorous additive manufacturing standards:
            </p>

            <ul className="mt-6 space-y-3.5">
              {(service.features || []).map((feat: string) => (
                <li key={feat} className="flex items-start gap-3">
                  <div className="size-5 shrink-0 rounded-full bg-accent/15 flex items-center justify-center text-accent mt-0.5">
                    <Sparkles className="size-3" />
                  </div>
                  <span className="text-sm font-medium text-fg">{feat}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ── Process Steps ──────────────────────────────────── */}
      {service.process_steps && service.process_steps.length > 0 && (
        <section className="border-y border-border/60 bg-surface/30 py-16 md:py-20">
          <div className="mx-auto max-w-6xl px-4 md:px-6">
            <div className="text-center max-w-xl mx-auto mb-12">
              <p className="text-[11px] font-medium tracking-[0.18em] text-accent uppercase">
                Step-by-Step
              </p>
              <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight text-fg">
                The Engineering Workflow
              </h2>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {service.process_steps.map((st: ServiceProcessStep) => (
                <div key={st.step} className="rounded-xl border border-border bg-surface p-5 shadow-xs">
                  <div className="font-mono text-xs font-bold text-accent mb-2">
                    PHASE {st.step}
                  </div>
                  <h3 className="font-semibold text-fg text-base">{st.title}</h3>
                  <p className="text-xs text-muted mt-2 leading-relaxed">
                    {st.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Real-World Examples ────────────────────────────── */}
      {service.examples && service.examples.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-16 md:px-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
            <div>
              <p className="text-[11px] font-medium tracking-[0.18em] text-accent uppercase">
                Case Studies
              </p>
              <h2 className="mt-1 font-display text-2xl sm:text-3xl font-semibold tracking-tight text-fg">
                Real-World Applications
              </h2>
            </div>
            <p className="text-xs text-muted max-w-md">
              A sample of custom components designed, refined, and manufactured for our clients across India.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {service.examples.map((ex: ServiceExample) => (
              <div
                key={ex.title}
                className="rounded-2xl border border-border bg-surface p-6 shadow-xs space-y-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-display text-lg font-bold text-fg">{ex.title}</h3>
                  {ex.badge && (
                    <span className="rounded-full bg-surface-2 border border-border px-2.5 py-0.5 text-[10px] font-semibold text-muted">
                      {ex.badge}
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted leading-relaxed">{ex.description}</p>
                {ex.specs && (
                  <div className="pt-2 border-t border-border/50 text-xs text-accent font-medium">
                    {ex.specs}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Interactive Quote & Inquiry Form ────────────────── */}
      <section ref={formRef} className="mx-auto max-w-4xl px-4 py-12 md:px-6">
        <div className="rounded-3xl border border-border bg-surface p-6 sm:p-10 shadow-lg">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/15 px-3 py-1 text-xs font-semibold text-accent">
              <Sparkles className="size-3.5" />
              <span>Direct Engineering Assessment</span>
            </span>
            <h2 className="mt-3 font-display text-2xl sm:text-3xl font-bold tracking-tight text-fg">
              Obtain This Service: {service.title}
            </h2>
            <p className="mt-2 text-sm text-muted leading-relaxed">
              Describe your project, board specs, or broken part. Our design engineers will evaluate the requirements, verify printability, and email you a free technical assessment and transparent quote.
            </p>
          </div>

          {submittedTicketId ? (
            <div className="mt-8 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-6 text-center">
              <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-emerald-500 text-ink">
                <Check className="size-6" strokeWidth={3} />
              </div>
              <h3 className="mt-4 font-display text-xl font-bold text-fg">
                Inquiry Received! Ticket #{submittedTicketId}
              </h3>
              <p className="mt-2 text-sm text-muted max-w-md mx-auto">
                Thank you! We have sent a confirmation email to <strong>{email}</strong>. Our CAD engineering team will review your specifications and contact you with a 3D preview and quotation.
              </p>
              <div className="mt-6 flex justify-center gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSubmittedTicketId(null);
                    setIdea("");
                    setPhotos([]);
                  }}
                >
                  Submit Another Request
                </Button>
                <Button asChild>
                  <Link to="/profile">View In Dashboard</Link>
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-8 space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="req-name">Your Name</Label>
                  <Input
                    id="req-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Rahul Sharma"
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="req-email">
                    Email Address <span className="text-danger">*</span>
                  </Label>
                  <Input
                    id="req-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="rahul@example.com"
                    className="mt-1.5"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <Label htmlFor="req-phone">Phone / WhatsApp (Optional)</Label>
                  <Input
                    id="req-phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="req-material">Preferred Polymer</Label>
                  <select
                    id="req-material"
                    value={material}
                    onChange={(e) => setMaterial(e.target.value)}
                    className="mt-1.5 h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm text-fg shadow-2xs focus:border-accent focus:outline-none"
                  >
                    <option value="PETG">PETG (Durable &amp; Moisture Resistant)</option>
                    <option value="PLA">PLA (Detail &amp; Desk Aesthetic)</option>
                    <option value="ABS">ABS (High Temperature 85°C)</option>
                    <option value="ASA">ASA (Outdoor &amp; UV Stable)</option>
                    <option value="Unsure">Recommend For Me</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="req-qty">Quantity Needed</Label>
                  <Input
                    id="req-qty"
                    type="number"
                    min={1}
                    max={1000}
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    className="mt-1.5"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="req-idea">
                  Project Details, Dimensions or Description <span className="text-danger">*</span>
                </Label>
                <Textarea
                  id="req-idea"
                  required
                  rows={4}
                  value={idea}
                  onChange={(e) => setIdea(e.target.value)}
                  placeholder={`Describe your requirements for ${service.title}. Include dimensions, port locations, mounting preferences, or appliance model if known...`}
                  className="mt-1.5"
                />
              </div>

              {/* Photo & Drawing Attachments */}
              <div>
                <Label>Reference Photos, Sketches or Schematics (Up to 5)</Label>
                <div className="mt-2 flex flex-wrap gap-3">
                  {photos.map((p, idx) => (
                    <div
                      key={idx}
                      className="relative size-20 rounded-xl border border-border overflow-hidden bg-surface-2 group"
                    >
                      <img src={p} alt="Attachment" className="size-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removePhoto(idx)}
                        className="absolute top-1 right-1 size-5 rounded-full bg-black/70 text-white flex items-center justify-center hover:bg-danger transition-colors cursor-pointer"
                      >
                        <X className="size-3" />
                      </button>
                    </div>
                  ))}

                  {photos.length < 5 && (
                    <label className="flex size-20 flex-col items-center justify-center rounded-xl border-2 border-dashed border-border hover:border-accent hover:bg-accent/5 transition-colors cursor-pointer text-muted hover:text-accent">
                      <Camera className="size-5" />
                      <span className="text-[10px] mt-1 font-medium">Add Photo</span>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={handlePhotoUpload}
                      />
                    </label>
                  )}
                </div>
                <p className="mt-1.5 text-xs text-subtle">
                  Phone photos of broken parts, napkin sketches with a ruler for scale, or KiCad/PCB exports.
                </p>
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  size="lg"
                  disabled={isSubmitting}
                  className="w-full sm:w-auto gap-2 font-semibold shadow-xs cursor-pointer"
                >
                  <Send className="size-4" />
                  <span>{isSubmitting ? "Submitting Inquiry..." : "Submit Project Assessment Request"}</span>
                </Button>
                <span className="ml-3 text-xs text-muted block sm:inline mt-2 sm:mt-0">
                  Free assessment · Direct response within 1 business day
                </span>
              </div>
            </form>
          )}
        </div>
      </section>

      {/* ── FAQ Section ────────────────────────────────────── */}
      {service.faq.length > 0 && (
        <section className="mx-auto max-w-4xl px-4 py-12 md:px-6">
          <div className="text-center mb-8">
            <h2 className="font-display text-2xl font-bold tracking-tight text-fg">
              Frequently Asked Questions
            </h2>
            <p className="text-xs text-muted mt-1">
              Common inquiries regarding {service.title}
            </p>
          </div>

          <div className="space-y-4">
            {service.faq.map((item, idx) => (
              <details
                key={idx}
                className="group rounded-xl border border-border bg-surface p-4.5 open:border-accent/40 shadow-xs transition-colors"
              >
                <summary className="flex cursor-pointer items-center justify-between font-semibold text-fg group-open:text-accent">
                  <span className="text-sm sm:text-base pr-4">{item.question}</span>
                  <ChevronDown className="size-4 shrink-0 transition-transform duration-200 group-open:rotate-180" />
                </summary>
                <p className="mt-3 text-xs sm:text-sm text-muted leading-relaxed border-t border-border/50 pt-3">
                  {item.answer}
                </p>
              </details>
            ))}
          </div>
        </section>
      )}

      {/* ── Other Services ─────────────────────────────────── */}
      {otherServices.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-12 md:px-6 border-t border-border/60">
          <h2 className="font-display text-xl font-bold text-fg mb-6">
            Other Engineering &amp; Additive Services
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
            {otherServices.map((srv) => {
              const SrvIcon = getServiceIcon(srv.icon);
              return (
                <Link
                  key={srv.slug}
                  to="/services/$slug"
                  params={{ slug: srv.slug }}
                  className="group rounded-xl border border-border bg-surface p-4 shadow-xs hover:border-accent/40 hover:bg-surface-2/40 transition-all flex items-start gap-3"
                >
                  <div className="size-10 rounded-lg border border-border bg-surface-2 flex items-center justify-center text-accent shrink-0 group-hover:scale-105 transition-transform">
                    <SrvIcon className="size-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm text-fg group-hover:text-accent transition-colors">
                      {srv.title}
                    </h3>
                    <p className="text-xs text-muted line-clamp-1 mt-0.5">{srv.tagline}</p>
                    <span className="text-[11px] text-accent font-medium mt-1.5 inline-flex items-center gap-1">
                      <span>Explore</span>
                      <ArrowRight className="size-3" />
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
