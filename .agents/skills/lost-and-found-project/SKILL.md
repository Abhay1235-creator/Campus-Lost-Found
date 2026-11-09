---
name: lost-and-found-project
description: Project-specific context and constraints for the Lost and Found application. Apply when planning or implementing this project.
---

# Lost and Found project skill

Use [the project roadmap](../../../ROADMAP.md) as the working source of truth for scope, sequencing, and acceptance criteria.

## Hard constraints

- Current target is a two-week proof of concept. Prioritize a small end-to-end report, public board, and manual claim review flow; defer complexity to roadmap stages 2 and 3.
- Stack: Track J — Node.js and MongoDB.
- Do not write or change application code unless the user explicitly authorizes coding.
- Keep private details encrypted and structurally inaccessible to public serialization. Public output must use a dedicated allowlisted DTO; never serialize database documents directly. Include an explicit public-field leakage test in the POC.
- Use Sharp to resize images and strip EXIF metadata when image upload is in the POC; image upload may be deferred if time is constrained.
- For the POC, a simple campus location list, basic paginated board, manual claim review, and simple/manual search are acceptable.
- Defer map UI, infinite scroll, automated/nightly matching, verification scoring, competing-claim workflows, notifications, ERP/SSO, security-role handovers, disposal, full analytics, and advanced admin features unless existing infrastructure makes them trivial.
- Keep image similarity via perceptual hashing or embeddings as a stretch goal.
- Preserve the full original requirements as follow-on scope in ROADMAP.md. Confirm CES deliverable and deployment specifics before production commitments.

When planning implementation, protect the two-week POC scope and privacy gate first. Use later stages for incremental functionality.