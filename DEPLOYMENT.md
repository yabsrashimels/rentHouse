# EthioRent Deployment Guide

## 📋 Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Prerequisites](#prerequisites)
3. [Local Development Setup](#local-development-setup)
4. [Database Setup](#database-setup)
5. [Environment Configuration](#environment-configuration)
6. [External Services Setup](#external-services-setup)
7. [Production Deployment](#production-deployment)
8. [Post-Deployment Checklist](#post-deployment-checklist)

---

## Architecture Overview

```
Frontend (React + Vite) ─── Netlify / Vercel
Backend (Node.js + Express) ─── Railway / Render
Database (PostgreSQL) ─── Railway Postgres / Supabase / Neon
Images ─── Cloudinary
```

---

## Prerequisites

- Node.js v18+ (v22 recommended)
- npm or pnpm
- PostgreSQL 14+
- Git

---

## Local Development Setup

### 1. Clone and install dependencies

```bash
# Backend
cd ethiorent/backend
npm install

# Frontend
cd ../frontend
npm install
```

### 2. Configure environment variables

```bash
# Backend
cp .env.example .env
# Edit .env with your values

# Frontend
cp .env.example .env
# Edit .env with your values
```

### 3. Set up the database (see Database Setup below)

### 4. Start development servers

```bash
# Terminal 1: Backend
cd backend
npm run dev

# Terminal 2: Frontend
cd frontend
npm run dev
```

The frontend will be available at http://localhost:5173
The backend API at http://localhost:5000

---

## Database Setup

### Create PostgreSQL database

```sql
CREATE DATABASE ethiorent;
CREATE USER ethiorent_user WITH ENCRYPTED PASSWORD 'yourpassword';
GRANT ALL PRIVILEGES ON DATABASE ethiorent TO ethiorent_user;
```

### Run Prisma migrations

```bash
cd backend

# Generate Prisma client
npm run prisma:generate

# Run migrations (creates all tables)
npm run prisma:migrate

# Seed with initial data (packages, admin user, demo data)
npm run prisma:seed
```

The seed requires `ADMIN_PASSWORD` to be set to a unique, strong value before it runs. Demo owner, tenant, and property records are created only when `NODE_ENV` is not `production`; do not use demo credentials in a deployed environment.

The seed intentionally does not configure Telebirr or CBE recipient details. Configure and verify official merchant instructions with the platform operator before collecting advertising payments. A submitted receipt is not proof of a successful transfer.

### Production migration

```bash
# In production, use deploy instead of migrate dev
npx prisma migrate deploy
```

---

## Environment Configuration

### Backend (.env)

| Variable                | Description                                        | Required |
| ----------------------- | -------------------------------------------------- | -------- |
| `NODE_ENV`              | `development` or `production`                      | Yes      |
| `PORT`                  | Server port (default: 5000)                        | Yes      |
| `DATABASE_URL`          | PostgreSQL connection string                       | Yes      |
| `JWT_SECRET`            | Secure random string for JWT signing               | Yes      |
| `JWT_REFRESH_SECRET`    | Secure random string for refresh tokens            | Yes      |
| `CLOUDINARY_CLOUD_NAME` | Your Cloudinary cloud name                         | Yes      |
| `CLOUDINARY_API_KEY`    | Cloudinary API key                                 | Yes      |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret                              | Yes      |
| `FRONTEND_URL`          | Your frontend domain (for CORS)                    | Yes      |
| `COOKIE_DOMAIN`         | Shared parent domain for auth cookies              | Optional |
| `COOKIE_SAME_SITE`      | `lax`, `strict`, or `none` (`none` requires HTTPS) | Optional |
| `ADMIN_EMAIL`           | Initial admin account email                        | Yes      |
| `ADMIN_PASSWORD`        | Initial admin account password                     | Yes      |
| `SMTP_HOST`             | Email SMTP host                                    | Optional |
| `SMTP_USER`             | Email SMTP username                                | Optional |
| `SMTP_PASS`             | Email SMTP password / App password                 | Optional |

### Frontend (.env)

| Variable               | Description         | Required         |
| ---------------------- | ------------------- | ---------------- |
| `VITE_API_URL`         | Backend API URL     | Yes (production) |
| `VITE_GOOGLE_MAPS_KEY` | Google Maps API key | Optional         |

---

## External Services Setup

### Cloudinary (Image Storage) — REQUIRED

1. Sign up at https://cloudinary.com (free tier: 25GB storage)
2. From the dashboard, copy:
   - Cloud Name
   - API Key
   - API Secret
3. Add these to backend `.env`

### PostgreSQL — REQUIRED

**Option A: Railway (recommended for simplicity)**

1. Create account at railway.app
2. New Project → Add Database → PostgreSQL
3. Copy the connection URL to `DATABASE_URL`

**Option B: Supabase (free tier)**

1. Create account at supabase.com
2. New project → Settings → Database → Connection string
3. Use the "Direct connection" URL

**Option C: Neon (serverless postgres)**

1. Create account at neon.tech
2. Create database, copy connection string

### Google Maps API (Optional)

1. Go to Google Cloud Console
2. Enable Maps JavaScript API
3. Create API key and restrict to your domain
4. Add to frontend `.env` as `VITE_GOOGLE_MAPS_KEY`

### Gmail SMTP (Optional - for email notifications)

1. Enable 2FA on your Google account
2. Go to Account Settings → Security → App passwords
3. Create app password for "Mail"
4. Use this as `SMTP_PASS`

Password-reset email delivery is not implemented yet. The forgot-password API currently creates a reset token but does not deliver it; configure an email provider and implement delivery before enabling password resets in production.

For cookie authentication, prefer serving the frontend and API on the same site (for example, `www.example.com` and `api.example.com`) and configure `COOKIE_DOMAIN` as the shared parent domain if needed. Cross-site deployments require HTTPS and `COOKIE_SAME_SITE=none`; browser third-party-cookie restrictions can still block those sessions.

---

## Production Deployment

### Backend on Railway

1. Create account at railway.app
2. New Project → Deploy from GitHub repo
3. Select `ethiorent/backend` as root directory
4. Add environment variables from your `.env`
5. Railway auto-detects Node.js and builds
6. Note your backend URL: `https://your-app.railway.app`

### Frontend on Netlify

1. Create account at netlify.com
2. New site from Git → Select repository
3. Build settings:
   - Base directory: `frontend`
   - Build command: `npm run build`
   - Publish directory: `frontend/dist`
4. Add environment variables:
   - `VITE_API_URL`: Your Railway backend URL + `/api`
5. Deploy

**Netlify redirect rule** (add `frontend/public/_redirects`):

```
/*    /index.html    200
```

### Frontend on Vercel

```bash
cd frontend
npx vercel
# Follow prompts, set VITE_API_URL env var
```

---

## Post-Deployment Checklist

### Immediate (Required)

- [ ] Run database migrations: `npx prisma migrate deploy`
- [ ] Run database seed: `ts-node prisma/seed.ts`
- [ ] Verify admin login works: admin@ethiorent.com
- [ ] **Change admin password immediately**
- [ ] Test property listing creation
- [ ] Test payment submission
- [ ] Verify Cloudinary uploads work
- [ ] Test property search

### SEO Setup

- [ ] Submit sitemap to Google Search Console: `https://yoursite.com/sitemap.xml`
- [ ] Verify domain in Google Search Console
- [ ] Set up Google Analytics (add tracking script)
- [ ] Configure robots.txt (already included)
- [ ] Test Open Graph meta tags with Facebook Debugger

### Security

- [ ] Rotate JWT secrets (set long, random strings)
- [ ] Ensure `NODE_ENV=production` on server
- [ ] Verify CORS only allows your frontend domain
- [ ] Test rate limiting on auth endpoints
- [ ] Check that admin routes are not publicly accessible

### Payment Setup

- [ ] Update Telebirr phone number in SiteConfig (via admin panel or database)
- [ ] Update CBE account number in SiteConfig
- [ ] Update contact email and phone
- [ ] Test full payment flow

### Backup

- [ ] Set up automated PostgreSQL backups
- [ ] Enable Cloudinary backup if needed
- [ ] Document rollback procedure

---

## Database Backup

### Backup (PostgreSQL)

```bash
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql
```

### Restore

```bash
psql $DATABASE_URL < backup_20241027.sql
```

Railway provides automated backups on paid plans.

---

## Admin Dashboard Access

After setup, access admin dashboard at:

- URL: `https://yoursite.com/admin`
- Default email: admin@ethiorent.com
- Default password: Admin@EthioRent2024!

**⚠️ Change this password immediately after first login.**

---

## Monitoring

### Health Check

```
GET https://your-backend.railway.app/health
```

### Logs

```bash
railway logs  # If using Railway
```

---

## Known Limitations & Future Work

1. **Payment**: Currently manual verification only. Can be extended with:
   - Telebirr API integration (requires merchant account)
   - Chapa payment gateway integration
2. **Maps**: Basic map integration placeholder. Configure with Google Maps API key.

3. **Email notifications**: SMTP configured but email templates need customization.

4. **SMS notifications**: Not implemented. Can be added with Africa's Talking or Twilio.

5. **Image optimization**: Cloudinary handles transformation. CDN delivery included.

6. **Search**: Text search uses PostgreSQL ILIKE. Can be upgraded to Elasticsearch for better performance.
