# ChainPoint audit and verification — 18 November 2026

## Result

Java 21 and Spring Boot 3.4.3 are preserved. The application builds and runs on port 8080 with MySQL, Redis, and RabbitMQ. Verification uses the separate local `chainpoint_audit` MySQL database and RabbitMQ virtual host, with an isolated Redis key prefix. The original cloud database was not modified.

| Area | Changes |
| --- | --- |
| Build/configuration | Fixed the Windows Maven wrapper's null-array failure. Externalized database/JWT/blockchain/bank settings; added ignored `.env` support, an example configuration, and local dependency Compose configuration. Removed temporary Web3 signing-wallet generation. |
| Security/APIs | Public static pages with JWT-protected APIs; controller role checks; server-enforced branch scope; staff role-assignment restrictions and status toggling; `/users` and `/bills` aliases; invalid credentials return 401. Existing branch CRUD, registration, staff/customer APIs, bill detail/history, branch metrics, and top-dish metadata were inspected and verified. |
| Checkout/loyalty | Authenticated cashier identity; database loyalty rules; anonymous orders earn no points; locked stock/customer rows; zero-stock status and cache eviction; table occupancy updates; duplicate checkout protection; price/loyalty changes and insufficient cash are rejected. Direct point-balance editing is blocked. |
| Blockchain/RabbitMQ | Correct five-argument redemption ABI; separate invoice, earning, redemption, and refund hashes; guarded loyalty calls; refund synchronization; transactional MySQL outbox; confirmed RabbitMQ publishing; durable DLQ and checkpointed worker stages. Versioned queue/routing key preserve the legacy broker topology. |
| Frontend | One canonical `/pos` implementation; legacy redirects preserve bill queries. Every portal loads the shared JWT client. Real product/table/customer/bill APIs drive the POS. Cash and cashier-confirmed transfer checkout persist actual bills. Removed simulated payments, arbitrary product/branch ID fallbacks, sample QR assets, default staff passwords, and placeholder customer identities. Stock is entered explicitly. Revenue excludes refunded bills. |

The source of truth is `src/main/resources/static`. The duplicated `static/Frontend/pos` implementation was removed. Top-level `Frontend/` and `diagnostics/` deletions were already present when this task began and were preserved.

## Verification

| Check | Outcome |
| --- | --- |
| `./mvnw.cmd clean compile` | BUILD SUCCESS; Java release 21; zero compilation errors. |
| `./mvnw.cmd clean package -DskipTests` | BUILD SUCCESS; executable `target/ChainPoint-0.0.1-SNAPSHOT.jar`. |
| `./mvnw.cmd test` | 12 tests; no failures or errors. Tests cover public/static and protected routes, JWT, branch scope, role restrictions, authenticated cashier identity, stock, loyalty, checkout retries, legacy redirect queries, ABI arguments, transaction hashes, refund checkpoints, and rejection behavior. |
| `node scripts/verify-static.mjs` | 76 files, 40 standalone/inline scripts, 266 local references; no syntax errors or missing references. |
| `node scripts/verify-http.mjs` | 136 live checks passed using actual MySQL and Redis records, including cash/transfer bills, customer points, configurable loyalty rules, idempotency, stock/cache behavior, history, refunds, disabling a staff account, dashboards, and the production API/data/POS-store JavaScript. |
| `node scripts/verify-rabbit.mjs` | A real broker rejection was routed through the configured dead-letter exchange into `blockchain.loyalty.dlq`; the probe was consumed only from the isolated audit DLQ. |
| Source checks | No conflict-marker strings remain; decorative equals-sign comment separators were normalized to prevent false positives. `git diff --check` passes. |
| Startup/HTTP | Final packaged instance starts without error-level log entries; root and static requests return 200, APIs return 401 without/with invalid JWTs, and valid authorized JWTs return 200. |

Maven is not on the host PATH, so the repository wrapper was used. Verification used the existing local Maven repository through `-Dmaven.repo.local=...`; offline mode was used after dependencies were available. Generated logs and temporary verification credentials are in ignored `.tmp/`.

## Access

