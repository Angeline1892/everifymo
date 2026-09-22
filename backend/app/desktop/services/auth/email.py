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
TEMPLATE_PATH_LOCATION_ANOMALY = TEMPLATES_DIR / "location_email_template.html"

AGENCY_DISPLAY_NAMES = {
    "fda_personnel": "FDA",
    "lea_personnel": "LEA-CIDG",
    "fda_admin": "FDA",
    "lea_admin": "LEA-CIDG",
    "FDA": "FDA",
    "LEA-CIDG": "LEA-CIDG",
}

LOCATION_THEMES = {
    "FDA": {
        "system_name": "EVerifyMo · FDA Admin",
        "display_name": "Food and Drug Administration",
        "header_bg": "linear-gradient(135deg, #1f2937 0%, #1B4332 100%)",
        "header_border": "#065f46",
        "badge_bg": "#ecfdf5",
        "badge_text": "#065f46",
        "badge_border": "#a7f3d0",
        "logo_src": "https://raw.githubusercontent.com/everifymo/assets/main/FDA.png",
        "logo_alt": "FDA Logo",
    },
    "LEA": {
        "system_name": "EVerifyMo · LEA Admin",
        "display_name": "PNP Criminal Investigation and Detection Group",
        "header_bg": "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
        "header_border": "#1d4ed8",
        "badge_bg": "#eff6ff",
        "badge_text": "#1e40af",
        "badge_border": "#bfdbfe",
        "logo_src": "https://raw.githubusercontent.com/everifymo/assets/main/pnp-cidg.jpg",
        "logo_alt": "PNP-CIDG Logo",
    },
}

TEMPLATE_PATH_CONVERTED_PRODUCT = Path(__file__).parent / "templates" / "converted_product_email.html"

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


def render_converted_product_email(
    product_name: str,
    previous_classification: str,
    new_classification: str,
    registration_number: str = "-",
    manufacturer: str = "-",
    category: str = "Cosmetics",
    officer_name: str = "FDA Officer",
    officer_position: str = None,
    officer_agency: str = None,
    officer_employee_id: str = None,
    conversion_date: str = None,
    advisory_details: str = None,
    source_url: str = None,
) -> str:
    html = TEMPLATE_PATH_CONVERTED_PRODUCT.read_text(encoding="utf-8")

    # Badges
    registered_badge = '<span style="display:inline-block;padding:6px 14px;font-size:11.5px;font-weight:700;border-radius:20px;font-family:\'Poppins\',Arial,sans-serif;letter-spacing:0.3px;white-space:nowrap;background-color:#ecfdf5;color:#047857;border:1px solid #a7f3d0;">Registered</span>'
    advisory_badge = '<span style="display:inline-block;padding:6px 14px;font-size:11.5px;font-weight:700;border-radius:20px;font-family:\'Poppins\',Arial,sans-serif;letter-spacing:0.3px;white-space:nowrap;background-color:#fef2f2;color:#b91c1c;border:1px solid #fecaca;">Unregistered/Advisory</span>'

    prev_badge = advisory_badge if ("unreg" in previous_classification.lower() or "advis" in previous_classification.lower()) else registered_badge
    new_badge = advisory_badge if ("unreg" in new_classification.lower() or "advis" in new_classification.lower()) else registered_badge

    # Officer Meta
    meta_parts = []
    if officer_position and officer_position != "-":
        meta_parts.append(officer_position)
    if officer_agency and officer_agency != "-":
        meta_parts.append(officer_agency)
    if officer_employee_id and officer_employee_id != "-":
        meta_parts.append(f"ID: {officer_employee_id}")

    officer_meta_html = ""
    if meta_parts:
        officer_meta_html = f'<span style="display:block;font-size:11px;color:#64748b;margin-top:3px;font-weight:400;">{" · ".join(meta_parts)}</span>'

    # Extra rows (advisory details & source url)
    extra_rows = []
    if advisory_details and advisory_details.strip() and advisory_details.strip() != "-":
        extra_rows.append(f'''
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 11px 18px; width: 38%; color: #64748b; font-weight: 600; font-size: 13px; vertical-align: top;">Details / Remarks</td>
            <td style="padding: 11px 18px; width: 62%; color: #1e293b; font-weight: 500; font-size: 12px; line-height: 1.6; vertical-align: top; text-align: right; word-break: break-word;">{advisory_details}</td>
          </tr>
        ''')
    if source_url and source_url.strip() and source_url.strip() != "-":
        extra_rows.append(f'''
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 11px 18px; width: 38%; color: #64748b; font-weight: 600; font-size: 13px; vertical-align: top;">Source Reference</td>
            <td style="padding: 11px 18px; width: 62%; font-size: 12px; vertical-align: top; text-align: right; word-break: break-all;">
              <a href="{source_url}" target="_blank" style="color:#0D9488;text-decoration:underline;">{source_url}</a>
            </td>
          </tr>
        ''')

    extra_rows_html = "".join(extra_rows)

    # Defaults
    if not conversion_date:
        from datetime import datetime
        conversion_date = datetime.now().strftime("%b %d, %Y %I:%M %p")

    # Replace placeholders
    html = html.replace("{{PRODUCT_NAME}}", product_name or "-")
    html = html.replace("{{PREVIOUS_CLASSIFICATION}}", previous_classification or "-")
    html = html.replace("{{NEW_CLASSIFICATION}}", new_classification or "-")
    html = html.replace("{{REGISTRATION_NUMBER}}", registration_number or "-")
    html = html.replace("{{MANUFACTURER}}", manufacturer or "-")
    html = html.replace("{{CATEGORY}}", category or "Cosmetics")
    html = html.replace("{{OFFICER_NAME}}", officer_name or "-")
    html = html.replace("{{OFFICER_META_HTML}}", officer_meta_html)
    html = html.replace("{{CONVERSION_DATE}}", conversion_date)
    html = html.replace("{{PREVIOUS_BADGE_HTML}}", prev_badge)
    html = html.replace("{{NEW_BADGE_HTML}}", new_badge)
    html = html.replace("{{EXTRA_ROWS_HTML}}", extra_rows_html)

    return html


