/**
 * Translation keys for the PUBLIC marketing pages (homepage, /pricing,
 * /help, /help/modules) — a separate namespace from the Field Force
 * customer/provider dict (src/lib/i18n/dict/*.ts). Kept separate because
 * the content is entirely different (marketing copy/FAQ vs. app UI
 * strings) and the key sets would otherwise collide. Reuses the SAME
 * `Locale` type and the SAME `mbf_ff_locale` cookie/switching mechanism —
 * see src/lib/i18n/publicLocales.ts.
 *
 * Deliberately does NOT cover: dynamic content pulled from the database at
 * request time (PartnerType descriptions/labels, module labels from
 * modules.ts, BUSINESS_TYPE_COPY per-business-type copy, MODULE_TIER_INTRO,
 * plan names/prices) — that's a separate, larger follow-up. This only
 * covers the static page chrome/copy authored directly in page.tsx,
 * pricing/page.tsx, help/page.tsx, and help/modules/page.tsx.
 *
 * Translation quality caveat (same as the Field Force dicts): every
 * dictionary other than English is AI-generated, not reviewed by a native
 * speaker. Good enough to make the page's meaning available to a reader who
 * can't read English at all — get a native-speaker review pass before
 * relying on exact wording for anything legal/financial.
 */
export const en = {
  // Header
  signIn: "Sign in",
  getStarted: "Get started",
  navPricing: "Pricing",
  navTrackMyRepair: "Track My Repair",
  navBookAppointment: "Book Appointment",
  navDownloads: "Downloads",
  navHelp: "Help",
  navContact: "Contact",
  navTerms: "Terms",
  navPrivacy: "Privacy",
  navDesignSystem: "Design system reference",

  // Homepage hero
  heroTitleGenericLine1: "One platform.",
  heroTitleGenericLine2: "The modules your business needs.",
  heroBodyGeneric:
    "Manage workorders, billing, stock and customer workflows from one account. Choose a configured business package, then add the available modules your operations need. Features and connected workflows depend on your selected modules and plan.",
  heroTitleScLine1: "Run your",
  heroTitleScMark: "service centre",
  heroTitleScLine2: "from one screen.",
  heroBodyServiceCentre:
    "Manage repair intake, workorder stages, parts and invoices in one account. Configure your business details, inventory rules and enabled modules before using connected workflows.",
  stageCreated: "Created",
  stageInProgress: "In Progress",
  stageCompleted: "Completed",
  stageClosed: "Closed",
  registerBusiness: "Register your business",
  seePricing: "See pricing",

  // Spotlight module section
  spotlightLabelGeneric: "Spotlight module",
  spotlightLabelSc: "The module",
  spotlightTitle: "Built around the real repair workflow",
  spotlightIntro:
    "Track repair jobs, customer updates and parts through a connected workflow, with access and setup based on your business configuration.",
  featureLifecycleTitle: "Full workorder lifecycle",
  featureLifecycleDesc:
    "Created → In Progress → Completed → Closed, with fault/symptom/solution details and brand/model on every job.",
  featureTrackingTitle: "Public repair tracking",
  featureTrackingDesc:
    "Every workorder gets a shareable tracking link — customers check status without an account or a phone call.",
  featureBillingTitle: "Inventory-linked billing",
  featureBillingDesc:
    "Create invoices from workorder parts and labour. Inventory deductions follow your configured workflow and stock rules; tax invoices require the appropriate business and tax details.",
  featureSetupTitle: "Set up your way, same as every module",
  featureSetupDesc:
    "Use supported Admin controls for fields, labels and catalogs. Review changes against your repair workflow before making them available to staff.",
  signUpAsServiceCentre: "Sign up as Service Centre",

  // Every-business section
  everyBusinessLabel: "Every business, one platform",
  everyBusinessTitle: "Choose a starting package for your business",
  everyBusinessIntro:
    "Each configured package brings together a starting set of modules. Confirm the features, integrations and workflow setup your business needs before onboarding your team.",
  noBusinessTypesAvailable: "No business types are available for signup yet — check back soon.",
  joinOrRequestService: "Join or request a service — free",
  signUpAsPrefix: "Sign up as {label}",
  learnMore: "Learn more",

  // Screenshots section
  seeItInActionTitle: "See it in action",
  seeItInActionIntro: "Real screens from the running app — no mockups.",

  // FAQ
  faqTitle: "Frequently asked questions",
  faq1Q: "What is My Biz Flow?",
  faq1A:
    "My Biz Flow brings business modules such as workorders, billing, inventory and staff management into one account. The workflows available to your business depend on its enabled modules, plan and configuration.",
  faq2Q: "Which kinds of businesses can use it?",
  faq2A:
    "Any business that fits one or more of the platform's modules — Point of Sale, Service Centre (repair/workorder shops), Billing, Clinic, Inventory/Warehouse, and other verticals such as real estate, education, and manufacturing. A business picks a business type at signup, which bundles a starting set of modules; modules can be mixed and matched afterward.",
  faq3Q: "Do I need developers to set this up?",
  faq3A:
    "Supported fields, labels, module access and other routine settings can be managed through Admin. New calculations, integrations and structural changes still require development and testing.",
  faq4Q: "Does My Biz Flow support GST billing?",
  faq4A:
    "Billing includes tax-invoice fields and documents. Confirm your business tax details and the available reporting or provider integrations before relying on a particular compliance workflow.",
  faq5Q: "How does pricing work?",
  faq5A:
    "Plans are tiered by how many users, locations, and modules are included, with pricing shown on the pricing page. All tiers use the same no-code platform — higher tiers unlock more modules and seats, not a different product.",
  scFaq1Q: "What does the Service Centre module actually track?",
  scFaq1A:
    "Every workorder from intake to close: fault/symptom/solution details from a live catalog, brand/model selection, a Created → In Progress → Completed → Closed lifecycle, and the parts and labour line items tied to it.",
  scFaq2Q: "Can customers check on their repair without logging in?",
  scFaq2A:
    "Yes — each workorder gets a public tracking link (no account needed) that shows its current stage, so a customer can check repair status without calling in.",
  scFaq3Q: "Does closing a workorder handle billing and stock automatically?",
  scFaq3A:
    "Create an invoice from workorder parts and labour using the available billing action. Parts consumption follows your configured stock workflow; review the invoice and tax details before issue.",

  // Closing CTA + footer
  readyTitle: "Ready to set up your business?",

  // Pricing page
  plansTitleGeneric: "Plans for every stage",
  plansIntroGeneric:
    "No-code stays no-code at every tier. Pick the kind of business you run to see the modules, tiers, and pricing bundled for it.",
  plansTitleForType: "Plans for {type}",
  changeBusinessType: "← Change business type",
  noCodeStaysNoCode: "No-code stays no-code at every tier.",
  growsCopy: "What changes as you grow is how many modules and seats you get — not whether the builder works.",
  whatYouGetLabel: "What you get",
  pickPlanBelow: "Pick your plan below to get started ↓",
  noBusinessTypesYet: "No business types are available yet — check back soon.",
  seePlans: "See plans →",
  noPlansPublished: "No plans are published yet for this business type — check back soon.",
  mostPopular: "Most popular",
  tierSuffix: "tier",
  perMonth: "/ month",
  launchPricing: "Launch pricing",
  upToUsersLocations: "Up to {users} users · {locations} location(s)",
  modulesIncluded: "Modules included ({count})",
  whatYouGetAtTier: "What you get at {tier}",
  choosePlanPrefix: "Choose {plan}",
  pricingFaqTitle: "Pricing FAQ",
  pricingFaq1Q: "What changes between tiers?",
  pricingFaq1A:
    "The builder itself never changes — every tier is the same no-code platform. What changes is which modules are bundled (a higher tier adds inventory, billing documents, and full accounting/GST tooling on top of the base workflow) and how many users and locations you get.",
  pricingFaq2Q: "Is GST included in the price shown?",
  pricingFaq2A:
    "Prices shown are the plan's base subscription rate. Once you're signed up, GST and non-GST invoicing is available from the Starter tier up — check your plan's included modules above for what's bundled.",
  pricingFaq3Q: "Can I change plans later?",
  pricingFaq3A:
    "Yes — an admin can move a business to a different plan from Plan & Billing inside the partner portal at any time; the modules and seat limits update to match the new plan.",
  pricingFaq4Q: "Are there per-user charges on top of the plan price?",
  pricingFaq4A:
    "No — each plan already includes a maximum user and location count shown on its card. There's no separate per-seat add-on.",

  // Help page
  helpTitle: "Help & Documentation",
  helpIntro:
    "My Biz Flow is a modular, no-code, multi-vertical business/CRM platform. Businesses mix and match modules — POS, Service Centre, Billing, Clinic, and more — on a single account, all built on one shared metadata engine. This page is a general orientation guide; it's visible to any signed-in user, not just admins.",
  seeModuleGuide: "See the full Module Guide →",
  moduleGuideFollowup: "— every module, and what Basic/Pro/Ultimate unlocks for each. Already know which one fits? Head straight to",
  pricingLinkLabel: "Pricing",
  toSeePlans: "to see plans by business type.",
  partnerConceptTitle: "The Partner & module concept",
  partnerConceptBody:
    "A company that signs up is a Partner. Partners don't pick a fixed business \"type\" from a list — they enable the modules relevant to how they operate. A repair shop might enable Service Centre + Inventory + Billing; a clinic might enable Clinic + Billing. Each module owns its own records, fields, and pipeline, but they all share the same underlying platform.",
  sidebarTitle: "Navigating the sidebar",
  sidebarBody:
    "The sidebar nav is grouped by taxonomy. An amber dot marks Brand / multi-location modules, a teal dot marks vertical business modules (the industry-specific ones like POS or Real Estate), and a neutral dot marks cross-cutting modules (Inventory, Accounting) that plug into whichever vertical modules you're running. Click any module to land on its list page.",
  cedTitle: "Create, Edit, and Delete",
  cedBody:
    "Every module follows the same pattern. The list page shows every record in a table with a \"+ New\" button top-right. Clicking a row opens that record's detail page, which shows Edit and Delete in its header. Edit reopens the same form pre-filled with the record's values; Delete asks for confirmation first, naming the record so you don't delete the wrong thing by accident.",
  helpFaqTitle: "FAQ",
  hFaq1Q: "What is My Biz Flow?",
  hFaq1A:
    "A modular, no-code, multi-vertical business/CRM platform. Instead of shipping a separate product per industry, every business runs on one shared metadata engine — modules, fields, pipelines, and dashboards are all config-driven, and a business simply enables the modules it needs.",
  hFaq2Q: "Which module is right for my business?",
  hFaq2A:
    "Start from what your business actually does day to day, not a category label: running repair jobs points at Service Centre, ringing up in-store sales points at POS, and pure invoicing without a shop floor points at Billing — many businesses run more than one at once (a repair shop, for instance, often pairs Service Centre with Inventory and Billing). The Module Guide breaks down every module with its own Basic/Pro/Ultimate feature list so you can compare what each one actually unlocks before choosing.",
  hFaq3Q: "What is a Partner, and what does a module 'type' mean?",
  hFaq3A:
    "A signed-up company on the platform is called a Partner. A Partner doesn't have a fixed 'type' from a hardcoded list — its type is just the set of modules it has enabled (POS, Service Centre, Clinic, and so on). Enabling or disabling a module changes what a Partner can do without changing any code.",
  hFaq4Q: "How do I navigate the sidebar?",
  hFaq4A:
    "The sidebar groups modules by taxonomy: Brand (amber dot) for multi-location/partner hierarchy, Modules (teal dot) for vertical business modules like POS or Clinic, and Cross-cutting (neutral dot) for modules like Inventory that plug into any vertical. Click a module to open its list page.",
  hFaq5Q: "How does Create / Edit / Delete work?",
  hFaq5A:
    "Every module's list page has a \"+ New\" button that opens a create form. Clicking a row opens that record's detail view, which has Edit and Delete actions in the header. Edit opens the same form pre-filled with the record's data. Delete opens a confirmation dialog before anything is removed. In this pass there is no backend wired up yet, so Create/Edit/Delete are demo stubs — the UI and field coverage are real, persistence is a follow-up build.",
  hFaq6Q: "How do I add a custom field?",
  hFaq6A:
    "Custom fields aren't editable from the UI yet in this pass. Every module's admin page (Super Admin only) is scaffolded as the future home for field/pipeline configuration — see a module's \"Admin\" section in the sidebar. Until that editor is built, field sets are defined in code per module and shown in the Designer.",
  hFaq7Q: "What does a module's admin page do?",
  hFaq7A:
    "Each module has an admin/ subfolder gated to Super Admin. It's meant for no-code configuration of that module: custom fields, pipeline/workflow stages, and role permissions. It's scaffolded across all modules today; the actual field/pipeline editor UI is a follow-up build.",
  hFaq8Q: "Who can access admin pages?",
  hFaq8A:
    "Admin pages (anything under a module's admin/ folder, plus platform tools like the Designer) are meant for Super Admins only. Auth/session enforcement isn't wired up yet in this pass, so admin pages show a visible warning banner instead of silently pretending to be protected — that keeps the gap honest until real auth lands.",
  hFaq9Q: "What is the Designer, and why does every page register there?",
  hFaq9A:
    "The Designer (/admin/designer, Super Admin only) lists every page in the product, grouped by module, with a detail view per page showing its purpose and actual source code. Every page in the app calls registerPage() so it's guaranteed to show up there — a page that never registers is a page nobody can find or customize, which the design system treats as a bug.",

  // Module guide
  moduleGuideTitle: "Module Guide",
  moduleGuideIntro:
    "Every module the platform offers, grouped by type. Each one has its own Basic / Pro / Ultimate breakdown — click through to see exactly what each tier unlocks.",
  backToHelp: "← Back to Help",
  taxBusinessModule: "Business Module",
  taxCrossCutting: "Cross-cutting Add-on",
  taxBrand: "Brand / Multi-location",
  basicProUltimate: "Basic · Pro · Ultimate",
};
