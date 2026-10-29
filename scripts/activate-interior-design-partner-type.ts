import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
async function main() {
  const existing = await db.partnerType.findUnique({ where: { id: "interior-design" } });
  const modules = ["interior-design", "billing", "inventory", "manufacturing", "accounting-gst", "hrms"];
  const data = { description: "Interior design, materials, modular products, measured BOQs and progress billing.", defaultModules: modules, assignableRoleIds: existing?.assignableRoleIds ?? [], planTierByPage: existing?.planTierByPage ?? {}, planIds: existing?.planIds ?? [], idPrefix: existing?.idPrefix ?? "INT", requiresApproval: existing?.requiresApproval ?? false, customSignupFields: existing?.customSignupFields ?? [], status: "Active" };
  await db.partnerType.upsert({ where: { id: "interior-design" }, create: { id: "interior-design", ...data }, update: data });
  console.log("Activated Partner Type: interior-design", modules);
}
main().finally(() => db.$disconnect());
