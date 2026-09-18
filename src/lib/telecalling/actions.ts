"use server";

import { revalidatePath } from "next/cache";
import { createLead, bulkCreateLeads, assignLead, autoAssignBatch, autoAssignByTerritory, type LeadStatus } from "@/lib/telecalling/leadsData";
import { logCall, type CallOutcome } from "@/lib/telecalling/callsData";
import { createTemplate, updateTemplate, deleteTemplate, type MessageChannel } from "@/lib/telecalling/templatesData";
import { sendTemplateToLead } from "@/lib/telecalling/messaging";
import { createPartnerStaff, updatePartnerStaff, resetPartnerStaffPassword, nextAgentLoginId, setAgentTerritory } from "@/lib/partnerStaff";
import { requireSessionOrStaffPartnerId, requireSessionPartnerId } from "@/lib/requirePartnerSession";

/** Minimal CSV parser: first row is the header, columns matched case-insensitively
 * against name/phone/email/source. No quoted-comma support — good enough for a
 * plain contact-list export; a partner with commas-in-fields should use a
 * simpler export or we add a real CSV lib once this is validated. */
function parseLeadsCsv(
  text: string
): { name: string; phone: string; email?: string; source?: string; state?: string; city?: string }[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];
  const header = lines[0].split(",").map((h) => h.trim().toLowerCase());
  const nameIdx = header.indexOf("name");
  const phoneIdx = header.indexOf("phone");
  const emailIdx = header.indexOf("email");
  const sourceIdx = header.indexOf("source");
  const stateIdx = header.indexOf("state");
  const cityIdx = header.indexOf("city");
  if (phoneIdx === -1) throw new Error('CSV must have a "phone" column (name/email/source/state/city optional).');

  return lines.slice(1).map((line) => {
    const cols = line.split(",").map((c) => c.trim());
    return {
      name: nameIdx >= 0 ? cols[nameIdx] : cols[phoneIdx],
      phone: cols[phoneIdx],
      email: emailIdx >= 0 ? cols[emailIdx] : undefined,
      source: sourceIdx >= 0 ? cols[sourceIdx] : undefined,
      state: stateIdx >= 0 ? cols[stateIdx] : undefined,
      city: cityIdx >= 0 ? cols[cityIdx] : undefined,
    };
  });
}

