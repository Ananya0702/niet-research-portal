# NIET Research Analytics Portal — Production Deployment Guide

Zero-cost Phase 1 (Vercel + Railway + managed MySQL) with a clean, no-code-change
migration path to a single VPS via Docker Compose in Phase 2.

---

## 1. Deployment architecture

### Phase 1 — Zero cost (managed platforms)

```
                        ┌──────────────────────────────┐
   Browser  ──HTTPS──►  │  Vercel (free)               │
                        │  React + Vite static build    │
                        │  niet-portal.vercel.app       │
                        └──────────┬───────────────────┘
                                   │  axios (VITE_API_BASE_URL)
                ┌──────────────────┼───────────────────────┐
                ▼                  ▼                       ▼
 ┌──────────────────────┐ ┌──────────────────┐ ┌────────────────────┐
 │ Railway: backend     │ │ Railway: otp-api │ │ Railway: ml-api    │
 │ FastAPI :8000        │ │ Email OTP :8001  │ │ ML classify :8002  │
 │ (app.main:app)       │ │ Gmail SMTP       │ │ (ml_api:app)       │
 └──────────┬───────────┘ └──────────────────┘ └────────────────────┘
            │ TLS (DB_SSL=true)
            ▼
 ┌──────────────────────────┐      ┌──────────────────────────────┐
 │ Aiven MySQL (free tier)  │      │ External APIs (unchanged):   │
 │ niet_research database   │      │ ORCID public API, Google     │
 └──────────────────────────┘      │ Scholar, Scopus              │
                                   └──────────────────────────────┘
```

### Phase 2 — Single VPS (Docker Compose)

```
                     ┌────────────────────────────────────────────┐
 Browser ──HTTPS──►  │ VPS (DigitalOcean / Hostinger / EC2)       │
                     │                                            │
                     │  nginx (frontend container) :80/:443       │
                     │    /          → React static build         │
                     │    /api/      → backend  :8000             │
                     │    /otp/      → otp-api  :8001             │
                     │    /mlsvc/    → ml-api   :8002             │
                     │    /uploads/  → backend  :8000             │
                     │                                            │
                     │  mysql container (internal only) + volume  │
                     └────────────────────────────────────────────┘
```

Same-origin path routing on the VPS means **no CORS and relative API URLs**
(`VITE_API_BASE_URL=/api`) — the codebase does not change between phases.

---

## 2. Deployment folder structure

```
niet-portal/
├── backend/
│   ├── Dockerfile               # main FastAPI image (app.main:app)
│   ├── Dockerfile.ml            # standalone ML image (ml_api:app)
│   ├── requirements.prod.txt    # slim prod deps (no torch/transformers)
│   ├── ml_api.py                # standalone ML service entrypoint
│   └── otp_api/
│       ├── Dockerfile           # Email OTP image
│       └── main.py
├── frontend/
│   ├── Dockerfile               # node build → nginx (VPS phase)
│   ├── vercel.json              # SPA rewrites + asset caching (Phase 1)
│   └── src/services/api.js      # reads VITE_API_BASE_URL
├── deploy/
│   ├── DEPLOYMENT.md            # this guide
│   ├── nginx.conf               # reverse proxy (serves SPA + routes)
│   ├── proxy_params.conf        # shared proxy headers/timeouts
│   └── env/
│       ├── mysql.env.example
│       ├── backend.env.example
│       ├── otp-api.env.example
│       └── ml-api.env.example
├── docker-compose.yml           # Phase 2 full stack
└── .dockerignore
```

---

## 3. Environment variables (all services)

