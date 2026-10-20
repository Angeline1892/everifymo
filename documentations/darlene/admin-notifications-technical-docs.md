# Admin Notifications — Technical Documentation

For E-VerifyMo developers working on or extending the National Admin / FDA Admin / LEA Admin notification system.

## 1. What this system is for

Every account-lifecycle event (invites, activations, suspensions, lockouts, password changes, etc.) needs to notify the right set of admins — but *only* the right set. This replaced an older flat "notify every superadmin" system that existed before the project split into three admin tiers.

## 2. The three account tiers

| Role | Scope | Notes |
|---|---|---|
| `national_admin` | Cross-agency, `region_id = NULL` | Single flat tier, no per-agency split |
| `fda_admin` / `lea_admin` | One specific `region_id`, one agency | Multiple can exist per region (co-admins) |
| `fda_personnel` / `lea_personnel` | One specific `region_id`, one agency | Created directly by an admin; go through the same invite-link flow as admins but skip `pending_approval` — active as soon as they set their password |

## 3. The one rule everything else follows

**Notifications never cross workspace boundaries.**

- An action taken by/about a `national_admin` account notifies every other active `national_admin`.
- An action taken by/about an `fda_admin`/`lea_admin` account notifies every other active co-admin sharing that same role + `region_id`. National Admin is **never** included.
- An action taken by/about personnel notifies the co-admins in that personnel's own region + agency. National Admin is **never** included.

There is no cross-tier escalation. If you're adding a new trigger point and find yourself wanting to notify "everyone," stop — that's almost certainly wrong under this design.

## 4. Database

**Table:** `admin_notifications` (renamed from the old `superadmin_notifications`)

| Column | Type | Notes |
|---|---|---|
| `notification_id` | UUID, PK | |
| `recipient_id` | UUID, FK → `users.user_id` | Who this specific row is for |
| `event_type` | string | See `NotificationEventType` enum below. Deliberately **not** DB-constrained (no CHECK) — the action list is still evolving on the frontend side, so this stays enforced in Python only |
| `title` / `message` | string / text | Display text |
| `related_user_id` | UUID, FK → `users.user_id`, nullable | The account this event concerns |
| `agency` | string, nullable | `'FDA'` / `'LEA'` — describes the **event's own context**, not the recipient's scope |
| `region_id` | UUID, FK → `regions.region_id`, nullable | Same — event's own context. Both `agency` and `region_id` are `NULL` only for `national_admin`-account events, since that role has no agency/region of its own |
| `is_read` / `read_at` | bool / timestamp | |
| `created_at` | timestamp | |

**Important:** `agency`/`region_id` on a row are **not** the recipient's own scope — they describe what the event is about. A `national_admin` recipient has no region of their own, but still needs the row to say "this concerns Region III" for display purposes.

The personnel-facing table (`notifications`, separate system, `recipient_type='personnel'`) is untouched by any of this except for one dual-write case — see §6.

## 5. Event types (`NotificationEventType` enum)

**Admin bucket** (`national_admin` / `fda_admin` / `lea_admin` accounts — still go through invite → pending approval):
`ADMIN_INVITED`, `ACCOUNT_PENDING_APPROVAL`, `RESEND_LINK_REQUESTED`, `INVITE_NOT_ACTIVATED`, `INVITE_EXPIRED`, `PASSWORD_CHANGED`

**Shared** (used by both buckets):
`ACCOUNT_LOCKED`, `ACCOUNT_UNLOCKED`, `FAILED_LOGIN_WARNING`, `ACCOUNT_SUSPENDED`, `ACCOUNT_REACTIVATED`, `ACCOUNT_ACTIVATED`, `ACCOUNT_DELETED`

**Personnel bucket** (`fda_personnel` / `lea_personnel` accounts — no pending-approval step):
`PERSONNEL_INVITED`, `ACCOUNT_INFO_UPDATED`, `PASSWORD_RESET_REQUESTED`, `PASSWORD_RESET_COMPLETED`

**Retired — do not use:** `SUPERADMIN_INVITED`, the old `PERSONNEL_INVITED` meaning, `REGISTRATION_ACCOMPLISHED`, `SUPERADMIN_PASSWORD_CREATED`.

## 6. Service functions (`admin_notification_service.py`)

This is the only place fan-out logic lives. Every trigger point elsewhere in the codebase calls one of these — nothing outside this file queries `admin_notifications` directly for writes.

### The two primitives

```python
notify_national_admin_workspace(db, event_type, title, message, related_user_id=None, agency=None, region_id=None)
```
Fans out to every active `national_admin`. `agency`/`region_id` here are display context only — they don't filter recipients.

```python
notify_regional_admin_workspace(db, agency_admin_role, region_id, agency, event_type, title, message, related_user_id=None)
```
Fans out to every active user matching `role == agency_admin_role AND region_id == region_id`. Used for both admin-account events (co-admin management) and personnel-account events — same audience shape either way.

### The three wrapper functions — pick based on who the actor is

