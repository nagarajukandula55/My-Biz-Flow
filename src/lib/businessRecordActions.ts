"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createBusinessRecord, updateBusinessRecord, getBusinessRecord } from "@/lib/businessRecords";
import { getPartner } from "@/lib/partnerData";
import { notifyCentralApiBillingInvoice } from "@/lib/centralApi";
import { requireSessionPartnerId } from "@/lib/requirePartnerSession";
import { withRecordLock } from "@/lib/withRecordLock";
import { applyInvoiceConsumption, finalizeInvoiceItems, hasInventoryLines, planInvoiceConsumption } from "@/lib/invoiceInventory";

/**
 * Every page whose material picker is built from getBomOptionsForPartner
 * (see src/lib/sample-data/bom.ts) — revalidated together whenever a BOM
 * record is created/edited/bulk-imported, so a material added or renamed
 * in BOM shows up immediately everywhere else instead of leaving those
 * pages serving Next's stale Router Cache copy of the options list (the
 * actual bug behind "select a material already in BOM → Material not
 * available / add to BOM first").
 */
function revalidateBomConsumerPaths(partnerId: string) {
  for (const path of [
    "inventory/stock-adjustments",
    "inventory/stock-take",
    "inventory/stock-transfers",
    "inventory/return-orders",
    "inventory/part-orders",
    "inventory/part-planning",
    "manufacturing/bom",
    "manufacturing",
    "wholesale-b2b",
  ]) {
    revalidatePath(`/partner/${partnerId}/${path}`);
  }
}

/**
 * Invoice-number assignment + origin stamp for a manually created Billing
 * invoice. Runs at actual creation time, after any stock check has passed.
 */
async function withInvoiceDefaults(partnerId: string, values: Record<string, unknown>): Promise<Record<string, unknown>> {
  // Assign the real invoice number ONCE, here, at actual creation time —
  // via the same atomic, persisted NumberingCounter (getNextNumber) and
  // the SAME "invoice.b2c"/"invoice.b2b" scope a Service-Centre-workorder-
  // originated invoice uses (see service-centre/[recordId]/actions.ts,
  // createInvoiceFromWorkorderAction), so both origins draw from one
  // shared per-partner sequence and never hand out the same number twice.
  // Previously nothing stored a number at all: the printed document page
  // recomputed one live by counting "billing" rows on every render.
  if (!values["invoiceNumber"]) {
    const { getNextNumber } = await import("@/lib/designer/numbering");
    const isB2B = Boolean(String(values["customerGstin"] ?? "").trim());
    const numberingDocType = isB2B ? "invoice.b2b" : "invoice.b2c";
    const numberingDefaults = isB2B ? { prefix: "INV" } : { prefix: "BILL" };
    values = { ...values, invoiceNumber: await getNextNumber(numberingDocType, partnerId, numberingDefaults) };
  }

  // Stamp the invoice's origin for the Source filter on the Invoices list
  // (billing/page.tsx). This generic action is bound to a Billing invoice
  // only for a directly/manually created one — Service Centre's
  // createInvoiceFromWorkorderAction and the POS checkout action each
  // create their "billing" record via createBusinessRecord directly, with
  // their own "Service Centre"/"POS Sale" invoiceSource, bypassing this
  // function entirely — so "Direct" is correct whenever this path sets it.
  if (!values["invoiceSource"]) {
    values = { ...values, invoiceSource: "Direct" };
  }

  return values;
}

/**
 * Bind with .bind(null, partnerId, moduleSlug) before passing as a
 * RecordForm `action` prop — or .bind(null, partnerId, moduleSlug, urlPath)
 * when moduleSlug (the DB partition key, e.g. "inventory-warehouses")
 * differs from the module's real nested URL segment (e.g.
 * "inventory/warehouses"). This assumed the two always matched — true for
 * every single-segment module (billing, brand, hrms, ...) but false for
 * every nested one, so a hyphenated moduleSlug used unmodified in the
 * post-create redirect below sent the browser to a route that doesn't
 * exist (e.g. /partner/<id>/inventory-warehouses/<recordId> instead of
 * /partner/<id>/inventory/warehouses/<recordId>), landing on not-found.tsx
 * AFTER the record had already been created — the record is real, only the
 * redirect target was wrong. `urlPath` defaults to `moduleSlug` so every
 * existing single-segment caller is unaffected.
 */
