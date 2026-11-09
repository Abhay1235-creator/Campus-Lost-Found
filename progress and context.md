# Progress and Context

## Project snapshot

- **Project:** Campus lost-and-found proof of concept
- **Target:** A demonstrable end-to-end POC scoped to the two-week roadmap.
- **Stack:** Node.js, Express, and MongoDB.
- **Requirements:** `project-description.txt` contains the full requirements. [ROADMAP.md](ROADMAP.md) records the agreed POC scope and follow-on work.
- **API contract:** [docs/poc-data-model-and-api.md](docs/poc-data-model-and-api.md)

## Current status — 2026-11-09

The main POC report, board, claims, and staff review flows are implemented. MongoDB Community Server is running locally, the API is connected to it, and three fictional demo reports have been seeded. The UI is served by the API at `http://127.0.0.1:3000`.

## Implemented

- `POST /items`, `GET /board`, and `GET /items/:id` with public-field projections and an explicit allowlisted serializer.
- Reporter details and private identifying clues encrypted with AES-256-GCM in a separate `privateDetails` collection.
- `POST /claims`, `GET /admin/claims`, and `PATCH /admin/claims/:id`; claim details are encrypted and staff routes require a bearer token.
- `POST /found-reports`, `GET /admin/found-reports`, and `PATCH /admin/found-reports/:id`; finder contact/location/details are encrypted, and staff can confirm return or reopen the lost listing.
- Responsive UI for reporting lost/found items, searching and paging the public board, viewing item details, submitting ownership claims, reporting a found match on a lost listing, and reviewing both queues as staff.
- MongoDB indexes and an idempotent `npm run seed` command for three fictional reports.
- A privacy acceptance test covering public board/detail responses, private sentinel values, and `open`, `pending_review`, and `returned` item states.
- Optional volatile in-memory mode (`USE_IN_MEMORY_DB=true`) for a local preview without MongoDB.

## Local setup

- Backend dependencies are installed in `backend/node_modules`; `backend/package-lock.json` is present.
- `backend/.env` points to local MongoDB and contains generated encryption/admin secrets. It is excluded through `.gitignore`; do not copy secrets into project documentation.
- Start the MongoDB Windows service, then run `npm run dev` from `backend/`.
- Run `npm run seed` from `backend/` to add or refresh the demo reports. Demo private details are encrypted.
- The current database has three seeded demo reports. Seeded rows use an internal `demoKey`; the seed script updates these rows rather than adding duplicates.

## Outstanding POC work

- Walk through the new found-report path in the browser against MongoDB and confirm it appears in the staff queue; confirm/reopen a demo response.
- Run the acceptance suite after the current API and image-upload changes.
- Finish Render + Atlas setup. The Blueprint and local migration command are ready, but deployment still needs an Atlas connection string and a Git repository connected to Render.

## Latest implementation update — 2026-11-09

- New reports now require a JPEG, PNG, or WebP photo (up to 8 MB). Sharp rotates, resizes to 1280×1280, converts to WebP, and strips metadata; processed images are stored in MongoDB and served only for open items.
- Added `render.yaml` for the Render Node service and `npm run migrate:atlas` to copy items, encrypted private records, claims, found reports, and images to Atlas without deleting target records.
- Selected Render + MongoDB Atlas as the deployment target. No cloud service was created and no data was transferred; finishing that requires the Atlas URI and a connected source repository.
- Replaced the static homepage hero art with an accessible four-image slideshow (keys, bottle, backpack, notebook), including manual controls, pause/play, hover/focus pause, and reduced-motion support.

## Latest implementation update — 2026-11-09

- Added an “I found this” action to lost-item cards. The form collects finder name, contact, location, and optional context.
- Finder details are encrypted in the separate `foundReports` collection. A pending report moves the lost item out of public results while staff review it; approval marks it returned and rejection reopens it.
- Added the found-report queue and review actions to the staff UI, plus API/data-model documentation.
- Ran JavaScript syntax checks for the new route, API wiring, database indexes, and UI script. The acceptance suite has not been rerun for this update.

## Latest acceptance checks — 2026-11-09

- `npm.cmd test` from `backend/` passes both public privacy acceptance tests (2 passed, 0 failed).
- Exercised the API flow against the running local service using fictional data: create a found report, locate it on the public board, read its public detail, submit a claim, retrieve it in the protected staff review queue, approve it, and confirm the returned item is no longer on the public board.
- Completed the browser walkthrough for fictional report creation, public board visibility, item details, and claim submission. The staff review screen is present; the fictional claim was loaded and approved through the protected local API, and it is no longer pending.
- Reviewed `backend/README.md` and the staff review UI instructions; local setup, seed, test, admin-token, and image-upload limitations are documented.
- The browser walkthrough added a fictional report and claim to the local MongoDB. The report is now `returned` after approval and no longer appears on the public board.

## Workspace layout

```text
backend/
  src/       Express app, routes, serializers, services, middleware, DB setup
  test/      Public privacy acceptance test
  README.md  Local setup and API notes
database/
  seed/      Idempotent demo seed script
docs/        POC API and data-model contract
ui/          Static responsive UI served by Express
```

## Privacy requirements

- Keep private data encrypted and separate from public item documents.
- Public item output must use the allowlisted serializer; never serialize a MongoDB document directly.
- Keep the public-field leakage test as a required POC acceptance gate.

## Deferred scope

Campus map picker, infinite scroll, automated/nightly matching, verification challenges, competing-claim handling, handover and custody, disposal/retention workflows, full analytics, notifications, ERP/SSO, production object storage, and deployment hardening remain follow-on work. See the roadmap for the full backlog.

## Latest UI and demo-image update - 2026-11-09

- Added three optimized local WebP photos to the fictional demo reports (green water bottle, black folding umbrella, and blue lecture notebook). Updated `database/seed/seed.js` and reran `npm run seed`; the existing MongoDB demo rows now point to these photos.
- Added distinct report and staff-review hero themes. The browse page keeps its slideshow hero.
- Updated the homepage slideshow to show keys, laptop, backpack, and student ID card. Generated landscape assets for all four slides and normalized them to 1200x750 WebP images so they fit the slideshow frame consistently.
- Adjusted slideshow and board-card image sizing to preserve full photos, including responsive mobile sizing.
- Slideshow autoplay interval is 4 seconds. Manual controls, pause/play, focus/hover pause, and reduced-motion behavior remain available.
- Verified the new slideshow assets return `200 image/webp` from the local server and ran `node --check ui/app.js` successfully.
