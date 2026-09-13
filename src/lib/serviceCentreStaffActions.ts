"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createPartnerStaff,
  updatePartnerStaff,
  resetPartnerStaffPassword,
  type CreatePartnerStaffInput,
  type UpdatePartnerStaffInput,
} from "@/lib/partnerStaff";

/** Bind with .bind(null, partnerId) before passing as a RecordForm `action` prop. */
export async function createPartnerStaffAction(partnerId: string, values: Record<string, unknown>): Promise<void> {
  const input: CreatePartnerStaffInput = {
    partnerId,
    name: String(values.name ?? "").trim(),
    email: String(values.email ?? "").trim(),
    phone: String(values.phone ?? "").trim() || undefined,
    role: String(values.role ?? "Technician"),
  };
  if (!input.name || !input.email) throw new Error("Name and email are required");

  const { staff, password } = await createPartnerStaff(input);
  revalidatePath(`/partner/${partnerId}/service-centre/staff`);
  redirect(
    `/partner/${partnerId}/service-centre/staff?created=${encodeURIComponent(staff.id)}&password=${encodeURIComponent(password)}`
  );
}

/** Bind with .bind(null, partnerId, staffId) before passing as a RecordForm `action` prop. */
export async function updatePartnerStaffAction(
  partnerId: string,
  staffId: string,
  values: Record<string, unknown>
): Promise<void> {
  const input: UpdatePartnerStaffInput = {
    name: String(values.name ?? "").trim(),
    email: String(values.email ?? "").trim(),
    phone: String(values.phone ?? "").trim() || undefined,
    role: String(values.role ?? "Technician"),
    status: String(values.status ?? "Active"),
  };
  if (!input.name || !input.email) throw new Error("Name and email are required");

  await updatePartnerStaff(partnerId, staffId, input);
  revalidatePath(`/partner/${partnerId}/service-centre/staff`);
  redirect(`/partner/${partnerId}/service-centre/staff`);
}

/** Toggles a staff member between Active/Suspended without touching the rest of their profile — bound to a plain button, not a full form. */
export async function toggleStaffStatusAction(partnerId: string, staffId: string, nextStatus: string): Promise<void> {
  const { getPartnerStaff } = await import("@/lib/partnerStaff");
  const existing = await getPartnerStaff(partnerId, staffId);
  if (!existing) return;
  await updatePartnerStaff(partnerId, staffId, {
    name: existing.name,
    email: existing.email,
    phone: existing.phone ?? undefined,
    role: existing.role,
    status: nextStatus,
  });
  revalidatePath(`/partner/${partnerId}/service-centre/staff`);
}

/** Resets a staff member's password to a freshly generated one — redirects back to the list with the one-time password shown once. */
export async function resetStaffPasswordAction(partnerId: string, staffId: string): Promise<void> {
  const password = await resetPartnerStaffPassword(partnerId, staffId);
  revalidatePath(`/partner/${partnerId}/service-centre/staff`);
  redirect(
    `/partner/${partnerId}/service-centre/staff?reset=${encodeURIComponent(staffId)}&password=${encodeURIComponent(password ?? "")}`
  );
}
