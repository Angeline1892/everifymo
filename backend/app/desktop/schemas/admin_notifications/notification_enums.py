# backend/app/desktop/schemas/admin_notifications/notification_enums.py
from enum import Enum


class NotificationEventType(str, Enum):
    """
    Every valid event_type value written to admin_notifications.event_type.

    Split into two buckets by which account type the event concerns:
    - Admin bucket: national_admin / fda_admin / lea_admin accounts -
      still go through invite -> pending approval, since admin accounts
      are the only ones with a self-registration deep-link left.
    - Personnel bucket: fda_personnel / lea_personnel accounts - created
      directly by an admin now, no invite/pending-approval flow.

    Recipients for every event type stay inside the SAME workspace the
    triggering action happened in - a national_admin action notifies only
    national_admin peers, a regional admin action notifies only co-admins
    in that same region+agency. There is no cross-workspace notification.
    See notification_service.py for the actual fan-out logic.

    Inherits from str so it serializes cleanly in JSON responses and can
    be compared directly against plain strings without an extra .value.
    """

    # ---- Admin-account bucket (national_admin / fda_admin / lea_admin) ----

    # New admin invited - same event whether National Admin invites a
    # peer/regional admin, or a regional admin invites their own co-admin.
    ADMIN_INVITED = "admin_invited"

    # Invited admin set their password, now awaiting approval. Renamed
    # from the old SUPERADMIN_PASSWORD_CREATED so it reads correctly for
    # all three admin roles, not just superadmin.
    ACCOUNT_PENDING_APPROVAL = "account_pending_approval"

    # Resend requested for an admin whose invite link is stale/expired.
    RESEND_LINK_REQUESTED = "resend_link_requested"

    # Invited admin hasn't activated after X days, token still valid.
    # Computed on read, not a real stored row - see
    # _get_stale_invite_notifications in the service.
    INVITE_NOT_ACTIVATED = "invite_not_activated"

    # Invited admin's link expired before they activated. Computed on
    # read, not a real stored row.
    INVITE_EXPIRED = "invite_expired"

    # Admin changed their OWN password (self-service, logged-in flow).
    # Whole workspace gets notified - every co-admin in that admin's
    # region+agency, or every national_admin peer if it's a national
    # admin. No special-cased fan-out needed, same workspace-scoped rule
    # as every other admin-bucket event.
    PASSWORD_CHANGED = "password_changed"

    # ---- Shared account-status transitions (both buckets use these) ----

    ACCOUNT_LOCKED = "account_locked"
    ACCOUNT_UNLOCKED = "account_unlocked"
    FAILED_LOGIN_WARNING = "failed_login_warning"
    ACCOUNT_SUSPENDED = "account_suspended"
    ACCOUNT_REACTIVATED = "account_reactivated"

    # The approval step that moves an account from pending_approval to
    # active. Distinct from ACCOUNT_PENDING_APPROVAL, which only means
    # the account holder finished THEIR half.
    ACCOUNT_ACTIVATED = "account_activated"

    # Permanently deleted - distinct from ACCOUNT_SUSPENDED since
    # suspension is reversible and deletion is not. Used by both buckets.
    ACCOUNT_DELETED = "account_deleted"

    # ---- Personnel-account bucket (fda_personnel / lea_personnel) ----

    # Admin edited a personnel's profile fields (name, contact number,
    # employee_id, department, position, etc). DUAL-WRITE event: one row
    # fans out to co-admins in that personnel's region+agency, and a
    # SEPARATE single row goes to that one personnel's own notification -
    # not a broadcast to other personnel. See
    # notify_personnel_profile_updated in the service.
    ACCOUNT_INFO_UPDATED = "account_info_updated"

    # STEP 1 of the personnel password-reset flow: personnel clicked
    # "Notify Administrator to Reset Password" on their own account page.
    # Personnel-initiated - notifies co-admins in that personnel's
    # region+agency that action is needed.
    PASSWORD_RESET_REQUESTED = "password_reset_requested"

    # STEP 2 of the same flow: an admin actually performed the reset for
    # that personnel. Admin-initiated - notifies the SAME co-admin
    # audience as step 1, so everyone in that workspace knows the pending
    # request was fulfilled, not just the admin who did it.
    PASSWORD_RESET_COMPLETED = "password_reset_completed"

    # Personnel invited via the same deep-link flow as admins - unlike
    # admins, personnel skip pending_approval entirely and go straight to
    # active once they set their password (see the note on
    # ACCOUNT_ACTIVATED below about where that trigger actually lives).
    PERSONNEL_INVITED = "personnel_invited"
    LOCATION_ANOMALY_DETECTED = "location_anomaly_detected"