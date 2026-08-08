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
import "@/app/vendor/[vendorId]/pos/new/page";
import "@/app/vendor/[vendorId]/pos/[recordId]/page";
import "@/app/vendor/[vendorId]/pos/[recordId]/edit/page";
import "@/app/vendor/[vendorId]/service-centre/page";
import "@/app/vendor/[vendorId]/service-centre/admin/page";
import "@/app/vendor/[vendorId]/service-centre/new/page";
import "@/app/vendor/[vendorId]/service-centre/[recordId]/page";
import "@/app/vendor/[vendorId]/service-centre/[recordId]/edit/page";
import "@/app/vendor/[vendorId]/billing/page";
import "@/app/vendor/[vendorId]/billing/admin/page";
import "@/app/vendor/[vendorId]/billing/new/page";
import "@/app/vendor/[vendorId]/billing/[recordId]/page";
import "@/app/vendor/[vendorId]/billing/[recordId]/edit/page";
import "@/app/vendor/[vendorId]/brand/page";
import "@/app/vendor/[vendorId]/brand/admin/page";
import "@/app/vendor/[vendorId]/brand/new/page";
import "@/app/vendor/[vendorId]/brand/[recordId]/page";
import "@/app/vendor/[vendorId]/brand/[recordId]/edit/page";
import "@/app/vendor/[vendorId]/clinic/page";
import "@/app/vendor/[vendorId]/clinic/admin/page";
import "@/app/vendor/[vendorId]/clinic/new/page";
import "@/app/vendor/[vendorId]/clinic/[recordId]/page";
import "@/app/vendor/[vendorId]/clinic/[recordId]/edit/page";
import "@/app/vendor/[vendorId]/amc-field-service/page";
import "@/app/vendor/[vendorId]/amc-field-service/admin/page";
import "@/app/vendor/[vendorId]/amc-field-service/new/page";
import "@/app/vendor/[vendorId]/amc-field-service/[recordId]/page";
import "@/app/vendor/[vendorId]/amc-field-service/[recordId]/edit/page";
import "@/app/vendor/[vendorId]/restaurant-pos/page";
import "@/app/vendor/[vendorId]/restaurant-pos/admin/page";
import "@/app/vendor/[vendorId]/restaurant-pos/new/page";
import "@/app/vendor/[vendorId]/restaurant-pos/[recordId]/page";
import "@/app/vendor/[vendorId]/restaurant-pos/[recordId]/edit/page";
import "@/app/vendor/[vendorId]/subscriptions/page";
import "@/app/vendor/[vendorId]/subscriptions/admin/page";
import "@/app/vendor/[vendorId]/subscriptions/new/page";
import "@/app/vendor/[vendorId]/subscriptions/[recordId]/page";
import "@/app/vendor/[vendorId]/subscriptions/[recordId]/edit/page";
import "@/app/vendor/[vendorId]/real-estate/page";
import "@/app/vendor/[vendorId]/real-estate/admin/page";
import "@/app/vendor/[vendorId]/real-estate/new/page";
import "@/app/vendor/[vendorId]/real-estate/[recordId]/page";
import "@/app/vendor/[vendorId]/real-estate/[recordId]/edit/page";
import "@/app/vendor/[vendorId]/rentals/page";
import "@/app/vendor/[vendorId]/rentals/admin/page";
import "@/app/vendor/[vendorId]/rentals/new/page";
import "@/app/vendor/[vendorId]/rentals/[recordId]/page";
import "@/app/vendor/[vendorId]/rentals/[recordId]/edit/page";
import "@/app/vendor/[vendorId]/education/page";
import "@/app/vendor/[vendorId]/education/admin/page";
import "@/app/vendor/[vendorId]/education/new/page";
import "@/app/vendor/[vendorId]/education/[recordId]/page";
import "@/app/vendor/[vendorId]/education/[recordId]/edit/page";
import "@/app/vendor/[vendorId]/manufacturing/page";
import "@/app/vendor/[vendorId]/manufacturing/admin/page";
import "@/app/vendor/[vendorId]/manufacturing/new/page";
import "@/app/vendor/[vendorId]/manufacturing/[recordId]/page";
import "@/app/vendor/[vendorId]/manufacturing/[recordId]/edit/page";
import "@/app/vendor/[vendorId]/wholesale-b2b/page";
import "@/app/vendor/[vendorId]/wholesale-b2b/admin/page";
import "@/app/vendor/[vendorId]/wholesale-b2b/new/page";
import "@/app/vendor/[vendorId]/wholesale-b2b/[recordId]/page";
import "@/app/vendor/[vendorId]/wholesale-b2b/[recordId]/edit/page";
import "@/app/vendor/[vendorId]/logistics-fleet/page";
import "@/app/vendor/[vendorId]/logistics-fleet/admin/page";
import "@/app/vendor/[vendorId]/logistics-fleet/new/page";
import "@/app/vendor/[vendorId]/logistics-fleet/[recordId]/page";
import "@/app/vendor/[vendorId]/logistics-fleet/[recordId]/edit/page";
import "@/app/vendor/[vendorId]/legal/page";
import "@/app/vendor/[vendorId]/legal/admin/page";
import "@/app/vendor/[vendorId]/legal/new/page";
import "@/app/vendor/[vendorId]/legal/[recordId]/page";
import "@/app/vendor/[vendorId]/legal/[recordId]/edit/page";
import "@/app/vendor/[vendorId]/event-booking/page";
import "@/app/vendor/[vendorId]/event-booking/admin/page";
import "@/app/vendor/[vendorId]/event-booking/new/page";
import "@/app/vendor/[vendorId]/event-booking/[recordId]/page";
import "@/app/vendor/[vendorId]/event-booking/[recordId]/edit/page";
import "@/app/vendor/[vendorId]/inventory/page";
import "@/app/vendor/[vendorId]/inventory/admin/page";
import "@/app/vendor/[vendorId]/inventory/new/page";
import "@/app/vendor/[vendorId]/inventory/[recordId]/page";
import "@/app/vendor/[vendorId]/inventory/[recordId]/edit/page";
import "@/app/vendor/[vendorId]/accounting-gst/page";
import "@/app/vendor/[vendorId]/accounting-gst/admin/page";
import "@/app/vendor/[vendorId]/accounting-gst/new/page";
import "@/app/vendor/[vendorId]/accounting-gst/[recordId]/page";
import "@/app/vendor/[vendorId]/accounting-gst/[recordId]/edit/page";
import "@/app/vendor/[vendorId]/loyalty-rewards/page";
import "@/app/vendor/[vendorId]/loyalty-rewards/admin/page";
import "@/app/vendor/[vendorId]/loyalty-rewards/new/page";
import "@/app/vendor/[vendorId]/loyalty-rewards/[recordId]/page";
import "@/app/vendor/[vendorId]/loyalty-rewards/[recordId]/edit/page";
import "@/app/vendor/[vendorId]/hrms/page";
import "@/app/vendor/[vendorId]/hrms/admin/page";
import "@/app/vendor/[vendorId]/hrms/new/page";
import "@/app/vendor/[vendorId]/hrms/[recordId]/page";
import "@/app/vendor/[vendorId]/hrms/[recordId]/edit/page";
import "@/app/vendor/[vendorId]/marketplace/page";
import "@/app/vendor/[vendorId]/marketplace/admin/page";
import "@/app/vendor/[vendorId]/marketplace/new/page";
import "@/app/vendor/[vendorId]/marketplace/[recordId]/page";
import "@/app/vendor/[vendorId]/marketplace/[recordId]/edit/page";

