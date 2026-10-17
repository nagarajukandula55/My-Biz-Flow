# Native app handoff

The web application is the canonical client and is now installable as a PWA. A future Android/iOS shell should reuse the same HTTPS routes rather than duplicate business logic.

## Required shell behavior

- Open the partner login and module routes over HTTPS.
- Keep authentication in secure, platform-managed storage; never put partner data or API secrets in the app bundle.
- Preserve the current tenant boundary: every request is authenticated by the server session and partner/module access is checked server-side.
- Request camera, location, notification and file permissions only when a selected module needs them.
- Use the existing module manifest routes for deep links, for example `/partner/{partnerId}/service-centre/` and `/partner/{partnerId}/hrms/employee/`.
- Keep writes online-first. Do not queue invoice, payment, stock or attendance writes offline until a conflict-safe sync protocol is designed.

## Provider configuration

Businesses can bring their own provider accounts. The supported environment/configuration surfaces are documented in `.env.example` and `docs/DEPLOYMENT.md`. Unconfigured optional providers degrade to manual records or in-app notifications; they do not block the core workspace.

## Release boundary

The native shell must be tested on real Android and iOS devices before store submission. This document is a handoff contract, not a claim that store binaries have been built or signed.
