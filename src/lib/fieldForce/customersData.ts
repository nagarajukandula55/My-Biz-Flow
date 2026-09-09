/**
 * A partner's own end customers and their saved addresses. Every read/write
 * here takes a partnerId and filters/checks by it, per src/lib/tenant.ts.
 */
import { prisma } from "@/lib/prisma";
import { assertPartnerScope } from "@/lib/tenant";

export type AddressRecord = {
  id: string;
  label: string;
  line1: string;
  line2: string | null;
  landmark: string | null;
  city: string;
  state: string;
  pincode: string;
  isDefault: boolean;
};

export type CustomerRecord = {
  id: string;
  partnerId: string;
  name: string;
  phone: string;
  email: string | null;
  createdAt: Date;
  addresses: AddressRecord[];
};

const INCLUDE = { addresses: true } as const;

export async function listCustomers(partnerId: string): Promise<CustomerRecord[]> {
  return prisma.customer.findMany({ where: { partnerId }, include: INCLUDE, orderBy: { createdAt: "desc" } });
}

export async function getCustomer(id: string, partnerId: string): Promise<CustomerRecord | null> {
  const row = await prisma.customer.findUnique({ where: { id }, include: INCLUDE });
  if (!row) return null;
  assertPartnerScope(partnerId, row.partnerId);
  return row;
}

/** Finds an existing customer by phone for this partner, or creates one. */
export async function findOrCreateCustomer(
  partnerId: string,
  input: { name: string; phone: string; email?: string }
): Promise<CustomerRecord> {
  const existing = await prisma.customer.findUnique({
    where: { partnerId_phone: { partnerId, phone: input.phone } },
    include: INCLUDE,
  });
  if (existing) return existing;
  return prisma.customer.create({
    data: { partnerId, name: input.name, phone: input.phone, email: input.email || null },
    include: INCLUDE,
  });
}

export async function addAddress(
  customerId: string,
  partnerId: string,
  input: { label?: string; line1: string; line2?: string; landmark?: string; city: string; state: string; pincode: string; isDefault?: boolean }
): Promise<AddressRecord> {
  const customer = await prisma.customer.findUniqueOrThrow({ where: { id: customerId } });
  assertPartnerScope(partnerId, customer.partnerId);
  return prisma.address.create({
    data: {
      customerId,
      label: input.label || "Home",
      line1: input.line1,
      line2: input.line2 || null,
      landmark: input.landmark || null,
      city: input.city,
      state: input.state,
      pincode: input.pincode,
      isDefault: input.isDefault ?? false,
    },
  });
}

export async function listAddresses(customerId: string): Promise<AddressRecord[]> {
  return prisma.address.findMany({ where: { customerId }, orderBy: { isDefault: "desc" } });
}
