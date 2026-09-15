# FleetPilot Enterprise — Agent Notes

## Architecture

- Frontend: React + Vite (`src/`). Backend: Node/Express + MySQL (`server/`), via `mysql2` — all DB calls in the backend are async (`get`/`all`/`run` from `server/src/db.js`).
- `src/api/client.js` is the single HTTP client the frontend uses to talk to the backend (entities, auth, file uploads). Reuse it — don't add a second client or call `fetch` directly from a page/component.
- `server/src/entities.js` is the single source of truth for each domain entity's table schema and validation (zod). Add new fields there, not ad hoc in a route.
- The backend is a plain REST API under `/api` (see `server/src/routes/`); there is no external BaaS — auth, persistence, and file storage are all self-hosted.

## Working notes

- `npm run dev` runs the Vite dev server and the API together (Vite proxies `/api` and `/uploads` to `http://localhost:4000`). Use `npm run dev:web` / `npm run dev:api` to run either side alone.
- Requires a local MySQL for `npm run dev`/`npm test` — see README for the one-line Docker command. Uploaded files live at `data/uploads/` (gitignored, created automatically).
- Before finishing a change, run `npm run lint`, `npm run build`, and `npm test` (`node --test` + Supertest backend tests) to catch regressions.
- Auth: email/password with OTP email verification, plus optional Google OAuth (only active when `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`/`GOOGLE_REDIRECT_URI` are set). Without SMTP env vars configured, OTP/reset emails are logged to the server console instead of sent.
