# Retain: personal expense & budget manager

Retain helps you record expenses, set a monthly budget and see where your money goes.

**Live app:** `https://retain-app-1-qjbg.onrender.com`  
**API:** `https://retain-expense-qbpq.onrender.com/api/health`

The admin account is seeded using the `ADMIN_EMAIL` and `ADMIN_PASSWORD` values in the backend `.env`.

## Technologies
- **Frontend:** React 18, TypeScript, Vite, React Router, Redux Toolkit, plain CSS (responsive)
- **Backend:** Node.js, Express 5, PostgreSQL (`pg`), JWT, bcrypt

## Main features
- Sign up, sign in, sign out, user roles and protected routes (**React Context** only)
- Expense CRUD with title, amount, category, date, payment method and notes
- Search, category / payment / date / amount filters, sort by date or amount, pagination (**Redux** only; the filter state drives the API query)
- Monthly budget with total spent, remaining and a within / approaching (80%+) / over status
- Dashboard: month total, remaining budget, highest expense, spending by category, recent expenses
- Admin dashboard (admin role only): create, rename and delete categories; platform insights (users, expense count and value, expenses this month, spend per category, top 5 and bottom 5 categories, recent expenses and users)
- Deleting a category moves its expenses to the default **Uncategorized** category inside one transaction. The default category cannot be edited or deleted.

## Project structure
```
backend/   Express API (src/db.js schema + seed, auth.js, api.js, index.js)
frontend/  React app (context/ auth, store/ Redux filters, pages/, components/)
```

## Run locally
Requires Node 18+ and PostgreSQL.
```bash
# 1. Database
createdb retain

# 2. Backend
cd backend
cp .env.example .env        # edit DATABASE_URL and JWT_SECRET
npm install
npm start                   # creates tables, default categories and the admin user

# 3. Frontend (new terminal)
cd frontend
cp .env.example .env        # VITE_API_URL=http://localhost:4000/api
npm install
npm run dev                 # http://localhost:5173
```

## Environment variables
| Where | Name | Purpose |
|---|---|---|
| backend | `DATABASE_URL` | PostgreSQL connection string |
| backend | `DATABASE_SSL` | `true` for most hosted databases |
| backend | `JWT_SECRET` | long random string |
| backend | `CLIENT_URL` | deployed frontend URL(s), comma separated (CORS) |
| backend | `ADMIN_EMAIL`, `ADMIN_PASSWORD` | seeded admin account |
| frontend | `VITE_API_URL` | deployed API base, e.g. `https://retain-api.onrender.com/api` |
| frontend | `VITE_CURRENCY` | ISO currency code, default `USD` |

## Deployment
1. **Database + API (Render or Railway):** create a PostgreSQL instance; create a web service from `backend/` (build `npm install`, start `npm start`); set the backend variables above with `DATABASE_SSL=true`.
2. **Frontend (Netlify or Vercel):** base directory `frontend/`, build `npm run build`, publish `dist`; set `VITE_API_URL`. A `_redirects` file handles client-side routing on Netlify (on Vercel add a rewrite of all paths to `/index.html`).
3. Set `CLIENT_URL` on the API to the frontend URL, then paste both URLs at the top of this README.

## API (all routes except auth need `Authorization: Bearer <token>`)
| Method | Route | Notes |
|---|---|---|
| POST | `/api/auth/register`, `/api/auth/login` | returns `{ token, user }` |
| GET | `/api/auth/me` | current user |
| GET | `/api/categories` | all categories |
| GET | `/api/expenses` | query: `q, category, payment, from, to, min, max, sort (date\|amount), order, page, limit` |
| POST / GET / PUT / DELETE | `/api/expenses[/:id]` | only the owner's expenses |
| GET / PUT | `/api/budgets/:month` | month like `2026-10` |
| GET | `/api/dashboard?month=` | spent, budget, remaining, status, highest, by category, recent |
| POST / PUT / DELETE | `/api/admin/categories[/:id]` | admin only |
| GET | `/api/admin/insights` | admin only |

## Security notes
Passwords are hashed with bcrypt; every expense and budget query is scoped to the signed-in user; the admin role is read from the database on every request, so admin routes are enforced on the server as well as in the UI. New sign-ups are always regular users.
