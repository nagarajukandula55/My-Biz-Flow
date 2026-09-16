import { PrintButton } from "@/components/PrintButton";
import { PrintFrame } from "@/components/PrintFrame";
import { generateTrackingQrDataUrl, buildTrackingUrl } from "@/lib/trackingQr";

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
  issueDescription,
  workPerformed,
  loggedBy,
  engineerName,
}: {
  partnerId: string;
  /** The workorder number — used to build the public tracking QR/URL. */
  trackingCode: string;
  docNumber: string;
  date: string;
  status?: string;
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
  issueDescription?: string;
  workPerformed?: string;
  loggedBy?: string;
  engineerName?: string;
}) {
  const trackingQrDataUrl = await generateTrackingQrDataUrl(partnerId, trackingCode);

  const notes = [
    issueTitle && `Issue Reported: ${issueTitle}`,
    issueDescription && `Issue: ${issueDescription}`,
    workPerformed && `Work performed: ${workPerformed}`,
    loggedBy && `Logged By (CCO): ${loggedBy}`,
    engineerName && `Engineer: ${engineerName}`,
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
              <h1 className="text-xl font-bold tracking-tight" style={{ color: "#111827" }}>WORK ORDER</h1>
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
          </div>

          {trackingQrDataUrl && (
            <div className="mt-6 flex items-center gap-4 rounded border border-gray-200 p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={trackingQrDataUrl} alt="Track your repair" className="h-24 w-24 shrink-0" width={96} height={96} />
              <div className="text-xs text-gray-500">
                <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-700">Track Your Repair</p>
                <p>Scan this code anytime to check your repair status online.</p>
                <p className="mt-1 break-all font-mono">{buildTrackingUrl(partnerId, trackingCode)}</p>
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 border-t border-gray-200 pt-4 text-[10px] text-gray-400">
          This is a service work order and not a tax invoice.
        </div>
        </div>
        </PrintFrame>
      </div>
    </div>
  );
}
