# MagerBeliGrocery — Backend API

REST API for an online grocery platform built with Express, TypeScript, Prisma, and PostgreSQL.

## Tech Stack

| Layer       | Library                                        |
| ----------- | ---------------------------------------------- |
| Runtime     | Node.js + TypeScript                           |
| Framework   | Express v5                                     |
| ORM         | Prisma v7 (pg adapter)                         |
| Database    | PostgreSQL                                     |
| Auth        | JWT (cookie-based) + Passport Google OAuth 2.0 |
| Password    | bcrypt                                         |
| Validation  | Zod                                            |
| Email       | Nodemailer + Handlebars templates              |
| File upload | Multer + Cloudinary                            |
| Logging     | Winston + winston-daily-rotate-file            |
| Testing     | Jest + ts-jest                                 |
| Scheduler   | node-cron                                      |

## Project Structure

```
src/
  config/          # App config (CORS, logger, Passport, Prisma client, env vars)
  controllers/     # Request/response handlers
  helpers/         # Shared utilities (bcrypt, JWT, Cloudinary, Multer, Nodemailer)
  jobs/            # Scheduled cron jobs
  middlewares/     # Express middleware (auth, error handler, Zod validation)
  repositories/    # Database layer — raw Prisma queries per feature
  routes/          # Express routers
  services/        # Business logic per feature
    __tests__/     # Unit tests (Jest) — colocated with services
  templates/       # Handlebars email templates
  types/           # Shared TypeScript types per feature
  validators/      # Zod request schemas per feature
  app.ts           # App entry point
```

## Architecture

Requests flow through the following layers:

```
Router → Controller → Service → Repository → Prisma (PostgreSQL)
```

- **Router** — defines routes and applies middleware (auth, validation)
- **Controller** — handles HTTP (req/res), delegates to service
- **Service** — business logic, transaction orchestration
- **Repository** — all database queries; accepts optional `tx` for transactions
- **Types** (`src/types/`) — shared interfaces used across layers

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database

### Installation

```bash
npm install
```

### Environment Variables

Create a `.env` file at the project root:

```env
PORT=8000
DATABASE_URL=postgresql://user:password@localhost:5432/dbname

JWT_SECRET_TOKEN=your_jwt_secret

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:8000/api/auth/google/callback

# Email
USER_EMAILER=your_email@gmail.com
PASSWORD_EMAILER=your_app_password

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# App
FRONTEND_URL=http://localhost:5173
SESSION_SECRET=your_session_secret
```

### Database Setup

```bash
# Run migrations
npx prisma migrate dev

# Generate Prisma client
npx prisma generate
```

### Running the App

```bash
# Development (with hot reload)
npm run dev

# Production build
npm run build
npm start
```

### Running Tests

```bash
# Run all tests
npm test

# Run with coverage report
npm run test:coverage
```

## API Endpoints

All routes are prefixed with `/api`.

### Response Format

All endpoints return a consistent JSON shape:

```json
{
  "success": true,
  "message": "Human-readable message",
  "data": {}
}
```

### Authentication

Protected routes require a valid JWT. The token is issued as an `access_token` `HttpOnly` cookie on login / OAuth callback. Alternatively, pass it as a `Bearer` token in the `Authorization` header.

### Auth (`/api/auth`)

| Method | Endpoint                | Auth | Description                          |
| ------ | ----------------------- | ---- | ------------------------------------ |
| POST   | `/register`             | No   | Register a new user                  |
| POST   | `/login`                | No   | Log in with email & password         |
| POST   | `/verify-email`         | No   | Verify email and set password        |
| POST   | `/resend-verification`  | No   | Resend verification email            |
| POST   | `/forgot-password`      | No   | Request password reset link          |
| POST   | `/reset-password`       | No   | Reset password via token             |
| GET    | `/google`               | No   | Initiate Google OAuth                |
| GET    | `/google/callback`      | No   | Google OAuth callback                |
| GET    | `/me`                   | Yes  | Get current user profile             |
| POST   | `/logout`               | Yes  | Log out (clear cookie)               |
| POST   | `/complete-profile`     | Yes  | Complete profile (phone, referral)   |
| POST   | `/setup-password`       | Yes  | Set password for OAuth-only accounts |

### Cart (`/api/cart`)

All cart routes require authentication. Only verified users can add items.

| Method | Endpoint | Auth | Description                                        |
| ------ | -------- | ---- | -------------------------------------------------- |
| GET    | `/`      | Yes  | Get authenticated user's cart with items            |
| POST   | `/`      | Yes  | Add item to cart (increments qty if already exists) |
| PUT    | `/:id`   | Yes  | Update cart item quantity                           |
| DELETE | `/:id`   | Yes  | Remove cart item (auto-deletes empty cart)          |