| Variable | Service | Purpose |
|---|---|---|
| `DB_USER` `DB_PASSWORD` `DB_HOST` `DB_PORT` `DB_NAME` | backend | MySQL connection |
| `DB_SSL` / `DB_SSL_CA` | backend | TLS for managed MySQL |
| `DB_ECHO` | backend | SQL logging (keep `false` in prod) |
| `SECRET_KEY` | backend | JWT signing — **set a long random value** |
| `CORS_ORIGINS` | backend, ml-api | Extra allowed browser origins (comma-separated) |
| `OTP_API_BASE_URL` | backend | URL of the Email OTP service |
| `SERPAPI_API_KEY` | backend | Optional hosted Google Scholar Author API key |
| `EMAIL_ADDRESS` `EMAIL_APP_PASSWORD` | otp-api | Gmail app-password credentials |
| `VITE_API_BASE_URL` | frontend (build time) | Backend base URL for axios |

Secrets live only in platform dashboards or `deploy/env/*.env`
(git-ignored). Never commit them.

---

## 4. Phase 1 — step-by-step (zero cost)

> Cost reality check: Vercel Hobby = free forever; Aiven MySQL "Free" plan =
> free forever; Railway gives a one-time trial credit (~$5) rather than a
> permanent free tier — Render's free tier is the always-free alternative but
> spins down after 15 min idle (first request is slow). Both work with this
> setup identically.

### Step 1 — Managed MySQL (Aiven, free)

1. aiven.io → sign up → **Create service → MySQL** → pick the **Free** plan
   and a region near your users.
2. When running, open **Overview → Connection information**. You need:
   `HOST`, `PORT`, `USER` (`avnadmin`), `PASSWORD`.
3. Download the **CA certificate** (`ca.pem`) from the overview page.
4. Create the database schema: connect once with any MySQL client
   (e.g. DBeaver/MySQL Workbench using the connection info + CA) and run:

   ```sql
   CREATE DATABASE IF NOT EXISTS niet_research;
   ```

5. Import existing data (optional): import `backend/NIET_Research_Seed_Data.sql`
   into `niet_research`.

Tables are created automatically on first backend boot
(`Base.metadata.create_all` + idempotent migrations), so an empty DB works too.

### Step 2 — Main backend on Railway

1. Push this repo to GitHub. railway.app → **New Project → Deploy from
   GitHub repo** → select the repo.
2. In the service → **Settings**:
   - **Root Directory:** `/backend`
   - **Custom Start Command:** *empty* (the Dockerfile CMD is used)
3. Railway auto-detects `backend/Dockerfile`. Set these **Variables**:

   ```
   DB_USER=avnadmin
   DB_PASSWORD=<aiven password>
   DB_HOST=<aiven host>
   DB_PORT=<aiven port>
   DB_NAME=niet_research
   DB_SSL=true
   SECRET_KEY=<python -c "import secrets; print(secrets.token_urlsafe(48)")>
   CORS_ORIGINS=https://<your-vercel-project>.vercel.app
   OTP_API_BASE_URL=https://<otp-service-domain>     # set after step 4
   PORTAL_URL=https://<your-vercel-project>.vercel.app
   OTP_ALLOW_IN_APP_FALLBACK=false
   SERPAPI_API_KEY=<optional Google Scholar API key for cloud sync>
   ```

Google Scholar may rate-limit requests from cloud-hosted IP addresses. If
that happens, add a SerpApi key as the backend's `SERPAPI_API_KEY` secret;
the portal then fetches Scholar's author profile through the Google Scholar
Author API. When enabled, the faculty member's Scholar profile ID is sent to
SerpApi to retrieve public profile data. Without the key, the portal tries its direct Google Scholar
connection; if the hosted backend is blocked, sync will fail clearly and the
local-machine sync remains a no-cost workaround. Each API request retrieves up
to 100 profile articles.

4. **Settings → Networking → Generate Domain** → note e.g.
   `https://niet-backend-production.up.railway.app`. Verify:
   `curl https://.../` → `{"message": "NIET Research Portal API is running ✓"}`
5. Seed check: the default admin (`admin@niet.co.in` / `admin123`) is created
   on first boot. **Log in and change this password immediately.**

### Step 3 — ML API on Railway

1. Same project → **New service → GitHub repo** (same repo).
2. **Settings → Root Directory:** `/backend`,
   **Custom Dockerfile path:** `Dockerfile.ml`
