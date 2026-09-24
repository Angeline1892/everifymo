from pathlib import Path
from fastapi_mail import ConnectionConfig, FastMail, MessageSchema, MessageType
from app.core.config import settings

TEMPLATE_PATH = Path(__file__).parent.parent / "templates" / "update_status_email.html"

desktop_mail_conf = ConnectionConfig(
    MAIL_USERNAME=settings.MAIL_USERNAME,
    MAIL_PASSWORD=settings.MAIL_PASSWORD,
    MAIL_FROM=settings.MAIL_EXTENSION_FROM,
    MAIL_FROM_NAME=settings.MAIL_FROM_NAME,
    MAIL_PORT=settings.MAIL_PORT,
    MAIL_SERVER=settings.MAIL_HOST,
    MAIL_STARTTLS=True,
    MAIL_SSL_TLS=False,
    USE_CREDENTIALS=True,
)

STATUS_STYLE_MAP = {
    "completed": "",             
    "under_review": "is-warning",
    "takedown_requested": "is-warning",
    "dismissed": "is-critical",
}

def get_status_modifier_class(status_code: str) -> str:
    return STATUS_STYLE_MAP.get(status_code, "")

def render_status_update_email(
    product_title: str,
    case_reference: str,
    new_status_label: str,
    new_status_code: str,
    change_note: str | None,
) -> str:
    html = TEMPLATE_PATH.read_text(encoding="utf-8")
    html = html.replace("{{PRODUCT_TITLE}}", product_title)
    html = html.replace("{{CASE_REFERENCE}}", case_reference)
    html = html.replace("{{NEW_STATUS_LABEL}}", new_status_label)
    html = html.replace("{{STATUS_MODIFIER_CLASS}}", get_status_modifier_class(new_status_code))
    note_block = f"<p>{change_note}</p>" if change_note else ""
    html = html.replace("{{CHANGE_NOTE_BLOCK}}", note_block)
    return html

async def send_status_update_email(
    to_email: str,
    product_title: str,
    case_reference: str,
    new_status_label: str,
    new_status_code: str,
    change_note: str | None = None,
):
    html_body = render_status_update_email(
        product_title, case_reference, new_status_label, new_status_code, change_note
    )

    message = MessageSchema(
        subject="Update on your complaint",
        recipients=[to_email],
        body=html_body,
        subtype=MessageType.html,
    )
    mail = FastMail(desktop_mail_conf)
    await mail.send_message(message)