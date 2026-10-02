"use client";

import { useEffect, useState, useTransition } from "react";
import { StatusChip } from "@/components/StatusChip";
import {
  createAgentAction,
  setAgentStatusAction,
  resetAgentPasswordAction,
  setAgentTerritoryAction,
  listTerritoryCitiesAction,
} from "@/lib/telecalling/actions";

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

/**
 * Real multi-select territory picker — states first (checkbox-style
 * multi-select), then a dependent city/district multi-select scoped to
 * whichever states are currently picked (refetched via
 * listTerritoryCitiesAction on every state change, see src/lib/geo/
 * pincodeClient.ts's listCitiesForStates — the postal_pincodes table has no
 * separate "city" column, so this is really district-level). Replaces the
 * old single comma-separated free-text inputs. Both selects submit as
 * native multi-value form fields (multiple `<option>`s with the same
 * `name`), so the existing server actions just switch from
 * formData.get() to formData.getAll() — no new wire format.
 */
function TerritoryMultiSelect({
  initialStates,
  initialCities,
  indiaStates,
}: {
  initialStates: string[];
  initialCities: string[];
  indiaStates: string[];
}) {
  const [selectedStates, setSelectedStates] = useState<string[]>(initialStates);
  const [cityOptions, setCityOptions] = useState<string[]>(initialCities);
  const [selectedCities, setSelectedCities] = useState<string[]>(initialCities);
  const [loadingCities, setLoadingCities] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoadingCities(true);
    listTerritoryCitiesAction(selectedStates)
      .then((cities) => {
        if (cancelled) return;
        // Keep any already-picked city even if it falls outside the fresh
        // list (e.g. a state was just removed) — never silently drop a
        // saved selection the user didn't touch.
        const merged = Array.from(new Set([...cities, ...selectedCities])).sort();
        setCityOptions(merged);
        setSelectedCities((prev) => prev.filter((c) => merged.includes(c)));
      })
      .finally(() => {
        if (!cancelled) setLoadingCities(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStates.join("|")]);

  return (
    <div className="flex gap-2">
      <div>
        <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-text-muted">
          States (Ctrl/Cmd-click for multiple)
        </label>
        <select
          multiple
          name="assignedStates"
          value={selectedStates}
          onChange={(e) => setSelectedStates(Array.from(e.target.selectedOptions, (o) => o.value))}
          size={Math.min(6, Math.max(3, indiaStates.length))}
          className="w-44 rounded-md border border-border bg-bg px-2 py-1 text-xs text-text"
        >
          {indiaStates.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-text-muted">
          Cities {loadingCities && "(loading…)"}
        </label>
        <select
          multiple
          name="assignedCities"
          value={selectedCities}
          onChange={(e) => setSelectedCities(Array.from(e.target.selectedOptions, (o) => o.value))}
          size={Math.min(6, Math.max(3, cityOptions.length || 1))}
          disabled={selectedStates.length === 0}
          className="w-44 rounded-md border border-border bg-bg px-2 py-1 text-xs text-text disabled:opacity-50"
        >
          {cityOptions.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        {selectedStates.length === 0 && <p className="mt-1 text-[11px] text-text-muted">Pick a state first.</p>}
      </div>
    </div>
  );
}

export function AgentsClient({
  partnerId,
  agents,
  indiaStates,
}: {
  partnerId: string;
  agents: Agent[];
  /** Real states/UTs actually present in our postal_pincodes table (src/lib/geo/pincodeClient.ts) — autocomplete suggestions for the still-freetext territory field below, not a hard constraint. */
  indiaStates: string[];
}) {
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
          <div className="sm:col-span-3">
            <TerritoryMultiSelect initialStates={[]} initialCities={[]} indiaStates={indiaStates} />
          </div>
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
                  <TerritoryCell agent={agent} onSave={boundSetTerritory} indiaStates={indiaStates} />
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

/** Shows an agent's territory as chips, click to edit via the same
 * TerritoryMultiSelect the create form uses, then submits via
 * setAgentTerritoryAction. Empty on both = unrestricted (sees every lead). */
function TerritoryCell({
  agent,
  onSave,
  indiaStates,
}: {
  agent: Agent;
  onSave: (formData: FormData) => Promise<void>;
  indiaStates: string[];
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
      <TerritoryMultiSelect initialStates={agent.assignedStates} initialCities={agent.assignedCities} indiaStates={indiaStates} />
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
