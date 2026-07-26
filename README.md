# ⚡ Savory Server — Restaurant OS Backend Core Engine

Savory Server is the high-performance, real-time backend engine powering the Savory Restaurant Operating System. Built with Node.js, Express, TypeScript, Prisma ORM, PostgreSQL, and Socket.io, it provides robust APIs, real-time WebSocket event dispatching, payment gateway integrations, and strict transaction safety.

---

## 🏗️ Architecture Overview

The backend is built following a clean, domain-driven modular structure:

```
src/
├── config/             # App-level constants, business rules, & database client
├── middleware/         # Auth, validation, & error handling middleware
├── modules/
│   ├── customer/       # Customer OTP auth & QR ordering endpoints
│   ├── orders/         # Order creation, partial rejection & status state-machine
│   ├── payments/       # Billing, Cashfree PG integration & refund resolution
│   ├── sessions/       # Table session management & bill closure
│   ├── tables/         # Table floor plan & layout configuration
│   └── restaurants/    # Restaurant profile & settings
├── socket.ts           # Socket.io real-time event broadcasting
├── app.ts              # Express application mounting
└── server.ts           # HTTP server initialization
```

---

## 🌟 Key Engineering Features

### ⚡ 1. Order State Machine & Partial Rejection Logic
- Supports initial order placement & multi-round re-orders for table sessions.
- **Race Condition Guard**: Re-order rejection safely voids only `pending_approval` items without canceling already approved kitchen items (`sent`/`preparing`/`served`).
- **Auto-Recalculation**: Subtotal, Tax Total (GST), and Order Total automatically recalculate upon partial voids.
- **Rejection Reasons**: Stores structured manager rejection reasons in JSON metadata synced directly to guest screens.

### 💳 2. Financial & Payment Processing Engine
- **Split Payments**: Native support for splitting bills across multiple payment methods (e.g. Cash + Online UPI).
- **Idempotency Protection**: 5-second locks preventing duplicate parallel online payment creation.
- **Cashfree Payment Gateway SDK**: Seamless creation of payment links and automated webhook reconciliation.
- **Double Payment Resolution**: Dedicated API endpoints to resolve overpaid bills (e.g., Refund Online payment or Keep Online & Void Cash).
- **Expanded Transaction Analytics**: Individual payment status tracking (`refunded`, `reversed`, `completed`).

### 📡 3. Real-Time WebSocket Synchronization (Socket.io)
- Broadcasts real-time events to all connected clients:
  - `order:new` / `order:updated` ➔ Updates POS & KDS instantly.
  - `table:updated` / `session:closed` ➔ Floor plan real-time sync.
  - `waiter:call` / `bill:request` ➔ Instant Manager Topbar notifications.

---

## 🛠️ Tech Stack

- **Runtime**: Node.js (v18+)
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: PostgreSQL
- **ORM**: Prisma ORM
- **Real-Time Communication**: Socket.io
- **Payment Gateway**: Cashfree Payment Gateway Node SDK
- **Validation**: Zod
- **Authentication**: JWT & Phone OTP

---

## 📦 Installation & Setup

1. **Clone & Navigate**:
   ```bash
   cd savory-server
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Environment Setup**:
   Create a `.env` file in the root directory:
   ```env
   PORT=4000
   NODE_ENV=development
   DATABASE_URL="postgresql://user:password@localhost:5432/savory_db?schema=public"
   JWT_SECRET="your_jwt_secret_key"
   CASHFREE_APP_ID="your_cashfree_app_id"
   CASHFREE_SECRET_KEY="your_cashfree_secret_key"
   CASHFREE_ENV="SANDBOX" # or PRODUCTION
   ```

4. **Database Migration & Prisma Client**:
   ```bash
   npx prisma db push
   npx prisma generate
   ```

5. **Start Development Server**:
   ```bash
   npm run dev
   ```

6. **Build for Production**:
   ```bash
   npm run build
   npm start
   ```

---

## 📄 License

Internal Enterprise Application — All Rights Reserved.
