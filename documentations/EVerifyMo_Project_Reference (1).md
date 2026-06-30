# E-VerifyMo — ICM Desktop App: Project Reference

A running reference of everything decided so far, for picking the project back up without losing context. Organized so you can jump to whatever piece you're about to build.

---

## 1. Stack and Architecture Overview

- **Backend:** Python, FastAPI, PostgreSQL, hosted centrally on AWS (EC2 + RDS)
- **Frontend:** Electron (desktop shell) + React + Vite
- **Why centralized, not local-per-officer:** FDA and LEA officers in the same workspace must see each other's updates — this requires one shared backend, not a local database per machine
- **Team split:** 3 sub-teams (NLP Pipeline, Browser Extension, Desktop App). You + 2 teammates own the Desktop App. You specifically own the FDA workspace + the shared authentication foundation.

**Critical architectural decision locked in:** the desktop app *always* talks to the centrally-hosted AWS backend — never a local backend per officer. This is required for real-time interagency visibility.

---

## 2. Database: Tooling and Workflow

**Do not build/alter tables by hand in pgAdmin.** Use pgAdmin only to *view* and run ad-hoc queries — never to create or modify schema directly, or your migration history and actual DB state will silently diverge.

**Use Alembic + SQLAlchemy for schema management** — this is the Python/FastAPI equivalent of `php artisan migrate` in Laravel:

| Laravel/XAMPP | Python/FastAPI |
|---|---|
| `php artisan make:migration` | `alembic revision --autogenerate -m "..."` |
| `php artisan migrate` | `alembic upgrade head` |
| `php artisan migrate:rollback` | `alembic downgrade -1` |
| Eloquent Models | SQLAlchemy Models |
| phpMyAdmin (view only) | pgAdmin (view only) |
| MySQL | PostgreSQL |

