# MalesBeliGrocery — Backend API

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