export async function createLeadAction(partnerId: string, formData: FormData) {
  partnerId = await requireSessionOrStaffPartnerId(partnerId);
  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const source = String(formData.get("source") ?? "").trim();
  const state = String(formData.get("state") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim();
  if (!phone) throw new Error("Phone is required");
  const lead = await createLead(partnerId, { name: name || phone, phone, email, source, state, city });
  // Auto-assign by territory (see leadsData.ts's doc comment) — a lead
  // matching no agent's territory is left unassigned rather than guessed at.
  await autoAssignByTerritory(partnerId, lead.importBatch);
  revalidatePath(`/partner/${partnerId}/telecalling`);
}

export async function importLeadsAction(partnerId: string, formData: FormData) {
  partnerId = await requireSessionOrStaffPartnerId(partnerId);
  const file = formData.get("file");
  const batchLabel = String(formData.get("batchLabel") ?? "").trim();
  const agentIds = formData.getAll("agentIds").map(String).filter(Boolean);
  if (!(file instanceof File) || file.size === 0) throw new Error("Choose a CSV file to upload");

  const text = await file.text();
  const rows = parseLeadsCsv(text);
  if (rows.length === 0) throw new Error("No valid rows found in the CSV");

  const importBatch = batchLabel || `Import ${new Date().toISOString().slice(0, 10)}`;
  const count = await bulkCreateLeads(partnerId, importBatch, rows);
  if (agentIds.length > 0) {
    // Explicit manual agent picks always win over territory matching.
    await autoAssignBatch(partnerId, importBatch, agentIds);
  } else {
    // No manual picks — auto-assign by each agent's configured territory
    // instead (see leadsData.ts's autoAssignByTerritory doc comment). A
    // lead whose state/city matches no agent's territory stays unassigned.
    await autoAssignByTerritory(partnerId, importBatch);
  }

  revalidatePath(`/partner/${partnerId}/telecalling`);
  return { count, importBatch };
}

export async function assignLeadAction(partnerId: string, formData: FormData) {
  partnerId = await requireSessionOrStaffPartnerId(partnerId);
  const leadId = String(formData.get("leadId") ?? "");
  const assignedToId = String(formData.get("assignedToId") ?? "") || null;
  if (!leadId) throw new Error("Lead is required");
  await assignLead(leadId, partnerId, assignedToId);
  revalidatePath(`/partner/${partnerId}/telecalling`);
}

export async function logCallAction(partnerId: string, formData: FormData) {
  partnerId = await requireSessionOrStaffPartnerId(partnerId);
  const leadId = String(formData.get("leadId") ?? "");
  const agentId = String(formData.get("agentId") ?? "");
  const outcome = String(formData.get("outcome") ?? "") as CallOutcome;
  const notes = String(formData.get("notes") ?? "").trim();
  const callbackAtRaw = String(formData.get("callbackAt") ?? "");
  if (!leadId || !agentId || !outcome) throw new Error("Lead, agent and outcome are required");
  await logCall(partnerId, {
    leadId,
    agentId,
    outcome,
    notes,
    callbackAt: callbackAtRaw ? new Date(callbackAtRaw) : undefined,
  });
  revalidatePath(`/partner/${partnerId}/telecalling/queue`);
}

export async function sendTemplateAction(partnerId: string, formData: FormData) {
  partnerId = await requireSessionOrStaffPartnerId(partnerId);
  const leadId = String(formData.get("leadId") ?? "");
  const templateId = String(formData.get("templateId") ?? "");
  const sentById = String(formData.get("sentById") ?? "");
  const linkOverride = String(formData.get("linkOverride") ?? "").trim();
  if (!leadId || !templateId || !sentById) throw new Error("Lead, template and sender are required");
  const result = await sendTemplateToLead(partnerId, { leadId, templateId, sentById, linkOverride });
  revalidatePath(`/partner/${partnerId}/telecalling/queue`);
  return result;
}

export async function createTemplateAction(partnerId: string, formData: FormData) {
  partnerId = await requireSessionOrStaffPartnerId(partnerId);
  const name = String(formData.get("name") ?? "").trim();
  const channel = String(formData.get("channel") ?? "sms") as MessageChannel;
  const category = String(formData.get("category") ?? "General").trim();
  const body = String(formData.get("body") ?? "").trim();
  if (!name || !body) throw new Error("Name and body are required");
  await createTemplate(partnerId, { name, channel, category, body });
  revalidatePath(`/partner/${partnerId}/telecalling/templates`);
}

export async function updateTemplateAction(partnerId: string, formData: FormData) {
  partnerId = await requireSessionOrStaffPartnerId(partnerId);
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const channel = String(formData.get("channel") ?? "sms") as MessageChannel;
  const category = String(formData.get("category") ?? "General").trim();
  const body = String(formData.get("body") ?? "").trim();
  if (!id || !name || !body) throw new Error("Name and body are required");
  await updateTemplate(id, partnerId, { name, channel, category, body });
  revalidatePath(`/partner/${partnerId}/telecalling/templates`);
}

export async function deleteTemplateAction(partnerId: string, formData: FormData) {
  partnerId = await requireSessionOrStaffPartnerId(partnerId);
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Template id is required");
  await deleteTemplate(id, partnerId);
  revalidatePath(`/partner/${partnerId}/telecalling/templates`);
}

/** Creates a Telecaller agent account (role is always "Telecaller" — this
 * page is the Telecalling module's own staff roster, not a general staff
 * manager). Generates the Agent ID (loginId) the agent will sign in with —
 * no email required — and returns it plus the generated password once, same
 * convention as every other generated-password flow in this app (shown
 * once, never retrievable again). */
/** Splits a comma-separated textbox value into trimmed, deduped, non-empty entries. */
function parseTerritoryList(raw: string): string[] {
  return Array.from(new Set(raw.split(",").map((s) => s.trim()).filter(Boolean)));
}

export async function createAgentAction(partnerId: string, formData: FormData) {
  partnerId = await requireSessionPartnerId(partnerId);
  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const assignedStates = parseTerritoryList(String(formData.get("assignedStates") ?? ""));
  const assignedCities = parseTerritoryList(String(formData.get("assignedCities") ?? ""));
  if (!name) throw new Error("Name is required");
  const loginId = await nextAgentLoginId(partnerId, "Telecaller");
  const result = await createPartnerStaff({
    partnerId,
    name,
    email: email || undefined,
    phone,
    role: "Telecaller",
    loginId,
    assignedStates,
    assignedCities,
  });
  revalidatePath(`/partner/${partnerId}/telecalling/agents`);
  return result;
}

/** Updates just an agent's territory (states/cities) — see setAgentTerritory's doc comment. */
export async function setAgentTerritoryAction(partnerId: string, formData: FormData) {
  partnerId = await requireSessionPartnerId(partnerId);
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Agent id is required");
  const assignedStates = parseTerritoryList(String(formData.get("assignedStates") ?? ""));
  const assignedCities = parseTerritoryList(String(formData.get("assignedCities") ?? ""));
  await setAgentTerritory(partnerId, id, { assignedStates, assignedCities });
  // Territory changes can newly qualify previously-unassigned leads for
  // this agent — sweep the whole partner (no importBatch scope) so those
  // show up in their queue immediately rather than waiting for the next import.
  await autoAssignByTerritory(partnerId);
  revalidatePath(`/partner/${partnerId}/telecalling/agents`);
}

export async function setAgentStatusAction(partnerId: string, formData: FormData) {
  partnerId = await requireSessionPartnerId(partnerId);
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  const existing = formData.get("name");
  if (!id || !status) throw new Error("Agent id and status are required");
  await updatePartnerStaff(partnerId, id, {
    name: String(existing ?? ""),
    email: String(formData.get("email") ?? "") || undefined,
    phone: String(formData.get("phone") ?? "") || undefined,
    role: "Telecaller",
    status,
  });
  revalidatePath(`/partner/${partnerId}/telecalling/agents`);
}

export async function resetAgentPasswordAction(partnerId: string, formData: FormData) {
  partnerId = await requireSessionPartnerId(partnerId);
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Agent id is required");
  const password = await resetPartnerStaffPassword(partnerId, id);
  revalidatePath(`/partner/${partnerId}/telecalling/agents`);
  return password;
}
