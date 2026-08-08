import { PublicHeader } from "@/components/PublicHeader";
import { ContactForm } from "./ContactForm";
import { registerPage } from "@/lib/designer/registry";

registerPage({
  id: "platform.contact",
  moduleSlug: "platform",
  title: "Contact",
  path: "/contact",
  kind: "form",
  superAdminOnly: false,
  customizableRegions: [{ key: "contact-form", label: "Contact form fields" }],
  explanation:
    "Public contact form. Demo submission handler (src/app/contact/actions.ts) — logs server-side, no email service wired up yet, same honest-demo pattern as every other unbacked form in this codebase.",
  sourceFile: "src/app/contact/page.tsx",
});

export default function ContactPage() {
  return (
    <div className="mbf-page min-h-screen w-full bg-bg">
      <PublicHeader />
      <div className="mx-auto max-w-[65ch] px-6 py-16">
        <h1 className="font-display text-3xl font-bold text-text">Contact us</h1>
        <p className="mt-2 max-w-[60ch] text-sm text-text-muted">
          Questions about a plan, a module, or anything else — send a message and we&apos;ll get
          back to you.
        </p>
        <div className="mt-8">
          <ContactForm />
        </div>
      </div>
    </div>
  );
}
