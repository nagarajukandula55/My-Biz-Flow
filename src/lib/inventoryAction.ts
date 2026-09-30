import { redirect } from "next/navigation";
import { requireSessionPartnerId } from "@/lib/requirePartnerSession";
import { withRecordLock } from "@/lib/withRecordLock";

class InventoryRedirect { constructor(readonly url: string) {} }
class InventoryValidation { constructor(readonly result: unknown) {} }

/** Defer navigation until the stock transaction has committed. */
export function redirectAfterInventoryWrite(url: string): never { throw new InventoryRedirect(url); }

export async function withInventoryAction<T>(partnerId: string, action: () => Promise<T>): Promise<T> {
  await requireSessionPartnerId(partnerId);
  let destination: string | undefined;
  let result: T;
  try {
    result = await withRecordLock("inventory-partner", partnerId, async () => {
      try {
        const value = await action();
        // Existing forms return validation failures instead of throwing. Those
        // must roll back any earlier lines or reversal writes in the same form.
        if (value && typeof value === "object" && "error" in value && value.error) throw new InventoryValidation(value);
        return value;
      } catch (error) {
        if (error instanceof InventoryRedirect) { destination = error.url; return undefined as T; }
        throw error;
      }
    });
  } catch (error) {
    if (error instanceof InventoryValidation) return error.result as T;
    throw error;
  }
  if (destination) redirect(destination);
  return result;
}
