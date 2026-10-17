# Production-Ready Calendar & Event Management System

A modern, responsive, and full-featured Calendar & Event Management module built with React, Vite, Tailwind CSS, Lucide Icons, Node.js/Express, and SQLite.

## Features

- **Interactive Monthly Calendar**:
  - Monday-to-Sunday layout with full month grid.
  - Previous/Next month navigation and quick "Today" jump.
  - Distinct highlights for today's date and the user-selected date.
  - Visual event indicators: colored dot icons and event count badges (`● 3 Events`).
  - Clicking an empty date pre-fills that date in the Create Event modal.
  - Clicking a date with events filters the event list and highlights the day.

- **Event Creation & Editing**:
  - **Event Information**: Event Name (required), Date (required), Start Time & End Time (required with validation: end time > start time), Description (multiline).
  - **Contact Details**: Phone Number (with international format support), Email (with regex format check), Address (multiline).
  - **Additional Details**: Event Type selector (Meeting, Appointment, Call, Interview, Demo, Task, Personal, Other), Location, Meeting Link (with URL validation), Notes.
  - **Time Overlap Checking**: Real-time conflict warning when scheduling at overlapping times, with a configurable toggle to allow or flag concurrent events.
  - **Inline Validation**: Instant error feedback under each input field.

- **Event Details & Deletion**:
  - Full details modal with clickable `mailto:`, `tel:`, and meeting link launcher.
  - Edit event modal with prefilled data and instant UI update.
  - Accessible delete confirmation modal (*"Are you sure you want to delete '...'? This action cannot be undone."*).
  - Auto-updates calendar event indicators and count badges immediately.

- **Event List, Search, and Filtering**:
  - Chronological sorting (date and start time ascending).
  - Tabbed views: `Upcoming`, `Today`, and `Past`.
  - Dynamic multi-field search (title, description, email, phone, address, location, notes).
  - Filters: Date ranges (Today, Tomorrow, This Week, This Month), Event Types, and Statuses.
  - Skeleton loading states and empty state illustrations.

- **Backend & Database**:
  - RESTful API endpoints at `/api/events` with CRUD and query parameters (`?date=`, `?month=`, `?search=`, `?eventType=`, `?status=`).
  - SQLite database persistence with WAL mode.
  - Indexed columns on `date`, `start_time`, `event_type`, and `status`.
  - Server-side validation matching client rules.

## Getting Started

### 1. Install Dependencies
```bash
npm install
npm run news:install
```

### 2. Run in Development Mode (Concurrent Server & Client)
```bash
npm run dev
```
- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:5000`

### 3. Run Production Server
```bash
npm run build
npm run server
```
The server serves both the REST API and the bundled frontend at `http://localhost:5000`.

### Run with Docker

Install and start Docker Desktop, then run these commands from the project folder:

```bash
docker compose up --build -d
```

Open `http://localhost:3000`. Docker Compose builds the Vite app and integrated
Industry News site, starts them with the API, and stores SQLite data in the
persistent `elevate-data` volume. The API is also exposed on port 5000 for
devices that connect directly to it.

Use `docker compose logs -f elevate` to view logs and `docker compose down` to
stop the app. Stopping it this way keeps the database. Compose reads optional
Google login and SMTP credentials from the root `.env` file; Docker does not
copy that file into the image. Set `STORY_LINK_SECRET` in `.env` to a long,
stable random value before using the news story links across container rebuilds.

### 4. Run Automated Test Suite
```bash
npm test
```
Runs 15 end-to-end integration tests verifying health checks, validation rules, multi-event handling, overlap detection, search, and CRUD workflows.

## Admin Industry News

The former Live World News portal has been removed. The complete news website from `D:\news website` is copied into `news-site/` and appears only in Admin → Industry News. Its original folder is unchanged.

Select an industry on the admin login screen before signing in. The fresh database's default login is `admin` / `admin123`; custom passwords remain unchanged. Login errors now display the server's actual message. The selected industry persists in a private, expiring server session. Log out and log back in to change industries.

Only that industry's stories appear, including its subsections, ticker, search, alerts, reader and briefs. Unrelated headlines and unclassified padding are excluded. Feeds can be empty when no matching stories are available. Live feeds use the copied website's Google News RSS provider; optional provider settings are in `news-site/.env.example`.

`npm run build` builds both apps. `npm run server` starts the backend and private news service together, and serves the app at `http://localhost:3000`. The internal news service listens on loopback port 3101; `/admin-news` requires admin authentication. Existing news database records are preserved; the retired news worker is no longer started.

Run `npm run news:test` against the running server for login, scope, logout and filtering tests. Set `TEST_NEWS_SITE=1` to include the integrated website and industry redirect checks. See `news-site/INTEGRATION.md` for more details.
