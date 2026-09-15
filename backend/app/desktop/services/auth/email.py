# backend/app/desktop/services/auth/email.py
"""
ICMDA transactional email sender.

Role tiers:
    National Admin  -> no agency / region (system-wide)
    Admin (FDA/LEA)  -> agency + region scoped, manages personnel + fellow admins
    Personnel (FDA/LEA) -> agency + region scoped

Email lifecycle per account:
    invite      -> deep link to set a password (no credentials in the email)
    otp         -> login verification code
    activation  -> account approved by an approver; NO credentials included,
                   since the user already set their own password via invite
    reset       -> personnel-only. Admin-triggered from User Management.
                   Sends a temporary password; next successful login forces
                   a password change (force_change_password = True).
"""

import html
from pathlib import Path
from urllib.parse import quote

from fastapi_mail import ConnectionConfig, FastMail, MessageSchema, MessageType

from app.core.config import settings

TEMPLATES_DIR = Path(__file__).parent / "templates"

TEMPLATE_PATH_PERSONNEL_INVITE = TEMPLATES_DIR / "personnel_invite_email.html"
TEMPLATE_PATH_ADMIN_INVITE = TEMPLATES_DIR / "admin_invite_email.html"
TEMPLATE_PATH_NATIONAL_ADMIN_INVITE = TEMPLATES_DIR / "national_admin_invite_email.html"

TEMPLATE_PATH_PERSONNEL_OTP = TEMPLATES_DIR / "personnel_otp_email.html"
TEMPLATE_PATH_ADMIN_OTP = TEMPLATES_DIR / "admin_otp_email.html"
TEMPLATE_PATH_NATIONAL_ADMIN_OTP = TEMPLATES_DIR / "national_admin_otp_email.html"

TEMPLATE_PATH_PERSONNEL_ACTIVATION = TEMPLATES_DIR / "personnel_activation_email.html"
TEMPLATE_PATH_ADMIN_ACTIVATION = TEMPLATES_DIR / "admin_activation_email.html"
TEMPLATE_PATH_NATIONAL_ADMIN_ACTIVATION = TEMPLATES_DIR / "national_admin_activation_email.html"

TEMPLATE_PATH_PERSONNEL_RESET_PASSWORD = TEMPLATES_DIR / "personnel_reset_password_email.html"
TEMPLATE_PATH_PERSONNEL_INFO_UPDATED = TEMPLATES_DIR / "personnel_info_updated_email.html"

AGENCY_DISPLAY_NAMES = {
    "fda_personnel": "FDA",
    "lea_personnel": "LEA-CIDG",
    "fda_admin": "FDA",
    "lea_admin": "LEA-CIDG",
    "FDA": "FDA",
    "LEA-CIDG": "LEA-CIDG",
}

conf = ConnectionConfig(
    MAIL_USERNAME=settings.MAIL_USERNAME,
    MAIL_PASSWORD=settings.MAIL_PASSWORD,
    MAIL_FROM=settings.MAIL_FROM,
    MAIL_FROM_NAME=settings.MAIL_FROM_NAME,
    MAIL_PORT=settings.MAIL_PORT,
    MAIL_SERVER=settings.MAIL_HOST,
    MAIL_STARTTLS=True,
    MAIL_SSL_TLS=False,
    USE_CREDENTIALS=True,
)


def _render(template_path: Path, **fields) -> str:
    """Load a template and substitute {{PLACEHOLDER}} values, HTML-escaping every value."""
    text = template_path.read_text(encoding="utf-8")
    for key, value in fields.items():
        text = text.replace("{{" + key + "}}", html.escape(str(value)))
    return text


async def _send(to_email: str, subject: str, html_body: str) -> None:
    message = MessageSchema(
        subject=subject,
        recipients=[to_email],
        body=html_body,
        subtype=MessageType.html,
    )
    fm = FastMail(conf)
    await fm.send_message(message)


def _deep_link(token: str) -> str:
    # everifymo://complete-registration?token={token}
    return f"https://everifyapp.netlify.app/?token={quote(token)}"


def _display_agency(agency_name: str) -> str:
    return AGENCY_DISPLAY_NAMES.get(agency_name, agency_name)


# ---------------------------------------------------------------------------
# Invite emails
# ---------------------------------------------------------------------------

async def send_personnel_invite_email(to_email: str, agency_name: str, region: str, token: str) -> None:
    html_body = _render(
        TEMPLATE_PATH_PERSONNEL_INVITE,
        AGENCY_NAME=_display_agency(agency_name),
        REGION=region,
        DEEP_LINK=_deep_link(token),
    )
    await _send(to_email, "You're invited to register — ICMDA", html_body)


