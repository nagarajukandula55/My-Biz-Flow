"use server";

/**
 * Technician roster for Service Centre — replaces the old PartnerStaff
 * "sign up your own staff accounts, each with their own login" flow
 * (deleted along with /service-centre/staff-login and
 * /service-centre/staff-change-password). Service Centre now has exactly
 * ONE login for the whole business (the partner-owner session — see
 * src/lib/requirePartnerSession.ts); there is no per-technician account
 * or password anymore.
 *
 * A technician is still worth naming (the workorder assignment picker in
 * WorkorderLifecycle.tsx needs a roster of names to pick from — see
 * [recordId]/page.tsx's technicianOptions), so this keeps writing
 * PartnerStaff rows (reusing that table rather than forking a parallel
 * one), but only ever as inert reference data: no email/password is
 * collected from the owner, no login page exists for these rows, and
 * `mustChangePassword`/the auto-generated password are never surfaced.
 * A synthetic, never-used email/password pair fills the columns that are
 * still NOT NULL/unique on that table.
 */
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { randomUUID } from "crypto";
import {
  createPartnerStaff,
  listPartnerStaff,
  updatePartnerStaff,
  type PartnerStaffRecord,
} from "@/lib/partnerStaff";
import { requireSessionPartnerId } from "@/lib/requirePartnerSession";

/** Roster only — Owner/Manager/FrontDesk rows created before this change still list here, but this module no longer offers a way to create anything but a Technician. */
export async function listServiceCentreTechnicians(partnerId: string): Promise<PartnerStaffRecord[]> {
  return listPartnerStaff(partnerId);
}

export async function addTechnicianAction(partnerId: string, formData: FormData): Promise<void> {
  await requireSessionPartnerId(partnerId);
  const name = String(formData.get("name") ?? "").trim();
  if (!name) redirect(`/partner/${partnerId}/service-centre/technicians/new?error=missing_name`);

  await createPartnerStaff({
    partnerId,
    name,
    email: `technician-${randomUUID()}@no-login.internal`,
    role: "Technician",
  });

  revalidatePath(`/partner/${partnerId}/service-centre/technicians`);
  redirect(`/partner/${partnerId}/service-centre/technicians`);
}

export async function setTechnicianStatusAction(partnerId: string, staffId: string, status: "Active" | "Suspended"): Promise<void> {
  await requireSessionPartnerId(partnerId);
  const existing = (await listPartnerStaff(partnerId)).find((s) => s.id === staffId);
  if (!existing) return;
  await updatePartnerStaff(partnerId, staffId, {
    name: existing.name,
    email: existing.email,
    phone: existing.phone ?? undefined,
    role: existing.role,
    status,
  });
  revalidatePath(`/partner/${partnerId}/service-centre/technicians`);
}
