"""Notification service facade.

The actual delivery logic lives in :mod:`app.notifications`, which discovers
an available provider per channel from environment configuration (SMTP for
email; Twilio / MSG91 / Fast2SMS / AWS SNS / generic HTTP for SMS). This
module keeps the legacy public functions so existing callers (routers) stay
unchanged while new gateways are added purely by configuration.

OTP delivery: the portal uses Mobile OTP (SMS) via the configured gateway.
OTP values are never returned in API responses and never logged — they are
delivered only to the registered mobile number.
"""

import logging

from app.notifications import (
    email_configured as _email_configured,
    sms_configured as _sms_configured,
    send_otp_via_provider,
    send_message_via_provider,
    available_channels,
)
from app.notifications.email.templates import (
    otp_email_html,
    otp_email_text,
    password_changed_html,
    password_reset_html,
    force_reset_html,
    account_unlocked_html,
)

log = logging.getLogger("notifier")

APP_NAME = "NIET Research Analytics Portal"


# ── Configuration introspection ─────────────────────────────────────────────
def smtp_configured() -> bool:
    return _email_configured()


def sms_configured() -> bool:
    return _sms_configured()


def configured_channels() -> list:
    return available_channels()


# ── Contact masking ─────────────────────────────────────────────────────────
def _mask_email(email: str) -> str:
    if not email or "@" not in email:
        return email or ""
    local, _, domain = email.partition("@")
    if len(local) <= 2:
        masked_local = local[0] + "*" * max(1, len(local) - 1)
    else:
        masked_local = local[:2] + "*" * (len(local) - 2)
    return f"{masked_local}@{domain}"


def _mask_mobile(mobile: str) -> str:
    if not mobile:
        return ""
    if len(mobile) <= 4:
        return "*" * len(mobile)
    return mobile[:2] + "*" * (len(mobile) - 4) + mobile[-2:]


def mask_contact(value: str, method: str) -> str:
    return _mask_email(value) if method == "email" else _mask_mobile(value)


# ── OTP delivery ────────────────────────────────────────────────────────────
def otp_email(to_email: str, otp: str, purpose: str, expiry_minutes: int = 5) -> bool:
    """Send an OTP email through the configured email provider."""
    return send_otp_via_provider("email", to_email, otp, purpose, expiry_minutes)


def otp_sms(mobile: str, otp: str, expiry_minutes: int = 5) -> bool:
    """Send an OTP SMS through the configured SMS provider."""
    return send_otp_via_provider("mobile", mobile, otp, "account verification", expiry_minutes)


# ── Generic send helpers ────────────────────────────────────────────────────
def send_email(to_email: str, subject: str, html_body: str, text_body: str = "") -> bool:
    from app.notifications.base import get_email_provider
    provider = get_email_provider()
    if provider is None:
        log.info("[NO EMAIL PROVIDER] To: %s | Subject: %s | %s",
                 to_email, subject, text_body or html_body)
        return False
    return provider.send(to_email, subject, html_body, text_body)


def send_sms(mobile: str, message: str) -> bool:
    return send_message_via_provider("mobile", mobile, message)


# ── Security notification emails (event-driven, not OTP) ────────────────────
def password_changed_email(to_email: str, meta: dict) -> bool:
    return send_email(
        to_email,
        "Password Successfully Changed",
        password_changed_html(meta),
        "Your password has been changed successfully.",
    )


def password_reset_email(to_email: str, meta: dict) -> bool:
    return send_email(
        to_email,
        "Password Reset Successful",
        password_reset_html(meta),
        "Your password has been reset successfully.",
    )


def force_reset_email(to_email: str, meta: dict) -> bool:
    return send_email(
        to_email,
        "Security: Password Reset Required",
        force_reset_html(meta),
        "An administrator has required a password reset.",
    )


def account_unlocked_email(to_email: str, meta: dict) -> bool:
    return send_email(
        to_email,
        "Account Unlocked",
        account_unlocked_html(meta),
        "Your account has been unlocked.",
    )