export async function createBusinessRecordAction(
  partnerId: string,
  moduleSlug: string,
  values: Record<string, unknown>,
  urlPath: string = moduleSlug
): Promise<void | { error?: string }> {
  // Every module's create/edit/patch form binds this generic action with a
  // partnerId taken from the page's own URL — but a Server Action is its own
  // RPC endpoint, invoked directly rather than through PartnerLayout's
  // requirePartnerSessionForPage gate, so a crafted request could otherwise
  // pass ANY partnerId here regardless of which partner is actually signed
  // in. This was the generic write path behind Service Centre's Brands/
  // Models/Solutions/Fault Codes/Symptom Codes catalogs (and every other
  // module built directly on createBusinessRecord/updateBusinessRecord)
  // trusting the caller-supplied partnerId with nothing to enforce it.
  partnerId = await requireSessionPartnerId(partnerId);
  // Fail-closed GST-invoice gate: a partner without their own GSTIN cannot
  // issue a GST-format tax invoice (buyer GSTIN/HSN/CGST-SGST-IGST split) —
  // only a plain/normal invoice. BillingInvoiceForm already hides the "GST
  // Invoice" toggle client-side when partnerGstin is empty, but that alone
  // doesn't stop a direct/crafted form submission that forces
  // invoiceType: "GST" past the UI, so the same rule is enforced here too.
  if (moduleSlug === "billing" && values["invoiceType"] === "GST") {
    const partner = await getPartner(partnerId);
    if (!partner?.gstin) {
      throw new Error(
        "This business has no registered GSTIN — only a plain (Non-GST) invoice can be created."
      );
    }
  }

  // "Deduct from inventory" lines on a Sales Invoice — stock is checked and
  // deducted under the inventory lock, before the invoice number is drawn, so
  // a shortage creates no invoice and burns no invoice number. Invoices with no opted-in line take the plain
  // path below, unchanged.
  let record: Awaited<ReturnType<typeof createBusinessRecord>>;
  if (moduleSlug === "billing" && hasInventoryLines(values["items"])) {
    // Same "inventory-partner" lock every stock mutation takes, so a concurrent adjustment/sale can't slip between the check and the deduction.
    const result = await withRecordLock("inventory-partner", partnerId, async () => {
      const plan = await planInvoiceConsumption(partnerId, values["items"]);
      if (plan.error) return { error: plan.error };
      const prepared = await withInvoiceDefaults(partnerId, {
        ...values,
        items: finalizeInvoiceItems(values["items"], plan.consumedLineIndexes),
      });
      const created = await createBusinessRecord(partnerId, moduleSlug, prepared);
      await applyInvoiceConsumption(
        partnerId,
        { id: String(created.id), number: String(created["invoiceNumber"] ?? ""), customer: String(created["customer"] ?? "") },
        plan.allocations
      );
      return { record: created };
    });
    if ("error" in result && result.error) return { error: result.error };
    record = (result as { record: typeof record }).record;
  } else {
    record = await createBusinessRecord(
      partnerId,
      moduleSlug,
      moduleSlug === "billing"
        ? await withInvoiceDefaults(
            partnerId,
            // No line opted in — strip the flags so a crafted request can't pre-stamp "inventoryConsumed".
            Array.isArray(values["items"]) ? { ...values, items: finalizeInvoiceItems(values["items"], []) } : values
          )
        : values
    );
  }

  if (moduleSlug === "billing") {
    const partner = await getPartner(partnerId);
    if (partner) {
      const items = Array.isArray(record["items"]) ? (record["items"] as Record<string, unknown>[]) : [];
      const customerContactId = record["customerContactId"] ? String(record["customerContactId"]) : undefined;
      const customerContact = customerContactId
        ? await getBusinessRecord(partnerId, "billing-contacts", customerContactId)
        : undefined;
      // The invoice form now captures the customer's state directly (see
      // BillingInvoiceForm.tsx) — prefer that over the linked contact's
      // stored state, which only existed for invoices typed against a
      // saved contact.
      const customerState = record["customerState"]
        ? String(record["customerState"])
        : customerContact?.["state"]
          ? String(customerContact["state"])
          : undefined;
      await notifyCentralApiBillingInvoice(partner, {
        externalOrderId: String(record.id),
        customer: String(record["customer"] ?? ""),
        customerGstin: record["customerGstin"] ? String(record["customerGstin"]) : undefined,
        customerState,
        items: items.map((it) => ({
          description: String(it["description"] ?? ""),
          quantity: Number(it["quantity"] ?? 0),
          unitPrice: Number(it["unitPrice"] ?? 0),
          taxRate: Number(it["taxRate"] ?? 0),
        })),
        totalAmount: Number(record["totalAmount"] ?? 0),
      });
    }
  }

  revalidatePath(`/partner/${partnerId}/${urlPath}`);
  if (moduleSlug === "billing") {
    revalidatePath(`/partner/${partnerId}/inventory/stock`);
    revalidatePath(`/partner/${partnerId}/inventory/consumption`);
  }
  if (moduleSlug === "inventory-bom") {
    revalidateBomConsumerPaths(partnerId);
  }
  // ?created=1 is read by RecordDetail (via each detail page's own
  // searchParams prop) to render a real "<record> created" acknowledgment
  // on arrival, instead of a silent redirect to the new record.
  redirect(`/partner/${partnerId}/${urlPath}/${record.id}?created=1`);
}

