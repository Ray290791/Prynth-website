import { describe, it, expect } from "vitest";
import {
  generateBreadcrumbJsonLd,
  generateOrganizationJsonLd,
  generateProductJsonLd,
  generateFaqJsonLd,
} from "../src/lib/jsonld";

describe("G1: Structured Data (JSON-LD) Generators", () => {
  it("generates Schema.org BreadcrumbList with sequential positions", () => {
    const breadcrumbs = generateBreadcrumbJsonLd([
      { name: "Home", url: "/" },
      { name: "Shop", url: "/shop" },
      { name: "Hex Pegboard", url: "/shop/hex-pegboard" },
    ]);

    expect(breadcrumbs["@type"]).toBe("BreadcrumbList");
    expect(breadcrumbs.itemListElement).toHaveLength(3);
    expect(breadcrumbs.itemListElement[0]).toEqual({
      "@type": "ListItem",
      position: 1,
      name: "Home",
      item: "https://prynth.in/",
    });
    expect(breadcrumbs.itemListElement[2]).toEqual({
      "@type": "ListItem",
      position: 3,
      name: "Hex Pegboard",
      item: "https://prynth.in/shop/hex-pegboard",
    });
  });

  it("generates Organization schema with legal and contact details", () => {
    const org = generateOrganizationJsonLd({
      legal_business_name: "Prynth 3D LLP",
      legal_registered_address: "Bandra West, Mumbai 400050",
      support_email: "support@prynth.in",
    });

    expect(org["@type"]).toContain("Organization");
    expect(org["@type"]).toContain("Store");
    expect(org.name).toBe("Prynth");
    expect(org.legalName).toBe("Prynth 3D LLP");
    expect(org.contactPoint[0].email).toBe("support@prynth.in");
    expect(org.address.streetAddress).toBe("Bandra West, Mumbai 400050");
  });

  it("generates complete Product schema with Offer, Shipping, and Return Policy", () => {
    const product = generateProductJsonLd({
      slug: "cable-spine",
      name: "Cable Spine Organizer",
      description: "Articulated magnetic desk cable guide",
      image: "/products/cable-spine.jpg",
      price: 299,
      inStock: true,
      material: "PETG",
      shippingSettings: {
        standard_shipping_fee: 79,
        free_shipping_threshold: 349,
      },
    });

    expect(product["@type"]).toBe("Product");
    expect(product.name).toBe("Cable Spine Organizer");
    expect(product.sku).toBe("cable-spine");
    expect(product.offers["@type"]).toBe("Offer");
    expect(product.offers.price).toBe(299);
    expect(product.offers.priceCurrency).toBe("INR");
    expect(product.offers.availability).toBe("https://schema.org/InStock");

    // Under free threshold (299 < 349): standard fee applied
    expect(product.offers.shippingDetails.shippingRate.value).toBe(79);
    expect(product.offers.hasMerchantReturnPolicy.merchantReturnDays).toBe(7);
  });

  it("applies free shipping rate in Product Offer when price meets threshold", () => {
    const product = generateProductJsonLd({
      slug: "mega-pegboard",
      name: "Mega Studio Pegboard",
      description: "Complete wall organization system",
      image: "/products/mega-pegboard.jpg",
      price: 999,
      inStock: true,
      shippingSettings: {
        standard_shipping_fee: 79,
        free_shipping_threshold: 349,
      },
    });

    // Over free threshold (999 >= 349): shipping is 0
    expect(product.offers.shippingDetails.shippingRate.value).toBe(0);
  });

  it("generates FAQPage schema from Q&A pairs", () => {
    const faq = generateFaqJsonLd([
      { question: "How long does 3D printing take?", answer: "Usually 24–48 hours." },
      { question: "What materials do you print?", answer: "PLA, PETG, ABS, and ASA." },
    ]);

    expect(faq?.["@type"]).toBe("FAQPage");
    expect(faq?.mainEntity).toHaveLength(2);
    expect(faq?.mainEntity[0].name).toBe("How long does 3D printing take?");
    expect(faq?.mainEntity[0].acceptedAnswer.text).toBe("Usually 24–48 hours.");
  });
});
