from enum import Enum


class NotificationEventType(str, Enum):
    """
    Every valid event_type value that can be written to
    superadmin_notifications.event_type.

    Inherits from str so it serializes cleanly in JSON responses and can be
    compared directly against plain strings without an extra .value call.
    """

    # 1. Account locked out (is_locked flips to True)
    ACCOUNT_LOCKED = "account_locked"

    # 1b. Account unlocked by a superadmin (manual admin action, is_locked
    #     flips back to False). Pairs with ACCOUNT_LOCKED the way
    #     ACCOUNT_REACTIVATED pairs with ACCOUNT_SUSPENDED.
    ACCOUNT_UNLOCKED = "account_unlocked"

    # 2. Failed login attempts nearing lockout threshold
    FAILED_LOGIN_WARNING = "failed_login_warning"

    # 3. New superadmin account created or invited
    SUPERADMIN_INVITED = "superadmin_invited"

    # 4. New personnel account created or invited
    PERSONNEL_INVITED = "personnel_invited"

    # 5. User registration accomplished (personnel deep-link flow completed)
    REGISTRATION_ACCOMPLISHED = "registration_accomplished"

    # 6. "Create new superadmin pass" accomplished
    SUPERADMIN_PASSWORD_CREATED = "superadmin_password_created"

    # 7. Resend link requested
    RESEND_LINK_REQUESTED = "resend_link_requested"

    # 8. Password changed or reset requested
    PASSWORD_CHANGED = "password_changed"

    # 8b. Profile/account info fields changed (name, contact number,
    #     employee_id, department, position, etc.) - separate from
    #     PASSWORD_CHANGED so superadmins can tell which kind of change
    #     occurred at a glance.
    ACCOUNT_INFO_UPDATED = "account_info_updated"

    # 9. User account suspended / reactivated (split into two so the
    #    frontend can distinguish which one happened). Named "suspended"
    #    to match the UI wording and is_active field, not "deactivated".
    ACCOUNT_SUSPENDED = "account_suspended"
    ACCOUNT_REACTIVATED = "account_reactivated"

    # 9b. Account activated - the peer/superadmin approval step that moves
    #     a user from pending_approval to active. Distinct from
    #     REGISTRATION_ACCOMPLISHED / SUPERADMIN_PASSWORD_CREATED, which
    #     only mark that the USER finished their half (still pending
    #     approval at that point).
    ACCOUNT_ACTIVATED = "account_activated"

        # 9c. User/superadmin account permanently deleted from the system.
    #     Distinct from ACCOUNT_SUSPENDED - suspension is reversible,
    #     deletion is not.
    ACCOUNT_DELETED = "account_deleted"

    # 10. Invited user hasn't activated their account after X days
    INVITE_NOT_ACTIVATED = "invite_not_activated"

    # 11. User's invitation link expired
    INVITE_EXPIRED = "invite_expired"