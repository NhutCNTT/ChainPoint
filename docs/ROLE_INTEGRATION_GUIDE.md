# ChainPoint Owner / Manager / Cashier integration

Implementation date: 2026-11-19. See [the original audit](ROLE_ARCHITECTURE_AUDIT.md) and [file change inventory](ROLE_FILE_CHANGES.md).

## Architecture and permissions

The only business roles are `ROLE_OWNER`, `ROLE_MANAGER`, `ROLE_CASHIER`. The persistence converter reads legacy `ADMIN/OWNER`, `BRANCH/MANAGER`, and `EMPLOYEE/POS/CASHIER`, with or without `ROLE_`, and writes canonical values. Unknown values fail closed. No passwords or signing keys are migrated or regenerated.

`users.branch_id` remains the primary assignment. `manager_branches` grants explicit additional branches to managers. A cashier uses exactly the primary branch; manager membership never grants owner privileges. Branch `manager_name` remains historical display metadata and grants no access. Actual manager names are derived from account assignments when available. Assignments can be added from Branch Management or edited in Owner Staff Management.

`BranchAccess` reads the authenticated database user, not branch claims or client storage. JWT authentication reloads status, role and assignments on every request, so disabling or reassigning an account affects the next request. Owner can query globally. Missing branchId defaults to the primary/first assigned branch for nonowners; it never removes a scope restriction. Managers use the branch switcher to select another assignment.

| Resource/action | Owner | Manager | Cashier |
|---|---|---|---|
| System dashboard/reports | All branches | Selected assigned branch | Denied |
| Create/deactivate branches | Yes | Denied | Denied |
| Edit branch settings | All | Assigned branches | Denied |
| Assign/create managers | Yes | Denied | Denied |
| Create/edit/disable cashiers | All | Assigned branches only | Denied |
| Reassign cashiers | All | Within managed branches | Denied |
| Product/menu CRUD | All, including shared products | Own branch products | Read assigned menu |
| Legacy shared menu | Read/write | Read only | Read only |
| Table administration | All | Assigned branches; occupied tables protected | Denied |
| Create/edit open orders | All | Assigned branches | Assigned branch |
| Cash settlement | All | Assigned branches | Assigned branch |
| Transfer confirmation | Signed trusted adapter only | Signed trusted adapter only | Signed trusted adapter only |
| Cancel open orders | Yes | Assigned branches | Assigned branch |
| Cancel pending transfer | Yes | Assigned branches, explicit confirmation | Denied |
| Refund ledger/stock/points | Yes | Assigned branches | Denied |
| Customers and loyalty history | All | Assigned branches | Assigned branch |
| Edit customer point balances | Payment/refund workflows only | Payment/refund workflows only | Payment/refund workflows only |
| Edit global loyalty rules | Yes | Denied | Denied |
| Actuator beyond health | Yes | Denied | Denied |

Account and branch deletion endpoints deactivate records. Occupied tables cannot be reconfigured or disabled. Customers with financial history cannot be deleted or have their phone identifier changed. Account creation cannot create an Owner through Staff APIs. Managers cannot modify another manager or an Owner. Staff workflow does not edit the current account. Public Owner registration is closed by default and is restricted to an empty installation if explicitly enabled for bootstrap.

## Authentication and page map

Serve the UI from Spring Boot for server-enforced page access. Login returns Bearer JWT and canonical identity/assignments. The browser stores session identity and a token, and the server issues a signed JWT in an HttpOnly, SameSite=Strict page cookie. The cookie is accepted only for GET `.html` navigation; API requests still require a Bearer token. Logout clears both storage and page cookie. Missing/expired/invalid JWT produces 401; authenticated role or branch denial produces 403.

`common/session.js` refreshes identity from `/auth/me`, validates branch context, builds role navigation, and surfaces API failures. Login tabs select presentation only; the server's returned role controls the destination. Normal application ports use same-origin APIs. Optional Live Server ports 5500/5501 use localhost:8080, but same-origin Spring Boot hosting is the supported production setup.

