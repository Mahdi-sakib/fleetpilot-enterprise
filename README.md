# FleetPilot Enterprise

A fleet management platform for vehicles, drivers, trips, fuel and maintenance — developed by Mahdi Sakib.

## Stack

- **Frontend**: React + Vite, React Router, Tailwind, Radix UI, TanStack Query.
- **Backend**: Node.js + Express, MySQL (via `mysql2`), JWT auth, email OTP verification, Google OAuth.

## Local development

Run a local MySQL (Docker is the quickest way):

```
docker run -d --name fleetpilot-mysql -e MYSQL_ROOT_PASSWORD=test -p 3307:3306 mysql:8
```

Install dependencies, then run the frontend and API together:

```
npm install
npm run dev
```

This starts the Vite dev server (`http://localhost:5173`) and the API (`http://localhost:4000`) side by side; Vite proxies `/api` and `/uploads` to the API.

Environment variables (create a `.env` file at the project root — see `.env.example` for the full list):

```
PORT=4000
JWT_SECRET=change-me-to-a-long-random-string
CLIENT_URL=http://localhost:5173

DB_HOST=127.0.0.1
DB_PORT=3307
DB_USER=root
DB_PASSWORD=test
DB_NAME=fleetpilot

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

The target database is created automatically on first run if it doesn't exist. Uploaded files (fuel receipts) are stored in `data/uploads/` by default — set `UPLOADS_DIR` to point elsewhere on hosts with an ephemeral filesystem outside a specific persistent folder (see Deployment below).

## Scripts

- `npm run dev` — frontend + API together (recommended for local dev)
- `npm run dev:web` / `npm run dev:api` — run just one side
- `npm run build` — production frontend build (`dist/`)
- `npm start` — run the API in production mode, serving the built frontend
- `npm test` — backend test suite (`node --test` + Supertest); requires the local MySQL above to be running (`TEST_DB_*` env vars override the `127.0.0.1:3307` / `root` / `test` defaults)
- `npm run lint` — ESLint

## Deployment

The live deployment runs entirely on one cPanel account (DianaHost), split across two subdomains:

- **Frontend** (`vms.mahdisakib.com`): static `dist/` build uploaded to its document root. Build with `VITE_API_URL` set to the API's public URL (see `.env.production`) so the built app calls the right backend.
- **Backend API** (`api.mahdisakib.com`): a cPanel "Setup Node.js App" (CloudLinux Node.js Selector) application, with its app root pointed at this repo's `server/` directory (cloned onto the account via cPanel's Git Version Control feature) and a cPanel-managed MySQL database. Node.js Selector has no build step, and dependencies are installed via its own "Run NPM Install" action rather than a CI pipeline.

Set `CLIENT_URL` to the frontend's exact origin (CORS is locked to this one value) and provide a strong `JWT_SECRET` as an environment variable in the Node.js app's config — never commit real secrets.

`Dockerfile` / `fly.toml` / `.dockerignore` in this repo are for an alternative (Fly.io) deployment path that was evaluated but isn't the live one — kept here in case the account's Node.js hosting is ever unavailable and a container-based host is needed instead.