| Portal | URL |
| --- | --- |
| Main | http://localhost:8080/ |
| Owner login | http://localhost:8080/Frontend/pages/auth/owner-login.html |
| Owner dashboard | http://localhost:8080/Frontend/pages/owner/dashboard.html |
| Manager/cashier login | http://localhost:8080/Frontend/pages/auth/pos-login.html |
| Branch manager dashboard | http://localhost:8080/Frontend/pages/branch/dashboard.html |
| Cashier POS | http://localhost:8080/pos/index.html |
| Registration | http://localhost:8080/Frontend/pages/auth/register.html |

The running instance contains verification records in the isolated audit database. For normal use, configure `.env` as described in `README.md` and register your owner account against the intended database.

## External configuration and verification limits

- Live Sepolia transactions were not submitted: no funded operator key or deployed contract was configured. Blockchain synchronization defaults off and events remain durably pending in MySQL until enabled. ABI, worker guards, hash preservation, refund handling, and broker routing were tested independently.
- VietQR needs the restaurant's actual bank configuration. Transfers use explicit cashier confirmation; no real bank webhook integration is claimed or simulated.
- Broker delivery is at least once. A crash after an EVM receipt but before saving its hash still requires receipt reconciliation before replay; the MySQL outbox cannot atomically commit with an EVM transaction. Legacy queue messages are preserved for deliberate migration.
- POS drafts remain scoped to the browser session and branch; paid bills and history are persisted in MySQL. Products, membership, and loyalty settings are shared across the chain, matching the current schema.
- Visual browser QA could not run because the browser access host was unavailable. Local references and scripts were checked, all served files were fetched over HTTP, and production API/data/store scripts were executed against the live backend in a Node harness.
- Previously committed credentials remain in Git history; rotate the exposed credentials before deployment. Working-tree configuration now reads secrets externally.

## File inventory

The following inventory includes audit changes since `602c6d7` and newly created files. `A` = added, `M` = modified, `D` = removed. It excludes the pre-existing top-level frontend/diagnostics deletions and ignored build/verification artifacts.

