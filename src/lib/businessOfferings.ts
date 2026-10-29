import { MODULES, MODULE_SUB_NAV } from "@/lib/designer/modules";
import { getWorkspaceProfiles } from "@/lib/workspaceProfiles";
import scopes from "@/data/business-offering-scope.json";

const publicLimits: Record<string,string> = {
  hotel: "Owner-operated reservations, stays, housekeeping and folio records. Booking-channel/OTA sync, online payments, statutory guest reporting, tax invoicing and separate staff roles are not included. Launch acceptance is pending.",
  "pos": "Offline tills, hardware compatibility and stock synchronisation across sales channels need separate confirmation.",
  "billing": "Bank feeds and automatic government tax filing are not included.",
  "brand": "Confirm your partner hierarchy, location permissions and consolidated reporting requirements.",
  "clinic": "External laboratory, pharmacy and diagnostic integrations are not included.",
  "amc-field-service": "Automatic route optimisation and offline technician workflows are not included.",
  "restaurant-pos": "Confirm kitchen printer support, offline operation and food-delivery aggregator integrations before choosing this package.",
  "subscriptions": "Membership records do not provide automatic payment mandates, failed-payment recovery or every proration rule.",
  "real-estate": "Property portal integrations and automated lead capture from external sites are not included.",
  "rentals": "Supports pooled quantities, recorded partial pickups/returns, release of uncollected units and manual receipts/refunds. Deposits settle after all units are accounted for; prices are not automatically prorated. Reservations retain the contracted window and preparation time; maintenance blocks the whole pool. Inspection attachments, signatures and delivery routing are not included.",
  "education": "Live classes, an online learning system, examination management and a parent application are not included.",
  "manufacturing": "Finite-capacity scheduling and advanced production costing are not included.",
  "wholesale-b2b": "Electronic order exchange and automated logistics integrations are not included.",
  "interior-design": "Advanced CAD/BIM, supplier integrations and automated site execution are not included. Measurement-based BOQ pricing, quotations, invoices and stock consumption are supported.",
  "logistics-fleet": "GPS tracking, telematics and route optimisation are not included.",
  "legal": "Court integrations, trust-account compliance tooling and legal AI are not included.",
  "event-booking": "Public ticket sales, a guest application and automatic settlements are not included.",
  "salon-spa": "Customer acquisition, integrated payment processing and marketing automation are not included.",
  "telecalling": "Telecom, SMS and WhatsApp usage are separate from subscription charges. Unlimited calling is not included.",
  "inventory": "Confirm how receipts, consumption and sales connect to your stock before daily use.",
  "accounting": "Return preparation and exports do not submit returns to government portals. Bank feeds and complete automatic invoice-to-ledger posting are not included.",
  "loyalty-rewards": "Automatic purchase synchronisation across sales channels and marketing automation are not included.",
  "hrms": "Payroll records do not include statutory filing. Employee attendance uses a dedicated login and device location; facial recognition and continuous tracking are not included.",
  "marketplace": "A complete customer storefront, escrow and automated vendor payouts are not included.",
  "field-force": "Provider payouts require manual settlement. Configured transaction charges apply separately."
};
const uniqueLabels=(values:string[])=>[...new Map(values.map(value=>[value.toLowerCase(),value])).values()];

