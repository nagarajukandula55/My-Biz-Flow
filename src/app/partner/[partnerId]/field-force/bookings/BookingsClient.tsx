"use client";

import { useState } from "react";
import { DataTable, type Column } from "@/components/DataTable";
import { KanbanBoard, type KanbanStage, type KanbanCard } from "@/components/KanbanBoard";

export type BookingRow = {
  id: string;
  bookingNumber: string;
  customerName: string;
  serviceName: string;
  status: string;
  scheduledAt: string;
  slotLabel: string;
  priceAmount: number;
  paymentStatus: string;
  providerName: string | null;
};

const STAGES: KanbanStage[] = [
  { key: "requested", label: "Requested" },
  { key: "confirmed", label: "Confirmed" },
  { key: "assigned", label: "Assigned" },
  { key: "en-route", label: "En Route" },
  { key: "in-progress", label: "In Progress" },
  { key: "completed", label: "Completed" },
  { key: "cancelled", label: "Cancelled" },
];

const columns: Column[] = [
  { key: "bookingNumber", label: "Booking #", type: "text" },
  { key: "customerName", label: "Customer", type: "text" },
  { key: "serviceName", label: "Service", type: "text" },
  { key: "scheduledAt", label: "Scheduled", type: "date" },
  { key: "slotLabel", label: "Slot", type: "text" },
  { key: "providerName", label: "Provider", type: "text" },
  {
    key: "status",
    label: "Status",
    type: "select-chip",
    chipVariantMap: {
      requested: "warning",
      confirmed: "teal",
      assigned: "teal",
      "en-route": "teal",
      "in-progress": "teal",
      completed: "success",
      cancelled: "danger",
    },
  },
  {
    key: "paymentStatus",
    label: "Payment",
    type: "select-chip",
    chipVariantMap: { unpaid: "warning", paid: "success", refunded: "neutral" },
  },
  { key: "priceAmount", label: "Amount", type: "currency" },
];

export function BookingsClient({ partnerId, rows }: { partnerId: string; rows: BookingRow[] }) {
  const [view, setView] = useState<"list" | "kanban">("list");

  const tableRows = rows.map((r) => ({
    ...r,
    providerName: r.providerName ?? "—",
    priceAmount: r.priceAmount / 100,
  }));

  const cards: KanbanCard[] = rows.map((r) => ({
    id: r.id,
    stageKey: r.status,
    title: r.bookingNumber,
    meta: `${r.customerName} · ${r.serviceName}`,
    amount: r.priceAmount / 100,
  }));

  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <button
          type="button"
          onClick={() => setView("list")}
          className={view === "list" ? "btn-accent text-xs" : "btn-outline text-xs"}
        >
          List
        </button>
        <button
          type="button"
          onClick={() => setView("kanban")}
          className={view === "kanban" ? "btn-accent text-xs" : "btn-outline text-xs"}
        >
          Kanban
        </button>
      </div>

      {rows.length === 0 ? (
        <p className="rounded-md border border-dashed border-border bg-bg-raised p-6 text-center text-sm text-text-muted">
          No bookings yet.
        </p>
      ) : view === "list" ? (
        <DataTable
          columns={columns}
          rows={tableRows}
          onRowClick={(row) => {
            window.location.href = `/partner/${partnerId}/field-force/bookings/${row.id}`;
          }}
        />
      ) : (
        <KanbanBoard stages={STAGES} cards={cards} />
      )}

      {view === "kanban" && rows.length > 0 && (
        <p className="mt-3 text-xs text-text-muted">
          Click{" "}
          <button type="button" onClick={() => setView("list")} className="text-teal hover:underline">
            List view
          </button>{" "}
          to open a booking's detail page.
        </p>
      )}
    </div>
  );
}
