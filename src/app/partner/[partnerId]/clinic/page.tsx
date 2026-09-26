import { registerPage } from "@/lib/designer/registry";
import { redirect } from "next/navigation";

registerPage({
  id: "clinic.list",
  moduleSlug: "clinic",
  title: "Clinic — List",
  path: "/partner/[partnerId]/clinic",
  kind: "list",
  superAdminOnly: false,
  customizableRegions: [],
  explanation: "The clinic module's bare index route — redirects straight to /clinic/appointments (the real Appointments list, now Prisma-backed by Patient/Appointment/Prescription — see src/lib/clinic.ts). Kept registered so the module tile / any bare /clinic link still lands somewhere real, since the module's actual pages now live under /clinic/patients and /clinic/appointments.",
  sourceFile: "src/app/partner/[partnerId]/clinic/page.tsx",
});

export default function ClinicIndexPage({ params }: { params: { partnerId: string } }) {
  redirect(`/partner/${params.partnerId}/clinic/appointments`);
}
