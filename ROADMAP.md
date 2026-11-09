# Lost and Found POC Roadmap

## Goal and scope

Deliver a demonstrable campus lost-and-found proof of concept in **two weeks**. Prioritize a complete, understandable core flow over broad feature coverage. Keep the requested three parts (UI, backend, database), then grow the system in stages after the POC is reviewed.

**Stack:** Track J — Node.js and MongoDB. Use Sharp to resize and strip metadata from the required report image. Use simple text search for the POC; MongoDB text search or Meilisearch can support a later release. Perceptual hashing and image embeddings remain stretch goals.

**Privacy is a POC requirement:** private details must be stored encrypted and must be structurally excluded from public responses through a dedicated allowlisted public DTO. Add an explicit leakage test for the public board. Do not serialize database documents directly.

This is a planning document. Do not write or change application code until the user explicitly authorizes coding.

## Part 1 — UI

### POC (two weeks)

- One responsive, mobile-friendly report form for a lost or found item. Keep required fields to the minimum needed for a useful report.
- Use a simple campus location dropdown/list. Defer interactive campus maps.
- Require an image upload for every new report; show the optimized image on the public card and detail view.
- Build a public board with basic search/filter and paginated results. Defer infinite scroll and advanced filtering.
- Show an item detail page with only public information and a simple way to express interest / submit a claim for manual review.
- Provide a minimal admin view to browse reports and mark an item as returned. Keep operational tasks manual.

### Later stages

- **Stage 2:** improve reporting toward the under-60-second target; add camera capture, map picker, infinite scroll, richer filters, and claim status views.
- **Stage 3:** add verification challenge screens, match review, handover scheduling, and a full admin dashboard.

## Part 2 — Backend

### POC (two weeks)

- Implement the essential flows: create a lost/found report, list and view public reports, submit an ownership claim for a found item, and report finding an item listed as lost.
- Keep API surface small: `POST /items`, `GET /board`, `GET /items/:id`, `POST /claims`, and `POST /found-reports`. Add only endpoints needed by the chosen UI.
- Construct every public item response through a dedicated allowlisted DTO. Keep encrypted private detail in a separately controlled data path that the public serializer cannot traverse.
- Store uploaded images in MongoDB for this release; resize and strip metadata with Sharp before making images available.
- Use basic text search or MongoDB text search only if time permits. POC matching may be a simple search/manual review; defer automated suggestions and nightly refresh.
- Keep claims and found-item responses manually reviewed. Defer verification scoring, competing-claim resolution workflows, notifications, ERP/SSO, and scheduled jobs.
- Add a minimal admin-only action to mark a report returned. Defer handover workflows and full role integration unless already available.

### Later stages

- **Stage 2:** generate match suggestions on report creation and refresh them nightly; add claim verification, competing claims, notifications, and authentication integration.
- **Stage 3:** add security-role-gated handovers, custody records, ageing/disposal workflows, audit coverage, and operational resilience.
- **Stretch:** perceptual hashing or lightweight image embeddings; CCTV location references as metadata only (never video).

## Part 3 — Database

### POC (two weeks)

- Keep the initial MongoDB model small: `Item`, `ItemImage`, `PrivateDetail` (encrypted and separate), `Claim`, and `FoundReport` (encrypted finder details). Represent categories and campus locations with simple controlled values unless the POC needs separately managed records.
- Define the minimum item states needed for the demo: `lost`, `found`, `claimed` (or pending review), and `returned`.
- Add indexes for public board ordering, item type/status, and the basic search path. Avoid premature indexing and complex lifecycle machinery.
- Define a public-field allowlist and query/projection boundary so public reads cannot include private detail.
- Keep seed/demo data and a short schema note for repeatable demonstrations.

### Later stages

- **Stage 2:** add `ItemCategory`, `Location`, `MatchSuggestion`, `VerificationChallenge`, and richer claim states; introduce retention configuration and text indexes.
- **Stage 3:** add `CustodyRecord`, `Handover`, `DisposalRecord`, and `AuditEntry`; define lifecycle validation, retention/archive rules, and reporting indexes.

## Two-week delivery plan

| Time | Focus | POC outcome |
|---|---|---|
| Days 1–2 | Agree demo scope, fields, public/private boundary, basic screens, and MongoDB shape | Approved minimal flow and acceptance checklist |
| Days 3–5 | Reporting form, item creation, image path if feasible | A lost/found report can be submitted and persisted |
| Days 6–8 | Public board, item detail, search/filter, public DTO | Reports can be browsed without exposing private details |
| Days 9–10 | Claim/interest form, minimal admin review, return status, polish and demo setup | End-to-end POC demonstrated with seeded data |

Keep one day of slack inside the two-week window for integration and usability fixes. If the schedule slips, defer search polish before cutting the privacy boundary, required image path, or main report-to-board flow.

## POC acceptance checklist

- A user can submit a lost or found report and see its public version on the board.
- A user can express interest / submit a claim, and an admin can review it manually.
- A user browsing a lost-item report can say they found it and send private contact/location details for staff review.
- Every new report requires a JPEG, PNG, or WebP photo; the stored image is resized and stripped of metadata.
- An admin can mark an item returned.
- Public board and item responses are built from an allowlisted DTO; an explicit test asserts that private fields never appear.
- Private details are stored encrypted and are not reachable through public queries/serialization.
- The POC can be run and demonstrated with documented setup and seed data.

## Deferred requirement inventory

The original full scope remains a follow-on backlog: reporting under 60 seconds, camera capture, campus map picker, infinite scroll, automated matching and nightly refresh, full verification and competing-claim handling, security-role handovers, custody and disposal records, admin queues/configuration, complete analytics, email/SMS, ERP/SSO, object-storage production setup, edge caching, and production deployment hardening. Confirm CES-specific deliverables and deployment expectations before committing to a production release.