async def send_admin_invite_email(to_email: str, agency_name: str, region: str, token: str) -> None:
    html_body = _render(
        TEMPLATE_PATH_ADMIN_INVITE,
        AGENCY_NAME=_display_agency(agency_name),
        REGION=region,
        DEEP_LINK=_deep_link(token),
    )
    await _send(to_email, "You're invited as Interagency Admin — ICMDA", html_body)


async def send_national_admin_invite_email(to_email: str, token: str) -> None:
    html_body = _render(
        TEMPLATE_PATH_NATIONAL_ADMIN_INVITE,
        DEEP_LINK=_deep_link(token),
    )
    await _send(to_email, "You're invited as National Admin — ICMDA", html_body)


# ---------------------------------------------------------------------------
# OTP emails
# ---------------------------------------------------------------------------

async def send_personnel_otp_email(to_email: str, otp_code: str, expire_minutes: int = None) -> None:
    if expire_minutes is None:
        expire_minutes = settings.OTP_EXPIRE_MINUTES
    html_body = _render(TEMPLATE_PATH_PERSONNEL_OTP, OTP_CODE=otp_code, EXPIRE_MINUTES=expire_minutes)
    await _send(to_email, "Your ICMDA verification code", html_body)


async def send_admin_otp_email(to_email: str, otp_code: str, expire_minutes: int = None) -> None:
    if expire_minutes is None:
        expire_minutes = settings.OTP_EXPIRE_MINUTES
    html_body = _render(TEMPLATE_PATH_ADMIN_OTP, OTP_CODE=otp_code, EXPIRE_MINUTES=expire_minutes)
    await _send(to_email, "Your Interagency Admin verification code", html_body)


async def send_national_admin_otp_email(to_email: str, otp_code: str, expire_minutes: int = None) -> None:
    if expire_minutes is None:
        expire_minutes = settings.OTP_EXPIRE_MINUTES
    html_body = _render(TEMPLATE_PATH_NATIONAL_ADMIN_OTP, OTP_CODE=otp_code, EXPIRE_MINUTES=expire_minutes)
    await _send(to_email, "Your National Admin verification code", html_body)


# ---------------------------------------------------------------------------
# Activation emails — approved, NO credentials (password already self-set via invite)
# ---------------------------------------------------------------------------

async def send_personnel_activation_email(to_email: str, full_name: str) -> None:
    html_body = _render(TEMPLATE_PATH_PERSONNEL_ACTIVATION, FULL_NAME=full_name, EMAIL=to_email)
    await _send(to_email, "Your ICMDA account has been activated", html_body)


async def send_admin_activation_email(to_email: str, full_name: str, agency_name: str, region: str) -> None:
    html_body = _render(
        TEMPLATE_PATH_ADMIN_ACTIVATION,
        FULL_NAME=full_name,
        EMAIL=to_email,
        AGENCY_NAME=_display_agency(agency_name),
        REGION=region,
    )
    await _send(to_email, "Your Interagency Admin account has been activated", html_body)


async def send_national_admin_activation_email(to_email: str, full_name: str) -> None:
    html_body = _render(TEMPLATE_PATH_NATIONAL_ADMIN_ACTIVATION, FULL_NAME=full_name, EMAIL=to_email)
    await _send(to_email, "Your National Admin account has been activated", html_body)


# ---------------------------------------------------------------------------
# Reset password — personnel only, triggered by an admin from User Management.
# Sends a temp password; caller is responsible for setting
# force_change_password = True on the personnel record.
# ---------------------------------------------------------------------------

async def send_personnel_reset_password_email(to_email: str, full_name: str, temp_password: str) -> None:
    html_body = _render(
        TEMPLATE_PATH_PERSONNEL_RESET_PASSWORD,
        FULL_NAME=full_name,
        EMAIL=to_email,
        TEMP_PASSWORD=temp_password,
    )
    await _send(to_email, "Your ICMDA password has been reset", html_body)


# ---------------------------------------------------------------------------
# Info updated — personnel only, triggered by an admin from Edit Info.
# No field values in the email itself; the user checks Profile Settings
# in-app to see what changed.
# ---------------------------------------------------------------------------
 
async def send_personnel_info_updated_email(to_email: str, full_name: str) -> None:
    html_body = _render(
        TEMPLATE_PATH_PERSONNEL_INFO_UPDATED,
        FULL_NAME=full_name,
    )
    await _send(to_email, "Your ICMDA account information has been updated", html_body)