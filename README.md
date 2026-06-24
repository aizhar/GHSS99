# GHSS Farooq Abad — Matric Class of 1999 · Class Fellows Portal

A web application where class fellows from the **Matric Class of 1999, Govt. Higher
Secondary School, Farooq Abad** can list themselves, search for one another, and add
their own profile (name, section, photos, and a short description). Admins can edit or
delete any profile.

- **Frontend:** vanilla HTML, CSS, and JavaScript (responsive, mobile-friendly, accessible)
- **Backend:** Node.js + Express REST API
- **Database:** MongoDB Atlas via Mongoose
- **Auth:** single admin account, JWT-based
- **Images:** Cloudinary (signed, direct-from-browser uploads)
- **Hosting:** Vercel (static frontend + serverless API)

---

## Table of contents

1. [Project structure](#project-structure)
2. [How it works](#how-it-works)
3. [API reference](#api-reference)
4. [Prerequisites: creating the accounts](#prerequisites-creating-the-accounts)
5. [Run it locally](#run-it-locally)
6. [Admin login & managing profiles](#admin-login--managing-profiles)
7. [Deploy to Vercel](#deploy-to-vercel)
8. [Push to GitHub](#push-to-github)
9. [Security & error handling](#security--error-handling)
10. [Customizing](#customizing)

---

## Project structure

```
GHSS99/
├── api/
│   └── index.js            # Vercel serverless entry — exports the Express app
├── src/
│   ├── app.js              # Express app (routes, static, error handler)
│   ├── db.js               # Cached Mongoose connection (serverless-safe)
│   ├── cloudinary.js       # Cloudinary config + "isConfigured" flag
│   ├── middleware/
│   │   └── auth.js         # requireAdmin (JWT verification)
│   ├── models/
│   │   └── Profile.js      # Mongoose schema + allowed sections
│   └── routes/
│       ├── profiles.js     # GET/POST/PUT/DELETE /api/profiles
│       ├── auth.js         # POST /api/login
│       └── upload.js       # GET /api/upload-signature
├── public/                 # Static frontend (served by Vercel / Express)
│   ├── index.html
│   ├── css/styles.css
│   └── js/app.js
├── scripts/
│   └── hash-password.js    # Generate a bcrypt hash for the admin password
├── server.js               # Local dev server (not used on Vercel)
├── vercel.json             # Rewrites /api/* to the serverless function
├── .env.example            # Copy to .env and fill in
├── .gitignore
└── package.json
```

## How it works

- The **frontend** is a single page. It calls the API at `/api/*` (same origin, so no
  CORS issues in production).
- The **API** is one Express app. Locally it runs via `server.js`; on Vercel the same
  app is exported from `api/index.js` and run as a serverless function. `vercel.json`
  rewrites every `/api/*` request to that function.
- **Photos** are uploaded straight from the browser to Cloudinary. The server only
  hands out a short-lived **signature** (`GET /api/upload-signature`) so the Cloudinary
  API secret never reaches the client and large image bodies never pass through the
  serverless function (which has a small request-size limit).
- **Admin actions** (edit/delete) require an `Authorization: Bearer <JWT>` header. The
  token is issued by `POST /api/login` after checking the credentials in your
  environment variables.

## API reference

| Method | Endpoint                  | Auth   | Description                                   |
| ------ | ------------------------- | ------ | --------------------------------------------- |
| GET    | `/api/profiles`           | Public | List all profiles. Query: `?search=`, `?section=` |
| GET    | `/api/profiles/:id`       | Public | Get one profile                               |
| POST   | `/api/profiles`           | Public | Create a profile                              |
| PUT    | `/api/profiles/:id`       | Admin  | Update a profile                              |
| DELETE | `/api/profiles/:id`       | Admin  | Delete a profile (and its Cloudinary images)  |
| POST   | `/api/login`              | Public | Admin login → `{ token }`                     |
| GET    | `/api/upload-signature`   | Public | Signed params for a direct Cloudinary upload  |
| GET    | `/api/meta`               | Public | Portal title + available sections             |
| GET    | `/api/health`             | Public | Health check                                  |

**Profile shape**

```json
{
  "_id": "…",
  "name": "Asad Khan",
  "section": "Science",
  "description": "Now an engineer in Lahore.",
  "photos": [{ "url": "https://res.cloudinary.com/…", "publicId": "ghss99-profiles/abc" }],
  "createdAt": "…",
  "updatedAt": "…"
}
```

---

## Prerequisites: creating the accounts

You need four free accounts. Create them once, then copy the values into your `.env`
file (local) and into Vercel's Environment Variables (production).

### 1. MongoDB Atlas (database)

1. Sign up at <https://www.mongodb.com/cloud/atlas/register>.
2. **Create a free cluster** (M0 tier).
3. **Database Access** → *Add New Database User* → set a username + password
   (use a generated password without `@ : / ?` or URL-encode them).
4. **Network Access** → *Add IP Address* → **Allow access from anywhere**
   (`0.0.0.0/0`) so Vercel's servers can connect.
5. **Connect** → *Drivers* → copy the connection string. It looks like:
   `mongodb+srv://USER:PASS@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority`
6. Insert a database name before the `?`, e.g. `…mongodb.net/ghss99?retryWrites=true…`.
   This becomes your `MONGODB_URI`.

### 2. Cloudinary (image hosting)

1. Sign up at <https://cloudinary.com/users/register_free>.
2. From the **Dashboard**, copy **Cloud name**, **API Key**, and **API Secret**.
3. These become `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`.
   (Leave `CLOUDINARY_FOLDER` as `ghss99-profiles` or change it.)

> Photos are optional — the app works without Cloudinary, profiles just show initials.

### 3. JWT secret + admin password

Generate a strong JWT secret:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Put the output in `JWT_SECRET`. Then choose an admin username and hash the password:

```bash
npm install            # first time only
npm run hash-password -- "your-strong-password"
```

Copy the printed hash into `ADMIN_PASSWORD_HASH` and set `ADMIN_USERNAME`.

### 4. GitHub & Vercel

- GitHub: <https://github.com/signup>
- Vercel: <https://vercel.com/signup> (sign up **with GitHub** so it can import your repo).

---

## Run it locally

> Requires **Node.js 18+** (`node -v` to check). If you have an old version, upgrade via
> [nodejs.org](https://nodejs.org) or `nvm`.

```bash
# 1. install dependencies
npm install

# 2. create your env file
cp .env.example .env        # Windows PowerShell: Copy-Item .env.example .env
#    then edit .env and fill in MONGODB_URI, JWT_SECRET, ADMIN_USERNAME,
#    ADMIN_PASSWORD_HASH, and the Cloudinary keys.

# 3. start the dev server (auto-reloads on changes)
npm run dev
```

Open <http://localhost:3000>. The frontend and API are both served on this port.

**Quick test without hashing** (local only): instead of `ADMIN_PASSWORD_HASH`, you may
set `ADMIN_PASSWORD=changeme` for a fast trial. Use a hash for anything real.

## Admin login & managing profiles

1. Click **Admin login** (top-right).
2. Enter the `ADMIN_USERNAME` and the password you hashed.
3. On success you're issued a JWT (stored in your browser). **Edit** and **Delete**
   buttons now appear on every profile card.
4. Click **Log out** to clear the session.

Anyone (no login) can **add** their own profile via the **+ Add your profile** button.
Only the admin can edit or delete profiles.

## Deploy to Vercel

1. Push the project to GitHub (see next section).
2. Go to <https://vercel.com/new>, **Import** your repository.
3. Framework preset: **Other**. Leave build/output settings empty — `vercel.json`
   handles routing, and there is no build step.
4. Expand **Environment Variables** and add every key from `.env`:
   - `MONGODB_URI`
   - `JWT_SECRET`, `JWT_EXPIRES_IN`
   - `ADMIN_USERNAME`, `ADMIN_PASSWORD_HASH`
   - `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `CLOUDINARY_FOLDER`
   - *(Do **not** set `ADMIN_PASSWORD` in production; use the hash.)*
5. Click **Deploy**. When it finishes you get a URL like
   `https://ghss99.vercel.app`.

To deploy from the command line instead:

```bash
npm i -g vercel
vercel            # first run links the project
vercel --prod     # production deployment
```

> After changing environment variables in Vercel, **redeploy** for them to take effect.

## Push to GitHub

This repo is already initialized locally with commits on a `main` branch and feature
branches. To publish it:

```bash
# create an empty repo on github.com first (no README), then:
git remote add origin https://github.com/<your-username>/GHSS99.git
git push -u origin main
git push origin --all     # pushes the feature branches too
```

Or, with the GitHub CLI:

```bash
gh repo create GHSS99 --public --source=. --push
```

## Security & error handling

- Admin password is stored only as a **bcrypt hash**; login compares with `bcrypt`.
- Protected routes require a valid **JWT**; tokens expire (`JWT_EXPIRES_IN`, default 8h).
- The Cloudinary **API secret stays server-side**; the browser only gets a signed,
  time-limited upload signature.
- All user input is **sanitized** server-side and validated by the Mongoose schema
  (allowed sections, length limits). Output is **HTML-escaped** in the frontend to
  prevent XSS.
- The API returns **JSON errors** with appropriate status codes; a central error
  handler hides internal details on `500`s.
- Security headers (`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`)
  are set via `vercel.json`.
- **Never commit `.env`** — it is git-ignored.

## Customizing

- **Sections:** edit the `SECTIONS` array in `src/models/Profile.js`.
- **Portal title:** edit `/api/meta` in `src/app.js` (and the `<title>` in
  `public/index.html`).
- **Look & feel:** tweak the CSS variables at the top of `public/css/styles.css`.
- **Max photos per profile:** change the `.slice(0, 6)` in `src/routes/profiles.js`
  and the matching limit in `public/js/app.js`.

---

Built with Express, Mongoose, JWT, and Cloudinary · deployed on Vercel.
