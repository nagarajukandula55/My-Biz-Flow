"use client";

import { useMemo, useState } from "react";
import { DataTable, type Column } from "@/components/DataTable";
import { KanbanBoard, type KanbanStage, type KanbanCard } from "@/components/KanbanBoard";

export type BookingRow = { id: string; bookingNumber: string; customerName: string; serviceName: string; status: string; scheduledAt: string; slotLabel: string; priceAmount: number; paymentStatus: string; providerName: string | null };

const STAGES: KanbanStage[] = [
  { key: "requested", label: "Requested" }, { key: "confirmed", label: "Confirmed" }, { key: "assigned", label: "Assigned" },
  { key: "en-route", label: "En Route" }, { key: "arrived", label: "Arrived" }, { key: "in-progress", label: "In Progress" }, { key: "completed", label: "Completed" }, { key: "cancelled", label: "Cancelled" },
];

const columns: Column[] = [
  { key: "bookingNumber", label: "Booking #", type: "text" }, { key: "customerName", label: "Customer", type: "text" }, { key: "serviceName", label: "Service", type: "text" },
  { key: "scheduledAt", label: "Scheduled", type: "date" }, { key: "slotLabel", label: "Slot", type: "text" }, { key: "providerName", label: "Provider", type: "text" },
  { key: "status", label: "Status", type: "select-chip", chipVariantMap: { requested: "warning", confirmed: "teal", assigned: "teal", "en-route": "teal", arrived: "teal", "in-progress": "teal", completed: "success", cancelled: "danger" } },
  { key: "paymentStatus", label: "Payment", type: "select-chip", chipVariantMap: { unpaid: "warning", paid: "success", refunded: "neutral" } }, { key: "priceAmount", label: "Amount", type: "currency" },
];

export function BookingsClient({ partnerId, rows }: { partnerId: string; rows: BookingRow[] }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [providerFilter, setProviderFilter] = useState("all");
  const providers = useMemo<string[]>(() => Array.from(new Set(rows.map((row) => row.providerName).filter((name): name is string => Boolean(name)))).sort(), [rows]);
  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return rows.filter((row) => {
      const matchesSearch = !query || [row.bookingNumber, row.customerName, row.serviceName, row.providerName ?? ""].join(" ").toLowerCase().includes(query);
      return matchesSearch && (statusFilter === "all" || row.status === statusFilter) && (providerFilter === "all" || row.providerName === providerFilter);
    });
  }, [rows, search, statusFilter, providerFilter]);
  const tableRows = filteredRows.map((row) => ({ ...row, providerName: row.providerName ?? "-", priceAmount: row.priceAmount / 100 }));
  const cards: KanbanCard[] = filteredRows.map((row) => ({ id: row.id, stageKey: row.status, title: row.bookingNumber, meta: `${row.customerName} • ${row.serviceName}${row.providerName ? ` • ${row.providerName}` : ""}`, amount: row.priceAmount / 100 }));
  const openBooking = (id: string) => { window.location.href = `/partner/${partnerId}/field-force/bookings/${id}`; };

  return <div>
    <div className="mb-4 rounded-lg border border-border bg-bg-raised p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><div><h2 className="text-sm font-semibold text-text">Booking pipeline</h2><p className="text-xs text-text-muted">Kanban overview and detailed list stay in sync.</p></div><span className="text-xs text-text-muted">Showing {filteredRows.length} of {rows.length}</span></div>
      <div className="mb-4 grid gap-2 md:grid-cols-[minmax(220px,1fr)_180px_180px_auto]">
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search booking, customer, service..." className="input" />
        <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="input"><option value="all">All statuses</option>{STAGES.map((stage) => <option key={stage.key} value={stage.key}>{stage.label}</option>)}</select>
        <select value={providerFilter} onChange={(event) => setProviderFilter(event.target.value)} className="input"><option value="all">All providers</option>{providers.map((provider) => <option key={provider} value={provider}>{provider}</option>)}</select>
        <button type="button" onClick={() => { setSearch(""); setStatusFilter("all"); setProviderFilter("all"); }} className="btn-outline text-xs">Clear filters</button>
      </div>
      <KanbanBoard stages={STAGES} cards={cards} onCardClick={(card) => openBooking(card.id)} />
    </div>
    {filteredRows.length === 0 ? <p className="rounded-md border border-dashed border-border bg-bg-raised p-6 text-center text-sm text-text-muted">{rows.length === 0 ? "No bookings yet." : "No bookings match the selected filters."}</p> : <DataTable columns={columns} rows={tableRows} onRowClick={(row) => openBooking(String((row as { id: string }).id))} />}
  </div>;
}
