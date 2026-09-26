"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { StatusChip } from "@/components/StatusChip";
import { Modal } from "@/components/Modal";
import { SearchSelectModal, type SearchSelectOption } from "@/components/SearchSelectModal";
import type { ContractStatus } from "@/lib/sample-data/amc-field-service";
import {
  dispatchTechnicianAction,
  raiseServiceRequestAction,
  resolveServiceRequestAction,
  renewContractAction,
  addServiceVisitAction,
} from "./actions";

export type ServiceVisitLogEntry = {
  id: string;
  visitDate: string;
  technicianName: string | null;
  status: string;
};

const VISIT_STATUS_OPTIONS = ["Scheduled", "Technician en route", "Checked in", "Completed", "Overdue"];

const CONTRACT_STATUS_VARIANT: Record<ContractStatus, "success" | "neutral" | "danger"> = {
  Active: "success",
  Renewed: "neutral",
  Expired: "danger",
};

const STATUS_VARIANT: Record<string, "teal" | "warning" | "amber" | "success" | "danger" | "neutral"> = {
  "Scheduled": "teal",
  "Technician en route": "warning",
  "Checked in": "amber",
  "Completed": "success",
  "Overdue": "danger",
};

export function AmcLifecycle({
  partnerId,
  contractId,
  contractStatus,
  serviceRequestRaisedAt,
  technicianId,
  technicianName,
  slaHours,
  slaBreached,
  renewalDue,
  contractEndDate,
  technicianOptions,
  serviceVisits,
}: {
  partnerId: string;
  contractId: string;
  contractStatus: ContractStatus;
  serviceRequestRaisedAt?: string;
  technicianId?: string;
  technicianName?: string;
  slaHours: number;
  /** Server-computed at render time — never trust a stored flag for this. */
  slaBreached: boolean;
  /** Server-computed at render time. */
  renewalDue: boolean;
  contractEndDate?: string;
  /** This partner's own active team members (Users) eligible for dispatch. */
  technicianOptions: SearchSelectOption[];
  /** The full ServiceVisit log for this contract, newest first. */
  serviceVisits: ServiceVisitLogEntry[];
}) {
  const router = useRouter();
  const [technician, setTechnician] = useState({ id: technicianId, name: technicianName });
  const [requestOpen, setRequestOpen] = useState(Boolean(serviceRequestRaisedAt));
  const [technicianPickerOpen, setTechnicianPickerOpen] = useState(false);
  const [renewConfirmOpen, setRenewConfirmOpen] = useState(false);
  const [addVisitOpen, setAddVisitOpen] = useState(false);
  const [visitDraft, setVisitDraft] = useState({ visitDate: "", technicianName: "", status: "Scheduled" });
  const [, startPersist] = useTransition();

  function dispatch(option: SearchSelectOption) {
    setTechnician({ id: option.value, name: option.label });
    setTechnicianPickerOpen(false);
    startPersist(async () => {
      await dispatchTechnicianAction(partnerId, contractId, option.value, option.label);
      router.refresh();
    });
  }

  function raiseRequest() {
    setRequestOpen(true);
    setTechnician({ id: undefined, name: undefined });
    startPersist(async () => {
      await raiseServiceRequestAction(partnerId, contractId);
      router.refresh();
    });
  }

  function resolveRequest() {
    setRequestOpen(false);
    startPersist(async () => {
      await resolveServiceRequestAction(partnerId, contractId);
      router.refresh();
    });
  }

  function addVisit() {
    setAddVisitOpen(false);
    const draft = visitDraft;
    setVisitDraft({ visitDate: "", technicianName: "", status: "Scheduled" });
    startPersist(async () => {
      await addServiceVisitAction(partnerId, contractId, draft);
      router.refresh();
    });
  }

  function renew() {
    setRenewConfirmOpen(false);
    startPersist(async () => {
      const result = await renewContractAction(partnerId, contractId);
      if (result?.newContractId) {
        router.push(`/partner/${partnerId}/amc-field-service/${result.newContractId}`);
      } else {
        router.refresh();
      }
    });
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <StatusChip label={`Contract: ${contractStatus}`} variant={CONTRACT_STATUS_VARIANT[contractStatus]} />
        {renewalDue && <StatusChip label="Renewal Due" variant="warning" />}
        {slaBreached && <StatusChip label="SLA Breached" variant="danger" />}
        {requestOpen && !slaBreached && <StatusChip label={`Open request — SLA ${slaHours}h`} variant="teal" />}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => setTechnicianPickerOpen(true)}
          className="rounded-md border border-border bg-bg-raised px-3 py-2 text-left text-sm"
        >
          <div className="text-xs font-semibold uppercase tracking-wide text-text-muted">Dispatched Technician</div>
          <div className="mt-0.5 text-text">{technician.name ?? "Unassigned"}</div>
        </button>
        <div className="rounded-md border border-border bg-bg-raised px-3 py-2 text-sm">
          <div className="text-xs font-semibold uppercase tracking-wide text-text-muted">Contract End Date</div>
          <div className="mt-0.5 text-text">{contractEndDate ?? "—"}</div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        {!requestOpen ? (
          <button type="button" className="btn-outline" onClick={raiseRequest}>
            Raise Service Request
          </button>
        ) : (
          <button type="button" className="btn-accent" onClick={resolveRequest}>
            Mark Request Resolved
          </button>
        )}
        {contractStatus === "Active" && (
          <button
            type="button"
            className={renewalDue ? "btn-accent" : "btn-outline"}
            onClick={() => setRenewConfirmOpen(true)}
          >
            Renew Contract
          </button>
        )}
      </div>

      <div className="mt-6 rounded-md border border-border bg-bg-raised">
        <div className="flex items-center justify-between border-b border-border px-3 py-2">
          <div className="text-xs font-semibold uppercase tracking-wide text-text-muted">Service Visit Log</div>
          <button type="button" className="btn-outline" onClick={() => setAddVisitOpen(true)}>
            + Add Visit
          </button>
        </div>
        {serviceVisits.length === 0 ? (
          <div className="px-3 py-4 text-sm text-text-muted">No service visits logged yet.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs font-semibold uppercase tracking-wide text-text-muted">
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Technician</th>
                <th className="px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {serviceVisits.map((v) => (
                <tr key={v.id} className="border-t border-border">
                  <td className="px-3 py-2 text-text">{new Date(v.visitDate).toLocaleString()}</td>
                  <td className="px-3 py-2 text-text">{v.technicianName ?? "Unassigned"}</td>
                  <td className="px-3 py-2">
                    <StatusChip label={v.status} variant={STATUS_VARIANT[v.status] ?? "neutral"} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal
        open={addVisitOpen}
        onClose={() => setAddVisitOpen(false)}
        title="Add Service Visit"
        size="sm"
        footer={
          <>
            <button type="button" className="btn-outline" onClick={() => setAddVisitOpen(false)}>
              Cancel
            </button>
            <button type="button" className="btn-accent" onClick={addVisit}>
              Add Visit
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <label className="block text-sm">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-text-muted">Visit Date</span>
            <input
              type="datetime-local"
              className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text"
              value={visitDraft.visitDate}
              onChange={(e) => setVisitDraft((d) => ({ ...d, visitDate: e.target.value }))}
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-text-muted">Technician</span>
            <input
              type="text"
              className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text"
              value={visitDraft.technicianName}
              onChange={(e) => setVisitDraft((d) => ({ ...d, technicianName: e.target.value }))}
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-text-muted">Status</span>
            <select
              className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text"
              value={visitDraft.status}
              onChange={(e) => setVisitDraft((d) => ({ ...d, status: e.target.value }))}
            >
              {VISIT_STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
        </div>
      </Modal>

      <SearchSelectModal
        open={technicianPickerOpen}
        onClose={() => setTechnicianPickerOpen(false)}
        title="Dispatch Technician"
        options={technicianOptions}
        onSelect={dispatch}
      />

      <Modal
        open={renewConfirmOpen}
        onClose={() => setRenewConfirmOpen(false)}
        title="Renew Contract"
        size="sm"
        footer={
          <>
            <button type="button" className="btn-outline" onClick={() => setRenewConfirmOpen(false)}>
              Cancel
            </button>
            <button type="button" className="btn-accent" onClick={renew}>
              Renew
            </button>
          </>
        }
      >
        <p className="text-sm text-text-muted">
          Creates a new contract for the next term (dates shifted forward from the current end date) and marks this
          contract Renewed. Continue?
        </p>
      </Modal>
    </div>
  );
}