/**
 * Bind with .bind(null, partnerId, moduleSlug, recordKey) — or
 * .bind(null, partnerId, moduleSlug, recordKey, urlPath) when moduleSlug
 * differs from the real nested URL segment. See createBusinessRecordAction's
 * doc comment above for why this exists; same bug, same fix, on the edit path.
 */
export async function updateBusinessRecordAction(
  partnerId: string,
  moduleSlug: string,
  recordKey: string,
  values: Record<string, unknown>,
  urlPath: string = moduleSlug
) {
  partnerId = await requireSessionPartnerId(partnerId);

  // Same fail-closed GST-invoice gate as createBusinessRecordAction above —
  // editing an existing invoice into "GST" format is just as much a bypass
  // path as creating one that way, so it needs the same server-side check.
  if (moduleSlug === "billing" && values["invoiceType"] === "GST") {
    const partner = await getPartner(partnerId);
    if (!partner?.gstin) {
      throw new Error(
        "This business has no registered GSTIN — only a plain (Non-GST) invoice can be created."
      );
    }
  }

  await updateBusinessRecord(partnerId, moduleSlug, recordKey, values);
  revalidatePath(`/partner/${partnerId}/${urlPath}`);
  revalidatePath(`/partner/${partnerId}/${urlPath}/${recordKey}`);
  if (moduleSlug === "inventory-bom") {
    revalidateBomConsumerPaths(partnerId);
  }
  // ?updated=1 — same acknowledgment mechanism as the create action above.
  redirect(`/partner/${partnerId}/${urlPath}/${recordKey}?updated=1`);
}

/**
 * Deleting a BusinessRecord is disabled, full stop — not just hidden from
 * the UI. There is no partner-facing "Delete" button left anywhere in the
 * app (`DeleteBusinessRecordButton` is a permanent no-op), and no separate
 * Super-Admin delete UI exists either, so there is no legitimate caller
 * left for this action. It stays defined (rather than being deleted itself)
 * only so any stray reference fails loudly instead of silently deleting
 * data, in case some other code path is ever wired to call it directly.
 * Records should be archived/marked inactive via a Status field instead.
 */
export async function deleteBusinessRecordAction(
  _partnerId: string,
  _moduleSlug: string,
  _recordKey: string
): Promise<never> {
  throw new Error("Deleting records is not permitted. Mark the record inactive instead.");
}

/**
 * Merges a partial patch into an existing record's data and persists —
 * does NOT redirect (unlike the other actions here), since it's called
 * repeatedly from an already-loaded page (the Service Centre workorder
 * lifecycle's stage/parts/service-line mutations) that manages its own
 * local state and just needs writes to survive a reload. Bind with
 * .bind(null, partnerId, moduleSlug, recordKey).
 */
export async function patchBusinessRecordAction(
  partnerId: string,
  moduleSlug: string,
  recordKey: string,
  patch: Record<string, unknown>
): Promise<void> {
  partnerId = await requireSessionPartnerId(partnerId);
  const existing = await getBusinessRecord(partnerId, moduleSlug, recordKey);
  if (!existing) return;
  await updateBusinessRecord(partnerId, moduleSlug, recordKey, { ...existing, ...patch });
  revalidatePath(`/partner/${partnerId}/${moduleSlug}/${recordKey}`);
}