const workflows: Record<string, string[]> = {
  pos:["Set up items and staff","Open the till and record a sale","Record payment, returns and closing totals"],
  "service-centre":["Record an enquiry or workorder","Manage diagnosis, estimates, parts and repair stages","Issue an invoice, record payment and share tracking"],
  billing:["Set up contacts, items and document numbering","Prepare quotations and invoices","Record payments, credit notes and follow outstanding balances"],
  brand:["Set up the brand structure","Maintain partner and location links","Review location records and consolidated oversight"],
  clinic:["Register patients","Schedule a doctor and record the consultation","Create the consultation invoice and follow payment"],
  "amc-field-service":["Record a maintenance contract","Schedule and assign service visits","Record visit completion and review renewals"],
  "restaurant-pos":["Set up tables","Record table orders and kitchen tickets","Settle orders and review sales"],
  subscriptions:["Define membership plans","Enrol members and record renewals","Manage check-ins, freezes and expiry"],
  "real-estate":["List properties","Track enquiries, visits and negotiation","Record agreements, closure or lost opportunities"],
  rentals:["Register each rentable asset","Choose a category, booking window and pricing basis","Record handover, return, damage and refundable deposit"],
  education:["Create courses and batches","Enrol students and record fees","Track attendance and balances"],
  manufacturing:["Define bills of materials and work centres","Create production orders and consume materials","Track production stages and finished output"],
  "wholesale-b2b":["Set up dealer accounts and price tiers","Create and approve orders within credit terms","Follow fulfilment, billing and collections"],
  "interior-design":["Create a project and capture site measurements","Build a measurement-based BOQ with material pricing and wastage","Issue quotation/invoice and track stock consumption"],
  "logistics-fleet":["Register vehicles and drivers","Assign and dispatch trips","Record delivery status and completion"],
  legal:["Register clients and matters","Track case documents, time and activity","Manage engagement and billing records"],
  "event-booking":["Set up venues and resources","Reserve a conflict-free time window","Confirm the event and record payments"],
  "salon-spa":["Define services and stylists","Book and manage appointments","Record service completion and billing"],
  telecalling:["Import and assign leads","Work the call queue and record outcomes","Follow up with configured message templates"],
  inventory:["Set up materials and warehouses","Record receipts, transfers and adjustments","Count stock and review movements and ageing"],
  accounting:["Set up accounts, opening balances and fiscal periods","Record balanced journals and review financial statements","Use the GST workspace for return preparation, ITC and HSN summaries"],
  "loyalty-rewards":["Enrol members","Record points earned and redeemed","Review balances, tiers and the points ledger"],
  hrms:["Register employees and office geofences","Record attendance and manage leave","Prepare payroll records and payslips"],
  marketplace:["Maintain listings and vendor settings","Review partner orders","Reconcile order status and commercial arrangements"],
  "field-force":["Set up services, service providers and coverage","Receive customer bookings and dispatch providers","Record completion, collection and ratings"],
};

export const BUSINESS_OFFERINGS = MODULES.filter(m=>m.slug!=="accounting-gst").map(module=>{
  const scope=scopes.find(s=>s.slug===module.slug);
  const modules=module.slug==='accounting'?['accounting','accounting-gst','billing']:[module.slug];
  const profiles=getWorkspaceProfiles(modules);
  return {
    slug:module.slug, title:module.slug==='accounting'?'Accounting & GST':module.slug==='service-centre'?'Service Centre':module.label,
    summary:scope?.scope??module.description,
    limitation:publicLimits[module.slug]??'Confirm the required repair workflow and plan entitlements for your business. Existing Service Centre operations and pricing remain unchanged.',
    modules, workflow:module.slug==="hotel"?["Configure rooms, capacity and agreed nightly rates","Reserve rooms and check guests in","Settle guest folios, check out and prepare rooms"]:workflows[module.slug],
    features:uniqueLabels([...modules.flatMap(slug=>(MODULE_SUB_NAV[slug]??[]).map(item=>item.label.replace(/^\+ /,''))),...profiles.flatMap(p=>[...p.settings.map(s=>s.label),...p.sources.map(s=>s.label)])]),
    settings:[...new Set(profiles.flatMap(p=>p.settings.map(s=>s.label)))],
    metrics:[...new Set(profiles.flatMap(p=>p.sources.map(s=>s.label)))],
  };
});
export function getBusinessOffering(slug:string) {
  return BUSINESS_OFFERINGS.find(o=>o.slug===(slug==='accounting-gst'?'accounting':slug));
}
