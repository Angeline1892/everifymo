# E-VerifyMo — Registration & Deep-Link Backend Documentation

This document explains what was built, why, and in what order — from setting
up the database roles all the way to the three registration endpoints. It's
written for beginners, so it explains ideas in plain language before naming
the technical term.

---

## 1. Database Setup — Two Roles, Two Jobs

Before writing any code, the database needed two separate Postgres roles:

- **`postgres`** — used only by Alembic (our migration tool). Can freely
  create/change tables. Bypasses Row-Level Security (RLS) automatically,
  since it owns the tables.
- **`everify_app`** — used by the actual running FastAPI app. This role is
  *restricted* — RLS rules apply to it.

**Why two roles?** If the live app connected using the powerful `postgres`
role, every RLS rule we write would silently do nothing — no errors, it
would just show everyone's data regardless of region. Splitting the roles
means our security rules can't accidentally be bypassed by mistake.

This lives in `.env` as two separate connection strings:
`DATABASE_URL` (for the app) and `MIGRATIONS_DATABASE_URL` (for Alembic).

---

## 2. Enabling `pgcrypto`

Our tables use `gen_random_uuid()` to generate unique IDs automatically.
This function needs a Postgres extension called `pgcrypto` turned on first.

We enabled it using its own small migration:
```sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;
```
This only ever needs to run once per database — after that, every table
we create can use `gen_random_uuid()` freely.

---

## 3. The Tables We Built (Group 1 — Users & Auth)

### `regions`
One row per regional office (e.g. "Region 3 — Central Luzon"). Every
region-scoped account points back to a row in this table.

### `users`
Holds every account — SuperAdmin, FDA personnel, LEA personnel. Key point:
many columns (`first_name`, `last_name`, `position`, `password_hash`) are
**nullable**, because an account starts as an empty "stub" before the
officer ever fills anything in. A `status` column tracks progress:
`invited → pending_approval → active`.

### `account_invitation_tokens`
One row per invite link. Holds the random `invite_token` used in the
deep link, when it `expires_at`, and `used_at` (set once someone
completes registration with it — `NULL` means still unused).

### `otp_tokens` / `user_sessions`
Used for login (built by a teammate, not covered in detail here).

---

## 4. Row-Level Security (RLS) — Why and How

**The idea:** imagine a shared filing cabinet. RLS is a rule taped to it
saying "only open the folder that matches your ID badge's region."
Postgres enforces this automatically, so even if a developer forgets to
filter a query, the database itself blocks the wrong data from leaking.

**The policy we wrote** on `users`:
```sql
CREATE POLICY region_isolation_policy ON users
USING (
    current_setting('app.bypass_rls', true) = 'true'
    OR role = 'superadmin'
    OR region_id::text = current_setting('app.current_region_id', true)
);
```

A row is visible if **any one** of these is true:
1. A special bypass flag is turned on for this one request
2. The user is a SuperAdmin (sees everything, no region restriction)
3. The row's region matches the current logged-in user's own region

**The registration problem this caused:** someone registering hasn't
logged in yet — they have no "region badge" at all. Without a fix, RLS
would block our own registration code from finding real data, silently
returning nothing. That's what condition #1 (`app.bypass_rls`) solves —
our registration endpoints turn this flag on, just for themselves, before
touching the `users` table.

**Important for whoever builds login later:** the login code must run
`SET app.current_region_id = '<the user's actual region>'` on every
authenticated request, or RLS will silently show regional officers zero
rows. SuperAdmin doesn't need this set at all, since rule #2 already
covers them.

---

## 5. Pydantic Schemas — "Rulebooks" for Requests and Responses

A Pydantic schema is like a paper form's rulebook — it describes what a
valid request or response must look like, and FastAPI automatically
rejects anything that doesn't match, before our own code even runs.

File: `app/schemas/auth/registration.py`

- **`TokenStatus`** — a fixed list of allowed values (`valid`, `expired`,
  `used`, `invalid`) so a typo can't silently sneak through.
- **`ValidateTokenResponse`** — what we send back after checking a token:
  its status, an optional message, and (if valid) the officer's email,
  role, and region.
- **`RegistrationCompleteRequest`** — what the officer submits: their
  name, position, etc. Required fields use plain types (`str`); optional
  fields use `str | None = None`.
- **`RegistrationCompleteResponse`** / **`ResendInviteRequest`** /
  **`ResendInviteResponse`** — smaller shapes for the other two endpoints.

**Why nullable database columns can still be "required" here:** the
database allows `first_name` to be empty temporarily (before registration
happens). But *this specific form* should never accept a submission
without it. The schema enforces that stricter rule at the API level,
separate from what the database itself allows.

---

## 6. Role & Status Constants

File: `app/core/constants.py`

Instead of typing `"fda_personnel"` as a raw string in different files
(risking typos), we defined it once:

```python
class Role:
    SUPERADMIN = "superadmin"
    FDA_PERSONNEL = "fda_personnel"
    LEA_PERSONNEL = "lea_personnel"

class UserStatus:
    INVITED = "invited"
    PENDING_APPROVAL = "pending_approval"
    ACTIVE = "active"
    REJECTED = "rejected"     # not yet wired into any logic
    RETURNED = "returned"     # not yet wired into any logic
```

Used throughout the endpoints as `UserStatus.PENDING_APPROVAL` instead of
a bare string.

---

## 7. The Three Registration Endpoints

File: `app/routers/auth/registration.py`

All three start with `db.execute(text("SET app.bypass_rls = 'true'"))`
first — this is required every time, since registration always happens
before login.

### `GET /registration/validate/{invite_token}`
Checks a token from the deep link and reports its state:
1. Token doesn't exist → `invalid`
2. Token already used (`used_at` is set) → `used`
3. Token's `expires_at` has passed → `expired`
4. Otherwise → `valid`, plus the officer's email/role/region for display

This endpoint only **reads** data — it never changes anything.

### `POST /registration/complete`
The officer submits their filled-in form. Steps:
1. Re-check the token is still valid (never trust an earlier check)
2. Copy the submitted fields onto the `users` row
3. Change `status` from `invited` to `pending_approval`
4. Mark the token as used (`used_at = now`)
5. Save both changes together in one `db.commit()` — either both succeed,
   or neither does, so the two tables can never disagree with each other

### `POST /registration/resend-invite`
For a genuinely **expired** link only (not for fixing typos after
submission — that's a separate, direct edit SuperAdmin can do anytime).
Steps:
1. Find the old token
2. Reject if it was already used (`409`)
3. Reject if it hasn't actually expired yet (`400`)
4. Otherwise, generate a brand new random token
   (`secrets.token_urlsafe(32)`) pointing at the same user, valid for
   another 48 hours — the old token is left untouched, kept for audit

---

## 8. Manual Test Data Used

Since the SuperAdmin "create stub account" endpoint wasn't built yet,
test rows were inserted directly in pgAdmin to build and test against:

- A stub `users` row (`fda_personnel`, a real region, `status = invited`)
- A matching `account_invitation_tokens` row with a real token value
- A second stub user + a deliberately already-expired token, used to
  test the `resend-invite` endpoint's expired-link path

All three endpoints were tested successfully through FastAPI's built-in
`/docs` page, including the failure cases (invalid, used, expired).

---

## What's Next

- Electron deep-link catching (`main.js` — registering the `everifymo://`
  protocol, handling Windows vs. Mac differences)
- A preload script bridging Electron's main process to the React app
- Wiring the React registration form to actually call these three
  endpoints