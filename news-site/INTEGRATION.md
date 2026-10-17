This is a copy of the complete Next.js news website from `D:\news website`.
Its original source directory is untouched.

Elevate starts this service automatically with `npm run server` and serves it
inside the authenticated Admin → Industry News tab at `/admin-news`.
The internal service listens on loopback port 3101. The main app remains on 3000.

Install its dependencies once with `npm --prefix news-site ci --ignore-scripts`.
For production, run `npm --prefix news-site run build` before starting Elevate.
Without a production build, the bridge starts the Next development server.

The industry list in `src/config/industries.json` comes from this website's
industry taxonomy. Admin login requires a selection and stores it in a private
12-hour server session. Changing client storage or a news URL cannot switch the
session's industry. Log out and log back in to choose a different industry.
All news, alerts, reader pages and briefs are filtered to that industry.

No private `.env.local` credentials were copied. The source's free RSS provider
works without API keys. Optional provider and summary settings are documented
in `.env.example`.
