from pathlib import Path
from fastapi_mail import FastMail, MessageSchema, ConnectionConfig, MessageType

from app.core.config import settings

TEMPLATE_PATH = Path(__file__).parent / "templates" / "invite_email.html"
TEMPLATE_PATH_SUPERADMIN = Path(__file__).parent / "templates" / "superadmin_otp_email.html"
TEMPLATE_PATH_PERSONNEL = Path(__file__).parent / "templates" / "personnel_otp_email.html"
TEMPLATE_PATH_ACTIVATION = Path(__file__).parent / "templates" / "user_activation_email.html"
TEMPLATE_PATH_SUPERADMIN_INVITE = Path(__file__).parent / "templates" / "superadmin_invite_email.html"
TEMPLATE_PATH_SUPERADMIN_ACTIVATION = Path(__file__).parent / "templates" / "superadmin_activation_email.html"
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


def render_invite_email(agency_name: str, deep_link: str) -> str:
    html = TEMPLATE_PATH.read_text(encoding="utf-8")
    html = html.replace("{{AGENCY_NAME}}", agency_name)
    html = html.replace("{{DEEP_LINK}}", deep_link)
    return html


async def send_invite_email(to_email: str, agency_name: str, token: str):
    display_name = {
        "fda_personnel": "FDA",
        "lea_personnel": "LEA-CIDG",
        "FDA": "FDA",
        "LEA-CIDG": "LEA-CIDG"
    }.get(agency_name, agency_name)

    #deep_link = f"everifymo://complete-registration?token={token}"
    deep_link = f"https://everifyapp.netlify.app/?token={token}"
    html_body = render_invite_email(display_name, deep_link)

    message = MessageSchema(
        subject="You're invited to register — ICMDA",
        recipients=[to_email],
        body=html_body,
        subtype=MessageType.html,
    )

    fm = FastMail(conf)
    await fm.send_message(message)
    

def render_superadmin_invite_email(deep_link: str) -> str:
    html = TEMPLATE_PATH_SUPERADMIN_INVITE.read_text(encoding="utf-8")
    html = html.replace("{{DEEP_LINK}}", deep_link)
    return html


async def send_superadmin_invite_email(to_email: str, token: str):
    #deep_link = f"everifymo://complete-registration?token={token}"
    deep_link = f"https://everifyapp.netlify.app/?token={token}" 
    html_body = render_superadmin_invite_email(deep_link)

    message = MessageSchema(
        subject="You're invited as a Superadmin — ICMDA",
        recipients=[to_email],
        body=html_body,
        subtype=MessageType.html,
    )

    fm = FastMail(conf)
    await fm.send_message(message)


def render_superadmin_otp_email(otp_code: str, expire_minutes: int) -> str:
    html = TEMPLATE_PATH_SUPERADMIN.read_text(encoding="utf-8")
    html = html.replace("{{OTP_CODE}}", otp_code)
    html = html.replace("{{EXPIRE_MINUTES}}", str(expire_minutes))
    return html


async def send_superadmin_otp_email(to_email: str, otp_code: str, expire_minutes: int = None):
    if expire_minutes is None:
        from app.core.config import settings
        expire_minutes = settings.OTP_EXPIRE_MINUTES

    html_body = render_superadmin_otp_email(otp_code, expire_minutes)

    message = MessageSchema(
        subject="Your Superadmin verification code",
        recipients=[to_email],
        body=html_body,
        subtype=MessageType.html,
    )

    fm = FastMail(conf)
    await fm.send_message(message)


def render_personnel_otp_email(otp_code: str, expire_minutes: int) -> str:
    html = TEMPLATE_PATH_PERSONNEL.read_text(encoding="utf-8")
    html = html.replace("{{OTP_CODE}}", otp_code)
    html = html.replace("{{EXPIRE_MINUTES}}", str(expire_minutes))
    return html


async def send_personnel_otp_email(to_email: str, otp_code: str, expire_minutes: int = None):
    if expire_minutes is None:
        expire_minutes = settings.OTP_EXPIRE_MINUTES

    html_body = render_personnel_otp_email(otp_code, expire_minutes)

    message = MessageSchema(
        subject="Your ICMDA verification code",
        recipients=[to_email],
        body=html_body,
        subtype=MessageType.html,
    )

    fm = FastMail(conf)
    await fm.send_message(message)


def render_activation_email(full_name: str, email: str, temp_password: str) -> str:
    html = TEMPLATE_PATH_ACTIVATION.read_text(encoding="utf-8")
    html = html.replace("{{FULL_NAME}}", full_name)
    html = html.replace("{{EMAIL}}", email)
    html = html.replace("{{TEMP_PASSWORD}}", temp_password)
    return html


async def send_activation_email(to_email: str, full_name: str, temp_password: str):
    html_body = render_activation_email(full_name, to_email, temp_password)

    message = MessageSchema(
        subject="Your ICMDA account has been activated",
        recipients=[to_email],
        body=html_body,
        subtype=MessageType.html,
    )

    fm = FastMail(conf)
    await fm.send_message(message)




def render_superadmin_activation_email(email: str) -> str:
    html = TEMPLATE_PATH_SUPERADMIN_ACTIVATION.read_text(encoding="utf-8")
    html = html.replace("{{EMAIL}}", email)
    return html


async def send_superadmin_activation_email(to_email: str):
    html_body = render_superadmin_activation_email(to_email)

    message = MessageSchema(
        subject="Your ICMDA Superadmin account is now active",
        recipients=[to_email],
        body=html_body,
        subtype=MessageType.html,
    )

    fm = FastMail(conf)
    await fm.send_message(message)


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