| Function | Use when | How it routes |
|---|---|---|
| `notify_account_event(db, actor, target_user_id, target_role, target_region_id, event_type, title, message)` | A logged-in admin is managing **someone else's** account (suspend, activate, invite a co-admin, etc.) | By `actor.role` — personnel targets always go to the actor's own regional workspace; admin targets go to National workspace if actor is National, else the actor's own regional workspace |
| `notify_self_service_account_event(db, target, event_type, title, message)` | The account holder is acting **on their own account** (self-service password change, completing their own registration, getting locked out from failed login attempts) — there is no separate "actor," the target IS the actor | By `target.role`/`target.region_id`, read directly off the target's own row |
| `notify_personnel_profile_updated(db, personnel, agency_admin_role, agency, title, admin_workspace_message, personnel_message)` | Specifically `ACCOUNT_INFO_UPDATED` for a personnel account, admin-initiated | **Dual-write**: one row to the region+agency admin workspace via `notify_regional_admin_workspace`, plus a separate single row inserted directly into the personnel's own `notifications` table (not a broadcast to other personnel) |

**Rule of thumb:** if you have a `current_user`/`actor` performing an action on a *different* user, use `notify_account_event`. If the function you're editing has no separate actor — the person in the request IS the account the event is about — use `notify_self_service_account_event`.

### Computed (non-persisted) entries

`_get_stale_invite_notifications` / `_get_expired_invite_notifications` compute "this invite is going stale / has expired" notifications fresh on every read, rather than storing them. They're scoped the same way: `national_admin` sees any admin-tier invite; `fda_admin`/`lea_admin` sees invites for their own admin role *and* the personnel role under their own agency, filtered to their own region.

### Read path

`get_notifications`, `get_unread_count`, `mark_notification_read`, `mark_all_notifications_read` — standard CRUD, filtered by `recipient_id`. These don't need their own region/agency filtering logic, because correctness is already guaranteed at write time: a row only ever exists for a recipient who was supposed to get it.

## 7. Router

`app/desktop/routers/admin_notifications/admin_notifications.py`, mounted at `/admin-notifications`. Uses `get_current_admin_or_national_admin` (accepts all three admin roles). Endpoints: `GET ""`, `GET "/unread-count"`, `PATCH "/{notification_id}/read"`, `PATCH "/read-all"`.

## 8. Every wired trigger point

| File | Function | Event(s) | Which helper |
|---|---|---|---|
| `services/auth/invite.py` | `create_invited_account` | `ADMIN_INVITED` / `PERSONNEL_INVITED` (branches on role) | `notify_account_event` |
| | `activate_account` | `ACCOUNT_ACTIVATED` | `notify_account_event` |
| `services/account_status/lifecycle.py` | `suspend_account` | `ACCOUNT_SUSPENDED` | `notify_account_event` |
| | `reactivate_account` | `ACCOUNT_REACTIVATED` | `notify_account_event` |
| | `unlock_account` | `ACCOUNT_UNLOCKED` | `notify_account_event` |
| `services/account_status/invitations.py` | `resend_invite_link` | `RESEND_LINK_REQUESTED` | `notify_account_event` |
| | `delete_invited_account` | `ACCOUNT_DELETED` | `notify_account_event` |
| `services/account_status/personnel.py` | `edit_personnel_info` | `ACCOUNT_INFO_UPDATED` | `notify_personnel_profile_updated` (dual-write) |
| | `reset_personnel_password` | `PASSWORD_RESET_COMPLETED` | `notify_account_event` |
| `routers/auth/registration.py` | `complete_registration` | `ACCOUNT_ACTIVATED` (personnel) / `ACCOUNT_PENDING_APPROVAL` (admin) | `notify_self_service_account_event` |
| | `resend_invite` | `RESEND_LINK_REQUESTED` | `notify_self_service_account_event` |
| | `request_resend` | `RESEND_LINK_REQUESTED` | `notify_self_service_account_event` |
| `routers/profile_setting/profile.py` | `update_profile` | `ACCOUNT_INFO_UPDATED` | `notify_self_service_account_event` |
| | `change_password` | `PASSWORD_CHANGED` | `notify_self_service_account_event` |
| | `request_password_reset` | `PASSWORD_RESET_REQUESTED` | `notify_regional_admin_workspace` (direct — personnel target, not an admin self-service case) |
| `services/auth/admin_auth.py` | `_handle_failed_attempt` | `ACCOUNT_LOCKED`, `FAILED_LOGIN_WARNING` | `notify_self_service_account_event` |
| `services/auth/national_admin_auth.py` | `_handle_failed_attempt` | `ACCOUNT_LOCKED`, `FAILED_LOGIN_WARNING` | `notify_self_service_account_event` |
| `services/auth/personnel_auth.py` | `authenticate_personnel` | `ACCOUNT_LOCKED`, `FAILED_LOGIN_WARNING` | `notify_self_service_account_event` |
| `services/auth/otp_service.py` | `verify_otp_for_user` | `ACCOUNT_LOCKED`, `FAILED_LOGIN_WARNING` | `notify_self_service_account_event` |

## 9. Adding a new trigger point

1. Does the event concern an admin acting on someone else's account, or someone acting on their own? That decides `notify_account_event` vs `notify_self_service_account_event`.
2. Does the event need a new `NotificationEventType`? Add it to the correct bucket in `notification_enums.py` with a short comment on when it fires.
3. Never query `admin_notifications` directly for a write — always go through one of the service functions in §6, so the workspace-boundary rule stays enforced in exactly one place.
4. If the event is about a personnel account being edited by an admin *and* the personnel themselves should also know, use the dual-write pattern (`notify_personnel_profile_updated` is the existing example) rather than writing a one-off insert into the personnel `notifications` table.

## 10. Status

All identified trigger points across the account-management, registration, and login/OTP flows are wired. Not yet done: curl/git bash test pass, and frontend wiring for the National/FDA/LEA Admin workspaces (planned as the final step once backend testing is clean).
