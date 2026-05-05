# MagerBeliGrocery — Backend API

REST API for a multi-store online grocery platform. Handles authentication, product catalogue, cart, orders, inventory, promotions, and shipping.

## Tech Stack

| Layer       | Library                                  |
| ----------- | ---------------------------------------- |
| Runtime     | Node.js + TypeScript                     |
| Framework   | Express v5                               |
| ORM         | Prisma v7 (pg adapter)                   |
| Database    | PostgreSQL                               |
| Auth        | JWT (HttpOnly cookie) + Google OAuth 2.0 |
| Validation  | Zod                                      |
| Email       | Nodemailer + Handlebars                  |
| File upload | Multer + Cloudinary                      |
| Payment     | Midtrans                                 |
| Shipping    | RajaOngkir                               |
| Logging     | Winston + daily-rotate-file              |
| Scheduler   | node-cron                                |
| Testing     | Jest + ts-jest                           |

## Project Structure

```
src/
  config/        # CORS, logger, Passport, Prisma client, env vars
  controllers/   # HTTP request/response handlers
  helpers/       # Shared utilities (JWT, bcrypt, Cloudinary, Nodemailer, Midtrans)
  jobs/          # Scheduled cron jobs
  middlewares/   # Auth, error handler, Zod validation
  repositories/  # Prisma queries per feature
  routes/        # Express routers
  services/      # Business logic per feature
    __tests__/   # Jest unit tests (colocated)
  templates/     # Handlebars email templates
  types/         # TypeScript interfaces per feature
  validators/    # Zod request schemas
  app.ts         # Entry point
```

## Architecture

```
Router → Controller → Service → Repository → Prisma → PostgreSQL
```

- **Router** — mounts routes, applies auth and validation middleware
- **Controller** — handles HTTP, delegates to service
- **Service** — business logic, transaction orchestration
- **Repository** — all Prisma queries; accepts optional `tx` for transactions

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL

### Installation

```bash
npm install
```

### Environment Variables

Copy `.env.example` to `.env` and fill in the values:

```bash
cp .env.example .env
```

| Variable                            | Description                                |
| ----------------------------------- | ------------------------------------------ |
| `PORT`                              | Server port (default: `8000`)              |
| `DATABASE_URL`                      | PostgreSQL connection string               |
| `JWT_SECRET_TOKEN`                  | Access token signing secret                |
| `JWT_REFRESH_SECRET`                | Refresh token signing secret               |
| `JWT_ACCESS_TOKEN_EXPIRY`           | Access token TTL (default: `30m`)          |
| `JWT_REFRESH_TOKEN_EXPIRY`          | Refresh token TTL (default: `30d`)         |
| `EMAIL_VERIFICATION_EXPIRY_MINUTES` | Email token TTL (default: `60`)            |
| `PASSWORD_RESET_EXPIRY_MINUTES`     | Password reset token TTL (default: `15`)   |
| `USER_EMAILER`                      | Gmail address used to send emails          |
| `PASSWORD_EMAILER`                  | Gmail app password                         |
| `GOOGLE_CLIENT_ID`                  | Google OAuth client ID                     |
| `GOOGLE_CLIENT_SECRET`              | Google OAuth client secret                 |
| `GOOGLE_CALLBACK_URL`               | OAuth redirect URI                         |
| `SESSION_SECRET`                    | express-session secret                     |
| `CLOUDINARY_CLOUD_NAME`             | Cloudinary cloud name                      |
| `CLOUDINARY_API_KEY`                | Cloudinary API key                         |
| `CLOUDINARY_API_SECRET`             | Cloudinary API secret                      |
| `RAJAONGKIR_API_KEY`                | RajaOngkir API key                         |
| `RAJAONGKIR_BASE_URL`               | RajaOngkir base URL                        |
| `MIDTRANS_SERVER_KEY`               | Midtrans server key                        |
| `MIDTRANS_CLIENT_KEY`               | Midtrans client key                        |
| `MIDTRANS_IS_PRODUCTION`            | `true` for production, `false` for sandbox |
| `MIDTRANS_SNAP_URL`                 | Midtrans Snap API URL                      |
| `MIDTRANS_API_URL`                  | Midtrans core API URL                      |
| `MIDTRANS_WEBHOOK_URL`              | Public URL for payment webhook             |
| `FRONTEND_URL`                      | Frontend origin (CORS whitelist)           |
| `CRON_SECRET`                       | Secret for Vercel internal cron endpoint   |

### Database Setup

```bash
# Run migrations
npx prisma migrate dev

# Seed base data (regions, categories, stores)
npm run seed

# Seed Indonesian region data (provinces, cities, districts)
npm run seed:regions

# Seed demo data (users, products, orders)
npm run seed:demo
```

### Running the App

```bash
# Development with hot reload
npm run dev

# Production
npm run build
npm start
```

### Running Tests

```bash
npm test
npm run test:coverage
```

## API Overview

All routes are prefixed with `/api`. Every response follows:

```json
{ "success": true, "message": "...", "data": {} }
```

Authentication uses a JWT issued as an `HttpOnly` cookie (`access_token`) on login or OAuth callback. It can also be passed as a `Bearer` token in the `Authorization` header.

**Feature domains:**

