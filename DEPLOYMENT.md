# 🚀 The Scan Menu Platform — Production Deployment Guide

This guide covers everything needed to take the monorepo from your local machine to a fully production-ready multi-domain deployment.

---

## 📦 Repository Structure

```
the-scan-menu-platform/           ← Root monorepo (single Git repository)
├── the-scan-menu/
│   ├── client/                   → POS & QR Ordering Web App  (React 18 + Vite)
│   └── server/                   → Express API + WebSockets   (Node.js + MongoDB)
├── the-scan-menu-showcase/       → Marketing / Showcase Site  (React 19 + Vite)
├── captain-app/                  → Captain Mobile App         (Flutter)
├── package.json                  → Root scripts (dev:all, build:all, etc.)
├── .gitignore
└── DEPLOYMENT.md                 ← You are here
```

---

## 🌐 Domain Architecture

| Subdomain / Domain               | Project                        | Host              |
|----------------------------------|--------------------------------|-------------------|
| `thescanmenu.com`                | **Showcase** (Marketing Site)  | Vercel / Netlify  |
| `app.thescanmenu.com`            | **POS Client** (QR Ordering)   | Vercel / Netlify  |
| `api.thescanmenu.com`            | **API Server** (Express)       | Render / VPS      |
| _Google Play / Apple App Store_  | **Captain App** (Flutter)      | Mobile Stores     |

> **Alternative**: Swap Showcase to `products.thescanmenu.com` if you want `thescanmenu.com` to open the POS directly.

---

## 🔷 Step 1 — Push Monorepo to GitHub

```bash
cd "d:/PIXORA STUDIOS WEB/the-scan-menu-platform"
git add .
git commit -m "chore: integrate showcase into platform monorepo"
git remote add origin https://github.com/YOUR_ORG/the-scan-menu-platform.git
git push -u origin main
```

---

## 🔷 Step 2 — DNS Setup (Cloudflare — Recommended)

Log in to Cloudflare Dashboard → Select `thescanmenu.com` → DNS → Records:

| Type  | Name   | Content / Value                              | Proxy  |
|-------|--------|----------------------------------------------|--------|
| CNAME | `@`    | `cname.vercel-dns.com` *(added by Vercel)*   | ✅ ON  |
| CNAME | `app`  | `cname.vercel-dns.com` *(added by Vercel)*   | ✅ ON  |
| CNAME | `api`  | `your-service.onrender.com` *(from Render)*  | ✅ ON  |

Vercel and Render will tell you the exact CNAME value when you add the custom domain in their dashboards.

---

## 🔷 Step 3 — Deploy Showcase Site (`thescanmenu.com`)

### Vercel Setup
1. vercel.com → Add New Project → Import `the-scan-menu-platform` repo.
2. Configure Project:
   - **Root Directory**: `the-scan-menu-showcase`
   - **Framework Preset**: `Vite`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
3. Deploy → Settings → Domains → Add `thescanmenu.com`.

No environment variables are required for the showcase site currently.

---

## 🔷 Step 4 — Deploy POS Client (`app.thescanmenu.com`)

### Vercel Setup
1. vercel.com → Add New Project → Import **same** `the-scan-menu-platform` repo.
2. Configure Project:
   - **Root Directory**: `the-scan-menu/client`
   - **Framework Preset**: `Vite`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
3. Environment Variables:

   | Key                     | Value                             |
   |-------------------------|-----------------------------------|
   | `VITE_API_URL`          | `https://api.thescanmenu.com`     |
   | `VITE_SOCKET_URL`       | `https://api.thescanmenu.com`     |
   | `VITE_CLOUDINARY_NAME`  | your Cloudinary cloud name        |

4. Deploy → Settings → Domains → Add `app.thescanmenu.com`.

### SPA Routing — `the-scan-menu/client/vercel.json`
```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

---

## 🔷 Step 5 — Deploy API Server (`api.thescanmenu.com`)

### Render Setup
1. render.com → New → Web Service → Connect `the-scan-menu-platform` repo.
2. Settings:
   - **Root Directory**: `the-scan-menu/server`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm run start`
