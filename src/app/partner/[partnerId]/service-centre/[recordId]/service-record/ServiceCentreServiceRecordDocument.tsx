import { PrintButton } from "@/components/PrintButton";
import { PrintFrame } from "@/components/PrintFrame";

export type ServiceRecordLine = {
  description: string;
  hsn?: string;
  quantity: number;
  unit?: string;
  rate: number;
  gstRate: number;
};

const fmtMoney = (n: number) => `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/**
 * Service Centre's "Service Record" document — an exact port of AN-CRM's
 * own SERVICE RECORD print (renderer.tsx's default block list for this doc
 * type: header / company-details / party-details / items-table / totals /
 * terms / signature), per explicit direction that this document should
 * match AN-CRM's layout. No QR — per explicit direction, unlike the
 * workorder document, this one carries none.
 */
export async function ServiceCentreServiceRecordDocument({
  docNumber,
  date,
  status,
  companyName,
  companyAddress,
  companyPhone,
  companyGstin,
  logoUrl,
  termsText,
  customerName,
  customerPhone,
  customerAddress,
  brand,
  model,
  imeiOrSerial,
  issueTitle,
  loggedBy,
  technicalConsultant,
  lines,
  serviceHours,
  supportHotline,
}: {
  docNumber: string;
  date: string;
  status?: string;
  companyName: string;
  companyAddress?: string;
  companyPhone?: string;
  companyGstin?: string | null;
  logoUrl?: string | null;
  termsText?: string | null;
  customerName: string;
  customerPhone?: string;
  customerAddress?: string;
  brand?: string;
  model?: string;
  imeiOrSerial?: string;
  issueTitle?: string;
  loggedBy?: string;
  technicalConsultant?: string;
  lines: ServiceRecordLine[];
  serviceHours?: string | null;
  supportHotline?: string | null;
}) {
  const subtotal = lines.reduce((s, l) => s + l.quantity * l.rate, 0);
  const tax = lines.reduce((s, l) => s + l.quantity * l.rate * (l.gstRate / 100), 0);
  const grandTotal = subtotal + tax;

  const notes = [
    issueTitle && `Issue Reported: ${issueTitle}`,
    loggedBy && `Logged By (CCO): ${loggedBy}`,
    technicalConsultant && `Technical Consultant: ${technicalConsultant}`,
  ]
    .filter(Boolean)
    .join("\n");

  const Row = ({ label, value }: { label: string; value?: string }) =>
    value ? (
      <div className="flex border-b border-gray-100 py-1.5 text-xs">
        <span className="w-32 shrink-0 text-gray-400">{label}</span>
        <span className="text-gray-800">{value}</span>
      </div>
    ) : null;

  const footerBandItems = [
    serviceHours && `Service Hours: ${serviceHours}`,
    supportHotline && `Hotline: ${supportHotline}`,
  ].filter(Boolean) as string[];

  return (
    <div className="mbf-page min-h-screen bg-gray-100 py-8 print:bg-white print:py-0">
      <div className="mx-auto flex max-w-3xl flex-col gap-4 print:max-w-none">
        <div className="flex justify-end print:hidden">
          <PrintButton />
        </div>

        <PrintFrame sizes={["a4", "a5"]}>
        <div className="rounded-2xl bg-white p-10 shadow-sm print:rounded-none print:p-10 print:shadow-none">
        <div className="text-sm text-gray-900">
          <div className="mb-6 flex items-start justify-between border-b pb-4" style={{ borderColor: "#111827" }}>
            <div>
              <h1 className="text-xl font-bold tracking-tight" style={{ color: "#111827" }}>SERVICE RECORD</h1>
              <p className="mt-1 font-mono text-xs font-semibold text-gray-700">{docNumber}</p>
            </div>
            <div className="text-right text-xs text-gray-500">
              <p>Date: {date}</p>
              {status && <p>Status: {status}</p>}
            </div>
          </div>

          <div className="mb-6 flex items-start gap-3">
            <div>
              <p className="mb-1 text-[10px] uppercase tracking-wide text-gray-400">SC Details</p>
              <p className="font-semibold">{companyName}</p>
              {companyAddress && <p className="text-xs text-gray-500">{companyAddress}</p>}
              {companyPhone && <p className="text-xs text-gray-500">{companyPhone}</p>}
              {companyGstin && <p className="text-xs text-gray-500">GSTIN: {companyGstin}</p>}
            </div>
          </div>

          <div className="mb-6">
            <Row label="Customer Name" value={customerName} />
            <Row label="Contact No." value={customerPhone} />
            {customerAddress && <Row label="Address" value={customerAddress} />}
            {brand && <Row label="Brand" value={brand} />}
            {model && <Row label="Model" value={model} />}
            {imeiOrSerial && <Row label="IMEI / Serial No." value={imeiOrSerial} />}
          </div>

          <div className="mb-6 overflow-x-auto">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="border-b-2 bg-gray-50 text-left" style={{ borderColor: "#111827" }}>
                  <th className="py-2 pr-2">Description</th>
                  <th className="py-2 pr-2">HSN</th>
                  <th className="py-2 pr-2 text-right">Qty</th>
                  <th className="py-2 pr-2 text-right">Rate</th>
                  <th className="py-2 pr-2 text-right">Tax %</th>
                  <th className="py-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((l, i) => (
                  <tr key={i} className="border-b border-gray-100">
                    <td className="py-2 pr-2">{l.description}</td>
                    <td className="py-2 pr-2 text-gray-500">{l.hsn || "—"}</td>
                    <td className="py-2 pr-2 text-right">{l.quantity} {l.unit || ""}</td>
                    <td className="py-2 pr-2 text-right">{fmtMoney(l.rate)}</td>
                    <td className="py-2 pr-2 text-right">{l.gstRate}%</td>
                    <td className="py-2 text-right">{fmtMoney(l.quantity * l.rate * (1 + l.gstRate / 100))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mb-6 flex justify-end">
            <div className="w-60 space-y-1 text-xs">
              <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span>{fmtMoney(subtotal)}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Tax</span><span>{fmtMoney(tax)}</span></div>
              <div className="mt-1 flex justify-between border-t pt-1 font-semibold" style={{ borderColor: "#111827", fontSize: "0.95rem" }}>
                <span>Paid Amount</span><span>{fmtMoney(grandTotal)}</span>
              </div>
            </div>
          </div>

          <div className="mb-6 space-y-3">
            {notes && (
              <div className="rounded border border-gray-200 p-3">
                <p className="mb-1 text-[10px] uppercase tracking-wide text-gray-400">Notes</p>
                <p className="whitespace-pre-line text-xs text-gray-600">{notes}</p>
              </div>
            )}
            {termsText?.trim() && (
              <div className="rounded border border-gray-200 p-3">
                <p className="mb-1 text-[10px] uppercase tracking-wide text-gray-400">Terms &amp; Conditions</p>
                <p className="whitespace-pre-line text-[11px] leading-relaxed text-gray-600">{termsText.trim()}</p>
              </div>
            )}
          </div>

          <div>
            <p className="mb-4 text-[11px] font-medium text-gray-700">Signature constitutes agreement to the above terms.</p>
            <div className="flex justify-center gap-16">
              <div className="text-center text-xs text-gray-500">
                <div className="h-10 w-40" />
                <div className="mx-auto w-40 border-t border-gray-300 pt-1">Customer Signature</div>
              </div>
              <div className="text-center text-xs text-gray-500">
                <div className="h-10 w-40" />
                <div className="mx-auto w-40 border-t border-gray-300 pt-1">Authorized Signatory (Service Centre)</div>
              </div>
            </div>
            {footerBandItems.length > 0 && (
              <div className="mt-6 border-t border-gray-200 pt-3 text-center text-[10px] text-gray-400">
                {footerBandItems.join("  •  ")}
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 border-t border-gray-200 pt-4 text-[10px] text-gray-400">
          This is a service record, not a tax invoice.
        </div>
        </div>
        </PrintFrame>
      </div>
    </div>
  );
}
