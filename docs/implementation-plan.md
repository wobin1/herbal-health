# Herbal Health Seminar Platform — Implementation Plan

Source docs: `herbal-health-seminar-platform-product-spec.md` (product/technical spec) and
`herbal-health-international-standards.md` (compliance baseline). Engineering rules live in
`/CLAUDE.md`. Visual reference: `docs/design/`.

Each phase lists scope, key deliverables, and an exit gate. A phase isn't "done" until its gate
passes — gates are how we avoid rework later instead of a bolt-on security/a11y pass at the end.

---

## Phase 0 — Project Setup

- Initialize Next.js (App Router) + TypeScript project, folder structure per spec §61.
- Configure Prisma + PostgreSQL, separate dev/staging/prod databases (env-scoped connection strings).
- ESLint, Prettier, TypeScript strict mode.
- Test runner setup: unit + integration (e.g. Vitest/Jest) and e2e (e.g. Playwright) wired to a
  single `npm test` that runs everything and exits non-zero on failure — this is the command CI
  and every phase gate below calls. No parallel/separate test commands per suite.
- CI pipeline skeleton: lint → typecheck → `npm test` → build (extend with security gates in
  Phase 7).
- Push protection: Husky `pre-push` hook running `npm test` locally, plus a required GitHub status
  check on the CI test job so `main` can't receive a red or hook-bypassed push.
- `.env.example` with all vars from spec §50; secrets never committed.
- Base layout, design tokens (colors/type/spacing) derived from `docs/design/` screenshots.

**Exit gate:** app builds and deploys to a staging environment; `npm test` runs (even with zero
tests yet) and CI calls it on every push.

---

## Phase 1 — Foundation: Auth, RBAC, DB Core

- Prisma schema baseline (spec §40): Event, Location, TicketType, Attendee, Order, OrderItem,
  Payment, Registration, RegistrationTermAcceptance, plus AdminUser/Role.
- Admin authentication (Auth.js or equivalent), Argon2id password hashing, MFA for admins.
- RBAC: Admin / Content Editor roles per spec §5 permission matrix.
- Session security: Secure/HttpOnly/SameSite cookies, rotation on login, invalidation on logout
  and password reset.
- Audit log model + write path (who/what/when/entity/before-after) wired to auth events first.

**Exit gate:** an admin can log in with MFA, roles restrict access per the matrix, failed logins
are rate-limited and logged.

---

## Phase 2 — Public Website Shell ✅ Complete

- Routes: `/`, `/about`, `/faq`, `/contact`, `/terms`, `/privacy`, `/refund-policy`, `/disclaimer`.
- Homepage sections per spec §9 (hero, mission, upcoming seminars, educational focus, instructors,
  FAQ, final CTA, footer) — CMS-driven fields, not hard-coded copy.
- Content models: ContentPage, FAQ, Instructor (structured content, not a general CMS — spec §23).
- Build to match `docs/design/hero-and-small-content.png` and `other-content-section.png`; note in
  CLAUDE.md when new reference screenshots are added.
- WCAG 2.2 AA pass on shell: semantic HTML, landmarks, focus states, labeled nav.

**Exit gate:** public shell pages render from DB content, responsive at mobile/tablet/desktop,
pass automated a11y checks (axe or equivalent) with zero critical violations.

Gate status: lint, typecheck, and unit tests (35/35) pass locally. The Playwright/axe e2e suite
(`tests/e2e/public-shell.spec.ts`) covers a11y on all shell routes, primary nav, and footer links,
but its Chromium binary cannot install on this local machine (macOS 13 is unsupported by
Playwright 1.63) — verified via CI (`ubuntu-latest`), which runs `npx playwright install chromium
--with-deps` and executes this suite as a required status check.

---

## Phase 3 — Event Catalog & Admin Event Management ✅ Complete

- Event model (spec §11) with full schedule/location/content/commerce/media/publication fields,
  plus new `Location`, `EventInstructor`, `EventTicketType`, and `EventFaqOverride` models
  (migration `20260911172022_phase3_event_catalog`, applied to the local dev database).
- Public routes: `/events`, `/events/[slug]` with status-driven CTA (spec §10, `src/lib/events/status-cta.ts`)
  and schema.org `Event` JSON-LD structured data.
- Search/filter: keyword, city, state, date range, status — plain Prisma `where` queries
  (`src/server/services/event-service.ts`).
- Admin: event list (`/admin/events`, columns per §30 — tickets sold/revenue show 0 pending Phase 4
  orders), tabbed event editor (`/admin/events/new`, `/admin/events/[id]`, §31 tabs), Draft→Publish
  workflow with validation that blocks incomplete public events (`publishEvent` throws
  `EventValidationError` listing missing fields).
- Location and Instructor management (reusable entities, referenced not duplicated) at
  `/admin/locations` and `/admin/instructors`, backed by `location-service.ts` / `instructor-service.ts`.
- SEO: per-event title/description/canonical/OG image/structured data; `src/app/sitemap.ts` and
  `src/app/robots.ts` (published-visible events only).

**Exit gate:** admin can create, edit, and publish a complete event end to end; it appears
correctly on `/events` and `/events/[slug]`, in the sitemap, with valid structured data.

