"use client";

import { useState } from "react";
import { t, type Locale } from "@/lib/i18n/locales";

type ServiceOption = { id: string; name: string; category: string };

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
    action(formData);
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      <input name="name" placeholder={t(locale, "name")} required className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text" />
      <input name="phone" placeholder={t(locale, "phone")} required className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text" />
      <input name="email" type="email" placeholder={t(locale, "email")} className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text" />
      <input name="password" type="password" placeholder={t(locale, "password")} required className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text" />
      <input name="pincode" placeholder={t(locale, "pincode")} required pattern="\d{6}" className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text" />

      <div>
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-text-muted">{t(locale, "skillLevel")}</label>
        <select name="skillLevel" defaultValue="skilled" className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text">
          <option value="skilled">{t(locale, "skilled")}</option>
          <option value="unskilled">{t(locale, "unskilled")}</option>
        </select>
      </div>

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
