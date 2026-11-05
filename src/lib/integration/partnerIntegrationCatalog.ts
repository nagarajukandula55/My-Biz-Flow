/**
 * Partner-owned integration catalog.
 *
 * This is deliberately metadata-only: it does not claim a provider is
 * configured, and it never contains credentials. Connection records can be
 * persisted behind this boundary later without changing partner-facing UI.
 */

export type PartnerIntegrationCategory =
  | "tax"
  | "banking"
  | "payments"
  | "shipping"
  | "logistics"
  | "communications"
  | "accounting"
  | "productivity";

export type PartnerIntegrationAuth = "api-key" | "oauth2" | "credentials" | "webhook";

export type PartnerIntegrationDefinition = {
  id: string;
  name: string;
  category: PartnerIntegrationCategory;
  auth: PartnerIntegrationAuth;
  description: string;
  requiredModules: string[];
  supportsTestConnection: boolean;
  supportsWebhooks: boolean;
  credentialLabels: string[];
};

export const PARTNER_INTEGRATIONS: readonly PartnerIntegrationDefinition[] = [
  { id: "gst-irp", name: "GST / e-Invoice / e-Way Bill", category: "tax", auth: "credentials", description: "Partner-owned tax provider connection for invoice and transport compliance workflows.", requiredModules: ["accounting", "billing"], supportsTestConnection: true, supportsWebhooks: true, credentialLabels: ["GSTIN", "provider username", "provider password", "client ID", "client secret"] },
  { id: "bank-feed", name: "Bank feed", category: "banking", auth: "oauth2", description: "Partner-authorized bank connection for statement import and reconciliation.", requiredModules: ["accounting"], supportsTestConnection: true, supportsWebhooks: true, credentialLabels: ["bank connection"] },
  { id: "razorpay", name: "Razorpay", category: "payments", auth: "api-key", description: "Partner-owned payment collection, refund and webhook reconciliation.", requiredModules: ["billing", "pos"], supportsTestConnection: true, supportsWebhooks: true, credentialLabels: ["key ID", "key secret", "webhook secret"] },
  { id: "stripe", name: "Stripe", category: "payments", auth: "api-key", description: "Partner-owned online payments, subscriptions, refunds and webhook reconciliation.", requiredModules: ["billing", "subscriptions"], supportsTestConnection: true, supportsWebhooks: true, credentialLabels: ["publishable key", "secret key", "webhook secret"] },
  { id: "shipping-carrier", name: "Shipping carrier", category: "shipping", auth: "api-key", description: "Partner-owned label, tracking, pickup and delivery-status connection.", requiredModules: ["inventory", "wholesale-b2b", "logistics-fleet"], supportsTestConnection: true, supportsWebhooks: true, credentialLabels: ["account ID", "API key", "API secret"] },
  { id: "an-logistics", name: "AN Logistics", category: "logistics", auth: "oauth2", description: "Optional AN Logistics service connection for dispatch, tracking and delivery settlement.", requiredModules: ["logistics-fleet", "inventory", "wholesale-b2b"], supportsTestConnection: true, supportsWebhooks: true, credentialLabels: ["AN Logistics account"] },
  { id: "whatsapp-business", name: "WhatsApp Business", category: "communications", auth: "api-key", description: "Partner-owned WhatsApp templates and delivery status.", requiredModules: ["telecalling", "billing", "field-force"], supportsTestConnection: true, supportsWebhooks: true, credentialLabels: ["phone number ID", "access token", "template namespace"] },
  { id: "sms-provider", name: "SMS provider", category: "communications", auth: "api-key", description: "Partner-owned transactional SMS delivery and delivery receipts.", requiredModules: ["telecalling", "billing", "hrms"], supportsTestConnection: true, supportsWebhooks: true, credentialLabels: ["sender ID", "API key", "approved template mappings"] },
  { id: "accounting-export", name: "Accounting export", category: "accounting", auth: "api-key", description: "Partner-authorized export or synchronization with an external accounting system.", requiredModules: ["accounting", "billing"], supportsTestConnection: true, supportsWebhooks: false, credentialLabels: ["API key", "company identifier"] },
  { id: "calendar", name: "Calendar", category: "productivity", auth: "oauth2", description: "Partner-authorized calendar availability and appointment synchronization.", requiredModules: ["clinic", "salon-spa", "event-booking", "real-estate"], supportsTestConnection: true, supportsWebhooks: true, credentialLabels: ["calendar account"] },
] as const;

export function getPartnerIntegration(id: string): PartnerIntegrationDefinition | undefined {
  return PARTNER_INTEGRATIONS.find((integration) => integration.id === id);
}
