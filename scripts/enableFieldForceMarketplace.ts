import { prisma } from "../src/lib/prisma";

async function main() {
  await prisma.fieldForceSettings.upsert({
    where: { partnerId: "FF0001" },
    create: { partnerId: "FF0001", customerSignupEnabled: true, providerSignupEnabled: true },
    update: { customerSignupEnabled: true, providerSignupEnabled: true },
  });
  console.log("Enabled public Field Force signup for FF0001");
}

main().finally(() => prisma.$disconnect());
