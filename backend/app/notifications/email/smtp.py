"""SMTP email provider — the reference EmailProvider implementation."""

import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from ..base import EmailProvider, _env

log = logging.getLogger("notifications.smtp")

APP_NAME = "NIET Research Analytics Portal"


class SmtpEmailProvider(EmailProvider):
    name = "smtp"

    def is_configured(self) -> bool:
        return bool(_env("SMTP_USER", "EMAIL_ADDRESS") and
                    _env("SMTP_PASSWORD", "EMAIL_APP_PASSWORD") and
                    _env("SMTP_FROM", "SMTP_USER", "EMAIL_ADDRESS"))

    def send(self, to_email: str, subject: str, html_body: str,
             text_body: str = "") -> bool:
        host = _env("SMTP_HOST", default="smtp.gmail.com")
        try:
            port = int(_env("SMTP_PORT", default="587"))
            user = _env("SMTP_USER", "EMAIL_ADDRESS")
            password = _env("SMTP_PASSWORD", "EMAIL_APP_PASSWORD")
            from_addr = _env("SMTP_FROM", "SMTP_USER", "EMAIL_ADDRESS")
            if not user or not password or not from_addr:
                log.error("Email provider is not configured: set SMTP_USER, SMTP_PASSWORD, and SMTP_FROM")
                return False
            from_name = _env("SMTP_FROM_NAME", default=APP_NAME)

            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = f"{from_name} <{from_addr}>"
            msg["To"] = to_email
            if text_body:
                msg.attach(MIMEText(text_body, "plain"))
            msg.attach(MIMEText(html_body, "html"))

            with smtplib.SMTP(host, port, timeout=20) as server:
                server.ehlo()
                if _env("SMTP_TLS", default="1") != "0":
                    server.starttls()
                    server.ehlo()
                if user:
                    server.login(user, password)
                server.sendmail(from_addr, [to_email], msg.as_string())
            return True
        except Exception as e:
            log.error("Email send failed: %s", e)
            return False
