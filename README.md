# ChainPoint

Spring Boot 3.4.3, Java **21**, MySQL, Redis, RabbitMQ, Web3j, and a static HTML/JavaScript UI.

## Run locally

1. Install Java 21. Maven is included through `mvnw.cmd` / `mvnw`.
2. Copy `.env.example` to `.env` and replace the database, RabbitMQ, and JWT secrets. Spring loads `.env` from the working directory. Environment variables override that file.
3. Start dependencies with `docker compose up -d`, or configure existing MySQL, Redis, and RabbitMQ services in `.env`. The supplied Compose file uses ports 3306, 6379, 5672, and 15672; do not start it if those ports already host your dependencies.
4. Run `./mvnw.cmd clean package -DskipTests`, then `java -jar target/ChainPoint-0.0.1-SNAPSHOT.jar` from this directory.
5. Open <http://localhost:8080/>. Register an owner, create branches and tables, add menu stock, and create manager/cashier accounts. No sample users, products, customers, or bills are inserted.

Generate a JWT secret in PowerShell:

```powershell
[Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(48))
```

## Portals

| Portal | URL |
| --- | --- |
| Main portal | http://localhost:8080/ |
| Owner login | http://localhost:8080/Frontend/pages/auth/owner-login.html |
| Owner dashboard | http://localhost:8080/Frontend/pages/owner/dashboard.html |
| Manager / cashier login | http://localhost:8080/Frontend/pages/auth/pos-login.html |
| Branch manager | http://localhost:8080/Frontend/pages/branch/dashboard.html |
| Cashier POS | http://localhost:8080/pos/index.html |
| Registration | http://localhost:8080/Frontend/pages/auth/register.html |

The UI lives only under `src/main/resources/static`. `/Frontend/pos/*` redirects to `/pos/*`, preserving query strings. All HTML, CSS, JS, and images are public; business APIs require a JWT. Managers and cashiers are scoped to their assigned branch. Owners administer the chain. Products, membership balances, and loyalty settings are shared across the chain. Cashiers may register new members, but cannot directly change point balances or manage staff/products.

## Payment and blockchain configuration

Set `PAYMENT_BANK_CODE`, `PAYMENT_BANK_NAME`, `PAYMENT_ACCOUNT_NUMBER`, and `PAYMENT_ACCOUNT_NAME` to generate a VietQR for your actual account. Transfer checkout requires the cashier to check the bank account and confirm receipt. There is no simulated webhook or automatic bank settlement integration.

Blockchain synchronization is opt-in: set `BLOCKCHAIN_ENABLED=true`, a deployed `RestaurantLoyalty` contract address, RPC URL, chain ID, and a funded operator key authorized by that contract. Keep the key in the environment or ignored `.env`. The chain ID defaults to Sepolia, `11155111`. No temporary signing wallet is generated.

Checkout and refund events are committed to `checkout_outbox` in the same MySQL transaction as the bill. While blockchain is disabled, events remain there. When enabled, the publisher sends events in order and waits for RabbitMQ publisher confirms. Broker failures leave events for retry. Worker failures reject to durable `blockchain.loyalty.dlq`; inspect the failure and replay after correcting the cause. Invoice, redemption, earning, and refund hashes are stored separately. Confirmed stages are skipped when a message is replayed.

The protected queue is `blockchain.loyalty.v2.queue`, using `chainpoint.checkout.v2.success` on `chainpoint.event.exchange`. A versioned topology avoids RabbitMQ's immutable queue argument conflict with the old `blockchain.loyalty.queue`. Existing queues/messages are preserved. Drain any legacy queue deliberately during deployment; old events must be reconciled against committed bills before replay.

Publisher delivery is at least once. A process crash between an on-chain receipt and saving its hash still requires receipt reconciliation before replay; no distributed system can atomically commit an EVM receipt and a MySQL row. POS drafts remain in the browser session; paid bills and history are persisted in MySQL.

## Verification

```powershell
./mvnw.cmd clean compile
./mvnw.cmd clean package -DskipTests
./mvnw.cmd test
node scripts/verify-static.mjs
node scripts/verify-http.mjs
```

Java tests use an isolated H2 database and test configuration. `verify-static.mjs` checks every local asset reference and parses standalone/inline JavaScript. `verify-http.mjs` requires a running application with MySQL, Redis, and RabbitMQ. It creates verification accounts and bills; run it only against a disposable database. It saves generated credentials in ignored `.tmp/audit-user.json`. Set `CHAINPOINT_URL` to choose the instance.

`scripts/verify-rabbit.mjs` verifies real dead-letter routing through the RabbitMQ management API. Set `RABBITMQ_VHOST` to a dedicated audit virtual host, provide management credentials through `RABBITMQ_USERNAME` and `RABBITMQ_PASSWORD`, and disable the application worker. It requires both audit queues to be empty before publishing and consuming its probe.
