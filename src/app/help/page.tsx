import Link from "next/link";
import { LogoMark } from "@/components/LogoMark";
import { registerPage } from "@/lib/designer/registry";
import "@/lib/designer/registerAll";

registerPage({
  id: "platform.help",
  moduleSlug: "platform",
  title: "Help & Documentation",
  path: "/help",
  kind: "other",
  superAdminOnly: false,
  customizableRegions: [],
  explanation:
    "General-purpose help/documentation page, visible to any signed-in user (not vendor-scoped, not Super-Admin-gated). Explains the Vendor/module concept, sidebar navigation, the Create/Edit/Delete pattern used across every module, and answers common questions — the first place a new user should land when they're unsure how the product works.",
  sourceFile: "src/app/help/page.tsx",
});

const FAQS: { q: string; a: string }[] = [
  {
    q: "What is My Biz Flow?",
    a: "A modular, no-code, multi-vertical business/CRM platform. Instead of shipping a separate product per industry, every business runs on one shared metadata engine — modules, fields, pipelines, and dashboards are all config-driven, and a business simply enables the modules it needs.",
  },
  {
    q: "What is a Vendor, and what does a module 'type' mean?",
    a: "A signed-up company on the platform is called a Vendor. A Vendor doesn't have a fixed 'type' from a hardcoded list — its type is just the set of modules it has enabled (POS, Service Centre, Clinic, HRMS, and so on). Enabling or disabling a module changes what a Vendor can do without changing any code.",
  },
  {
    q: "How do I navigate the sidebar?",
    a: "The sidebar groups modules by taxonomy: Brand (amber dot) for multi-location/partner hierarchy, Modules (teal dot) for vertical business modules like POS or Clinic, and Cross-cutting (neutral dot) for modules like Inventory or HRMS that plug into any vertical. Click a module to open its list page.",
  },
  {
    q: "How does Create / Edit / Delete work?",
    a: "Every module's list page has a \"+ New\" button that opens a create form. Clicking a row opens that record's detail view, which has Edit and Delete actions in the header. Edit opens the same form pre-filled with the record's data. Delete opens a confirmation dialog before anything is removed. In this pass there is no backend wired up yet, so Create/Edit/Delete are demo stubs — the UI and field coverage are real, persistence is a follow-up build.",
  },
  {
    q: "How do I add a custom field?",
    a: "Custom fields aren't editable from the UI yet in this pass. Every module's admin page (Super Admin only) is scaffolded as the future home for field/pipeline configuration — see a module's \"Admin\" section in the sidebar. Until that editor is built, field sets are defined in code per module and shown in the Designer.",
  },
  {
    q: "What does a module's admin page do?",
    a: "Each module has an admin/ subfolder gated to Super Admin. It's meant for no-code configuration of that module: custom fields, pipeline/workflow stages, and role permissions. It's scaffolded across all modules today; the actual field/pipeline editor UI is a follow-up build.",
  },
  {
    q: "Who can access admin pages?",
    a: "Admin pages (anything under a module's admin/ folder, plus platform tools like the Designer) are meant for Super Admins only. Auth/session enforcement isn't wired up yet in this pass, so admin pages show a visible warning banner instead of silently pretending to be protected — that keeps the gap honest until real auth lands.",
  },
  {
    q: "What is the Designer, and why does every page register there?",
    a: "The Designer (/admin/designer, Super Admin only) lists every page in the product, grouped by module, with a detail view per page showing its purpose and actual source code. Every page in the app calls registerPage() so it's guaranteed to show up there — a page that never registers is a page nobody can find or customize, which the design system treats as a bug.",
  },
];

export default function HelpPage() {
  return (
    <div className="mbf-page min-h-screen w-full bg-bg">
      <header className="mb-6 flex items-center justify-between border-b border-border pb-4">
        <Link href="/" className="flex items-center gap-2">
          <LogoMark size={22} />
          <span className="font-display text-base font-extrabold text-text">My Biz Flow</span>
        </Link>
      </header>
      <div>
        <div className="mbf-prose">
          <h1 className="font-display text-3xl font-bold text-text">Help &amp; Documentation</h1>
          <p className="mt-3 text-base leading-relaxed text-text-muted">
            My Biz Flow is a modular, no-code, multi-vertical business/CRM platform.
            Businesses mix and match modules — POS, Service Centre, Billing,
            Clinic, HRMS, and more — on a single account, all built on one
            shared metadata engine. This page is a general orientation guide;
            it's visible to any signed-in user, not just admins.
          </p>

          <h2 className="mt-10 font-display text-xl font-bold text-text">
            The Vendor &amp; module concept
          </h2>
          <p className="mt-2 text-base leading-relaxed text-text-muted">
            A company that signs up is a <strong className="text-text">Vendor</strong>.
            Vendors don't pick a fixed business "type" from a list — they enable
            the modules relevant to how they operate. A repair shop might enable
            Service Centre + Inventory + Billing; a clinic might enable Clinic +
            Billing + HRMS. Each module owns its own records, fields, and
            pipeline, but they all share the same underlying platform.
          </p>

          <h2 className="mt-10 font-display text-xl font-bold text-text">
            Navigating the sidebar
          </h2>
          <p className="mt-2 text-base leading-relaxed text-text-muted">
            The sidebar nav is grouped by taxonomy. An amber dot marks Brand /
            multi-location modules, a teal dot marks vertical business
            modules (the industry-specific ones like POS or Real Estate), and
            a neutral dot marks cross-cutting modules (Inventory, HRMS,
            Accounting) that plug into whichever vertical modules you're
            running. Click any module to land on its list page.
          </p>

          <h2 className="mt-10 font-display text-xl font-bold text-text">
            Create, Edit, and Delete
          </h2>
          <p className="mt-2 text-base leading-relaxed text-text-muted">
            Every module follows the same pattern. The list page shows every
            record in a table with a "+ New" button top-right. Clicking a row
            opens that record's detail page, which shows Edit and Delete in
            its header. Edit reopens the same form pre-filled with the
            record's values; Delete asks for confirmation first, naming the
            record so you don't delete the wrong thing by accident.
          </p>

          <h2 className="mt-10 font-display text-xl font-bold text-text">FAQ</h2>
          <dl className="mt-4 space-y-6">
            {FAQS.map((item) => (
              <div key={item.q}>
                <dt className="font-display text-base font-bold text-text">{item.q}</dt>
                <dd className="mt-1.5 text-base leading-relaxed text-text-muted">{item.a}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </div>
  );
}
