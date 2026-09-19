import { PrintButton } from "@/components/PrintButton";
import { PrintFrame } from "@/components/PrintFrame";
import { generateTrackingQrDataUrl } from "@/lib/trackingQr";

/**
 * Service Centre's "Print Workorder" document — an exact port of AN-CRM's
 * own WORK_ORDER print (src/app/print/jobsheets/[id]/page.tsx, default
 * blocks: company-details / party-details / terms / signature, no header
 * block so the auto-header fallback always fires), per explicit direction
 * that AN-CRM's workorder print is now the single canonical print action
 * for a workorder (the separate "Intake Receipt" document/button has been
 * removed). Reproduces AN-CRM's own hardcoded gray-scale palette and block
 * order verbatim rather than this app's design tokens, since the ask was a
 * visual match, not a token-ised reinterpretation — the one addition is the
 * "Track Your Repair" QR block (src/lib/trackingQr.ts), which AN-CRM's
 * version never had.
 */
export async function ServiceCentreJobCardDocument({
  partnerId,
  trackingCode,
  docNumber,
  date,
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
  warrantyStatus,
  remark,
}: {
  partnerId: string;
  /** The workorder number — used to build the public tracking QR/URL. */
  trackingCode: string;
  docNumber: string;
  date: string;
  companyName: string;
  companyAddress?: string;
  companyPhone?: string;
  companyGstin?: string | null;
  logoUrl?: string | null;
  /** The partner's resolved workorder Terms & Conditions — blank prints no Terms card. */
  termsText?: string | null;
  customerName: string;
  customerPhone?: string;
  customerAddress?: string;
  brand?: string;
  model?: string;
  imeiOrSerial?: string;
  issueTitle?: string;
  /** Label for the workorder's `warrantyStatus` field (e.g. "In Warranty (IW)") — already resolved by the caller. */
  warrantyStatus?: string;
  /** The SC's own free-text Remark entered at workorder creation — the only thing that ever prints under "Notes". */
  remark?: string;
}) {
  const trackingQrDataUrl = await generateTrackingQrDataUrl(partnerId, trackingCode);

  // Notes prints only the SC's own free-text Remark from workorder creation —
  // never a rollup of other fields (those now print in their own rows above).
  const notes = remark?.trim() || "";

  const Row = ({ label, value }: { label: string; value?: string }) =>
    value ? (
      <div className="flex border-b border-gray-200 py-1 text-xs">
        <span className="w-32 shrink-0 text-gray-400">{label}</span>
        <span className="text-gray-800">{value}</span>
      </div>
    ) : null;

  const brandModel = [brand, model].filter(Boolean).join(" ");

  return (
    <div className="mbf-page min-h-screen bg-gray-100 py-8 print:bg-white print:py-0">
      <div className="mx-auto flex max-w-3xl flex-col gap-4 print:max-w-none">
        <div className="flex justify-end print:hidden">
          <PrintButton />
        </div>

        <PrintFrame sizes={["a4", "a5"]}>
        <div className="rounded-2xl bg-white p-10 shadow-sm print:rounded-none print:p-8 print:shadow-none">
        <div className="text-sm text-gray-900">
          <div className="mb-4 border-b-2 pb-4" style={{ borderColor: "#111827" }}>
            <h1 className="mb-3 text-center text-xl font-bold tracking-tight" style={{ color: "#111827" }}>
              WORK ORDER
            </h1>
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                {logoUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={logoUrl} alt={companyName} className="h-12 w-12 shrink-0 rounded object-contain" />
                )}
                <div>
                  <p className="font-semibold">{companyName}</p>
                  {companyAddress && <p className="text-xs text-gray-500">{companyAddress}</p>}
                  {companyPhone && <p className="text-xs text-gray-500">{companyPhone}</p>}
                  {companyGstin && <p className="text-xs text-gray-500">GSTIN: {companyGstin}</p>}
                </div>
              </div>
              <div className="text-right text-xs text-gray-500">
                <p className="font-mono text-xs font-semibold text-gray-700">{docNumber}</p>
                <p>Date: {date}</p>
              </div>
            </div>
          </div>

          <div className="mb-4">
            <Row label="Customer Name" value={customerName} />
            <Row label="Contact No." value={customerPhone} />
            {customerAddress && <Row label="Address" value={customerAddress} />}
            {brandModel && <Row label="Brand / Model" value={brandModel} />}
            {imeiOrSerial && <Row label="IMEI / Serial No." value={imeiOrSerial} />}
            {warrantyStatus && <Row label="Warranty Status" value={warrantyStatus} />}
            {issueTitle && <Row label="Issue Reported" value={issueTitle} />}
          </div>

          {notes && (
            <div className="mb-4 rounded border-2 border-gray-300 p-3">
              <p className="mb-1 text-[10px] uppercase tracking-wide text-gray-400">Notes</p>
              <p className="whitespace-pre-line text-xs text-gray-600">{notes}</p>
            </div>
          )}

          {termsText?.trim() && (
            <div className="mb-4 border-t-2 pt-3" style={{ borderColor: "#111827" }}>
              <div className="rounded border-2 border-gray-500 p-3">
                <p className="mb-1 text-[10px] uppercase tracking-wide text-gray-400">Terms &amp; Conditions</p>
                <p className="whitespace-pre-line text-[9px] leading-snug text-gray-600">{termsText.trim()}</p>
              </div>
            </div>
          )}

          <div className="mb-4 border-t-2 pt-4" style={{ borderColor: "#111827" }}>
            <p className="mb-6 text-[11px] font-medium text-gray-700">Signature constitutes agreement to the above terms.</p>
            <div className="flex justify-between">
              <div className="text-center text-xs text-gray-500">
                <div className="h-10 w-40" />
                <div className="w-40 border-t-2 border-gray-400 pt-1">Customer Signature</div>
              </div>
              <div className="text-center text-xs text-gray-500">
                <div className="h-10 w-40" />
                <div className="w-40 border-t-2 border-gray-400 pt-1">Authorized Signatory (Service Centre)</div>
              </div>
            </div>
          </div>

          {trackingQrDataUrl && (
            <div className="flex items-center gap-4 rounded border-2 border-gray-300 p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={trackingQrDataUrl} alt="Track your repair" className="h-24 w-24 shrink-0" width={96} height={96} />
              <div className="text-xs text-gray-500">
                <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-700">Track Your Repair</p>
                <p>Scan this code anytime to check your repair status online.</p>
              </div>
            </div>
          )}
        </div>

        <div className="mt-4 border-t-2 border-gray-300 pt-3 text-[10px] text-gray-400">
          This is a service work order and not a tax invoice.
        </div>
        </div>
        </PrintFrame>
      </div>
    </div>
  );
}
