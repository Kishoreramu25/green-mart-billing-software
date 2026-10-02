# Green Mart - Billing & POS System

[![Node.js](https://img.shields.io/badge/Node.js-v18+-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Electron](https://img.shields.io/badge/Electron-v33-47848F?logo=electron&logoColor=white)](https://www.electronjs.org/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?logo=supabase&logoColor=white)](https://supabase.com/)
[![SQLite](https://img.shields.io/badge/SQLite-Offline_First-003B57?logo=sqlite&logoColor=white)](https://www.sqlite.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A modern, offline-first Point of Sale (POS) and inventory management system designed for retail stores, supermarkets, and grocery shops. Features dual-engine database synchronization (Cloud Supabase PostgreSQL + Local SQLite), thermal receipt printing, GST calculation, barcode scanning, and an integrated professional SQL database explorer.

---

## Key Highlights

- **Dual-Mode Database Architecture**:
  - **Cloud Mode (Supabase / PostgreSQL)**: Real-time cloud sync across multiple counters and devices.
  - **Offline Mode (SQLite via WebAssembly)**: Seamless zero-configuration fallback when internet connectivity is unavailable.
- **Embedded Database Explorer**:
  - Direct database grid modeled after pgAdmin, Supabase Studio, and DataGrip.
  - Displays explicit SQL column types (`int8 PK`, `text`, `varchar`, `numeric(12,2)`, `jsonb`, `timestamptz`).
  - Row numbering (`# row`), SQL filter bar (`WHERE`), live record counts, and one-click CSV / JSON table export.
  - Zero emojis with clean, sharp rectangular enterprise styling.
- **Fast POS Billing**:
  - Barcode scanning and instant SKU autocomplete.
  - Split payments: Cash, UPI, Card, and Customer Credit.
  - Bill hold & resume for multi-customer queues.
  - Returns and refund processing with automatic inventory restock.
- **Hardware-Ready Thermal Printing**:
  - Direct 58mm and 80mm ESC/POS receipt printing support.
  - Configurable auto-print upon checkout.
- **Inventory & Stock Management**:
  - Real-time stock decrement on completed sales.
  - Box/unit conversion (pieces per box).
  - Low-stock warnings and intelligent 30-day sales velocity reorder suggestions.
  - Complete stock audit ledger for purchase, sale, damage, and adjustment movements.
- **Customer Ledger & Credit**:
  - Track customer outstanding balances and payment settlements.
  - Default "Walk-in" customer with support for registered accounts.
- **Financial Reports & Daily Closing**:
  - Real-time calculation of Revenue, Gross Profit, Expenses, Net Profit, and GST Collected.
  - Daily cash reconciliation (Expected Cash vs. Counted Drawer Cash).

---

## Architecture Overview

```
                      +---------------------------------------+
                      |       Green Mart POS Frontend         |
                      |  (Single-Page App / Web & Electron)   |
                      +---------------------------------------+
                                          |
                      +---------------------------------------+
                      |         Local API / Proxy Server      |
                      |          (Node.js / Express-like)     |
                      +---------------------------------------+
                                    /           \
                                   /             \
                    (Online & Configured)   (Offline / Fallback)
                                 /                 \
                                v                   v
                     +--------------------+   +-------------------+
                     |  Supabase Cloud    |   |   SQLite Local    |
                     |  (PostgreSQL + RLS)|   |   (WASM Storage)  |
                     +--------------------+   +-------------------+
```

---

## Directory Structure

```
.
├── .env.example              # Template for Supabase credentials
├── .gitignore                # Production ignore rules
├── db.js                     # SQLite (sql.js WASM) offline database adapter
├── main.js                   # Electron main process desktop wrapper
├── package.json              # Dependencies, build configs, and scripts
├── preload.js                # Electron context bridge
├── README.md                 # Project documentation
├── renderer/
│   └── index.html            # Complete POS application and Database Explorer
├── server.js                 # Local API & static asset server
├── supabase_schema.sql       # Production PostgreSQL schema, RLS policies & seed data
├── supabaseClient.js         # Frontend Supabase client adapter
├── supabaseDb.js             # Backend Supabase PostgreSQL adapter
├── view-data.js              # Command-line database inspector
├── open-BillingPOS.bat       # Launcher: Desktop app (Electron)
├── open-in-browser.bat       # Launcher: Web app (Browser)
├── build-installer.bat       # Build script: Windows NSIS .exe installer
└── view-data.bat             # Terminal table viewer launcher
```

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v18.0.0 or higher
- [npm](https://www.npmjs.com/) v9.0.0 or higher

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/Kishoreramu25/green-mart-billing-software.git
   cd green-mart-billing-software
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables (Optional for Cloud Mode)**:
   Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
   Add your Supabase project credentials:
   ```env
   SUPABASE_URL=https://your-project-id.supabase.co
   SUPABASE_ANON_KEY=your-supabase-anon-or-publishable-key
   PORT=3000
   ```
   *(If `.env` is left empty, the application will automatically run in 100% offline SQLite mode).*

---

## Running the Application

### 1. Web Application Mode
To start the local web server:
```bash
npm run web
```
Open **[http://localhost:3000](http://localhost:3000)** in any modern web browser (Chrome, Edge, Brave, Firefox).

### 2. Desktop Application Mode (Electron)
To launch the native desktop application window:
```bash
npm start
```
*(On Windows, you can also double-click `open-BillingPOS.bat`).*

### 3. Packaging Desktop Application
To compile a standalone Windows `.exe`:
```bash
npm run dist
```
The compiled output will be generated inside the `dist/` directory.

---

## Database Setup (Supabase Cloud)

To connect to your own Supabase project:

1. Create a free project at [Supabase.com](https://supabase.com/).
2. Open the **SQL Editor** from the left navigation.
3. Paste the contents of [`supabase_schema.sql`](./supabase_schema.sql) and click **Run**.
4. Copy your **Project URL** and **Anon / Public Key** into `.env` (or enter them directly in the **Settings** tab of the POS app).
5. Open the **Database** tab in the POS app and click **REFRESH QUERY** to verify live connection.

---

## Database Tables

| Table | Description | Primary Key |
|---|---|---|
| `public.products` | Product catalog, pricing, tax rates, and live stock | `id (BIGINT)` |
| `public.customers` | Customer profiles and credit ledger balances | `id (BIGINT)` |
| `public.bills` | Invoices, item snapshots, and payment split records | `no (TEXT)` |
| `public.purchases` | Inward stock purchases from suppliers | `id (BIGSERIAL)` |
| `public.stock_movements` | Immutable stock movement ledger (audit trail) | `id (BIGSERIAL)` |
| `public.expenses` | Store operating expenses categorized | `id (BIGSERIAL)` |
| `public.daily_closings` | Day-end register closing and cash counts | `day (TEXT)` |
| `public.audit_logs` | System security and business action logs | `id (BIGSERIAL)` |
| `public.settings` | Shop profile, invoice numbering, and print configs | `key (TEXT)` |

---

## Keyboard Shortcuts

- <kbd>Enter</kbd> (in barcode field): Add product to current bill
- <kbd>Alt</kbd> + <kbd>S</kbd>: Save & Print receipt
- <kbd>Alt</kbd> + <kbd>H</kbd>: Hold current bill
- <kbd>Alt</kbd> + <kbd>R</kbd>: Resume held bill

---

## License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