import "@/app/vendor/[vendorId]/admin/access-groups/page";
import "@/app/vendor/[vendorId]/admin/access-groups/new/page";
import "@/app/vendor/[vendorId]/admin/access-groups/[recordId]/page";
import "@/app/vendor/[vendorId]/admin/access-groups/[recordId]/edit/page";
import "@/app/vendor/[vendorId]/admin/roles/page";
import "@/app/vendor/[vendorId]/admin/roles/new/page";
import "@/app/vendor/[vendorId]/admin/roles/[recordId]/page";
import "@/app/vendor/[vendorId]/admin/roles/[recordId]/edit/page";
import "@/app/vendor/[vendorId]/admin/users/page";
import "@/app/vendor/[vendorId]/admin/users/new/page";
import "@/app/vendor/[vendorId]/admin/users/[recordId]/page";
import "@/app/vendor/[vendorId]/admin/users/[recordId]/edit/page";
import "@/app/vendor/[vendorId]/settings/page";
import "@/app/vendor/[vendorId]/admin/subscription/page";
import "@/app/vendor/[vendorId]/dashboard/page";
import "@/app/vendor/[vendorId]/analytics/page";

import "@/app/help/page";
import "@/app/page";
import "@/app/login/page";
import "@/app/signup/page";
import "@/app/pricing/page";
import "@/app/subscribe/[planId]/page";
import "@/app/admin/designer/page";
import "@/app/admin/designer/[pageId]/page";
import "@/app/admin/plans/page";
import "@/app/admin/plans/new/page";
import "@/app/admin/plans/[recordId]/page";
import "@/app/admin/plans/[recordId]/edit/page";
import "@/app/admin/subscribers/page";