3. Variables:

   ```
   PORT=8002
   CORS_ORIGINS=https://<your-vercel-project>.vercel.app
   ```

4. Generate domain → verify `https://.../health` → `{"status": "ok", ...}`.

### Step 4 — Email OTP API on Railway

1. Same project → **New service → GitHub repo**.
2. **Settings → Root Directory:** `/backend/otp_api` (Dockerfile auto-detected).
3. Variables:

   ```
   EMAIL_ADDRESS=your_email@gmail.com
   EMAIL_APP_PASSWORD=<16-char gmail app password>
   PORTAL_URL=https://<your-frontend-domain>
   OTP_ALLOW_IN_APP_FALLBACK=false
   ```

4. Generate domain → then go back to the **backend service** and set
   `OTP_API_BASE_URL=https://<this-domain>` (Railway redeploys automatically).
   Set `PORTAL_URL` on both the backend and OTP API to the public frontend URL.
   New faculty receive an account-setup email with a five-minute OTP and a link
   to verify the code and choose their password.

   The portal reports an OTP as sent only after SMTP confirms delivery. For a
   temporary closed pilot only, set `OTP_ALLOW_IN_APP_FALLBACK=true` on both the
   backend and OTP API services to show the code in that requester’s OTP screen
   when email delivery fails. This weakens password-reset verification because
   the code is visible to whoever submits the reset request; leave it disabled
   on a public production site. Prefer configuring valid Gmail app-password
   credentials or another approved email sender.

### Step 5 — Frontend on Vercel

1. vercel.com → **Add New → Project** → import the same GitHub repo.
2. **Root Directory:** `frontend` (Framework: Vite, auto-detected).
3. **Environment Variables:**

   ```
   VITE_API_BASE_URL=https://<backend-domain>.up.railway.app
   ```

4. Deploy. Open the Vercel URL and log in.

> Changing `VITE_API_BASE_URL` requires a rebuild (Vite bakes it in at build
> time). Redeploy after changing it.

### Step 6 — Post-deploy checklist

- [ ] Login works from the Vercel domain (CORS OK)
- [ ] Forgot-password sends a real email (OTP service reachable)
- [ ] Add a publication → ML topic/quartile gets filled
- [ ] Profile → Connect ORCID / Sync works
- [ ] Dashboards render for Faculty / HOD / Dean
- [ ] Default admin password changed
- [ ] HTTPS padlock on both domains (automatic on Vercel/Railway)

---

## 5. Phase 2 — VPS migration (no code changes)

```bash
# 1. On the VPS (Ubuntu 22.04+)
curl -fsSL https://get.docker.com | sh

# 2. Get the code
git clone https://github.com/<you>/niet-research-portal.git && cd niet-research-portal

# 3. Configure secrets
cp deploy/env/mysql.env.example   deploy/env/mysql.env
cp deploy/env/backend.env.example deploy/env/backend.env
cp deploy/env/otp-api.env.example deploy/env/otp-api.env
cp deploy/env/ml-api.env.example  deploy/env/ml-api.env
# edit all four files with real values

# 4. Build & start everything
docker compose up -d --build
docker compose ps                 # all services Up
docker compose logs -f backend    # watch migrations run
```

The site is now on `http://<vps-ip>/` (nginx serves the SPA and proxies
`/api`, `/otp`, `/mlsvc`). Migrate data by importing your Aiven dump into the
containerized MySQL:

```bash
docker compose exec -T mysql mysql -u root -p niet_research < dump.sql
```

### Custom domain + HTTPS

1. DNS: point `yourdomain.com` A record → VPS IP (and `www` CNAME → root).
2. Install certbot and add TLS termination:

```bash
sudo apt install certbot -y
certbot certonly --standalone -d yourdomain.com -d www.yourdomain.com
```

3. Extend `deploy/nginx.conf` with a 443 server block:

