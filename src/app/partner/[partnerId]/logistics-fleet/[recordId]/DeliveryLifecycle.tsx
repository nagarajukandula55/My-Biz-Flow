"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { StatusChip } from "@/components/StatusChip";
import { Modal } from "@/components/Modal";
import { SearchSelectModal, type SearchSelectOption } from "@/components/SearchSelectModal";
import { DELIVERY_STAGES, type DeliveryStage } from "@/lib/sample-data/logistics-fleet";
import { assignDriverAction, advanceDeliveryStageAction } from "./actions";

const STAGE_VARIANT: Record<DeliveryStage, "neutral" | "teal" | "success" | "danger"> = {
  Pending: "neutral",
  "Out for Delivery": "teal",
  Delivered: "success",
  Failed: "danger",
};

export function DeliveryLifecycle({
  partnerId,
  shipmentId,
  initialStage,
  driverId,
  driverName,
  vehicleNumber,
  recipientName,
  deliveryNotes,
  failureReason,
  driverOptions,
}: {
  partnerId: string;
  shipmentId: string;
  initialStage: DeliveryStage;
  driverId?: string;
  driverName?: string;
  vehicleNumber?: string;
  recipientName?: string;
  deliveryNotes?: string;
  failureReason?: string;
  /** This partner's own active team members (Users) eligible as drivers. */
  driverOptions: SearchSelectOption[];
}) {
  const router = useRouter();
  const [stage, setStage] = useState<DeliveryStage>(initialStage);
  const [driver, setDriver] = useState({ id: driverId, name: driverName });
  const [vehicle, setVehicle] = useState(vehicleNumber ?? "");
  const [driverPickerOpen, setDriverPickerOpen] = useState(false);
  const [proofOpen, setProofOpen] = useState(false);
  const [failOpen, setFailOpen] = useState(false);
  const [proofRecipient, setProofRecipient] = useState(recipientName ?? "");
  const [proofNotes, setProofNotes] = useState(deliveryNotes ?? "");
  const [failReasonInput, setFailReasonInput] = useState("");
  const [blockedMessage, setBlockedMessage] = useState<string | null>(null);
  const [, startPersist] = useTransition();

  const stageIndex = DELIVERY_STAGES.indexOf(stage as (typeof DELIVERY_STAGES)[number]);
  const terminal = stage === "Delivered" || stage === "Failed";

  function selectDriver(option: SearchSelectOption) {
    setDriver({ id: option.value, name: option.label });
    setDriverPickerOpen(false);
    startPersist(async () => {
      await assignDriverAction(partnerId, shipmentId, option.value, option.label, vehicle);
      router.refresh();
    });
  }

  function persistVehicle() {
    if (!driver.id) return;
    startPersist(async () => {
      await assignDriverAction(partnerId, shipmentId, driver.id!, driver.name!, vehicle);
    });
  }

  function advance() {
    if (!driver.id) {
      setBlockedMessage("Assign a driver before advancing the delivery.");
      return;
    }
    const next = DELIVERY_STAGES[stageIndex + 1] as DeliveryStage | undefined;
    if (!next) return;
    if (next === "Delivered") {
      setProofOpen(true);
      return;
    }
    setBlockedMessage(null);
    setStage(next);
    startPersist(async () => {
      await advanceDeliveryStageAction(partnerId, shipmentId, next);
      router.refresh();
    });
  }

  function confirmDelivered() {
    if (!proofRecipient.trim()) return;
    setStage("Delivered");
    setProofOpen(false);
    startPersist(async () => {
      await advanceDeliveryStageAction(partnerId, shipmentId, "Delivered", {
        recipientName: proofRecipient,
        deliveryNotes: proofNotes,
      });
      router.refresh();
    });
  }

  function confirmFailed() {
    setStage("Failed");
    setFailOpen(false);
    startPersist(async () => {
      await advanceDeliveryStageAction(partnerId, shipmentId, "Failed", undefined, failReasonInput);
      router.refresh();
    });
  }

  return (
    <div>
      {/* Stage stepper */}
      <div className="flex flex-wrap items-center gap-2">
        {DELIVERY_STAGES.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <StatusChip label={s} variant={s === stage ? STAGE_VARIANT[s] : "neutral"} />
            {i < DELIVERY_STAGES.length - 1 && <span className="text-text-muted">&rarr;</span>}
          </div>
        ))}
        {stage === "Failed" && (
          <>
            <span className="text-text-muted">&rarr;</span>
            <StatusChip label="Failed" variant="danger" />
          </>
        )}
      </div>

      {stage === "Failed" && failureReason && (
        <p className="mt-2 text-sm text-danger">Failure reason: {failureReason}</p>
      )}

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => setDriverPickerOpen(true)}
          disabled={terminal}
          className="rounded-md border border-border bg-bg-raised px-3 py-2 text-left text-sm disabled:opacity-60"
        >
          <div className="text-xs font-semibold uppercase tracking-wide text-text-muted">Driver</div>
          <div className="mt-0.5 text-text">{driver.name ?? "Unassigned"}</div>
        </button>
        <div className="rounded-md border border-border bg-bg-raised px-3 py-2 text-sm">
          <div className="text-xs font-semibold uppercase tracking-wide text-text-muted">Vehicle Number</div>
          <input
            type="text"
            value={vehicle}
            disabled={terminal}
            onChange={(e) => setVehicle(e.target.value)}
            onBlur={persistVehicle}
            placeholder="e.g. KA-05-AB-4471"
            className="mt-0.5 w-full bg-transparent text-text outline-none disabled:opacity-60"
          />
        </div>
      </div>

      {blockedMessage && (
        <div className="mt-4 rounded-md border border-danger bg-danger-soft px-3 py-2 text-sm text-danger">
          {blockedMessage}
        </div>
      )}

      {stage === "Delivered" && (
        <div className="mt-4 rounded-md border border-border bg-bg-raised p-4">
          <h2 className="font-display text-base font-bold text-text">Delivery Proof</h2>
          <p className="mt-1 text-sm text-text-muted">Recipient: <span className="text-text">{recipientName ?? "—"}</span></p>
          <p className="mt-1 text-sm text-text-muted">Notes: <span className="text-text">{deliveryNotes ?? "—"}</span></p>
        </div>
      )}

      <div className="mt-6 flex items-center gap-3">
        {!terminal && (
          <>
            <button type="button" className="btn-accent" onClick={advance}>
              {stage === "Pending" && "Mark Out for Delivery"}
              {stage === "Out for Delivery" && "Mark Delivered"}
            </button>
            {stage === "Out for Delivery" && (
              <button type="button" className="btn-outline text-danger" onClick={() => setFailOpen(true)}>
                Mark Failed
              </button>
            )}
          </>
        )}
      </div>

      <SearchSelectModal
        open={driverPickerOpen}
        onClose={() => setDriverPickerOpen(false)}
        title="Assign Driver"
        options={driverOptions}
        onSelect={selectDriver}
      />

      <Modal
        open={proofOpen}
        onClose={() => setProofOpen(false)}
        title="Delivery Proof"
        size="sm"
        footer={
          <>
            <button type="button" className="btn-outline" onClick={() => setProofOpen(false)}>
              Cancel
            </button>
            <button type="button" className="btn-accent" onClick={confirmDelivered} disabled={!proofRecipient.trim()}>
              Confirm Delivered
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-text-muted">Recipient Name *</label>
            <input
              type="text"
              value={proofRecipient}
              onChange={(e) => setProofRecipient(e.target.value)}
              className="mt-1 w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text"
              placeholder="Who received the shipment?"
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-text-muted">Signature / Notes</label>
            <textarea
              value={proofNotes}
              onChange={(e) => setProofNotes(e.target.value)}
              rows={3}
              className="mt-1 w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text"
              placeholder="e.g. signed for by security desk"
            />
          </div>
        </div>
      </Modal>

      <Modal
        open={failOpen}
        onClose={() => setFailOpen(false)}
        title="Mark Delivery Failed"
        size="sm"
        footer={
          <>
            <button type="button" className="btn-outline" onClick={() => setFailOpen(false)}>
              Cancel
            </button>
            <button type="button" className="btn-accent" onClick={confirmFailed}>
              Mark Failed
            </button>
          </>
        }
      >
        <textarea
          value={failReasonInput}
          onChange={(e) => setFailReasonInput(e.target.value)}
          rows={3}
          className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text"
          placeholder="Reason for failed delivery"
        />
      </Modal>
    </div>
  );
}
