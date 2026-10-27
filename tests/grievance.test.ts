import { describe, it, expect } from "vitest";
import { processGrievanceSubmission } from "../src/lib/grievance-fns";
import { getSql } from "../src/lib/db";

describe("Consumer Grievance Workflow (Consumer Protection E-Commerce Rules, 2020)", () => {
  it("submits a consumer complaint, generates a ticket number, and establishes 48h and 30d SLAs", async () => {
    const res = await processGrievanceSubmission({
        name: "Test Consumer",
        email: "test.consumer@example.com",
        phone: "+91 98765 43210",
        orderNumber: "PRY-TEST-1234",
        category: "product_defect",
        subject: "Surface defect on custom print",
        description: "The printed tray had layer delamination across the bottom edge. Requesting replacement or refund.",
    });

    expect(res.success).toBe(true);
    expect(res.ticketNumber).toMatch(/^PRY-GRV-\d{4}-[A-Z0-9]+$/);

    const now = Date.now();
    const ackDueDate = new Date(res.acknowledgeDueAt).getTime();
    const resolveDueDate = new Date(res.resolveDueAt).getTime();

    // 48 hours (+/- 10 seconds tolerance for test execution)
    const expectedAckMs = 48 * 60 * 60 * 1000;
    expect(ackDueDate - now).toBeGreaterThan(expectedAckMs - 15000);
    expect(ackDueDate - now).toBeLessThan(expectedAckMs + 15000);

    // 30 days (+/- 10 seconds tolerance)
    const expectedResolveMs = 30 * 24 * 60 * 60 * 1000;
    expect(resolveDueDate - now).toBeGreaterThan(expectedResolveMs - 15000);
    expect(resolveDueDate - now).toBeLessThan(expectedResolveMs + 15000);

    // Verify row was stored in the database
    const sql = await getSql();
    const rows = await sql<{
      ticket_number: string;
      status: string;
      name: string;
      email: string;
      category: string;
    }>`
      SELECT ticket_number, status, name, email, category
      FROM grievance_complaints
      WHERE ticket_number = ${res.ticketNumber}
    `;

    expect(rows.length).toBe(1);
    expect(rows[0].ticket_number).toBe(res.ticketNumber);
    expect(rows[0].status).toBe("submitted");
    expect(rows[0].name).toBe("Test Consumer");
    expect(rows[0].email).toBe("test.consumer@example.com");
    expect(rows[0].category).toBe("product_defect");
  });

  it("submits a DPDP Act 2023 data deletion request and stores it for the admin queue", async () => {
    const res = await processGrievanceSubmission({
      name: "Privacy User",
      email: "privacy.user@example.com",
      category: "data_deletion",
      subject: "Request for personal data erasure under DPDP Act 2023",
      description: "Please delete my uploaded CAD models, contact address, and order history as permitted under DPDP 2023.",
    });

    expect(res.success).toBe(true);
    expect(res.ticketNumber).toMatch(/^PRY-GRV-\d{4}-[A-Z0-9]+$/);

    const sql = await getSql();
    const rows = await sql<{
      ticket_number: string;
      category: string;
    }>`
      SELECT ticket_number, category
      FROM grievance_complaints
      WHERE ticket_number = ${res.ticketNumber}
    `;

    expect(rows.length).toBe(1);
    expect(rows[0].category).toBe("data_deletion");
  });
});
