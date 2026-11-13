"use client";

import { useEffect, useState } from "react";
import { t, type Locale } from "@/lib/i18n/locales";
import { lookupPincodeViaApi } from "@/lib/geo/pincodeClient";

type ServiceOption = { id: string; name: string; category: string };
type AreaRow = { mode: "region" | "pincode"; state: string; district: string; locality: string; pincode: string };

export function ProviderSignupForm({
  services,
  action,
  locale,
}: {
  services: ServiceOption[];
  action: (formData: FormData) => void;
  locale: Locale;
}) {
  const [selectedServiceIds, setSelectedServiceIds] = useState<Set<string>>(new Set());
  const [pincode, setPincode] = useState("");
  const [location, setLocation] = useState<{ state: string; city: string; areas: string[] } | null>(null);
  const [areas, setAreas] = useState<AreaRow[]>([]);
  const categories = Array.from(new Set(services.map((s) => s.category)));

  function toggleService(id: string) {
    setSelectedServiceIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleSubmit(formData: FormData) {
    formData.set("serviceIds", "");
    selectedServiceIds.forEach((id) => formData.append("serviceIds", id));
    formData.set("serviceAreas", JSON.stringify(areas.map((a) => a.mode === "pincode" ? { state: a.state, pincode: a.pincode } : { state: a.state, district: a.district || undefined, locality: a.locality || undefined })));
    action(formData);
  }

  useEffect(() => {
    if (!/^\d{6}$/.test(pincode)) { setLocation(null); return; }
    const timer = window.setTimeout(() => { lookupPincodeViaApi(pincode).then((result) => {
      if (result.found && result.state && result.cities?.[0]) setLocation({ state: result.state, city: result.cities[0], areas: result.areas ?? [] });
      else setLocation(null);
    }); }, 300);
    return () => window.clearTimeout(timer);
  }, [pincode]);

  function addArea() { setAreas((current) => [...current, { mode: "pincode", state: location?.state ?? "", district: location?.city ?? "", locality: "", pincode: "" }]); }

  return (
    <form action={handleSubmit} encType="multipart/form-data" className="space-y-4">
      <input name="name" placeholder={t(locale, "name")} required className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text" />
      <input name="phone" placeholder={t(locale, "phone")} required className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text" />
      <input name="email" type="email" placeholder={t(locale, "email")} className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text" />
      <input name="password" type="password" placeholder={t(locale, "password")} required className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text" />
      <div className="rounded-md border border-border bg-bg-raised p-3">
        <div className="text-sm font-semibold text-text">Identity verification</div>
        <p className="mt-1 text-xs text-text-muted">Aadhaar details and selfie are required. Your files are stored privately for verification and are not made public.</p>
        <input name="aadhaarNumber" inputMode="numeric" pattern="\d{12}" maxLength={12} placeholder="Aadhaar number (12 digits)" required className="mt-3 w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text" />
        <label className="mt-3 block text-xs text-text-muted">Aadhaar front image<input name="aadhaarFront" type="file" accept="image/*" required className="mt-1 block w-full text-sm text-text" /></label>
        <label className="mt-3 block text-xs text-text-muted">Aadhaar back image<input name="aadhaarBack" type="file" accept="image/*" required className="mt-1 block w-full text-sm text-text" /></label>
        <label className="mt-3 block text-xs text-text-muted">Recent selfie<input name="selfie" type="file" accept="image/*" capture="user" required className="mt-1 block w-full text-sm text-text" /></label>
      </div>
      <div>
        <input name="pincode" value={pincode} onChange={(e) => setPincode(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder={t(locale, "pincode")} required pattern="\d{6}" className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text" />
        {location && <p className="mt-1 text-xs text-success">Primary location: {location.city}, {location.state}</p>}
        {!location && pincode.length === 6 && <p className="mt-1 text-xs text-danger">Location not found. Please check the pincode.</p>}
      </div>

      <div className="rounded-md border border-border bg-bg-raised p-3">
        <div className="text-sm font-semibold text-text">Additional serviceable areas</div>
        <p className="mt-1 text-xs text-text-muted">Add extra pincodes or city/area coverage beyond the primary pincode.</p>
        {areas.map((area, index) => <div key={index} className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-4">
          <select value={area.mode} onChange={(e) => setAreas((all) => all.map((a, i) => i === index ? { ...a, mode: e.target.value as AreaRow["mode"] } : a))} className="rounded-md border border-border bg-bg px-2 py-2 text-sm text-text"><option value="pincode">Pincode</option><option value="region">City / Area</option></select>
          <input value={area.pincode} onChange={(e) => setAreas((all) => all.map((a, i) => i === index ? { ...a, pincode: e.target.value.replace(/\D/g, "").slice(0, 6) } : a))} placeholder="Serviceable pincode" className="rounded-md border border-border bg-bg px-2 py-2 text-sm text-text" />
          <input value={area.district} onChange={(e) => setAreas((all) => all.map((a, i) => i === index ? { ...a, district: e.target.value } : a))} placeholder="City / District" className="rounded-md border border-border bg-bg px-2 py-2 text-sm text-text" />
          <button type="button" onClick={() => setAreas((all) => all.filter((_, i) => i !== index))} className="btn-outline text-xs">Remove</button>
        </div>)}
        <button type="button" onClick={addArea} className="btn-ghost mt-2 text-xs">+ Add serviceable pincode / city</button>
      </div>

      <p className="rounded-md border border-border bg-bg-raised px-3 py-2 text-sm text-text-muted">
        Your provider category is calculated automatically from the services you select: Skilled or Unskilled Service Provider.
      </p>

      <div>
        <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-text-muted">{t(locale, "selectServices")}</div>
        {categories.map((cat) => (
          <div key={cat} className="mb-3">
            <div className="mb-1 text-xs text-text-muted">{cat}</div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {services
                .filter((s) => s.category === cat)
                .map((s) => (
                  <label key={s.id} className="flex items-center gap-2 rounded-md border border-border bg-bg-raised px-3 py-2 text-sm text-text">
                    <input type="checkbox" checked={selectedServiceIds.has(s.id)} onChange={() => toggleService(s.id)} />
                    {s.name}
                  </label>
                ))}
            </div>
          </div>
        ))}
      </div>

      <button type="submit" className="btn-accent w-full">
        {t(locale, "submit")}
      </button>
    </form>
  );
}
