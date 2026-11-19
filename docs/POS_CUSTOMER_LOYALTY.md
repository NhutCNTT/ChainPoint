# POS customer lookup and loyalty integration

Work is confined to branch `Nhut`; no merge, rebase, push, application.yml edit or production fixture insertion was performed.

## Audit and root causes

The existing payment screen already had customer search, quick registration, redemption previews and cash/transfer choices. CustomerService, SettlementService, persisted bills, customer row locks, unique phone constraints and signed transfer callbacks already implement the core workflow. Loyalty settings are currently global (one existing loyalty_config row); there are no branch-specific policy overrides to reuse. Existing branch access rules remain authoritative.

The missing pieces were phone validation/normalization, selected-customer removal, lookup/loading/error feedback, and preservation of selection on return. payment.js overwrote its saved selection before reading it. The rules banner used hardcoded values, success feedback guessed the new balance from an old snapshot, and pending transfer preparation deducted points before confirmation. Registration used count-based customer codes, which could collide for unrelated concurrent registrations.

## Changes and reused contracts

* `util/VietnamPhone.java`, CustomerRepository and CustomerServiceImpl normalize Vietnamese mobile numbers (local 0 or +84/84 prefix; spaces, dots, parentheses and hyphens supported). Existing formatted records are matched without rewriting historical identifiers/bills. Ambiguous legacy duplicates require review rather than merging or choosing a balance. New records use canonical phones and collision-resistant customer codes; the existing database unique constraint protects concurrent canonical registrations.
* CustomerResponse adds availablePoints while retaining points as the actual balance. The difference represents pending reservations, not deductions.
* SettlementService/BillRepository reserve availability under the existing customer row lock. They deduct and credit only on successful settlement, preserve payment idempotency and prevent concurrent overspending. Refund validation also respects pending reservations. No formula changed: the existing earn ratio, point value, minimum redemption, discount cap and allow flags remain authoritative.
* Bill adds redemption_reserved; manual migration `V3__loyalty_reservations.sql` defaults it to false. Older pending bills had already deducted points, so this marker avoids deducting those bills again and preserves their cancellation reversal. New pending bills set it true and only release availability on cancellation. Apply the migration once before deployment, skipping it if the column already exists. No business data or existing balances are rewritten.
* `Frontend/pos/payment.html` and `pos/js/payment.js` add current rules, estimated earnings, remove/change controls, normalized Enter-to-search, loading/error/not-found states, registration error handling, Escape/backdrop dismissal, stale-search protection and restored selection. Registration and switching preserve the persisted order/cart. Anonymous checkout remains supported. Invalid redemption blocks navigation and is independently rejected by the backend.
* `Frontend/js/common/loyalty-store.js` maps availablePoints; payment-cash.js obtains the confirmed balance from the server instead of guessing; payment-transfer.js refreshes customer data after confirmation.
* `RoleWorkflowIntegrationTests.java` adds normalization, duplicate registration, invalid/missing phone, reservation cancellation and same-customer concurrent-order coverage; existing retry/refund/payment/authorization tests remain. `scripts/browser-e2e.cjs` adds selection reload/remove/normalize tests and a POS-only mode using the same isolated fixture server.

No new production API, dependency, customer table or independent loyalty service was introduced. Reused endpoints: GET customers/by-phone/{phone}; POST customers; GET loyalty/config; POST pos/orders and pos/checkout; GET payment/status/{billCode}; signed POST payment/provider-confirmation; existing order/refund/history APIs.

The cashier selects or registers a customer on the POS payment screen. The selection persists during navigation and is refreshed on return; editing the phone clears the old selection. Payment submission links the bill to the server-resolved customer. Cash settlement validates funds; transfer settlement requires the trusted provider callback. Both paths calculate discounts/earnings on the server and update spend, balance, bill and delivery state transactionally. Existing settled-bill loyalty history remains the transaction record.

## Verification and limits

Backend checks use real Spring MVC/services/JPA with an isolated H2 database, not the production TiDB database. Browser checks use Chrome and the same isolated application, real API calls and persisted fixtures; only provider receipts/outage scenarios are test inputs. See target/surefire-reports and test-results/browser-results.json for executed results.

`mvnw.cmd verify` passed 15 tests (one startup test plus 14 integration tests), including failed cash collection without rewards, insufficient/invalid redemption, signed transfer confirmation, duplicate requests, cancellations/refunds and concurrent distinct orders sharing one customer. That new concurrency test exposed a stale pre-lock entity; settlement now loads phone matches directly with PESSIMISTIC_WRITE, and the test passes with both deductions and earnings preserved.

Run `mvnw.cmd verify`, `npm test`, then (after generating the browser classpath as described in ROLE_INTEGRATION_GUIDE.md) set `CHAINPOINT_POS_ONLY=1` and run `npm run test:e2e`. The focused browser mode seeds a menu item through the authenticated API in its test-only database and exercises anonymous/identified payment infrastructure, quick registration, normalized lookup, invalid phone feedback, selection restoration/removal, cart preservation, loyalty earnings and signed transfer polling.

The first full browser run encountered an unrelated menu-modal pointer interception before reaching POS. The POS-only run is reported separately; no unrelated menu/CSS fix is included in this task.

The focused Chrome run passed seven checks with zero JavaScript errors: normalized lookup/invalid input/restored and removed selection with cart preservation; cashier persisted-order cash checkout; quick customer registration and persisted earnings; signed-provider transfer polling; direct Owner URL denial; tablet/mobile POS layouts; and visible API-outage handling. `npm test` passed JavaScript syntax checks and all 309 local asset/navigation references. The full management browser suite is not claimed as passing in this task.

Production TiDB migration/locking behavior and live bank/blockchain calls require deployment validation. Existing ambiguous/non-mobile legacy phones require review. Global loyalty settings are respected; there is no invented per-branch policy. Existing automatic point-expiry limitations remain unchanged. Reservations remain until payment confirmation or authorized cancellation; they do not permanently deduct points from failed or abandoned transfers. No production bank transfer or customer-data migration was executed.
