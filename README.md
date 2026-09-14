# FleetPilot Enterprise

A fleet management platform for vehicles, drivers, trips, fuel and maintenance — developed by Mahdi Sakib.

## Stack

- **Frontend**: React + Vite, React Router, Tailwind, Radix UI, TanStack Query.
- **Backend**: Node.js + Express, SQLite (via `better-sqlite3`), JWT auth, email OTP verification, Google OAuth.

## Local development

Install dependencies, then run the frontend and API together:

```
npm install
npm run dev
```

This starts the Vite dev server (`http://localhost:5173`) and the API (`http://localhost:4000`) side by side; Vite proxies `/api` and `/uploads` to the API.

Environment variables (create a `.env` file at the project root — see below for defaults):

```
PORT=4000
JWT_SECRET=change-me-to-a-long-random-string
CLIENT_URL=http://localhost:5173

# Optional: enables "Continue with Google"
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:4000/api/auth/google/callback

# Optional: real email delivery for OTP/reset emails.
# Without these, emails are logged to the server console instead.
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM="FleetPilot Enterprise <no-reply@fleetpilot.local>"
```

Data is stored in `data/fleetpilot.db` (SQLite) and uploaded files in `data/uploads/` — both are gitignored.

## Scripts

- `npm run dev` — frontend + API together (recommended for local dev)
- `npm run dev:web` / `npm run dev:api` — run just one side
- `npm run build` — production frontend build (`dist/`)
- `npm start` — run the API in production mode, serving the built frontend
- `npm test` — backend test suite (Vitest + Supertest)
- `npm run lint` — ESLint