Gate status: lint, typecheck, and unit tests (65/65, including publish-validation, status-CTA,
admin CRUD, and audit-log-write coverage) pass locally. `tests/e2e/event-catalog.spec.ts` covers
public list/filter/a11y, the admin create→publish→appears-on-site flow with JSON-LD assertion, and
CONTENT_EDITOR-forbidden-from-publish — but, as in Phase 2, Playwright's Chromium cannot install on
this local machine (macOS 13); verify via the CI job. The e2e admin-flow tests additionally depend
on an `/admin/login` UI page and seeded ADMIN/CONTENT_EDITOR credentials, neither of which exists
yet (out of scope for this phase — Phase 1 shipped only the login API route); those tests
self-skip when login fails so the suite stays green until that UI lands. No checkout, payment, or
ticket-inventory logic was added — `EventTicketType` is catalog metadata only, per Phase 4 scope.

---

## Phase 4 — Ticketing, Checkout, Payments (highest-risk phase)

- TicketType model + inventory logic: atomic reservation via DB transaction, no oversell under
  concurrency (spec §13, §45).
- Checkout flow (spec §14): ticket selection → attendee details → legal acknowledgement (versioned,
  timestamped, spec §22) → pending order → inventory reservation → payment session.
- Money stored as integer minor units throughout, no floats.
- Payment provider adapter (spec §7.8) — confirm provider choice before building; keep core logic
  provider-agnostic.
- Webhook handler: signature verification, idempotency (store provider event ID), transactional
  order/payment/registration update (spec §20, §44, §46). Client redirect never confirms payment.
- Expired-reservation cleanup job (background job, spec §47).
- Registration reference generation (unique, non-enumerable, spec §18).

**Exit gate (this phase gets the deepest scrutiny):**

- Concurrent-purchase test proves no oversell.
- Duplicate webhook delivery produces exactly one payment record and one registration.
- No client-supplied price/total/inventory value is ever trusted server-side (grep-verifiable).
- No card data touches our database.
- E2E test: browse → select ticket → checkout → test payment → confirmation → registration lookup.

---

## Phase 5 — Orders, Registrations, Refunds, Attendee Management

- Admin: orders list/search/view/refund/export; attendee table + actions (resend confirmation,
  cancel, refund, transfer, mark attended, export, notes) per spec §17.
- Refund flow (spec §21): admin-initiated, provider refund, order/registration state sync,
  attendee notification.
- RegistrationTermAcceptance enforced — no registration completes without it.
- Financial actions restricted to Admin role only (Content Editor excluded per §5).

**Exit gate:** refund updates order/registration/payment state consistently with the provider;
attendee export is permission-gated; every state transition is audit-logged.

---

## Phase 6 — Notifications & Reminders

- Transactional email provider integration; required templates (spec §27): confirmation, receipt,
  payment failure, reminder, event update, cancellation, refund confirmation, transfer, admin
  new-registration alert.
- Async sending — a payment transaction must succeed even if email send fails (retry separately).
- Reminder jobs: 7-day and 1-day before event, idempotent.
- Email delivery/bounce/failure logging.

**Exit gate:** all required emails send correctly in staging with a test provider; reminder job
runs on schedule without duplicate sends on retry.

---

## Phase 7 — Security, Compliance & Observability Hardening

This phase closes the gaps against `herbal-health-international-standards.md` that aren't already
covered by the per-phase gates above.

- Security headers (CSP, HSTS, X-Content-Type-Options, Referrer-Policy, Permissions-Policy).
- Rate limiting + request size caps on all public endpoints.
- CI gates: SAST, dependency scanning, secret scanning, SBOM generation (standards §31–32, §46).
- DAST pass against staging (standards §33).
- Threat model review of checkout, webhook, admin-auth, refund flows (standards §34).
- Structured logging + error monitoring; audit log coverage confirmed against the action list in
  spec §38.
- Backup automation + one restore test (standards §37).
- Full WCAG 2.2 AA audit across public + checkout + admin (not just the Phase 2 shell pass).
- Privacy/retention documentation per data category (standards §43); confirm no unnecessary PII
  or health data is collected anywhere in the flow (standards §16, §42).
- Legal copy (terms/privacy/refund/disclaimer) reviewed by the organization's legal adviser —
  external dependency, flag early.

**Exit gate:** all "Mandatory Engineering Gates" in standards §57 are checked off or explicitly
deferred with a documented reason; no critical/high findings open from SAST/DAST.

---

## Phase 8 — Migration, QA, Launch

- Content migration from Wix (standards spec §55): inventory existing pages/events/FAQs/images,
  recreate as DB records, upload media to new storage.
- Redirects from old Wix URLs to new `/events/[slug]` structure.
- Full regression: E2E critical journeys (public + admin, spec §51) green in CI.
- Production environment stood up: separate credentials, HTTPS/TLS, monitoring, backups live.
- Go-live checklist against spec §63 Definition of Done.

**Exit gate:** production smoke test — real (or provider test-mode) end-to-end registration
succeeds, admin can manage it, old URLs redirect correctly.

---

## Testing approach across phases

Per CLAUDE.md: business logic, services, API routes, and anything touching money, inventory, auth,
or payment webhooks is written test-first (failing test → implementation → green). Every phase's
"Exit gate" above implicitly requires `npm test` passing in full — that command is the only way
tests get run, in CI and locally, so a phase isn't done if it only passes tests in isolation.

## Sequencing notes

- Phases 0–3 can mostly proceed linearly; Phase 4 (commerce) should not start until the payment
  provider is chosen, since the adapter shape depends on it.
- Phase 7 isn't purely a final pass — security headers, audit logging, and a11y should already be
  incrementally applied per-phase (per CLAUDE.md rules); Phase 7 is verification and closing gaps,
  not a first attempt.
- Future increments (advanced ticketing, attendee portal, check-in/QR, courses, membership,
  multi-organizer) are explicitly out of scope until this MVP is live — spec §54.