| Role/page | Canonical URL | Existing pages reused |
|---|---|---|
| Login | `/Frontend/pages/auth/login.html` | Owner/POS login aliases remain |
| Owner dashboard | `/Frontend/pages/owner/dashboard.html` | Complete original admin dashboard layout |
| Owner branches | `/Frontend/pages/admin/branches.html` | Owner branch alias retained |
| Owner managers/employees | `/Frontend/pages/admin/staff.html?role=manager`, `/Frontend/pages/admin/staff.html` | Existing staff form plus multiple assignments |
| Owner reports | `/Frontend/pages/owner/revenue-comparison.html` | Existing comparison, with date filtering |
| Manager dashboard | `/Frontend/pages/branch/dashboard.html` | Dashboard layout, scoped data |
| Menu/tables/orders/cashiers | `/Frontend/pages/branch/{menu,tables,orders,staff}.html` | Existing branch pages |
| Customers/loyalty/reports/settings | `/Frontend/pages/branch/{customers,loyalty,revenue,settings}.html` | Existing styling and forms |
| Cashier POS/tables | `/Frontend/pos/index.html` | Existing canonical POS |
| Cashier orders/customers | `/Frontend/pages/employee/{orders,customers}.html` | Existing employee pages |
| Cashier payments/history | `/Frontend/pos/{pending,history}.html` | Persistent bill data |
| Profile | `/Frontend/pages/employee/profile.html` | Shared read-only identity view |
| Legacy POS entry URLs | `/pos/*.html` | Redirect preserving query/hash |

Owner navigation also links to the branch operational views and POS. Manager navigation contains only branch management features. Cashier drawer contains POS, payments, branch orders, customers, history and profile; management links are absent. Backend HTML rules independently reject unauthorized direct URLs.

## Frontend/backend contracts

All paths below are relative to `/api/v1`. Branch-scoped operations verify resource ownership even when an ID is supplied directly. Scoped lists are queried with an authorized branch. Owner can omit branch filters for global lists.

| UI/function | API | Persistence/validation |
|---|---|---|
| Login/session/logout | `POST /auth/login`, `GET /auth/me`, `POST /auth/logout` | BCrypt, signed expiring JWT, live database principal |
| Branch CRUD/assignment | `GET/POST /branches`, `GET/PUT/DELETE /branches/{id}` | Owner-only creation/deactivation; optional managerId adds an active manager assignment |
| Staff/accounts | `GET/POST /staff`, `PUT/DELETE /staff/{id}` | Primary branch, manager branchIds, role checks, password hashing, soft deactivation |
| Menu/categories | `GET/POST /products`, `GET/PUT/DELETE /products/{id}`, `PATCH /products/{id}/toggle-status`, `GET /categories` | New branch products; derived category strings; HTTP(S) image URLs |
| Tables/areas | `GET/POST /tables`, `GET/PUT/DELETE /tables/{id}` | Unique branch+code, occupancy guards, disable rather than delete |
| Customers | `GET/POST /customers`, `GET/PUT/DELETE /customers/{id}`, `GET /customers/by-phone/{phone}` | Branch scope, unique phone, protected balances and financial identifiers |
| Dashboard | `GET /admin/dashboard/{metrics,revenue-chart,top-dishes}` | Paid-only revenue; branch filter; metrics presets or explicit from/to dates |
| Orders/history/reports | `GET /orders`, `GET /orders/{billCode}` | Branch/status/from/to filters, persisted line notes, cash received and paidAt |
| Save/edit active order | `POST /pos/orders` | Stable requestKey, optional orderCode, server prices, row-locked stock, table occupancy |
| Cancel unpaid order | `POST /pos/orders/{billCode}/cancel` | Restores stock and reserved points atomically; pending transfer requires management |
| Checkout | `POST /pos/checkout` | Existing orderCode or new requestKey; cashReceived required for cash; server-calculated totals |
| QR/status | `GET /payment/vietqr-info?billCode=...`, `GET /payment/status/{billCode}` | Amount comes from the bill, not query amount; branch checks |
| Bank receipt | `POST /payment/provider-confirmation` | HMAC, timestamp, exact amount, unique provider reference, locked settlement |
| Refund | `POST /orders/{billCode}/refund` | Management and branch checks, locked bill/customer/stock, no repeat refund |
| Loyalty | `GET/PUT /loyalty/config`, `GET /loyalty/transactions` | Owner-only global changes; financial history excludes unsettled bills |

Checkout example shape (use real authorized IDs and a stable UUID; no client prices):

