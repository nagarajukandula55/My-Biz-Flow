/**
 * Side-effect-only imports of every module's page files, so their
 * registerPage() calls have definitely run before /admin/designer reads
 * the registry. Next.js loads routes independently at request time —
 * without this, the Designer would only ever show pages that happened to
 * already be loaded by some other request in the same server process.
 *
 * This file must be updated whenever a module folder is added — see
 * DESIGN_SYSTEM.md §8. It is the one place allowed to import every
 * module's pages directly; no other file should do this.
 */

import "@/app/vendor/[vendorId]/pos/page";
import "@/app/vendor/[vendorId]/pos/admin/page";
import "@/app/vendor/[vendorId]/service-centre/page";
import "@/app/vendor/[vendorId]/service-centre/admin/page";
import "@/app/vendor/[vendorId]/billing/page";
import "@/app/vendor/[vendorId]/billing/admin/page";
import "@/app/vendor/[vendorId]/brand/page";
import "@/app/vendor/[vendorId]/brand/admin/page";
import "@/app/vendor/[vendorId]/clinic/page";
import "@/app/vendor/[vendorId]/clinic/admin/page";
import "@/app/vendor/[vendorId]/amc-field-service/page";
import "@/app/vendor/[vendorId]/amc-field-service/admin/page";
import "@/app/vendor/[vendorId]/restaurant-pos/page";
import "@/app/vendor/[vendorId]/restaurant-pos/admin/page";
import "@/app/vendor/[vendorId]/subscriptions/page";
import "@/app/vendor/[vendorId]/subscriptions/admin/page";
import "@/app/vendor/[vendorId]/real-estate/page";
import "@/app/vendor/[vendorId]/real-estate/admin/page";
import "@/app/vendor/[vendorId]/rentals/page";
import "@/app/vendor/[vendorId]/rentals/admin/page";
import "@/app/vendor/[vendorId]/education/page";
import "@/app/vendor/[vendorId]/education/admin/page";
import "@/app/vendor/[vendorId]/manufacturing/page";
import "@/app/vendor/[vendorId]/manufacturing/admin/page";
import "@/app/vendor/[vendorId]/wholesale-b2b/page";
import "@/app/vendor/[vendorId]/wholesale-b2b/admin/page";
import "@/app/vendor/[vendorId]/logistics-fleet/page";
import "@/app/vendor/[vendorId]/logistics-fleet/admin/page";
import "@/app/vendor/[vendorId]/legal/page";
import "@/app/vendor/[vendorId]/legal/admin/page";
import "@/app/vendor/[vendorId]/event-booking/page";
import "@/app/vendor/[vendorId]/event-booking/admin/page";
import "@/app/vendor/[vendorId]/inventory/page";
import "@/app/vendor/[vendorId]/inventory/admin/page";
import "@/app/vendor/[vendorId]/accounting-gst/page";
import "@/app/vendor/[vendorId]/accounting-gst/admin/page";
import "@/app/vendor/[vendorId]/loyalty-rewards/page";
import "@/app/vendor/[vendorId]/loyalty-rewards/admin/page";
import "@/app/vendor/[vendorId]/hrms/page";
import "@/app/vendor/[vendorId]/hrms/admin/page";
import "@/app/vendor/[vendorId]/marketplace/page";
import "@/app/vendor/[vendorId]/marketplace/admin/page";
