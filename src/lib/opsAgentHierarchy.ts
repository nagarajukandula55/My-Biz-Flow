import { OPS_AGENTS } from "@/lib/opsAgents";

export type OpsRole = "head" | "manager" | "lead" | "agent";
export type OpsNode = { id: string; name: string; role: OpsRole; domain: string; reportsTo: string | null; agentIds: string[]; telegramPolicy: "critical-only" | "daily-summary" | "all-failures" };

export const OPS_HIERARCHY: readonly OpsNode[] = [
  { id: "platform-ops-head", name: "Platform Operations Head", role: "head", domain: "platform", reportsTo: null, agentIds: [], telegramPolicy: "critical-only" },
  { id: "reliability-manager", name: "Reliability Manager", role: "manager", domain: "reliability", reportsTo: "platform-ops-head", agentIds: ["cron-health", "backup-health", "delivery-queue"], telegramPolicy: "all-failures" },
  { id: "security-manager", name: "Security & Data Protection Manager", role: "manager", domain: "security", reportsTo: "platform-ops-head", agentIds: ["security-boundary", "error-log"], telegramPolicy: "critical-only" },
  { id: "integration-manager", name: "Integration & Provider Manager", role: "manager", domain: "integrations", reportsTo: "platform-ops-head", agentIds: ["provider-readiness"], telegramPolicy: "daily-summary" },
  { id: "service-centre-lead", name: "Service Centre Protection Lead", role: "lead", domain: "service-centre", reportsTo: "platform-ops-head", agentIds: ["service-centre-safety"], telegramPolicy: "critical-only" },
  ...OPS_AGENTS.map((agent) => ({ id: `agent-${agent.id}`, name: agent.name, role: "agent" as const, domain: agent.id === "service-centre-safety" ? "service-centre" : agent.id === "provider-readiness" ? "integrations" : agent.id === "security-boundary" || agent.id === "error-log" ? "security" : "reliability", reportsTo: agent.id === "service-centre-safety" ? "service-centre-lead" : agent.id === "provider-readiness" ? "integration-manager" : agent.id === "security-boundary" || agent.id === "error-log" ? "security-manager" : "reliability-manager", agentIds: [agent.id], telegramPolicy: agent.id === "provider-readiness" ? "daily-summary" as const : agent.id === "security-boundary" || agent.id === "service-centre-safety" ? "critical-only" as const : "all-failures" as const })),
];
