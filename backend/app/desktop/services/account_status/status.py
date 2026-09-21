# backend/app/desktop/services/account_status/status.py
from datetime import datetime, timezone
from app.core.constants import UserStatus


def compute_display_status(user, latest_token) -> str:
    if user.status == UserStatus.ACTIVE:
        if not user.is_active:
            return "Suspended"
        if user.is_locked:
            return "Locked"
        return "Active"

    if user.status == UserStatus.INVITED:
        if not latest_token:
            return "Invited"
        expires_at = latest_token.expires_at
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        if expires_at >= datetime.now(timezone.utc):
            return "Invited"
        if latest_token.resend_requested_at is not None:
            return "Resend Requested"
        return "Link Expired"

    if user.status == UserStatus.PENDING_APPROVAL:
        return "Pending Approval"

    return user.status