"use client";

import { useEffect } from "react";

export type OfflineReferenceData = {
  partnerId: string;
  partnerLabel: string;
  restaurant?: { servicePointLabel: string; tables: string[]; menuItems: Array<{ id: string; name: string; price: number; taxRate: number }> };
  hotel?: { rooms: Array<{ id: string; name: string; roomType: string; ratePaise: number; capacity: number; status: string }> };
};

/** Keeps only the reference data needed for a local order/reservation draft. */
export function OfflineReferenceCache({ data }: { data: OfflineReferenceData }) {
  useEffect(() => {
    try {
      const key = `mbf-offline-reference:${data.partnerId}`;
      localStorage.setItem(key, JSON.stringify({ ...data, cachedAt: new Date().toISOString() }));
      const previous = JSON.parse(localStorage.getItem("mbf-offline-partners") ?? "[]");
      const list = Array.isArray(previous) ? previous.filter((item: unknown) => item && typeof item === "object" && (item as { partnerId?: string }).partnerId !== data.partnerId) : [];
      list.push({ partnerId: data.partnerId, partnerLabel: data.partnerLabel });
      localStorage.setItem("mbf-offline-partners", JSON.stringify(list.slice(-10)));
    } catch { /* device storage can be disabled or full; online workflows remain available */ }
  }, [data]);
  return null;
}