**Workflow:** define/edit a SQLAlchemy model → `alembic revision --autogenerate` → **review the generated migration file** (autogenerate isn't perfect — it can miss check constraints or get confused by renames) → `alembic upgrade head` → commit the migration file to Git so teammates can apply the same change locally.

**Team coordination rules (3 people, 16 interrelated tables):**
- Agree on one shared dev database (or apply identical migration files from Git on each local Postgres)
- Assign one person as "owner" of each table group to avoid conflicting `ALTER TABLE` migrations on the same table in the same week — you're the natural owner of `users`, `regions`, `otp_tokens`, `user_sessions`, `account_invitation_tokens`
- Never edit a migration file that's already been merged/applied by a teammate — write a new migration to fix problems instead

**First migration to write, before any registration endpoint code:** full `users` table (with `region_id`), `regions` table, `account_invitation_tokens` table. Build and agree on this as a team before writing FastAPI routes against it.

---

## 3. Schema — Final State Summary

Full annotated schema with all fixes and region scalability already delivered as a Word doc: **`EVerifyMo_Schema_Revision3.docx`** (color-coded: green = new, orange = modified, red = flagged for removal). Two further fixes discussed after that doc was generated and not yet folded in — see below.

### 16 tables, grouped:
- **Group 1 — Users & Auth:** `users`, `otp_tokens`, `user_sessions`, `consumer_accounts`
- **Group 2 — Product Database:** `registered_products`, `unregistered_advisories`
- **Group 3 — Complaints:** `walkin_complainants`, `complaints`, `complaint_status_history`
- **Group 4 — Interagency Communication:** `verification_requests`, `notifications`, `shared_files`
- **Group 5 — System & Performance:** `audit_logs`, `verification_cache`
- **Plus (new):** `regions`, `account_invitation_tokens`

### Key fixes already applied in Revision 3:
- `consumer_accounts.consumer_type` — dropped `'none'` value, removed default `'registered'` (every insert must explicitly state `registered` or `guest`)
- `consumer_accounts.email` — now nullable (guests may not provide one); app layer must enforce "required when `consumer_type = 'registered'`"
- `verification_requests.response_notes` — nullable (was a doc/constraint contradiction); app layer enforces "required before status leaves `pending`"
- `shared_files.recipient_agency` — nullable, required only when `complaint_id IS NULL`
- `walkin_complainants.created_at` — restored (was corrupted by an accidental note in the column name); `created_by` added (FK → users, NOT NULL)
- `complaints.manufacturer` — added (distinct from `seller_name`, which is "where bought," not "who made it")
- `complaints.product_category` — stays nullable; documented as a manual fallback only — authoritative category comes from the matched `registered_products`/`unregistered_advisories` row via `matched_product_id`

### ⚠️ Two fixes discussed AFTER Revision 3 — not yet in the document, do these before building:
1. **`complaints.verification_result`** — must change from `NOT NULL` to `NULLABLE`. It's an NLP-only verdict (`registered`/`unregistered`/`suspicious`); walk-in complaints never run NLP, so this can't be required at insert time. A walk-in's actual verdict comes from its linked `verification_requests.verification_request_status` instead — no duplicate column needed.
2. **`unregistered_advisories`** needs two new columns, mirroring `registered_products`:
   - `added_by UUID FK → users.user_id, NULLABLE` (NULL for bulk-imported records, populated when an FDA officer manually adds an advisory)
   - `updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
   - Open question for the NLP team: does a manually-added advisory get its `sbert_embedding` generated immediately, or only during a bulk reindex job? Decide before officers start adding these live.

### Region scalability (multi-tenancy) — the core design:
- New `regions` table (`region_id`, `region_name`, `region_code`, `is_active`, `created_at`)
- `region_id` is **NOT NULL** on: `users`, `complaints` — these are the tables that need their own region marker
- `region_id` is **nullable** on: `shared_files`, `audit_logs` — only populated for their no-parent edge cases (general interagency doc with no complaint; system action with no associated region)
- **No `region_id` at all** on: `registered_products`, `unregistered_advisories`, `verification_cache`, `consumer_accounts`, `otp_tokens`, `user_sessions`, `walkin_complainants`, `verification_requests`, `complaint_status_history`, `notifications` — these are either national/global data, or reachable via a one-hop join to a table that already carries the region
- **Enforcement:** use PostgreSQL Row-Level Security (RLS) on `users` and `complaints`, not just application-level `WHERE` filters — RLS guarantees isolation even if a developer forgets a filter somewhere. Add a bypass condition for `role = 'superadmin'` so national analytics can query across all regions through the same queries.
- **Deliberately NOT built yet:** Regional SuperAdmin role, region-switching UI, multi-region account provisioning. Adding the column now is cheap; building the permissions/UI around it isn't needed until there's an actual second region to onboard.

### Open schema questions still pending team decision:
- Can `fda_admin`/`lea_admin` create personnel accounts outside their own `region_id`, or same-region only? (Recommended default: same-region only; cross-region requires SuperAdmin.)
- Is `verification_requests.product_code` genuinely needed as LEA-supplied input, given `registration_number` is reachable once `matched_product_id` resolves?
- Does a single complaint realistically go through more than one verification request cycle (reject → resubmit)? If yes, add `shared_files.request_id` (nullable FK) to disambiguate which response a file belongs to. If no, skip it — timestamp-based inference is fine.
- Should a walk-in complaint's `status` auto-update when its linked `verification_requests` resolves, or does an LEA officer update it manually after seeing FDA's response?

---

## 4. Roles and Permissions Model

```
role ENUM: superadmin, fda_admin, fda_personnel, lea_admin, lea_personnel
```
- Agency is baked directly into the role (not a separate `agency` field) — intentional, since FDA and LEA are genuinely distinct personnel pools, not interchangeable "Admins"
- `region_id` is a separate, orthogonal column — `role` answers "what can they do," `region_id` answers "what can they see"
- **Authentication is role-agnostic; authorization is not.** Login/OTP/session flow never branches on role. Role only matters *after* login, for routing and permission checks (route guards, RLS policies) — keep this principle in mind any time you're tempted to special-case a table for a specific role.

### SuperAdmin specifics
- Logs in exactly like everyone else — same `email + password + OTP → JWT` flow, same `otp_tokens`/`user_sessions` tables, no special schema needed
- `region_id` is NULL only for SuperAdmin (system-wide, not scoped to one office)
- `employee_id` and `created_by` are also NULL for the root SuperAdmin (no government employee ID; nobody created the seed account)
- The **root** SuperAdmin account is created via a one-time developer seed script — never through any registration endpoint

### SuperAdmin dashboard scope (decided, see diagram delivered in chat)
SuperAdmin gets an **oversight/admin dashboard**, not a merged copy of the FDA and LEA operational workspaces. Sections:
1. **Accounts & access** — create admin accounts, review pending approvals, lock/unlock, deactivate
2. **Analytics & oversight** — cross-agency, cross-region trends; top flagged products (via `marketplace_detection_count`)
3. **Audit logs** — full system trail, filterable by region/user
4. **System config** — manage `regions` table (add/retire regional offices)
5. **Case detail (read-only)** — reached by drilling in *from* analytics, not a standalone duplicate of the FDA/LEA case screens. Practical build tip: this can likely just be the same case-detail component used elsewhere, with a `readOnly` prop instead of a fully separate screen.

**Deliberately NOT building for SuperAdmin:** the actual FDA review screen, the actual LEA intake/verification-composer screen — those stay exclusively in their own agency workspaces.

---

## 5. Account Lifecycle: Registration via Deep Link

No public self-registration. Every account is **provisioned**, not self-signed-up. Full lifecycle:

1. **SuperAdmin creates a stub account** — email, `role`, `region_id` only (SuperAdmin decides what the person is being invited *into*; the invitee does not self-declare role or region). Status: `invited`.
2. **System generates an invitation token** in a separate table `account_invitation_tokens` (`user_id`, `token`, `expires_at`, `used_at`) — random, unguessable. This is what makes the link secure (not the user_id itself).
3. **Email sent** with a deep link: `everifymo://complete-registration?token=...`
4. **Officer clicks the link** → OS hands it to the installed Electron app via the registered custom protocol
5. **Electron's main process catches it**, extracts the token, routes to the registration-completion screen
6. **Frontend validates token** via backend (exists? unexpired? unused?) → shows form
7. **Officer fills in** `first_name`, `middle_name`, `last_name`, `employee_id`, `contact_number`, `department`, `position`, sets password
8. **On submit:** password hashed into `password_hash`, fields saved, status → `pending_approval`, token's `used_at` set (single-use)
9. **SuperAdmin reviews submission** in a "Pending Approvals" screen, clicks Approve → status → `active`
10. **Second email sent:** "your account is now active"
11. **From here on:** completely ordinary login — email + password + OTP → JWT

### Status lifecycle needed on `users`:
```
invited → pending_approval → active   (happy path)
                ↓
          rejected/returned (if SuperAdmin finds an issue — decide: 
          does this kick back to the user to redo, or does SuperAdmin 
          just edit the fields directly before approving?)
```

### Email delivery risk — test early, not late
`.fda.gov.ph`-style addresses may hit spam filtering or domain restrictions depending on your mail sender (SendGrid/SES/SMTP). **Send a real test email to a similar domain in week 1, not week 8.** Fallback if delivery is unreliable: let SuperAdmin see/copy the activation link directly in their dashboard, same token system, just bypassing email as the only delivery path.

---

## 6. Deep Linking — Electron Implementation Notes

### The chicken-and-egg dev problem
Deep links normally get registered with the OS by an *installer*. During `npm run electron:dev`, nothing installs anything, so `everifymo://` links won't resolve to anything by default.

**Fix:** call `app.setAsDefaultProtocolClient()` yourself at runtime, every dev session:
```javascript
if (process.env.NODE_ENV === 'development') {
  app.setAsDefaultProtocolClient('everifymo', process.execPath, [path.resolve(process.argv[1])]);
} else {
  app.setAsDefaultProtocolClient('everifymo');
}
```
This re-registers the protocol on your machine every time the dev build starts, letting you test the full deep-link flow **without needing a packaged `.exe` yet.** Test by typing `everifymo://complete-registration?token=test123` directly into a browser address bar while your dev build is running.

You can build/test the link-*catching* logic (Electron side) completely independently of whether email-*sending* actually works yet — two separable problems.

### Platform differences — test on both, don't assume
- **Mac:** clean `open-url` event
- **Windows/Linux:** no equivalent event. A second instance of your app briefly launches; you must catch its command-line args (containing the URL) via `app.requestSingleInstanceLock()` + the `second-instance` event, close the second instance, forward the link to the already-running first instance.

### Other things to account for
- Protocol registration may only fully "stick" after the app has been opened at least once (relevant for fresh installs in beta testing — may need to tell officers to open the app once before clicking their registration email)
- Have a manual fallback (copy-paste the link into an in-app field) in case antivirus or locked-down government machines block custom protocol registration entirely

---

## 7. Real-Time Sync Strategy

**Decision:** real-time matters here — officers in the same workspace must see each other's updates without significant delay. "Perfect" (zero-latency, never-miss-an-update) isn't a realistic target for any system — the actual bar is **a few seconds of propagation, no silent failures, no data loss.**

- **Use WebSockets (not polling)** for the specific screens where two officers are likely to view/edit the same data simultaneously — a complaint being updated, a verification request being responded to. FastAPI supports WebSockets natively.
- Polling is fine for lower-stakes screens (e.g., SuperAdmin analytics dashboard probably doesn't need push updates — refresh-on-open is likely sufficient)
- **`notifications` table** is the data layer underneath this — but remember the table only records that something happened; the frontend still needs to actually re-render based on it (via WebSocket push or polling)
- Decide: does optimistic UI / conflict handling matter given your small headcounts? If realistically only one officer is ever assigned per case, you likely don't need sophisticated conflict resolution — just "always show the latest state"
- Build small affordances so any delay feels intentional, not broken: a "last updated Ns ago" indicator, a loading pulse on incoming updates, a visible "reconnecting..." state if the WebSocket drops
- **Offline handling:** decide on at least a basic "connection lost" banner — don't let actions silently fail when AWS is unreachable

---

## 8. Dev Environment — Running Everything Locally

Mental model carried over from Laravel:

| Laravel | Electron/FastAPI equivalent |
|---|---|
| `php artisan serve` | `uvicorn main:app --reload` (FastAPI backend, e.g. `localhost:8000`) |
| `npm run dev` (Vite) | `npm run dev` (same — Vite still serves the frontend, e.g. `localhost:5173`) |
| View in browser at `localhost` | `npm run electron:dev` — opens a native Electron window pointed at the Vite dev server. **Electron itself plays the role the browser used to play.** |

Three things run simultaneously during dev: FastAPI backend, Vite dev server, Electron main process (which just loads the Vite URL into a native window).

**Packaging for distribution** (only needed when producing an actual installable build, not during daily dev) uses a separate tool — `electron-builder` or `electron-forge` — to bundle everything into a `.exe`/`.dmg`.

**Two environment configs needed from the start:**
- `.env.development` → points at local `localhost:8000`
- `.env.production` → points at the AWS-hosted API
- Electron's build process should pick the right one — avoid a dev build accidentally hardcoded to hit AWS, or a "production" build accidentally pointed at someone's localhost.

---

## 9. Implementation Notes Checklist (carried over from schema doc)

- `CREATE EXTENSION IF NOT EXISTS vector;` and `pgcrypto;` before any migrations
- All timestamps: `TIMESTAMPTZ`, server timezone `Asia/Manila`
- `audit_logs` and `complaint_status_history` are **append-only** — never UPDATE/DELETE
- `sbert_embedding VECTOR(768)` needs pgvector — store as TEXT temporarily if unavailable, migrate later
- Indexes needed on: `complaints.status`, `complaints.source`, `complaints.created_at`, `complaints.region_id`, `users.email`, `users.role`, `users.region_id`, `audit_logs.performed_at`, `audit_logs.user_id`, `verification_cache.query_hash`, `verification_cache.expires_at` — the two `region_id` indexes are hot-path, hit by every region-scoped query
- `verification_cache` needs daily purging (pg_cron or background task) for expired rows
- `case_reference` (complaints): auto-generate via Postgres sequence/trigger, format `EVM-YYYY-NNNNN` — **sequential is fine**, this is internal-facing only
- `guest_reference_code` (complaints): generate randomly in FastAPI, **must not be sequential/guessable** — this is the public-facing lookup key with no login required
- Define role constants in one shared Python constants file — never hardcode role strings per-route
- Session policy: 1-day absolute refresh token expiry; monitor `last_used_at`, revoke after 2–4 hours idle
- `marketplace_detection_count` increments must be atomic with the complaint insert (same transaction, not a background job)
- `walkin_complainants` holds PII — ensure access is restricted to authorized personnel only
- Build a `verification_requests_full` view (joining `complaints` + `walkin_complainants`) for the "Ready to Send" screen, rather than duplicating complainant name/source/region onto `verification_requests`

---

## 10. General Team Reminders

- Seed realistic fake data for all tables early (one row per role, one region, a few complaints in different statuses) before building screens against an empty DB — empty-DB bugs hide easily (e.g. a dashboard count that works at zero rows but breaks at five)
- Pin down the exact JWT payload shape (`user_id`, `role`, `region_id` at minimum) before anyone writes protected routes — both backend guards and frontend routing depend on this; expensive to change once endpoints exist
- Test the Electron deep-link handler on every OS your team/testers will actually use, early — this is the one piece that's genuinely platform-inconsistent
- Decide RLS vs. application-level filtering for region isolation before writing many endpoints — expensive to switch direction midway

---

## 11. Build Order (current plan)

You're starting with: **SuperAdmin dashboard, Login, Registration** — the shared auth foundation, which unblocks your two teammates building the FDA and LEA workspaces against real auth instead of mocked auth.

Suggested sequence within this slice:
1. First Alembic migration: `regions`, `users` (with `region_id`), `account_invitation_tokens`, `otp_tokens`, `user_sessions`
2. Seed script for root SuperAdmin
3. Login endpoint + OTP + JWT issuance (role-agnostic, as above)
4. SuperAdmin: create stub account → generates invitation token → (stub) email send
5. Electron deep-link catching (testable now, via the dev-mode protocol registration trick — no installer needed yet)
6. Registration-completion form + submit endpoint
7. SuperAdmin "Pending Approvals" screen + approve action
8. Activation email + first real login test, end to end

---

*Other documents from this project: `EVerifyMo_Schema_Revision3.docx` (full annotated 16-table schema with color-coded changes) — apply the two post-Revision-3 fixes above before treating it as final.*
