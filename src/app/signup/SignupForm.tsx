import { PincodeLookupFields } from "./PincodeLookupFields";
import { registerBusiness } from "./actions";
import type { PartnerTypeRecord } from "@/lib/designer/partnerTypesData";
import {
  PRODUCT_DOMAINS,
  PRODUCT_DOMAIN_DESCRIPTIONS,
  PRODUCT_DOMAIN_LABELS,
} from "@/lib/catalog/productDomains";

/**
 * The actual signup form, shared by every business type's own
 * /signup/[type] page. Renders the SAME base fields every type has always
 * collected (Business Name, Address, Pincode/City/State, GSTIN, Business
 * Email, Business Contact, product domains, Login Contact, Referral code),
 * PLUS that PartnerType's own `customSignupFields` inserted after the base
 * "Business Details" block and before Login — text/number/select/textarea
 * per field def. `partnerTypeId` is a hidden input, not a dropdown: this
 * page is already scoped to one business type.
 */
export function SignupForm({ partnerType, error, referralCode }: { partnerType: PartnerTypeRecord; error?: string; referralCode?: string }) {
  return (
    <form action={registerBusiness} className="mt-8 space-y-8">
      <input type="hidden" name="partnerTypeId" value={partnerType.id} />

      {error === "contact_taken" && (
        <p className="rounded-md border border-danger bg-danger-soft px-3 py-2 text-sm text-danger">
          That contact number is already registered. Try signing in instead, or use a different number.
        </p>
      )}

      <div>
        <h2 className="font-display text-base font-bold text-text">Business Details</h2>
        <p className="mt-1 text-xs text-text-muted">Used on your invoices.</p>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="text-xs font-semibold uppercase tracking-wide text-text-muted sm:col-span-2">
            Company / Business Name
            <input
              type="text"
              name="businessName"
              required
              className="mt-1 w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-teal"
            />
          </label>
          <label className="text-xs font-semibold uppercase tracking-wide text-text-muted sm:col-span-2">
            Address
            <input
              type="text"
              name="addressLine"
              className="mt-1 w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-teal"
            />
          </label>
          <div className="sm:col-span-2">
            <PincodeLookupFields />
          </div>
          <label className="text-xs font-semibold uppercase tracking-wide text-text-muted sm:col-span-2">
            GSTIN <span className="normal-case text-text-muted">(optional — skip if unregistered)</span>
            <input
              type="text"
              name="gstin"
              placeholder="22AAAAA0000A1Z5"
              className="mt-1 w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-teal"
            />
            <span className="mt-1 block text-xs font-normal normal-case text-text-muted">
              Without a GSTIN you can still invoice customers, but B2B GST invoices won&apos;t be available —
              only B2C.
            </span>
          </label>
          <label className="text-xs font-semibold uppercase tracking-wide text-text-muted">
            Business Email
            <input
              type="email"
              name="businessEmail"
              required
              className="mt-1 w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-teal"
            />
          </label>
          <label className="text-xs font-semibold uppercase tracking-wide text-text-muted">
            Business Contact Number
            <input
              type="tel"
              name="businessContact"
              required
              className="mt-1 w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-teal"
            />
          </label>
        </div>
      </div>

      {partnerType.customSignupFields.length > 0 && (
        <div>
          <h2 className="font-display text-base font-bold text-text">{partnerType.id} Details</h2>
          <p className="mt-1 text-xs text-text-muted">A few extra details specific to this business type.</p>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {partnerType.customSignupFields.map((field) => (
              <label
                key={field.key}
                className={`text-xs font-semibold uppercase tracking-wide text-text-muted ${
                  field.type === "textarea" ? "sm:col-span-2" : ""
                }`}
              >
                {field.label}
                {field.required && <span className="text-danger"> *</span>}
                {field.type === "select" ? (
                  <select
                    name={`custom_${field.key}`}
                    required={field.required}
                    defaultValue=""
                    className="mt-1 w-full rounded-md border border-border bg-bg px-3 py-2 text-sm normal-case text-text outline-none focus:border-teal"
                  >
                    <option value="" disabled>
                      Select {field.label.toLowerCase()}
                    </option>
                    {(field.options ?? []).map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                ) : field.type === "textarea" ? (
                  <textarea
                    name={`custom_${field.key}`}
                    required={field.required}
                    rows={3}
                    className="mt-1 w-full rounded-md border border-border bg-bg px-3 py-2 text-sm normal-case text-text outline-none focus:border-teal"
                  />
                ) : (
                  <input
                    type={field.type === "number" ? "number" : "text"}
                    name={`custom_${field.key}`}
                    required={field.required}
                    className="mt-1 w-full rounded-md border border-border bg-bg px-3 py-2 text-sm normal-case text-text outline-none focus:border-teal"
                  />
                )}
              </label>
            ))}
          </div>
        </div>
      )}

      {partnerType.id === "service-centre" && (
        <div>
          <h2 className="font-display text-base font-bold text-text">What do you deal in?</h2>
          <p className="mt-1 text-xs text-text-muted">
            Pick everything that applies — you can service more than one. This decides which device types,
            brands and models you&apos;re offered when booking a job in, and you can change it later from
            Settings.
          </p>
          <div className="mt-4 grid max-w-xl grid-cols-1 gap-3 sm:grid-cols-2">
            {PRODUCT_DOMAINS.map((domain) => (
              <label key={domain} className="flex cursor-pointer gap-3 rounded-md border border-border bg-bg-raised p-3">
                <input
                  type="checkbox"
                  name="productDomains"
                  value={domain}
                  defaultChecked={domain === "ELECTRONICS"}
                  className="mt-0.5 h-4 w-4 flex-shrink-0 rounded border-border accent-current text-teal"
                />
                <span>
                  <span className="block text-sm font-semibold text-text">{PRODUCT_DOMAIN_LABELS[domain]}</span>
                  <span className="mt-0.5 block text-xs text-text-muted">{PRODUCT_DOMAIN_DESCRIPTIONS[domain]}</span>
                </span>
              </label>
            ))}
          </div>
        </div>
      )}

      <div>
        <h2 className="font-display text-base font-bold text-text">Login</h2>
        <p className="mt-1 text-xs text-text-muted">
          This number is what you&apos;ll sign in with, alongside your Partner ID. OTP verification is coming
          soon — for now, a generated password.
        </p>
        <div className="mt-4 max-w-sm">
          <label className="text-xs font-semibold uppercase tracking-wide text-text-muted">
            Registered Contact Number
            <input
              type="tel"
              name="loginContact"
              required
              className="mt-1 w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-teal"
            />
          </label>
        </div>
      </div>

      <div className="max-w-sm">
        <label className="text-xs font-semibold uppercase tracking-wide text-text-muted">
          Referral code (optional)
          <input
            type="text"
            name="referralCode"
            defaultValue={referralCode ?? ""}
            placeholder="REF-SC0001"
            className="mt-1 w-full rounded-md border border-border bg-bg px-3 py-2 text-sm normal-case text-text outline-none focus:border-teal"
          />
        </label>
      </div>

      <button type="submit" className="btn-accent w-full sm:w-auto">
        Create account
      </button>
    </form>
  );
}