```text
A	.env.example
M	.gitignore
A	compose.yaml
A	docs/AUDIT_REPORT.md
M	mvnw.cmd
M	pom.xml
M	PROJECT_ARCHITECTURE_AND_DATABASE_DESIGN.md
A	README.md
A	scripts/verify-http.mjs
A	scripts/verify-rabbit.mjs
A	scripts/verify-static.mjs
M	src/main/java/blockchain/ChainPoint/ChainPointApplication.java
A	src/main/java/blockchain/ChainPoint/config/CacheConfig.java
M	src/main/java/blockchain/ChainPoint/config/RabbitMQConfig.java
M	src/main/java/blockchain/ChainPoint/config/SecurityConfig.java
M	src/main/java/blockchain/ChainPoint/config/Web3Config.java
M	src/main/java/blockchain/ChainPoint/controller/BranchController.java
M	src/main/java/blockchain/ChainPoint/controller/CategoryController.java
M	src/main/java/blockchain/ChainPoint/controller/CustomerController.java
M	src/main/java/blockchain/ChainPoint/controller/DashboardController.java
M	src/main/java/blockchain/ChainPoint/controller/DiningTableController.java
M	src/main/java/blockchain/ChainPoint/controller/LoyaltyController.java
M	src/main/java/blockchain/ChainPoint/controller/OrderController.java
M	src/main/java/blockchain/ChainPoint/controller/PaymentController.java
A	src/main/java/blockchain/ChainPoint/controller/PortalController.java
M	src/main/java/blockchain/ChainPoint/controller/PosController.java
M	src/main/java/blockchain/ChainPoint/controller/ProductController.java
M	src/main/java/blockchain/ChainPoint/controller/StaffController.java
M	src/main/java/blockchain/ChainPoint/dto/order/OrderResponse.java
D	src/main/java/blockchain/ChainPoint/dto/payment/SimulatePaymentRequest.java
M	src/main/java/blockchain/ChainPoint/dto/pos/CheckoutRequest.java
M	src/main/java/blockchain/ChainPoint/entity/Bill.java
A	src/main/java/blockchain/ChainPoint/entity/CheckoutOutbox.java
M	src/main/java/blockchain/ChainPoint/event/CheckoutWeb3Event.java
M	src/main/java/blockchain/ChainPoint/exception/GlobalExceptionHandler.java
M	src/main/java/blockchain/ChainPoint/repository/BillRepository.java
A	src/main/java/blockchain/ChainPoint/repository/CheckoutOutboxRepository.java
M	src/main/java/blockchain/ChainPoint/repository/CustomerRepository.java
M	src/main/java/blockchain/ChainPoint/repository/DiningTableRepository.java
A	src/main/java/blockchain/ChainPoint/security/BranchAccess.java
M	src/main/java/blockchain/ChainPoint/service/BlockchainService.java
M	src/main/java/blockchain/ChainPoint/service/BlockchainServiceImpl.java
M	src/main/java/blockchain/ChainPoint/service/BranchServiceImpl.java
M	src/main/java/blockchain/ChainPoint/service/CheckoutServiceImpl.java
M	src/main/java/blockchain/ChainPoint/service/CustomerServiceImpl.java
M	src/main/java/blockchain/ChainPoint/service/DashboardServiceImpl.java
M	src/main/java/blockchain/ChainPoint/service/DiningTableService.java
M	src/main/java/blockchain/ChainPoint/service/DiningTableServiceImpl.java
M	src/main/java/blockchain/ChainPoint/service/LoyaltyServiceImpl.java
M	src/main/java/blockchain/ChainPoint/service/OrderServiceImpl.java
M	src/main/java/blockchain/ChainPoint/service/PaymentService.java
M	src/main/java/blockchain/ChainPoint/service/PaymentServiceImpl.java
M	src/main/java/blockchain/ChainPoint/service/ProductServiceImpl.java
M	src/main/java/blockchain/ChainPoint/service/StaffService.java
M	src/main/java/blockchain/ChainPoint/service/StaffServiceImpl.java
M	src/main/java/blockchain/ChainPoint/web3/RestaurantLoyaltyFunctions.java
M	src/main/java/blockchain/ChainPoint/worker/BlockchainWorker.java
A	src/main/java/blockchain/ChainPoint/worker/CheckoutOutboxPublisher.java
M	src/main/resources/application.yml
M	src/main/resources/static/Frontend/css/admin/admin.css
M	src/main/resources/static/Frontend/css/admin/dashboard.css
M	src/main/resources/static/Frontend/css/admin/tables.css
M	src/main/resources/static/Frontend/css/auth/login.css
M	src/main/resources/static/Frontend/css/base.css
M	src/main/resources/static/Frontend/index.html
M	src/main/resources/static/Frontend/js/admin/admin.js
M	src/main/resources/static/Frontend/js/admin/branches.js
M	src/main/resources/static/Frontend/js/admin/staff.js
M	src/main/resources/static/Frontend/js/admin/tables.js
M	src/main/resources/static/Frontend/js/auth/login.js
M	src/main/resources/static/Frontend/js/branch/branch-nav.js
M	src/main/resources/static/Frontend/js/branch/customers.js
M	src/main/resources/static/Frontend/js/branch/loyalty.js
M	src/main/resources/static/Frontend/js/branch/menu.js
M	src/main/resources/static/Frontend/js/branch/orders.js
M	src/main/resources/static/Frontend/js/branch/revenue.js
M	src/main/resources/static/Frontend/js/branch/settings.js
M	src/main/resources/static/Frontend/js/branch/staff.js
M	src/main/resources/static/Frontend/js/common/api.js
M	src/main/resources/static/Frontend/js/common/loyalty-store.js
M	src/main/resources/static/Frontend/pages/admin/branches.html
M	src/main/resources/static/Frontend/pages/admin/dashboard.html
M	src/main/resources/static/Frontend/pages/admin/orders.html
M	src/main/resources/static/Frontend/pages/admin/staff.html
M	src/main/resources/static/Frontend/pages/admin/tables.html
M	src/main/resources/static/Frontend/pages/auth/login.html
M	src/main/resources/static/Frontend/pages/auth/owner-login.html
M	src/main/resources/static/Frontend/pages/auth/pos-login.html
M	src/main/resources/static/Frontend/pages/auth/register.html
M	src/main/resources/static/Frontend/pages/branch/customers.html
M	src/main/resources/static/Frontend/pages/branch/dashboard.html
M	src/main/resources/static/Frontend/pages/branch/loyalty.html
M	src/main/resources/static/Frontend/pages/branch/menu.html
M	src/main/resources/static/Frontend/pages/branch/orders.html
M	src/main/resources/static/Frontend/pages/branch/revenue.html
M	src/main/resources/static/Frontend/pages/branch/settings.html
M	src/main/resources/static/Frontend/pages/branch/staff.html
M	src/main/resources/static/Frontend/pages/branch/tables.html
M	src/main/resources/static/Frontend/pages/employee/customers.html
M	src/main/resources/static/Frontend/pages/employee/orders.html
M	src/main/resources/static/Frontend/pages/employee/pos.html
M	src/main/resources/static/Frontend/pages/owner/branches.html
M	src/main/resources/static/Frontend/pages/owner/dashboard.html
M	src/main/resources/static/Frontend/pages/owner/revenue-comparison.html
D	src/main/resources/static/Frontend/pos/assets/qr-sample.jpg
D	src/main/resources/static/Frontend/pos/css/base.css
D	src/main/resources/static/Frontend/pos/css/history.css
D	src/main/resources/static/Frontend/pos/css/layout.css
D	src/main/resources/static/Frontend/pos/css/order.css
D	src/main/resources/static/Frontend/pos/css/payment.css
D	src/main/resources/static/Frontend/pos/css/tables.css
D	src/main/resources/static/Frontend/pos/history.html
D	src/main/resources/static/Frontend/pos/index.html
D	src/main/resources/static/Frontend/pos/js/common.js
D	src/main/resources/static/Frontend/pos/js/data.js
D	src/main/resources/static/Frontend/pos/js/history.js
D	src/main/resources/static/Frontend/pos/js/index.js
D	src/main/resources/static/Frontend/pos/js/order.js
D	src/main/resources/static/Frontend/pos/js/pay-common.js
D	src/main/resources/static/Frontend/pos/js/payment-cash.js
D	src/main/resources/static/Frontend/pos/js/payment-transfer.js
D	src/main/resources/static/Frontend/pos/js/payment.js
D	src/main/resources/static/Frontend/pos/js/pending.js
D	src/main/resources/static/Frontend/pos/js/store.js
D	src/main/resources/static/Frontend/pos/order.html
D	src/main/resources/static/Frontend/pos/payment-cash.html
D	src/main/resources/static/Frontend/pos/payment-transfer.html
D	src/main/resources/static/Frontend/pos/payment.html
D	src/main/resources/static/Frontend/pos/pending.html
D	src/main/resources/static/Frontend/pos/serve.json
M	src/main/resources/static/index.html
D	src/main/resources/static/pos/assets/qr-sample.jpg
M	src/main/resources/static/pos/css/base.css
M	src/main/resources/static/pos/css/layout.css
M	src/main/resources/static/pos/css/tables.css
M	src/main/resources/static/pos/history.html
M	src/main/resources/static/pos/index.html
M	src/main/resources/static/pos/js/common.js
M	src/main/resources/static/pos/js/data.js
M	src/main/resources/static/pos/js/order.js
M	src/main/resources/static/pos/js/payment-transfer.js
M	src/main/resources/static/pos/js/payment.js
M	src/main/resources/static/pos/js/store.js
M	src/main/resources/static/pos/order.html
M	src/main/resources/static/pos/payment-cash.html
M	src/main/resources/static/pos/payment-transfer.html
M	src/main/resources/static/pos/payment.html
M	src/main/resources/static/pos/pending.html
A	src/test/java/blockchain/ChainPoint/BlockchainWorkerTests.java
A	src/test/java/blockchain/ChainPoint/BusinessFlowTests.java
M	src/test/java/blockchain/ChainPoint/ChainPointApplicationTests.java
A	src/test/resources/application-test.yml
```
