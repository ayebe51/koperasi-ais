# Koperasi AIS 🏦

> **Aplikasi Informasi Simpan Pinjam** — Full-stack cooperative management system built with Laravel & React.

A comprehensive web application for managing Indonesian cooperatives (koperasi), featuring member management, savings/loans tracking, double-entry accounting, QRIS payment integration, and profit distribution (SHU).

---

## ✨ Features

### Core Business
- **Member Management** — Registration, profile, equity tracking
- **Savings (Simpanan)** — Pokok, Wajib, Sukarela deposits/withdrawals with auto-journaling
- **Loans (Pinjaman)** — Application, simulation, approval workflow, installment schedules
- **CKPN Provisioning** — Automated collectibility classification (5 categories) with provision rates

### Accounting
- **Double-Entry Bookkeeping** — Every transaction auto-generates balanced journal entries
- **Chart of Accounts** — 55 pre-seeded accounts across 5 categories
- **Financial Reports** — Balance Sheet, Income Statement, Cash Flow, Trial Balance
- **Buku Besar (Ledger)** — Per-account transaction history with date filtering

### Store (Unit Toko)
- **Product Management** — CRUD with stock tracking and batch receiving
- **Point of Sale** — Multi-item sales with member discount
- **COGS Engine** — FIFO cost of goods sold calculation

### Other
- **SHU Distribution** — Annual profit sharing based on member equity & transactions
- **QRIS Payments** — DOKU payment gateway integration
- **Activity Logging** — Complete audit trail of all user actions
- **Dark/Light Theme** — Toggleable with localStorage persistence

---

## 🏗️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Backend** | Laravel 12, PHP 8.2, Sanctum Auth |
| **Frontend** | React 18, Vite 6, React Router 7 |
| **Database** | PostgreSQL 16 |
| **Styling** | Vanilla CSS with custom design system (glassmorphism) |
| **Charts** | Chart.js |
| **Icons** | Lucide React |
| **Payments** | DOKU QRIS |

---

## 📊 Project Stats

```
72 API routes  ·  28 models  ·  18 migrations  ·  55 COA accounts
15 frontend pages  ·  10+ reusable components  ·  5 RBAC roles
```

---

## 🔐 Role-Based Access Control

| Role | Access |
|------|--------|
| **ADMIN** | Full access — all modules + settings + user management |
| **MANAGER** | Members, savings, loans, reports, SHU, approval |
| **TELLER** | Members, savings, loans, store (day-to-day operations) |
| **ACCOUNTANT** | Loans (view), all accounting modules, reports, SHU |
| **MEMBER** | Self-service portal — view own savings & loans |

---

## 🚀 Getting Started

### Prerequisites
- PHP 8.2+
- Composer
- Node.js 18+
- PostgreSQL 16+

### Installation

```bash
# Clone
git clone https://github.com/YOUR_USERNAME/koperasi-ais.git
cd koperasi-ais

# Backend
composer install
cp .env.example .env
php artisan key:generate

# Configure database in .env
# DB_CONNECTION=pgsql
# DB_HOST=127.0.0.1
# DB_PORT=5432
# DB_DATABASE=koperasi_ais
# DB_USERNAME=postgres
# DB_PASSWORD=your_password

php artisan migrate --seed

# Frontend
cd frontend
npm install
cd ..

# Run
php artisan serve &
cd frontend && npm run dev
```

Open **http://localhost:5173** and login with:
- Email: `admin@koperasi.test`
- Password: `password`

---

## 📁 Project Structure

```
koperasi-ais/
├── app/
│   ├── Enums/              # Status, Collectibility, PaymentType
│   ├── Http/
│   │   ├── Controllers/    # 10 controller groups
│   │   ├── Middleware/      # Role-based access
│   │   └── Requests/       # Form validation (11 requests)
│   ├── Models/             # 28 Eloquent models
│   └── Services/           # Business logic (8 services)
├── database/
│   ├── migrations/         # 18 migration files
│   └── seeders/            # COA, sample data
├── frontend/
│   └── src/
│       ├── components/     # Reusable UI components
│       ├── contexts/       # Auth, Toast providers
│       ├── layouts/        # AppLayout with sidebar
│       ├── lib/            # API client, utilities
│       └── pages/          # 15 page directories
├── routes/
│   └── api.php             # 72 API endpoints
└── tests/
    └── Feature/            # Service & API tests
```

---

## 📸 Screenshots

> _Run the app locally to see the full UI with dark glassmorphism theme._

---

## 📝 API Documentation

Key endpoint groups:

| Group | Endpoints | Description |
|-------|-----------|-------------|
| `/api/auth` | 5 | Login, register, profile, password |
| `/api/members` | 5 | CRUD + detail |
| `/api/savings` | 5 | Deposit, withdraw, balance, summary |
| `/api/loans` | 9 | Apply, simulate, approve, pay, CKPN |
| `/api/accounting` | 10 | COA, journals, ledger, reports |
| `/api/store` | 7 | Products, stock, sales |
| `/api/shu` | 4 | Calculate, distribute, pay |
| `/api/export` | 3 | CSV export (members, savings, loans) |
| `/api/payments` | 4 | QRIS create, webhook, status |

---

## 🧪 Testing

```bash
php artisan test
```

---

## 📄 License

This project is open-sourced software licensed under the [MIT license](https://opensource.org/licenses/MIT).
