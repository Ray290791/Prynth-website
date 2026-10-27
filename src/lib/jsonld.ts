/**
 * Standardized Schema.org JSON-LD structured data generators.
 * Adheres to Google Search guidelines & Schema.org specifications.
 * Values are dynamically driven from site settings or product records.
 */

export interface BreadcrumbItem {
  name: string;
  url: string;
}

export function generateBreadcrumbJsonLd(items: BreadcrumbItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": items.map((item, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "name": item.name,
      "item": item.url.startsWith("http") ? item.url : `https://prynth.in${item.url.startsWith("/") ? "" : "/"}${item.url}`,
    })),
  };
}

export function generateOrganizationJsonLd(settings?: {
  legal_business_name?: string;
  legal_registered_address?: string;
  support_email?: string;
  phone_number?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": ["Organization", "Store", "LocalBusiness"],
    "@id": "https://prynth.in/#organization",
    "name": "Prynth",
    "legalName": settings?.legal_business_name || "Prynth 3D Printing Studio",
    "alternateName": ["prynth!", "Prynth 3D", "Prynth India"],
    "url": "https://prynth.in/",
    "logo": "https://prynth.in/brand/mark.png",
    "image": "https://prynth.in/og.jpg",
    "description": "Prynth is an on-demand 3D printing studio based in Mumbai, India offering precision rapid prototyping, functional desk accessories, and custom CAD modeling with nationwide delivery.",
    "contactPoint": [
      {
        "@type": "ContactPoint",
        "email": settings?.support_email || "support@prynth.in",
        "contactType": "customer service",
        "areaServed": "IN",
        "availableLanguage": ["en", "hi"],
      },
    ],
    "address": {
      "@type": "PostalAddress",
      "streetAddress": settings?.legal_registered_address || "Mumbai",
      "addressLocality": "Mumbai",
      "addressRegion": "Maharashtra",
      "postalCode": "400001",
      "addressCountry": "IN",
    },
    "geo": {
      "@type": "GeoCoordinates",
      "latitude": 19.0760,
      "longitude": 72.8777,
    },
    "areaServed": {
      "@type": "Country",
      "name": "India",
    },
    "priceRange": "₹₹",
    "currenciesAccepted": "INR",
    "paymentAccepted": "Cash on Delivery, UPI, Credit Card, Debit Card, Net Banking",
    "sameAs": [
      "https://www.instagram.com/prynth.in",
      "https://twitter.com/prynth_in",
    ],
  };
}

export interface ProductJsonLdOptions {
  slug: string;
  name: string;
  description: string;
  image: string;
  price: number;
  inStock?: boolean;
  material?: string;
  shippingSettings?: {
    standard_shipping_fee?: string | number;
    free_shipping_threshold?: string | number;
  };
}

export function generateProductJsonLd({
  slug,
  name,
  description,
  image,
  price,
  inStock = true,
  material,
  shippingSettings,
}: ProductJsonLdOptions) {
  const standardFee = Number(shippingSettings?.standard_shipping_fee ?? 79) || 79;
  const threshold = Number(shippingSettings?.free_shipping_threshold ?? 349) || 349;
  const effectiveShippingRate = price >= threshold ? 0 : standardFee;

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": name,
    "description": description,
    "image": image.startsWith("http") ? image : `https://prynth.in${image}`,
    "sku": slug,
    "mpn": `PRY-${slug.toUpperCase()}`,
    "brand": {
      "@type": "Brand",
      "name": "Prynth",
    },
    "countryOfOrigin": {
      "@type": "Country",
      "name": "India",
    },
    ...(material ? { "material": material } : {}),
    "offers": {
      "@type": "Offer",
      "url": `https://prynth.in/shop/${slug}`,
      "priceCurrency": "INR",
      "price": price,
      "priceValidUntil": "2027-12-31",
      "availability": inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      "itemCondition": "https://schema.org/NewCondition",
      "seller": {
        "@type": "Organization",
        "name": "Prynth",
      },
      "shippingDetails": {
        "@type": "OfferShippingDetails",
        "shippingRate": {
          "@type": "MonetaryAmount",
          "value": effectiveShippingRate,
          "currency": "INR",
        },
        "shippingDestination": {
          "@type": "DefinedRegion",
          "addressCountry": "IN",
        },
        "deliveryTime": {
          "@type": "ShippingDeliveryTime",
          "handlingTime": {
            "@type": "QuantitativeValue",
            "minValue": 1,
            "maxValue": 2,
            "unitCode": "DAY",
          },
          "transitTime": {
            "@type": "QuantitativeValue",
            "minValue": 2,
            "maxValue": 5,
            "unitCode": "DAY",
          },
        },
      },
      "hasMerchantReturnPolicy": {
        "@type": "MerchantReturnPolicy",
        "applicableCountry": "IN",
        "returnPolicyCategory": "https://schema.org/MerchantReturnFiniteReturnWindow",
        "merchantReturnDays": 7,
        "returnMethod": "https://schema.org/ReturnByMail",
        "returnFees": "https://schema.org/FreeReturn",
      },
    },
  };
}

export function generateFaqJsonLd(faqs: Array<{ question: string; answer: string }>) {
  if (!faqs || faqs.length === 0) return null;
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqs.map((f) => ({
      "@type": "Question",
      "name": f.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": f.answer,
      },
    })),
  };
}

export const generateFAQJsonLd = generateFaqJsonLd;