```nginx
server {
    listen 443 ssl;
    http2 on;
    server_name yourdomain.com www.yourdomain.com;

    ssl_certificate     /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # ...copy the locations from the port-80 block...
}

server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$host$request_uri;
}
```

4. Mount the certs in `docker-compose.yml` (frontend service):

```yaml
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - /etc/letsencrypt:/etc/letsencrypt:ro
```

5. `docker compose up -d --build` again. Certbot renewals: rerun certbot and
   restart the frontend container (`docker compose restart frontend`).

For Railway/Vercel custom domains: add the domain in each dashboard and set
DNS records as instructed; HTTPS is automatic.

---

## 6. CORS configuration matrix

| Phase | Frontend origin | Backend `CORS_ORIGINS` | Frontend base URL |
|---|---|---|---|
| Local dev | `localhost:5173` | *(default localhost list)* | *(default)* `http://127.0.0.1:8000` |
| Phase 1 | `https://x.vercel.app` | `https://x.vercel.app` | `https://backend.up.railway.app` |
| Phase 2 | `https://yourdomain.com` | `https://yourdomain.com` *(or empty — same-origin)* | `/api` |

Rules encoded in the codebase:

- Backend merges localhost defaults + `CORS_ORIGINS` (`backend/app/main.py`).
- The ML service defaults to open CORS (no credentials, no sensitive data);
  restrict it with `CORS_ORIGINS` if you prefer.
- On the VPS the browser only ever talks to one origin, so CORS is moot.

---

## 7. Common deployment errors & fixes

| Symptom | Cause | Fix |
|---|---|---|
| Browser console: `blocked by CORS policy` | Frontend origin missing in backend `CORS_ORIGINS` | Add exact origin (with scheme, no trailing slash); redeploy backend |
| Mixed content: `HTTPS → http://… blocked` | `VITE_API_BASE_URL` still `http://` or default localhost | Rebuild frontend with the `https://` Railway URL |
| `Access denied for user …` on boot | Wrong DB creds / user not created | Check DB_* vars; on Aiven use `avnadmin`; create DB `niet_research` |
| `(2003, "Can't connect to MySQL…")` or SSL required | Provider demands TLS | Set `DB_SSL=true` (+ `DB_SSL_CA` for full verification) |
| `caching_sha2_password … 'cryptography'` | PyMySQL needs crypto backend | Already fixed — `requirements.prod.txt` ships `cryptography` |
| Backend boots then dies with `OperationalError` on Railway | DB not reachable at boot | Verify host/port; Aiven free tier suspends when unused — wake it up |
| Railway service crashes: `address already in use` | App bound to wrong port | Keep the Dockerfile CMD (`${PORT}`); don't hardcode ports in start command |
| Vercel deep links (e.g. `/login`) return 404 | SPA rewrite missing | Already handled by `frontend/vercel.json` rewrites |
| OTP email never arrives | OTP service vars wrong / backend points to old URL | Test `POST https://<otp>/send-otp`; ensure backend `OTP_API_BASE_URL` matches the OTP domain |
| Google Scholar sync fails on cloud | Google blocks datacenter IPs (pre-existing behavior) | Retry later / run syncs from residential IP; ORCID & manual entry unaffected |
| First ML request very slow / OOM on free tier | transformers model would be huge | Already avoided — prod image uses the sklearn fallback (no torch) |
| Uploads disappear after redeploy (VPS) | Container FS is ephemeral | Fixed — compose mounts the `uploads_data` volume |

---

## 8. Production security checklist

- [ ] `SECRET_KEY` is a long random value (not the dev default)
- [ ] Default admin `admin@niet.co.in / admin123` password changed immediately
- [ ] Strong MySQL passwords; DB not exposed publicly (compose keeps it internal)
- [ ] `.env` files never committed (`deploy/env/*.env` is git-ignored)
- [ ] Gmail app password scoped to mail only; rotate if leaked
- [ ] HTTPS everywhere (automatic on Vercel/Railway; certbot on VPS)
- [ ] `DB_ECHO=false` so SQL/logs never leak data
