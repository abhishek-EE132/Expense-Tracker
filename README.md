# Ledger — Expense Tracker

A full-stack, multi-user expense and income tracker with authentication, per-category budgets, CSV export, and aggregation-driven analytics — built with React, Express.js, and MongoDB.

## Stack
- **Frontend:** React 18 (Vite), React Router, Recharts, lucide-react icons, Axios
- **Backend:** Node.js, Express.js, Mongoose, JWT auth, bcrypt
- **Database:** MongoDB

## Features

**Authentication**
- Register/login with hashed passwords (bcrypt) and JWT sessions
- All transactions and budgets are scoped per user — this is a real multi-user app, not a single-user demo

**Transactions**
- Add / edit / delete income and expense entries
- Server-side + client-side validation
- Search by description, filter by type/category, sort by date/amount, paginated table
- One-click CSV export (respects the active type filter)

**Budgets**
- Set a monthly limit per expense category
- Live progress bars showing spend vs. limit, color-shifting as you approach/exceed it
- Dashboard surfaces an alert banner automatically when any budget crosses 80%

**Dashboard analytics**
- Balance, this-month income/expense with month-over-month % change
- Savings rate for the current month
- Monthly income-vs-expense bar chart (selectable year)
- Expense-by-category pie chart with percentages
- Top 5 spending categories with trend vs. last month
- Net (income − expense) trend line across the year

**UX details**
- Custom toast notifications and confirm dialogs (no browser `alert`/`confirm`)
- Skeleton loading states
- Sidebar navigation layout, fully responsive down to mobile
- Distinct visual identity: serif headings, tabular monospace figures for amounts, a restrained ink-navy/gold palette — not a default admin-template look

## Project Structure
```
expense-tracker/
├── backend/
│   ├── config/db.js
│   ├── models/{User,Transaction,Budget}.js
│   ├── controllers/{authController,transactionController,budgetController}.js
│   ├── routes/{authRoutes,transactionRoutes,budgetRoutes}.js
│   ├── middleware/{auth,validateTransaction,errorHandler}.js
│   ├── utils/generateToken.js
│   ├── server.js
│   └── .env.example
└── frontend/
    └── src/
        ├── api/{client,authApi,transactionApi,budgetApi}.js
        ├── context/{AuthContext,ToastContext}.jsx
        ├── components/{Layout,ProtectedRoute,ConfirmDialog,Dashboard,TransactionForm,TransactionList}.jsx
        ├── pages/{Login,Register,DashboardPage,Transactions,Budgets}.jsx
        ├── App.jsx
        └── main.jsx
```

## Setup

### 1. Backend
```bash
cd backend
npm install
cp .env.example .env
```
Edit `.env`:
- `MONGO_URI` — your local MongoDB or Atlas connection string
- `JWT_SECRET` — any long random string (used to sign auth tokens)

```bash
npm run dev
```
Server runs on `http://localhost:5000`. Health check: `GET /api/health`.

### 2. Frontend
```bash
cd frontend
npm install
npm run dev
```
Runs on `http://localhost:5173`, proxying `/api` calls to the backend (see `vite.config.js`). Open it, register an account, and start adding transactions.

### 3. MongoDB
- **Atlas:** create a free cluster, add a database user under Database Access, allow your IP under Network Access, and paste the connection string into `MONGO_URI`.

## API Reference

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | – | Create account, returns JWT |
| POST | `/api/auth/login` | – | Log in, returns JWT |
| GET | `/api/auth/me` | ✓ | Current user profile |
| GET | `/api/transactions` | ✓ | List (query: type, category, search, startDate, endDate, page, limit, sortBy, sortOrder) |
| POST | `/api/transactions` | ✓ | Create transaction |
| PUT | `/api/transactions/:id` | ✓ | Update transaction |
| DELETE | `/api/transactions/:id` | ✓ | Delete transaction |
| GET | `/api/transactions/meta/categories` | ✓ | Valid categories per type |
| GET | `/api/transactions/summary/overview` | ✓ | Balance, this-month totals, savings rate, MoM change |
| GET | `/api/transactions/summary/monthly?year=` | ✓ | 12-month income/expense/net |
| GET | `/api/transactions/summary/yearly` | ✓ | Totals by year |
| GET | `/api/transactions/summary/by-category?type=` | ✓ | Category breakdown with percentages |
| GET | `/api/transactions/summary/top-categories?limit=` | ✓ | Top categories with MoM trend |
| GET | `/api/transactions/export/csv` | ✓ | Download CSV of transactions |
| GET | `/api/budgets` | ✓ | List budgets with live spend/progress |
| POST | `/api/budgets` | ✓ | Create/update (upsert) a budget |
| DELETE | `/api/budgets/:id` | ✓ | Remove a budget |

All routes marked ✓ require `Authorization: Bearer <token>`.

## Deployment Notes
- **Backend:** Render/Railway. Set `MONGO_URI` (Atlas), `JWT_SECRET`, `CORS_ORIGIN` (your deployed frontend URL).
- **Frontend:** Vercel/Netlify. Update the Axios `baseURL`s in `src/api/*.js` to point at your deployed backend, since the Vite dev proxy only applies locally — or set up an environment variable and a rewrite rule.
- Rotate `JWT_SECRET` and any database credentials before making the repo public.

## What Was Verified in This Build
- All backend files pass Node syntax checks (`node --check`)
- Frontend builds cleanly via `vite build` and serves correctly via `vite preview`
- **Not verified in the build sandbox:** live database round-trips end-to-end (registration → login → CRUD → analytics), since no MongoDB instance was available there. Test this against your own MongoDB connection once running.

This is the updated version of my readme 