```json
{
  "requestKey": "stable-uuid-for-this-order",
  "orderCode": "existing-bill-code-or-null",
  "branchId": 123,
  "tableCode": "T1",
  "paymentMethod": "cash",
  "cashReceived": 100000,
  "customerPhone": null,
  "pointsToUse": 0,
  "items": [{ "productId": 456, "quantity": 2, "note": "Less ice" }]
}
```

Open orders reserve stock and persist across terminals and reloads. Editing is allowed only before payment preparation. Cash or a verified transfer transitions the bill to paid, records paidAt, frees the table, updates customer spend/tier/earnings, and marks blockchain delivery pending in the same database transaction. Transfer preparation reserves redeemed points under a customer row lock; earnings/revenue wait for verification. Cancelling a pending bill restores reservations. Identical retries do not repeat financial changes. Unique request keys and provider references supplement pessimistic row locks. Refund rejects a reversal that would require a negative customer balance.

Redis remains configured; scoped product reads use the database to avoid cross-branch cache reuse. A cache error handler prevents unavailable cache operations from falsely reporting committed database writes as failures.

Paid bills carry a durable blockchain_pending marker. A scheduled dispatcher republishes pending work through the existing RabbitMQ exchange; the worker locks the bill, preserves completed invoice/redemption/earning checkpoints on retryable failure, and clears the marker only on success. It ignores duplicate completed deliveries. Contract source adds payload-bound invoice/loyalty retry guards. These source changes do not update an already deployed contract.

## Safe migration and configuration

1. Back up the database, record existing schema and role values, and arrange a maintenance window. MySQL/TiDB DDL is not transactionally rolled back as a group.
2. Review [V2__roles_branch_orders.sql](../src/main/resources/db/migration/V2__roles_branch_orders.sql). It is a **manual, one-time script**, not automatically run by Flyway. Stop for unknown roles. Skip individual ADD COLUMN/constraint steps already present, checking INFORMATION_SCHEMA first.
3. The script archives original role labels without credentials, expands a native role ENUM to VARCHAR, canonicalizes known values, adds manager assignment rows from existing primary branches, and adds nullable/compatible operational fields. It deletes no business records. Existing global products keep NULL branch; existing balances and bill history remain unchanged. Historical bills are not automatically replayed to the blockchain.
4. Deploy the application, then assign additional managed branches through Owner Staff Management. Review historical free-text manager names; they do not grant access.
5. Keep `application.yml` as the primary configuration. It has no .env dependency. Existing user edits and credentials were preserved. New optional keys can be added to application.yml or supplied as standard Spring properties; no .env file is needed:

```yaml
auth:
  registration-enabled: false
payment:
  # Set through your existing secure configuration process; never use a sample key.
  webhook-secret: ${PAYMENT_WEBHOOK_SECRET:}
blockchain:
  delivery-delay-ms: 30000
```

Existing payment bank-code/account-number/account-name/template settings are retained. Missing trusted verification configuration returns 503 rather than fabricating success. Existing JWT secret/expiration, database, Redis, RabbitMQ and blockchain settings remain in use. For a truly empty installation, registration may be explicitly enabled briefly for a single bootstrap request during maintenance and then disabled.

The bank/provider adapter must verify a real successful credit to the configured account and submit:

```json
{"billCode":"persisted-bill-code","amount":95000,"reference":"stable-bank-receipt-id","timestamp":1795000000}
```

Header `X-Payment-Signature` is lowercase hex HMAC-SHA256 over UTF-8:
`billCode + "\n" + amount.toPlainString() + "\n" + reference + "\n" + timestamp`.
The timestamp is Unix seconds within five minutes. Decimal representation must match the JSON numeric value parsed as BigDecimal (for example 95000 and 95000.00 have different signature payloads). Keep the secret on trusted servers; never put it in the browser. There is no payment simulation endpoint or manual transfer-paid override.

## Repaired UI interactions

Role login redirects; authorized branch switching; shared navigation/logout/profile; Owner branch creation and existing-manager assignment; multi-branch manager creation/editing; Cashier creation/status/reassignment; menu category/price/stock/status/image URL forms; shared-product write restrictions; table configuration guards; persistent order save/edit/notes/cancel; cashier cash collection; trusted QR/status polling; customer lookup/creation; read-only loyalty balances; Owner-only loyalty rules; paid-only reports; date comparisons; dashboard live search and operational notices; responsive menu toggles; long-table pagination; API failure banners. Search links carry the selected branch and query. Pending transfers reopen the status view rather than allowing their prepared totals to be edited.

