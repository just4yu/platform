# just🔗4u — Developer Platform

## Quick start (local)
- npm install
- npm start
- Open http://localhost:3000/
- Admin: http://localhost:3000/admin.html (default ADMIN_SECRET=admin2025)

Env vars:
- ADMIN_SECRET: admin password
- JWT_SECRET: any random string
- CONTACT_EMAIL: where to receive contact requests
- SMTP_URL: SMTP connection string (optional; if empty logs to console)

## Deploy to Render
- Push repo to GitHub
- Create new Web Service from repo
- Build: `npm install`
- Start: `npm start`
- Set env vars (ADMIN_SECRET, JWT_SECRET, CONTACT_EMAIL, SMTP_URL)
- After deploy, open onrender.com URL

## Connect GoDaddy domain
1) Buy domain on GoDaddy
2) On Render service: Settings → Custom Domains → Add Domain (e.g. app.yourdomain.com)
3) Render will show DNS target (CNAME). In GoDaddy DNS:
   - Add CNAME record:
     - Name: `app` (or desired subdomain)
     - Value/Target: the Render CNAME shown (e.g. yourservice.onrender.com)
     - TTL: default
4) Wait for DNS propagation (5–30 min). Render will auto-issue SSL.
5) Open https://app.yourdomain.com

## Cloudflare (optional)
- If domain on Cloudflare: add CNAME there instead of GoDaddy; keep proxy (orange cloud) ON for HTTPS.

## Email sending (SMTP)
- Use SendGrid/Postmark/Mailgun
- Example (SendGrid):
  - CONTACT_EMAIL=you@company.com
  - SMTP_URL=smtp://apikey:SG.xxxxxx@smtp.sendgrid.net:587

## Data source
- On boot, server parses `candidates_database_extended.txt` into `data/developers.json`.
- Admin CRUD writes to `data/developers.json`.