3. Environment Variables (all from `.env.example`):

   | Key                       | Value                                          |
   |---------------------------|------------------------------------------------|
   | `NODE_ENV`                | `production`                                   |
   | `PORT`                    | `3000`                                         |
   | `MONGODB_URI`             | MongoDB Atlas connection string                |
   | `JWT_SECRET`              | strong random secret (32+ chars)               |
   | `CORS_ORIGIN`             | `https://app.thescanmenu.com`                  |
   | `CLOUDINARY_CLOUD_NAME`   | from Cloudinary                                |
   | `CLOUDINARY_API_KEY`      | from Cloudinary                                |
   | `CLOUDINARY_API_SECRET`   | from Cloudinary                                |
   | `RAZORPAY_KEY_ID`         | from Razorpay                                  |
   | `RAZORPAY_KEY_SECRET`     | from Razorpay                                  |
   | `FIREBASE_*`              | Firebase Admin SDK credentials                 |

4. Settings → Custom Domains → Add `api.thescanmenu.com`.

> Render supports WebSockets on all plans — no extra config needed for socket.io.

### Alternative: VPS with PM2 + Nginx
```bash
# On VPS
cd /var/www/the-scan-menu-platform/the-scan-menu/server
npm install && npm run build
pm2 start dist/index.js --name "scan-menu-api"
pm2 save && pm2 startup
```

Nginx config:
```nginx
server {
    listen 80;
    server_name api.thescanmenu.com;
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```
Then: `certbot --nginx -d api.thescanmenu.com`

---

## 🔷 Step 6 — Captain App (Flutter Mobile)

### Android
```bash
cd captain-app
flutter build apk --release
# Output: captain-app/build/app/outputs/flutter-apk/app-release.apk
# For Play Store:
flutter build appbundle --release
```

### iOS (macOS only)
```bash
flutter build ios --release
open ios/Runner.xcworkspace
# Xcode: Product → Archive → Distribute App
```

### Before Building
1. Update API base URL in the app to `https://api.thescanmenu.com`.
2. Add `google-services.json` (Android) and `GoogleService-Info.plist` (iOS) from Firebase Console.

---

## 🔷 Step 7 — CI/CD with GitHub Actions

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy All Apps
on:
  push:
    branches: [main]

jobs:
  deploy-showcase:
    name: Deploy Showcase
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_SHOWCASE_PROJECT_ID }}
          working-directory: the-scan-menu-showcase
          vercel-args: '--prod'

  deploy-pos:
    name: Deploy POS Client
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_POS_PROJECT_ID }}
          working-directory: the-scan-menu/client
          vercel-args: '--prod'
```

Add secrets in GitHub → Settings → Secrets and variables → Actions.

---

## 📋 Pre-Launch Checklist

### General
- [ ] All `.env` files populated in production (never committed to Git)
- [ ] `NODE_ENV=production` set on server
- [ ] CORS origin restricted to `https://app.thescanmenu.com`
- [ ] MongoDB Atlas IP allowlist configured

### Showcase (`thescanmenu.com`)
- [ ] HTTPS active and SSL certificate valid
- [ ] OG tags, favicon, and meta descriptions configured
- [ ] Analytics connected (GA4 or PostHog)

### POS Client (`app.thescanmenu.com`)
- [ ] `VITE_API_URL` pointing to production API
- [ ] QR code URLs using production domain
- [ ] PWA manifest and service worker active
- [ ] Razorpay switched to **live** keys (not test)

### API Server (`api.thescanmenu.com`)
- [ ] `GET /health` returns `200 OK`
- [ ] WebSocket connections tested from production client
- [ ] Rate limiting active
- [ ] Firebase Admin SDK using production credentials
- [ ] Error monitoring enabled (Sentry / Logtail)

### Captain App
- [ ] API base URL → `https://api.thescanmenu.com`
- [ ] Firebase push notifications tested on real device
- [ ] Android signed with production keystore
- [ ] iOS provisioning profiles configured

---

## 🔧 Local Development

```bash
# From monorepo root — install root dev tools (once only)
npm install

# Run everything together
npm run dev:all

# Or individually
npm run dev:server    # → http://localhost:3000
npm run dev:pos       # → http://localhost:5173
npm run dev:showcase  # → http://localhost:5174
```

---

## 💰 Estimated Hosting Cost

| Service          | Plan               | Cost         |
|------------------|--------------------|--------------|
| Vercel (Showcase)| Hobby (Free)       | **$0/mo**    |
| Vercel (POS)     | Hobby (Free)       | **$0/mo**    |
| Render (Server)  | Free Tier          | **$0/mo**    |
| MongoDB Atlas    | M0 Free Cluster    | **$0/mo**    |
| Cloudflare DNS   | Free               | **$0/mo**    |
| **Total**        |                    | **$0/mo** 🎉 |

> **Note**: Render's free tier spins down after inactivity (~15 min). Upgrade to $7/mo Starter for always-on server when going to production.
