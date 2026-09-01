from fastapi_mail import ConnectionConfig, FastMail, MessageSchema, MessageType
from app.core.config import settings

def send_transactional_email(to: str, subject: str, html_body: str) -> None:
    """
    Sends a single transactional email (OTP, password reset, notifications).
    Replace this with your existing email-sending implementation, keeping
    the same signature so callers don't need to change.
    """
    raise NotImplementedError("Wire this up to your existing mail sender")