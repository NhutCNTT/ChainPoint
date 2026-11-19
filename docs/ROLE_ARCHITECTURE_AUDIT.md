# ChainPoint role integration audit

Audit date: 2026-11-19. The Maven source tree is the executable application; `Backend/` contains no second application. There are 40 HTML pages, 40 JavaScript files and 18 stylesheets under static resources, including two POS copies. Existing application.yml edits, .env and .tmp are user-owned and must be preserved; the application must not depend on .env.

## Original architecture and dependencies

Spring MVC controllers delegate to transactional JPA services. BCrypt and signed JWTs already use ROLE_OWNER, ROLE_MANAGER and ROLE_CASHIER. JWT authentication reloads the user from the database. Users have one nullable branch; branches have only a manager display name. Products and loyalty configuration are global. Tables, bills and registered customers have branch references. Bills and bill details serve as order and payment history. Redis caches product lists; RabbitMQ publishes checkout events to a blockchain worker with a dead-letter queue. VietQR generates an image; it does not verify a bank transfer.

Existing CRUD: branches, staff, products, tables and customers. Existing reports: dashboard metrics, weekly revenue, top products and bill searches. Refund reverses stock and customer balances and attempts blockchain synchronization. No separate persisted active order or trusted transfer receipt exists. The only original test is a full context startup test; the baseline Maven test command passed, but this is not business or authorization coverage.

## Verified defects and migration risks

* Branch filters are caller-controlled throughout services. Omitting branchId exposes all records; object lookups do not verify branch ownership.
* Managers can create OWNER/MANAGER users, modify other managers and edit global loyalty settings. Customer CRUD accepts arbitrary loyalty points.
* Public auth/branches exposes revenue, staff counts and branch details. Public registration creates a globally privileged owner without an existing-owner restriction.
* Checkout marks cash and transfers paid immediately, trusts a fallback cashier name, does not reject disabled products, and has no duplicate request protection. Customer balance and refunds lack locks.
* Payment simulation uses an in-memory flag and is available to every authenticated user. POS has manual confirmation, mock transfer flags and hardcoded fallback bank details.
* Active orders and pending bills live only in sessionStorage, so other terminals cannot see them. POS product/branch IDs silently fall back to 1.
* Global product cache keys do not include branch or principal. Products have no branch field, so allowing manager writes would modify the entire business menu.
* Every static page is public. Frontend role guards default unknown roles to privileged roles; owner and manager logins both redirect to admin. Branch dashboard redirects to admin. Owner/branch/employee navigation is duplicated and incomplete.
* Several screens swallow API errors and show empty or successful states. Branch revenue includes refunded bills. Owner dashboard and branch dashboard are redirect stubs. Images are URLs, not uploads; categories are derived from product strings.
* Entity enum mapping cannot read legacy ADMIN/OWNER/BRANCH/EMPLOYEE/POS strings. Changing an existing MySQL ENUM requires an explicit predeployment migration. Do not infer manager assignments from manager_name text.
* Rabbit publish precedes transaction commit and catches failures, potentially losing blockchain work. Worker retries can duplicate on-chain loyalty calls. An external chain cannot participate atomically in a database transaction.

## Implementation decisions

Use a canonical three-value role enum with a compatibility attribute converter. Keep users.branch_id as the primary branch and add explicit manager branch assignments. Centralize access checks in a service, scope list queries before returning data, and check both old and new ownership on mutations. OWNER has global scope; managers choose an assigned active branch; cashiers retain exactly their primary branch. Null branch never grants nonowners global scope.

Preserve legacy global products as readable shared menu items; only OWNER can edit them. New manager products belong to an authorized branch. Preserve all existing bills, customer balances, passwords and signing keys. Deletion of branches/staff becomes deactivation. Global loyalty changes are OWNER-only; balance changes occur only through settled financial transactions.

Persist active orders and payment attempts on bills, with row locking and idempotency. Only cash collection or a signed, amount-verified provider callback can settle a payment. Transfers remain pending when no provider is configured. Retain RabbitMQ/blockchain integration with a durable database delivery marker and publish after commit/retry. Keep current HTML/CSS identity, consolidate session/navigation code and redirect legacy POS entry pages to the canonical POS.

The final integration guide records the implemented permissions, page/API map, migration steps, executed checks and remaining external-service limitations. No production data cleanup or destructive migration is authorized by this audit.
