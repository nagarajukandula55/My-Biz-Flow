# Hotel and Restaurant launch price

This proposal supersedes the October private pricing draft for these two modules. It publishes one tier per module because the current system does not enforce distinct higher tiers for seats, locations, or support promises.

| Module | Launch monthly rate | Standard monthly rate | Modules in the package |
| --- | ---: | ---: | --- |
| Restaurant | ₹1,299 | ₹1,499 | Restaurant POS and Billing |
| Hotel | ₹1,499 | ₹1,799 | Hotel and Billing |

Rates are per business per month before GST. Subscription checkout applies the platform's configured cycle discounts: the launch-price equivalent is about ₹585 per month for Restaurant and ₹675 per month for Hotel on a two-year term, before GST. Annual and two-year totals are shown by checkout. The price is a sustainability floor recommendation for the current owner-operated scope, not a cost-accounting guarantee: cloud, payment, messaging and support costs have not been allocated to individual accounts.

Restaurant includes configurable order locations, menu pricing, billing, separate GST/Non-GST invoice numbering and an optional in-app kitchen queue. It does not include external kitchen hardware, printer certification, food aggregators, payment processing or fully offline bill issuance. Hotel includes rooms, reservations, manual folios, GST/Non-GST billing, housekeeping tasks and safe offline reservation requests that require online availability validation before confirmation. It does not include OTAs, channel management, payment processing, statutory filings or offline check-in/checkout.

`scripts/publish-hotel-restaurant-pricing.ts` is a dry-run-first catalog update. It creates versioned public plans and changes only the two `PartnerType.planIds` signup lists when run with `--apply`. It does not edit existing plans or subscriptions, and it requires no migration. Review the dry-run output against the live catalog before applying it.