async def send_converted_product_email(
    to_email: str,
    product_name: str,
    previous_classification: str,
    new_classification: str,
    registration_number: str = "-",
    manufacturer: str = "-",
    category: str = "Cosmetics",
    officer_name: str = "FDA Officer",
    officer_position: str = None,
    officer_agency: str = None,
    officer_employee_id: str = None,
    conversion_date: str = None,
    advisory_details: str = None,
    source_url: str = None,
):
    html_body = render_converted_product_email(
        product_name=product_name,
        previous_classification=previous_classification,
        new_classification=new_classification,
        registration_number=registration_number,
        manufacturer=manufacturer,
        category=category,
        officer_name=officer_name,
        officer_position=officer_position,
        officer_agency=officer_agency,
        officer_employee_id=officer_employee_id,
        conversion_date=conversion_date,
        advisory_details=advisory_details,
        source_url=source_url,
    )

    subject = f"Product Classification Notice: {product_name} ({previous_classification} → {new_classification})"

    message = MessageSchema(
        subject=subject,
        recipients=[to_email],
        body=html_body,
        subtype=MessageType.html,
    )

    try:
        fm = FastMail(conf)
        await fm.send_message(message)
        print(f"Successfully sent conversion notice email to {to_email}")
    except Exception as e:
        print(f"Warning: Failed to send conversion email to {to_email}: {e}")


def render_location_anomaly_email(
    agency: str,
    personnel_name: str,
    personnel_email: str,
    login_at: str,
    distance: str,
    workspace_name: str,
    radius_meters: int = 500,
    detection_source: str = "device GPS",
    footer_agency_region: str = "Regional Office",
) -> str:
    agency_key = "LEA" if ("lea" in str(agency).lower() or "cidg" in str(agency).lower()) else "FDA"
    theme = LOCATION_THEMES.get(agency_key, LOCATION_THEMES["FDA"])

    is_ip = "ip" in str(detection_source).lower()
    ip_note_html = ""
    if is_ip:
        ip_note_html = f'<p style="margin: 6px 0 0 0; font-size: 11.5px; font-style: italic; color: {theme["badge_text"]}; opacity: 0.85;">Note: Location is approximate when determined via IP address.</p>'

    html_text = TEMPLATE_PATH_LOCATION_ANOMALY.read_text(encoding="utf-8")
    html_text = html_text.replace("{{HEADER_BG}}", theme["header_bg"])
    html_text = html_text.replace("{{HEADER_BORDER}}", theme["header_border"])
    html_text = html_text.replace("{{SYSTEM_NAME}}", theme["system_name"])
    html_text = html_text.replace("{{DISPLAY_NAME}}", theme["display_name"])
    html_text = html_text.replace("{{BADGE_BG}}", theme["badge_bg"])
    html_text = html_text.replace("{{BADGE_TEXT}}", theme["badge_text"])
    html_text = html_text.replace("{{BADGE_BORDER}}", theme["badge_border"])
    html_text = html_text.replace("{{LOGO_SRC}}", theme["logo_src"])
    html_text = html_text.replace("{{LOGO_ALT}}", theme["logo_alt"])
    html_text = html_text.replace("{{PERSONNEL_NAME}}", html.escape(str(personnel_name)))
    html_text = html_text.replace("{{PERSONNEL_EMAIL}}", html.escape(str(personnel_email)))
    html_text = html_text.replace("{{LOGIN_AT}}", html.escape(str(login_at)))
    html_text = html_text.replace("{{DISTANCE}}", html.escape(str(distance)))
    html_text = html_text.replace("{{WORKSPACE_NAME}}", html.escape(str(workspace_name)))
    html_text = html_text.replace("{{RADIUS_METERS}}", str(radius_meters))
    html_text = html_text.replace("{{DETECTION_SOURCE}}", html.escape(str(detection_source)))
    html_text = html_text.replace("{{FOOTER_AGENCY_REGION}}", html.escape(str(footer_agency_region)))
    html_text = html_text.replace("{{IP_NOTE_HTML}}", ip_note_html)

    return html_text


async def send_location_anomaly_email(
    to_email: str,
    agency: str,
    personnel_name: str,
    personnel_email: str,
    login_at: str,
    distance: str,
    workspace_name: str,
    radius_meters: int = 500,
    detection_source: str = "device GPS",
    footer_agency_region: str = "Regional Office",
) -> None:
    html_body = render_location_anomaly_email(
        agency=agency,
        personnel_name=personnel_name,
        personnel_email=personnel_email,
        login_at=login_at,
        distance=distance,
        workspace_name=workspace_name,
        radius_meters=radius_meters,
        detection_source=detection_source,
        footer_agency_region=footer_agency_region,
    )
    subject = f"Location anomaly detected — {personnel_name}"
    message = MessageSchema(
        subject=subject,
        recipients=[to_email],
        body=html_body,
        subtype=MessageType.html,
    )
    try:
        fm = FastMail(conf)
        await fm.send_message(message)
        print(f"Successfully sent location anomaly alert email to {to_email}")
    except Exception as exc:
        print(f"Warning: Failed to send location anomaly email to {to_email}: {exc}")