**Business rules:**

- Stock is validated against `StoreInventory` before adding or updating
- A cart is locked to one store — adding from a different store returns `400`
- Deleting the last item automatically removes the cart

---

### Orders (`/api/orders`)

All order routes require authentication unless otherwise noted. Only verified users can place orders.

| Method | Endpoint                      | Auth | Description                                                       |
| ------ | ----------------------------- | ---- | ----------------------------------------------------------------- |
| POST   | `/`                           | Yes  | Create a new order from the authenticated user's cart             |
| POST   | `/:id/payment-proof`          | Yes  | Upload payment proof image for a manual-transfer order            |
| POST   | `/webhook/payment`            | No   | Receive payment gateway webhook for automatic payment confirmation |

#### Request body — `POST /api/orders`

```json
{
  "address_id": 1,
  "payment_method": "manual_transfer",
  "voucher_code": "DISC10",
  "shipping_method": "JNE REG",
  "shipping_cost": 15000
}
```

| Field            | Type     | Required | Description                                          |
| ---------------- | -------- | -------- | ---------------------------------------------------- |
| `address_id`     | `number` | ✅       | ID of the saved delivery address (must belong to user) |
| `payment_method` | `enum`   | ✅       | `manual_transfer` or `payment_gateway`               |
| `voucher_code`   | `string` | ❌       | Applies a voucher (product, total purchase, or shipping) |
| `shipping_method`| `string` | ❌       | Courier / service name (e.g. `"JNE REG"`)           |
| `shipping_cost`  | `number` | ❌       | Shipping fee in IDR — defaults to `0`                |

#### Response — `201 Created`

```json
{
  "success": true,
  "message": "Order created successfully. Please complete payment within 1 hour.",
  "data": {
    "order": {
      "id": 42,
      "order_number": "MBG-123456789",
      "status": "waiting_for_payment",
      "payment_deadline": "2026-04-14T09:30:00.000Z",
      "total_price": "185000.00",
      "total_discount": "15000.00",
      "shipping_cost": "15000.00",
      "order_items": [ "..." ],
      "store": { "id": 3, "name": "MBG Warehouse Selatan" },
      "address": { "..." }
    }
  }
}
```

#### Business rules

- User must have a verified email — otherwise `403`
- Cart must be non-empty — otherwise `400`
- **Pre-order global stock check** — sums `StoreInventory.stock` across *all* warehouses for each cart product; fails immediately if global stock is insufficient
- **Nearest-warehouse routing** — all stores are sorted by Haversine distance to the delivery address; the closest store that can **fully fulfil all items** is selected
  - If no single store can fulfil the full order, returns `400`
- Active store/product discounts (BOGO, percentage, nominal) are applied per line item
- Vouchers are validated against ownership (`UserVoucher`), expiry, and minimum purchase amount
- Order is created with status `waiting_for_payment` and a **1-hour payment deadline**
- Users upload payment proof via `POST /api/orders/:id/payment-proof` using `proof` file field
  - Accepted formats: `jpg`, `jpeg`, `png`
  - Max file size: `1MB`
- Orders without payment proof after one hour are automatically cancelled by the scheduler
- Payment gateway webhooks are accepted at `POST /api/orders/webhook/payment` for automatic confirmation
- On success, the following happen atomically inside a single transaction:
  - `Order` + `OrderItem` records are created
  - `StoreInventory` stock is decremented for the selected warehouse
  - A `StockJournal` entry (`order_deduction`) is written per item
  - `UserVoucher` is marked as used (if applicable)
  - The user's `Cart` and all `CartItem` rows are deleted

## Data Model Overview

| Model                            | Description                                                     |
| -------------------------------- | --------------------------------------------------------------- |
| `User`                           | Platform users with roles: `user`, `store_admin`, `super_admin` |
| `UserOAuthAccount`               | Linked OAuth providers (Google, Facebook, Twitter)              |
| `VerificationToken`              | Email verification and password reset tokens                    |
| `Store`                          | Physical grocery stores with geolocation                        |
| `StoreInventory`                 | Per-store product stock levels                                  |
| `StockJournal`                   | Immutable log of every stock change                             |
| `StockMutation`                  | Inter-store stock transfer requests                             |
| `Product` / `ProductImage`       | Product catalogue with images                                   |
| `ProductCategory`                | Product categories                                              |
| `Cart` / `CartItem`              | User shopping cart                                              |
| `Order` / `OrderItem`            | Orders with payment and shipping info                           |
| `Discount`                       | Store/product-level discounts                                   |
| `Voucher` / `UserVoucher`        | User vouchers including referral rewards                        |
| `UserAddress`                    | Saved delivery addresses with geocoding                         |
| `Province` / `City` / `District` | Indonesian region data                                          |
