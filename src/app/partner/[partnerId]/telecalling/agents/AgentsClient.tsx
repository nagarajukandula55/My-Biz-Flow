"use client";

import { useState, useTransition } from "react";
import { StatusChip } from "@/components/StatusChip";
import { createAgentAction, setAgentStatusAction, resetAgentPasswordAction, setAgentTerritoryAction } from "@/lib/telecalling/actions";

type Agent = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  loginId: string | null;
  status: string;
  assignedStates: string[];
  assignedCities: string[];
};

export function AgentsClient({ partnerId, agents }: { partnerId: string; agents: Agent[] }) {
  const [showAdd, setShowAdd] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [credentials, setCredentials] = useState<{ loginId: string; password: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const boundCreate = createAgentAction.bind(null, partnerId);
  const boundSetStatus = setAgentStatusAction.bind(null, partnerId);
  const boundResetPassword = resetAgentPasswordAction.bind(null, partnerId);
  const boundSetTerritory = setAgentTerritoryAction.bind(null, partnerId);

  return (
    <div className="space-y-4">
      <button onClick={() => setShowAdd((v) => !v)} className="btn-accent">
        + Add Agent
      </button>

      {error && <div className="rounded-md border border-danger bg-danger-soft px-3 py-2 text-sm text-danger">{error}</div>}

      {credentials && (
        <div className="rounded-md border border-success bg-success-soft px-3 py-2 text-sm text-success">
          Account ready — share these with the agent (shown once, not recoverable after this):
          <div className="mt-1 font-mono text-sm">
            Agent ID: {credentials.loginId}
            <br />
            Password: {credentials.password}
          </div>
        </div>
      )}

      {showAdd && (
        <form
          action={(fd) => {
            setError(null);
            startTransition(async () => {
              try {
                const result = await boundCreate(fd);
                setCredentials({ loginId: result.staff.loginId ?? "", password: result.password });
                setShowAdd(false);
              } catch (e) {
                setError(e instanceof Error ? e.message : "Failed to create agent");
              }
            });
          }}
          className="grid grid-cols-1 gap-3 rounded-lg border border-border bg-bg-raised p-4 sm:grid-cols-3"
        >
          <input name="name" required placeholder="Full name *" className="rounded-md border border-border bg-bg px-3 py-2 text-sm text-text" />
          <input name="phone" placeholder="Phone" className="rounded-md border border-border bg-bg px-3 py-2 text-sm text-text" />
          <input name="email" type="email" placeholder="Email (optional)" className="rounded-md border border-border bg-bg px-3 py-2 text-sm text-text" />
          <input
            name="assignedStates"
            placeholder="Territory states (comma-separated, optional)"
            className="rounded-md border border-border bg-bg px-3 py-2 text-sm text-text sm:col-span-2"
          />
          <input
            name="assignedCities"
            placeholder="Territory cities (comma-separated, optional)"
            className="rounded-md border border-border bg-bg px-3 py-2 text-sm text-text"
          />
          <p className="text-xs text-text-muted sm:col-span-3">
            An Agent ID (e.g. AGT001) is generated automatically — the agent signs in with that, not an email.
            Leaving territory blank means this agent sees and can be auto-assigned every lead, unrestricted; setting
            it limits them to leads whose state or city matches, and new matching leads auto-assign to them going
            forward.
          </p>
          <button type="submit" disabled={isPending} className="btn-accent sm:col-span-3 sm:w-fit">
            Create Agent
          </button>
        </form>
      )}

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-bg-raised text-xs font-semibold uppercase tracking-wide text-text-muted">
            <tr>
              <th className="px-3 py-2 text-left">Agent ID</th>
              <th className="px-3 py-2 text-left">Name</th>
              <th className="px-3 py-2 text-left">Phone</th>
              <th className="px-3 py-2 text-left">Status</th>
              <th className="px-3 py-2 text-left">Territory</th>
              <th className="px-3 py-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {agents.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-text-muted">
                  No agents yet — add one to start assigning leads.
                </td>
              </tr>
            )}
            {agents.map((agent) => (
              <tr key={agent.id} className="border-t border-border">
                <td className="px-3 py-2 font-mono text-text">{agent.loginId ?? "—"}</td>
                <td className="px-3 py-2 text-text">{agent.name}</td>
                <td className="px-3 py-2 text-text-muted">{agent.phone ?? "—"}</td>
                <td className="px-3 py-2">
                  <StatusChip label={agent.status} variant={agent.status === "Active" ? "success" : "neutral"} />
                </td>
                <td className="px-3 py-2">
                  <TerritoryCell agent={agent} onSave={boundSetTerritory} />
                </td>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap gap-2">
                    <form
                      action={(fd) => {
                        fd.set("id", agent.id);
                        fd.set("name", agent.name);
                        fd.set("email", agent.email ?? "");
                        fd.set("phone", agent.phone ?? "");
                        fd.set("status", agent.status === "Active" ? "Suspended" : "Active");
                        startTransition(() => {
                          boundSetStatus(fd);
                        });
                      }}
                    >
                      <button type="submit" className="text-xs font-semibold text-accent hover:underline">
                        {agent.status === "Active" ? "Suspend" : "Reactivate"}
                      </button>
                    </form>
                    <form
                      action={(fd) => {
                        fd.set("id", agent.id);
                        setError(null);
                        startTransition(async () => {
                          const password = await boundResetPassword(fd);
                          if (password) setCredentials({ loginId: agent.loginId ?? "", password });
                        });
                      }}
                    >
                      <button type="submit" className="text-xs font-semibold text-accent hover:underline">
                        Reset Password
                      </button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** Shows an agent's territory as chips, click to edit as comma-separated
 * text (same input convention as the create form above), then submits via
 * setAgentTerritoryAction. Empty on both = unrestricted (sees every lead). */
function TerritoryCell({
  agent,
  onSave,
}: {
  agent: Agent;
  onSave: (formData: FormData) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const hasTerritory = agent.assignedStates.length > 0 || agent.assignedCities.length > 0;

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="text-left text-xs text-text hover:underline"
        title="Click to edit territory"
      >
        {hasTerritory ? (
          <>
            {agent.assignedStates.length > 0 && <div>States: {agent.assignedStates.join(", ")}</div>}
            {agent.assignedCities.length > 0 && <div>Cities: {agent.assignedCities.join(", ")}</div>}
          </>
        ) : (
          <span className="text-text-muted">All (unrestricted)</span>
        )}
      </button>
    );
  }

  return (
    <form
      action={(fd) => {
        fd.set("id", agent.id);
        startTransition(async () => {
          await onSave(fd);
          setEditing(false);
        });
      }}
      className="flex flex-col gap-1"
    >
      <input
        name="assignedStates"
        defaultValue={agent.assignedStates.join(", ")}
        placeholder="States, comma-separated"
        className="w-40 rounded-md border border-border bg-bg px-2 py-1 text-xs text-text"
      />
      <input
        name="assignedCities"
        defaultValue={agent.assignedCities.join(", ")}
        placeholder="Cities, comma-separated"
        className="w-40 rounded-md border border-border bg-bg px-2 py-1 text-xs text-text"
      />
      <div className="flex gap-2">
        <button type="submit" disabled={isPending} className="text-xs font-semibold text-accent hover:underline disabled:opacity-50">
          Save
        </button>
        <button type="button" onClick={() => setEditing(false)} className="text-xs text-text-muted hover:underline">
          Cancel
        </button>
      </div>
    </form>
  );
}
