# CLAUDE.md — notes for future AI/dev sessions

Class-fellows / alumni portal for **GHSS Farooq Abad, Matric Class of 1999**.

## Live & repo
- Live: https://ghss-99.vercel.app (Vercel project `ghss-99`, owner `aizhardev`, Hobby plan)
- Repo: https://github.com/aizhar/GHSS99 — **keep this PUBLIC** (see "Deploy gotcha")
- Auto-deploy: any push to `main` deploys to Vercel.

## Architecture
- **Backend:** one Express app in `src/app.js`. Local dev = `server.js` (`npm run dev`). On Vercel, `api/index.js` exports the app; `vercel.json` rewrites `/api/*` to it.
- **DB:** MongoDB Atlas via Mongoose. Connection cached for serverless in `src/db.js`.
- **Images:** Cloudinary, uploaded **directly from the browser** using a server-signed signature (`GET /api/upload-signature`). The API secret never reaches the client.
- **Auth:** single admin. `POST /api/login` checks `ADMIN_USERNAME` + bcrypt `ADMIN_PASSWORD_HASH`, returns a JWT. Protected routes use `Authorization: Bearer <token>` (see `src/middleware/auth.js`).
- **Models:** `Profile` (name, section ∈ {A,B,C,D}, description, photos[]), `Photo` (gallery: url, publicId, caption, year).

## Frontend (`public/`)
- `index.html` + `js/app.js` — directory, search, section filter, add/edit profile.
- `gallery.html` + `js/gallery.js` — photo gallery; **uploads are admin-only**, viewing is public; masonry + lightbox.
- `profile.html` + `js/profile.js` — shareable public profile page (`/profile.html?id=<id>`), photo lightbox, admin edit/delete.
- `js/common.js` — shared shell `window.Portal`: api(), toast, modals, auth state, Cloudinary upload. Admin-only UI uses class `admin-only` + `body.is-admin`.

## API
`GET/POST /api/profiles`, `GET/PUT/DELETE /api/profiles/:id` (PUT/DELETE admin) · `GET /api/photos`, `POST/DELETE /api/photos[/:id]` (POST/DELETE admin) · `POST /api/login` · `GET /api/upload-signature` · `GET /api/meta` (title + sections) · `GET /api/health`.

## Env vars (set in Vercel + local `.env`, never committed)
`MONGODB_URI`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `ADMIN_USERNAME`, `ADMIN_PASSWORD_HASH`, `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `CLOUDINARY_FOLDER`.
Change admin password: `npm run hash-password -- "<new>"` → update `ADMIN_PASSWORD_HASH` in Vercel → redeploy.

## Deploy gotcha
On Vercel **Hobby**, a **private** repo only auto-deploys commits authored by the account owner; other authors get "Deployment Blocked". This repo is public to avoid that. Don't make it private without upgrading to Pro or matching the commit author to the owner.

## To change sections
Edit `SECTIONS` in `src/models/Profile.js` (enforced server-side, drives the frontend dropdowns via `/api/meta`).