## Executed validation

* Original baseline `mvnw.cmd test`: passed the single context test before refactoring.
* `mvnw.cmd verify`: compilation, tests and executable Spring Boot JAR packaging passed. Current suite includes one context test and 11 integration tests covering valid/invalid/expired authentication, stale claims, server page authorization, role boundaries, cross-branch denial, account disable/reassignment, branch/manager/cashier creation, product/table CRUD, customer balance protection, order corrections/rollback, cash settlement, simultaneous settlement, signed transfer verification/replay rejection, revenue, loyalty, refund and blockchain checkpoint retries.
* `npm test`: all 57 external/inline scripts parse; 309 local asset and navigation references resolve.
* `npm run test:e2e`: 11 workflow checks passed in Chrome against a separately launched H2 test server, with zero JavaScript errors. Real frontend/API/database flows cover role redirects, branch/manager/Cashier creation, menu creation/search, order persistence after reload, cash payment, customer creation and persisted loyalty earnings, transfer preparation and polling after a signed test-provider receipt, direct Owner URL denial and POS layouts at 1024, 768 and 390 pixels. Additional controls checked include dashboard search/date/notification actions, table pagination and API error presentation. The signed fixture receipt tests the adapter contract; it is not a real bank payment.
* `npm run test:contract`: Solidity source compiled successfully with solc 0.8.38. This is compilation, not live-chain execution.
* `npm audit`: zero known dependency vulnerabilities after pinning the patched tmp dependency used by solc.

Test details are in target/surefire-reports and test-results/browser-results.json. Browser screenshots and server logs are local ignored artifacts. The test-only fixture server and its known credentials are under src/test and are excluded from the production JAR. Test infrastructure overrides use H2, an in-memory cache, disabled Rabbit listeners and a test-only signing key; production integrations were not disabled.

## Remaining limits and deployment checks

* The production TiDB migration has **not** been applied. Production startup after migration, TiDB-specific locking behavior, real Redis/Rabbit failures, bank receipts and live blockchain transactions require environment validation. The baseline did start with the original configuration; the updated application was started and exercised with isolated H2 fixtures.
* The callback contract is implemented, but a real bank/provider adapter and its secret must be configured. Generating VietQR does not itself prove payment. Refund reverses the sales ledger, points and stock; it does not issue a bank payout. The management confirmation explicitly states this.
* Blockchain contract changes are not deployed. Old contracts lack loyalty idempotency guards; a crash between an on-chain receipt and database checkpoint still needs reconciliation. A newly deployed contract also needs an explicit plan for existing on-chain balances/history. No contract was redeployed and no existing chain data was replaced.
* Automatic point expiration was not present in the original ledger and remains unsupported. The existing expiry value is retained and shown read-only. Expiring legacy balances without earning-bucket history would be unsafe. VAT remains branch metadata; totals continue to use configured product selling prices, without inventing a new tax policy.
* Product images remain validated image URLs; there was no supported upload endpoint. Categories are persisted on products and derived for navigation, rather than a new independent category hierarchy.
* Page cookies are stateless signed tokens: logout clears the browser's token but does not revoke a copied token on another device. Account deactivation invalidates it on the next request. There is no new refresh-token or device-session subsystem.
* UI table pagination is client-side; very large operational histories should use future server pagination. Daily/week/month presets and arbitrary metrics/report date filters are supported; the sales chart is explicitly weekly.

## Run and reproduce

On Windows with Java 21:

```powershell
.\mvnw.cmd verify
.\mvnw.cmd spring-boot:run
```

After the reviewed database migration and valid infrastructure configuration, open `http://localhost:8080/Frontend/pages/auth/login.html`. Existing accounts retain passwords and receive the appropriate role destination.

For frontend/contract/browser checks (Node.js and installed Chrome):

```powershell
npm ci
npm test
npm run test:contract
.\mvnw.cmd test-compile dependency:build-classpath '-Dmdep.outputFile=.tmp/browser-classpath.txt'
npm run test:e2e
```

The browser command starts/stops its own test-only server on port 18085 and never seeds the production database. Set CHAINPOINT_BROWSER_CHANNEL=msedge to use installed Edge. The application JAR is `target/ChainPoint-0.0.1-SNAPSHOT.jar`.