| Prefix              | Description                                                       |
| ------------------- | ----------------------------------------------------------------- |
| `/api/auth`         | Register, login, email verification, password reset, Google OAuth |
| `/api/users`        | Profile management, address book                                  |
| `/api/products`     | Product catalogue with category and image support                 |
| `/api/categories`   | Product category management                                       |
| `/api/cart`         | Cart management (single-store restriction)                        |
| `/api/orders`       | Order creation, payment proof upload, payment webhook             |
| `/api/admin/orders` | Admin order management (confirm, ship, cancel)                    |
| `/api/stores`       | Store listings and management                                     |
| `/api/inventory`    | Per-store stock management and adjustments                        |
| `/api/mutations`    | Inter-store stock transfer requests and approvals                 |
| `/api/discounts`    | Store-level discount management (%, nominal, BOGO)                |
| `/api/vouchers`     | Voucher management and redemption                                 |
| `/api/shipping`     | Shipping cost calculation via RajaOngkir                          |
| `/api/regions`      | Indonesian provinces, cities, and districts                       |
| `/api/reports`      | Sales and inventory reports (admin only)                          |

For the full request/response contract, import the Postman collection from `/docs`.

## Roles & Permissions

| Role          | Access                                                           |
| ------------- | ---------------------------------------------------------------- |
| `user`        | Browse products, manage own cart/orders/addresses/vouchers       |
| `store_admin` | Manage inventory, discounts, and orders for their assigned store |
| `super_admin` | Full access — stores, users, products, categories, reports       |

## Background Jobs

The scheduler runs every 5 minutes and handles order lifecycle transitions automatically:

- Cancel orders that exceed the payment deadline
- Auto-confirm orders after the store accepts them
- Auto-ship processing orders
- Auto-complete shipped orders after the delivery window

In production (Vercel), jobs are triggered via a secured internal endpoint instead of a long-running process.

## External APIs

| Service              | Purpose                                                           | Docs                                   |
| -------------------- | ----------------------------------------------------------------- | -------------------------------------- |
| **Midtrans**         | Payment gateway — Snap (redirect) and Core API (webhook)          | https://docs.midtrans.com              |
| **RajaOngkir**       | Indonesian shipping cost calculation (JNE, TIKI, POS, etc.)       | https://rajaongkir.com/docs            |
| **Cloudinary**       | Image storage and CDN for product and payment proof images        | https://cloudinary.com/documentation   |
| **Google OAuth 2.0** | Social login via Passport.js strategy                             | https://developers.google.com/identity |
| **Gmail SMTP**       | Transactional email (verification, password reset) via Nodemailer | https://nodemailer.com/smtp            |

## Git Workflow

### Branch Flow

**Development:**

```
feat/...  ─┐
fix/...   ─┼──→ development ──→ main
chore/... ─┘
```

**Release (production):**

```
feat/...  ─┐
fix/...   ─┼──→ release/v1.2.0 ──→ main
chore/... ─┘
```

### Branch Naming

Follows the [Conventional Branch](https://conventional-branch.github.io/) spec.

Format: `<type>/<short-description>`

| Type       | When to use                                  |
| ---------- | -------------------------------------------- |
| `feat/`    | New feature                                  |
| `fix/`     | Bug fix                                      |
| `hotfix/`  | Urgent production fix                        |
| `chore/`   | Non-functional tasks (deps, config, scripts) |
| `release/` | Release preparation (e.g. `release/v1.2.0`)  |

Rules:

- Lowercase only, words separated by hyphens
- No underscores, no consecutive hyphens, no trailing hyphens
- Include ticket number when applicable: `feat/issue-42-discount-engine`

```
✅ feat/add-voucher-redemption
✅ fix/order-stock-deduction
✅ chore/update-prisma-client
✅ release/v1.2.0
❌ Feature/AddVoucher
❌ fix/order_stock
❌ feat/new--feature
```

### Commit Messages

Follows the [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) spec.

Format:

```
<type>[optional scope]: <description>

[optional body]

[optional footer]
```

| Type       | When to use                        |
| ---------- | ---------------------------------- |
| `feat`     | New feature (MINOR bump)           |
| `fix`      | Bug fix (PATCH bump)               |
| `docs`     | Documentation only                 |
| `refactor` | Code change with no feature or fix |
| `test`     | Adding or updating tests           |
| `chore`    | Build, tooling, dependency updates |
| `perf`     | Performance improvement            |
| `ci`       | CI/CD config changes               |

Breaking changes: append `!` after the type or add `BREAKING CHANGE:` in the footer (MAJOR bump).

```
feat(order): add nearest-warehouse routing on checkout
fix(cart): prevent adding item from different store
chore: upgrade prisma to v7
feat!: rename order status enum values
```

## API Resource Naming

Follows [REST resource naming conventions](https://restfulapi.net/resource-naming/).

- **Use nouns, not verbs** — the HTTP method expresses the action
- **Plural for collections** — `/orders`, `/products`, `/stores`
- **Lowercase, hyphen-separated** — `/order-items`, not `/orderItems` or `/order_items`
- **Hierarchy for sub-resources** — `/stores/:id/inventory`, `/orders/:id/payment-proof`
- **No trailing slashes**
- **Query params for filtering/sorting** — `/products?category=dairy&sort=price`

```
✅ GET    /api/products
✅ GET    /api/products/:id
✅ POST   /api/orders
✅ GET    /api/stores/:id/inventory
✅ POST   /api/orders/:id/payment-proof
❌ POST   /api/createOrder
❌ GET    /api/getProductById/:id
❌ GET    /api/products/
```
