import { AppShell } from "@/components/AppShell";
import { registerPage } from "@/lib/designer/registry";
import { HelpAccordion } from "./HelpAccordion";

registerPage({
  id: "platform.partner-help",
  moduleSlug: "platform",
  title: "Help & Tutorials",
  path: "/partner/[partnerId]/help",
  kind: "other",
  superAdminOnly: false,
  customizableRegions: [],
  explanation:
    "Static written help center covering this app's own features (Workorders/Service Centre, Brands/Models/Solutions, Service Centre BOM, Customers, Billing & Invoices, Settings, Telegram Alerts) — an accordion of Q&A entries grouped by topic (HelpAccordion.tsx, a small Client Component so each answer can expand/collapse), no database/model behind it, no tutorial videos yet. Written fresh for My Biz Flow's actual feature set; not a port of any other AN Group product's help content. Reached from the Partner Admin nav group (buildPartnerAdminNavGroups, src/lib/designer/partnerAdminNav.ts) alongside Settings and Subscription.",
  sourceFile: "src/app/partner/[partnerId]/help/page.tsx",
});

export type HelpSection = {
  title: string;
  items: { q: string; a: string }[];
};

const HELP_SECTIONS: HelpSection[] = [
  {
    title: "Getting started",
    items: [
      {
        q: "What's the overall shape of this app?",
        a: "You pick which modules you use (Service Centre, Billing, and whatever else you've enabled) from the Common/Partner Admin nav on the left. Each module has its own records — workorders, invoices, customers — and its own list/detail/document pages, but they all share one Settings, one numbering scheme, and one Telegram alert channel underneath.",
      },
      {
        q: "Where do I set up my business details before printing anything?",
        a: "Settings > Business Profile. Fill in your business name, address, GSTIN, phone, and upload your logo there — every printed Job Card, Estimate, Service Record, and Invoice pulls those fields (and your uploaded logo, once set) directly, so this is worth doing before your first print.",
      },
      {
        q: "Can I add my own bank details or UPI ID so customers can pay me directly?",
        a: "Yes — Settings > Bank Details for account/IFSC info, and Settings > Config for your UPI VPA. Once a UPI ID is set, invoices print a scannable payment QR automatically; bank details print in a dedicated block on the invoice when filled in.",
      },
    ],
  },
  {
    title: "Workorders (Service Centre)",
    items: [
      {
        q: "How do I create a new repair job?",
        a: "Service Centre > New. Enter the customer's details and the device (Brand/Model — pick from your saved list or type a new one on the fly), then save. The workorder record stays open on one detail page through intake, repair, and closure — you don't move between separate screens for each stage.",
      },
      {
        q: "What's the difference between the Job Card, Estimate, and Service Record documents?",
        a: "All three print from the same workorder but serve different moments: the Job Card is the intake receipt (what was handed in, and its condition). The Estimate is a pre-repair quote for the customer to approve before work starts. The Service Record is the post-repair summary of exactly what was done. Each has its own print page (buttons on the workorder detail screen) and its own document number.",
      },
      {
        q: "Where do parts and labour charges on a job come from?",
        a: "From your Service Centre BOM (Bill of Materials) price list — a catalog of parts/services with rate, HSN code, and tax rate you maintain per Brand/Model (or mark Universal to apply to every device). When you add a line item to a workorder, it suggests entries from that list, or lets you type a brand-new one that gets saved back to the BOM.",
      },
      {
        q: "How do I close a job and turn it into an invoice?",
        a: "Once repair is complete and the customer has been informed, use the Close action on the workorder. It generates a GST tax invoice (or a plain Bill, if the job carried no tax) from the same parts/labour lines already on the record — you don't re-enter anything.",
      },
    ],
  },
  {
    title: "Brands, Models, Solutions & Fault/Symptom Codes",
    items: [
      {
        q: "What are these four masters actually for?",
        a: "Brands and Models describe the devices you service (e.g. Brand: Samsung, Model: Galaxy A14) and are what your BOM parts and workorder intake are filed under. Solutions are your library of standard repair procedures/fixes you can attach to a job. Fault Codes and Symptom Codes are short, reusable labels for what's wrong with a device and what the customer reported — using them consistently is what makes your Reports and Analytics meaningful over time, instead of every technician typing something different for the same issue.",
      },
      {
        q: "Do I have to pre-create a Brand/Model before I can use it on a workorder?",
        a: "No — the workorder intake form lets you type a new Brand/Model directly and it gets added to your saved list automatically. Pre-creating them is only useful if you want to attach BOM parts or Solutions to that Brand/Model ahead of time.",
      },
    ],
  },
  {
    title: "Customers",
    items: [
      {
        q: "Do I need to create a Customer record before starting a workorder?",
        a: "No — the workorder intake form captures the customer's name, phone, and address inline, and a returning customer's details autofill from workorder history. The standalone Customers list is for browsing/searching everyone who's ever brought in a device and their full job history, not a gate you must pass through first.",
      },
    ],
  },
  {
    title: "Billing & Invoices",
    items: [
      {
        q: "What's the difference between an Estimate, an Invoice, and a Credit/Debit Note?",
        a: "An Estimate is a pre-work price quote, not a billing document. An Invoice is the actual tax document raised once work is done (from Service Centre, generated on Close, or created directly from the Billing module for non-repair sales). A Credit Note reduces what a customer owes (a refund/correction); a Debit Note increases it (an additional charge after the fact).",
      },
      {
        q: "Why does an invoice show CGST+SGST on one job and IGST on another?",
        a: "It's based on place of supply: if the customer's state matches your own business state (set in Settings), the invoice splits GST into CGST+SGST at half the rate each. If the customer is in a different state, the whole rate is charged as IGST instead. This is computed automatically from your Settings state and the customer's state on the record.",
      },
      {
        q: "Why did an invoice print as a plain 'BILL' instead of a 'TAX INVOICE'?",
        a: "Any invoice that carries zero tax (e.g. a fully warranty/no-charge job) prints as a plain Bill rather than a Tax Invoice — labelling a zero-tax document as a tax invoice would be inaccurate.",
      },
      {
        q: "How do I get my logo, bank details, or a UPI QR to show up on invoices?",
        a: "All three come from Settings: upload your logo under Business Profile, bank details under Bank Details, and your UPI VPA under Config. Each only prints when you've actually filled it in — nothing shows a placeholder value.",
      },
    ],
  },
  {
    title: "Settings",
    items: [
      {
        q: "What lives under Settings?",
        a: "Business Profile (name/address/GSTIN/logo/timezone/currency), Bank Details (for invoices), Config (default labour charge, UPI VPA, Terms & Conditions text), and Numbering (how each document type's number/prefix is generated). If you have the Service Centre module, there's also a read-only summary tab linking back to your Service Centre-specific setup and Telegram connection status.",
      },
      {
        q: "Can I customize the numbering format for invoices vs job cards?",
        a: "Yes — Settings > Numbering lets you override the prefix, starting number, and format per document type (e.g. INV- for B2B invoices, BILL- for B2C, JC- for job cards) instead of using the platform-wide default scheme.",
      },
    ],
  },
  {
    title: "Telegram Alerts",
    items: [
      {
        q: "What do Telegram Alerts actually do?",
        a: "Once you link your Telegram chat (Service Centre > Telegram, generate a code and open it in Telegram), this app can push notifications there — new workorders, status changes, and other events relevant to your business — without needing a dedicated mobile app.",
      },
    ],
  },
];

export default function HelpPage({ params }: { params: { partnerId: string } }) {
  void params;
  return (
    <AppShell topbarTitle="Help & Tutorials">
      <div>
        <h1 className="font-display text-2xl font-bold text-text">Help &amp; Tutorials</h1>
        <p className="mt-1 max-w-[65ch] text-sm text-text-muted">
          Written guides covering how each part of My Biz Flow actually works. Click a question to
          expand its answer.
        </p>

        <HelpAccordion sections={HELP_SECTIONS} />
      </div>
    </AppShell>
  );
}
