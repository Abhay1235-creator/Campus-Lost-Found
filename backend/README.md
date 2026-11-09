# Backend API

Node.js and MongoDB API for the POC report and public-board slice.

## Run locally

1. Install Node.js 20 or newer. For persistent storage, run MongoDB locally. To preview the UI without MongoDB, set `USE_IN_MEMORY_DB=true`; reports and claims will only last until the API process stops.
2. In this directory, run `npm install`.
3. Copy `.env.example` to `.env` and set `PRIVATE_DATA_KEY` to a fresh 32-byte base64 key. For example:

   ```powershell
   node -e "console.log(require('node:crypto').randomBytes(32).toString('base64'))"
   ```

4. Set `ADMIN_API_TOKEN` to a long random secret for the protected review endpoints.
5. Start the API with `npm run dev` (or `npm start`). It listens on port 3000 by default.

The responsive UI is served at `http://localhost:3000/` by the same Express server. It supports report submission, public board search and pagination, item details, private ownership claims on found items, private found-item responses on lost listings, and separate staff review queues for both.

To populate the MongoDB board with three fictional lost/found examples, run `npm run seed` from this directory. The command is idempotent and encrypts the examples' private reporter/clue data. These demo rows carry an internal `demoKey` and are not deleted or modified by normal reports.

Run the public privacy acceptance tests from this directory with `npm test`. They exercise both public read endpoints with deliberately overfilled database fixtures across `open`, `pending_review`, and `returned` states.

The implemented routes are `GET /health`, `POST /items`, `GET /board`, `GET /items/:id`, `GET /images/:id`, `POST /claims`, `POST /found-reports`, `GET /admin/claims`, `PATCH /admin/claims/:id`, `GET /admin/found-reports`, and `PATCH /admin/found-reports/:id`. Admin endpoints require `Authorization: Bearer <ADMIN_API_TOKEN>`. Public item responses use the allowlisted serializer in `src/serializers/public-item.js`. Reporter, claimant, and finder private values are encrypted with AES-256-GCM.

Every new report requires a JPEG, PNG, or WebP image up to 8 MB. Sharp rotates and resizes it, converts it to WebP, and strips metadata before the binary is stored in MongoDB. Images are publicly served only while their item is open. Set `ATLAS_MONGODB_URI` in `backend/.env` and run `npm run migrate:atlas` from this directory to copy local items, encrypted private records, claims, found reports, and images into Atlas. The migration upserts by `_id` and does not delete target data. Use the same `PRIVATE_DATA_KEY` in Render that encrypted the existing local records, or those records cannot be decrypted. This POC admin token is a simple shared-secret gate and should be replaced with institutional authentication before production.

## Render deployment

The repository includes a `render.yaml` Blueprint for an Express web service. Connect the repository in Render and provide `MONGODB_URI`, `PRIVATE_DATA_KEY`, and `ADMIN_API_TOKEN` when Render prompts for secrets. Create the Atlas cluster and database user first, then add the Render service's outbound IP ranges to the Atlas IP access list. Do not use an unrestricted `0.0.0.0/0` access entry for production. After deployment, check `/health` and the public board before sharing the URL.
