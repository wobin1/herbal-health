# Herbal Health Seminar Series — Engineering Rules

Stack: Next.js + TypeScript + Prisma + PostgreSQL.

Full standards rationale: `docs/herbal-health-international-standards.md` (read on demand for
compliance/audit/CI-gate work — do not inline it here).

## Non-negotiable rules

**Trust boundary**

- Never trust client-supplied price, total, discount, tax, role, permissions, inventory, or
  payment_status. These are always computed/verified server-side.
- Validate every API input against a schema before touching the database.
- Authorize every resource access explicitly — never rely on "it's not linked in the UI."

**Auth & sessions**

- Passwords: Argon2id only. Never log passwords or reset tokens. Reset tokens: single-use, expiring.
- Admin accounts: MFA required, RBAC enforced, no shared accounts.
- Cookies: `Secure`, `HttpOnly`, appropriate `SameSite`. Rotate session on login/privilege change.
  Invalidate on logout, password reset, or admin deactivation.

**Payments**

- Never store full card numbers, CVV, or track/PIN data. Use hosted/tokenized payment flows.
- Webhooks: verify provider signature, reject invalid ones, process idempotently — duplicate
  delivery must never create duplicate registrations or double-charge.
- Ticket inventory changes go through atomic reservations/transactions, not read-then-write.

**Data handling**

- No raw SQL without parameterization; prefer Prisma query builder.
- Don't collect medical history, diagnoses, prescriptions, or PHI — this is an educational/event
  platform, not a clinical record system.
- Every new data field needs a stated reason before it's added (privacy-by-design).
- Timestamps: UTC in the database + separate IANA timezone field. Never store ambiguous date strings.

**Web/API surface**

- Security headers on all responses: CSP, HSTS, X-Content-Type-Options, Referrer-Policy,
  Permissions-Policy.
- Rate-limit and cap request size on all public endpoints.
- Error responses: consistent shape, no stack traces or internal details leaked to the client.

**Accessibility**

- WCAG 2.2 AA baseline on all user-facing UI: semantic HTML, labeled form inputs, visible focus
  states, sufficient contrast, keyboard operability, no keyboard traps, accessible error messages.

**Code hygiene**

- No secrets committed to git, ever — use env vars.
- No new abstractions/config flags for hypothetical future requirements — build for what's asked.

**Testing (TDD)**

- Write the failing test before the implementation for business logic, services, API routes, and
  webhook/payment handling — pricing, inventory, status transitions, auth/authz, and anything in
  the "Trust boundary" / "Payments" rules above are never written test-after.
- Simple presentational components and static content pages are the exception — test behavior, not
  markup.
- `npm test` must run the entire suite (unit + integration + e2e) in one command and exit non-zero
  on any failure — this is what CI and pre-merge checks call. Don't add a new test type without
  wiring it into that command.
- `npm test` must pass before pushing to origin, enforced two ways: a Husky `pre-push` hook running
  it locally, and a required CI status check on GitHub so a failing/bypassed push can't merge
  regardless. Never bypass with `--no-verify` — if a hook fails, fix the failure, don't skip it.

## When a task touches compliance, CI gates, retention periods, or legal scope

Read the relevant section of `docs/herbal-health-international-standards.md` first — don't guess
from memory, and don't paste it into this file.

## Design reference

UI should match the look and feel of the screenshots in `docs/design/` (layout, spacing, color,
typography, component style). Before building or revising a screen, check `docs/design/` for a
matching reference image and read it — don't invent new visual patterns when a reference exists.
Currently covers: `hero-and-small-content.png`, `other-content-section.png`.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
