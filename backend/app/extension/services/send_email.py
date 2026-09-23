# backend/app/extension/services/send_email.py
from pathlib import Path
from fastapi_mail import ConnectionConfig, FastMail, MessageSchema, MessageType
from app.core.config import settings

TEMPLATE_PATH = Path(__file__).parent / "templates" / "otp_email.html"
LOGO_PATH = Path(__file__).parent.parent.parent.parent.parent / "extension" / "assets" / "images" / "extension_icon.png"  # adjust if needed, file path for logo icon

extension_mail_conf = ConnectionConfig(
    MAIL_USERNAME=settings.MAIL_EXTENSION_USERNAME, 
    MAIL_PASSWORD=settings.MAIL_EXTENSION_PASSWORD,
    MAIL_FROM=settings.MAIL_EXTENSION_FROM,
    MAIL_FROM_NAME=settings.MAIL_EXTENSION_FROM_NAME,
    MAIL_PORT=settings.MAIL_PORT,
    MAIL_SERVER=settings.MAIL_HOST,

    MAIL_STARTTLS=True,
    MAIL_SSL_TLS=False,
    USE_CREDENTIALS=True,
)

DEFAULT_PURPOSE_TEXT = "Enter this code to verify your email and continue."
RESET_PASSWORD_PURPOSE_TEXT = "Enter this code to verify your identity and reset your password."

def render_otp_email(otp_code: str, expire_minutes: int, purpose_text: str = DEFAULT_PURPOSE_TEXT) -> str:
    html = TEMPLATE_PATH.read_text(encoding="utf-8")
    html = html.replace("{{OTP_CODE}}", otp_code)
    html = html.replace("{{EXPIRE_MINUTES}}", str(expire_minutes))
    html = html.replace("{{PURPOSE_TEXT}}", purpose_text)
    return html

async def send_otp_email(to_email: str, otp_code: str, expire_minutes: int = None, purpose_text: str = DEFAULT_PURPOSE_TEXT):
    if expire_minutes is None:
        expire_minutes = settings.OTP_EXTENSION_MIN_EXPIRE

    html_body = render_otp_email(otp_code, expire_minutes, purpose_text)

    message = MessageSchema(
        subject="Your verification code",
        recipients=[to_email],
        body=html_body,
        subtype=MessageType.html,
        attachments=[
            {
                "file": str(LOGO_PATH),
                "headers": {
                    "Content-ID": "<extension_logo>",
                    "Content-Disposition": "inline; filename=\"extension_icon.png\"",
                },
                "mime_type": "image",
                "mime_subtype": "png",
            }
        ],
    )
    mail = FastMail(extension_mail_conf)

    await mail.send_message(message)