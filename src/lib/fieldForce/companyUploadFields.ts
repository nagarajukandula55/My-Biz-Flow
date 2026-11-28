export const COMPANY_UPLOAD_FIELDS = [
  "customerName", "customerPhone", "addressLine1", "city", "state", "pincode",
  "serviceName", "brand", "model", "variant", "scheduledAt", "notes",
] as const;
export type CompanyUploadField = (typeof COMPANY_UPLOAD_FIELDS)[number];
export const REQUIRED_COMPANY_UPLOAD_FIELDS: CompanyUploadField[] = [
  "customerName", "customerPhone", "addressLine1", "city", "state", "pincode", "serviceName",
];
