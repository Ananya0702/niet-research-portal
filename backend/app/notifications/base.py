"""Channel provider base classes and the provider registry.

Providers are discovered by environment configuration. Adding a new SMS
gateway is a matter of implementing ``SmsProvider`` and registering it here —
no authentication code changes.
"""

import logging
import os
from abc import ABC, abstractmethod

log = logging.getLogger("notifications")


def _env(*names, default=""):
    for n in names:
        v = os.getenv(n)
        if v:
            return v
    return default


class EmailProvider(ABC):
    """Interface every email channel must implement."""

    name = "email"

    @abstractmethod
    def is_configured(self) -> bool:
        """Return True when this provider can send email right now."""

    @abstractmethod
    def send(self, to_email: str, subject: str, html_body: str,
             text_body: str = "") -> bool:
        """Send an email. Returns True if sent/queued."""


class SmsProvider(ABC):
    """Interface every SMS gateway must implement."""

    name = "sms"

    @abstractmethod
    def is_configured(self) -> bool:
        """Return True when this provider can send SMS right now."""

    @abstractmethod
    def send(self, to_mobile: str, message: str) -> bool:
        """Send an SMS. Returns True if sent/queued."""


class ProviderRegistry:
    """Holds one provider per channel, chosen from configuration."""

    def __init__(self):
        self.email_provider = None
        self.sms_provider = None
        self._discover()

    def _discover(self):
        from .email.smtp import SmtpEmailProvider
        from .sms.generic_http import GenericHttpSmsProvider
        from .sms.twilio import TwilioSmsProvider
        from .sms.msg91 import Msg91SmsProvider
        from .sms.fast2sms import Fast2SmsProvider
        from .sms.aws_sns import AwsSnsSmsProvider

        # Email channels — first configured wins.
        for provider in (SmtpEmailProvider(),):
            if provider.is_configured():
                self.email_provider = provider
                log.info("Email provider: %s", provider.__class__.__name__)
                break

        # SMS channels — first configured wins.
        for provider in (
            TwilioSmsProvider(),
            Msg91SmsProvider(),
            Fast2SmsProvider(),
            AwsSnsSmsProvider(),
            GenericHttpSmsProvider(),
        ):
            if provider.is_configured():
                self.sms_provider = provider
                log.info("SMS provider: %s", provider.__class__.__name__)
                break

    def available_channels(self) -> list:
        channels = []
        if self.email_provider:
            channels.append("email")
        if self.sms_provider:
            channels.append("mobile")
        return channels


_registry = None


def get_registry() -> ProviderRegistry:
    global _registry
    if _registry is None:
        _registry = ProviderRegistry()
    return _registry


def get_email_provider():
    return get_registry().email_provider


def get_sms_provider():
    return get_registry().sms_provider


def email_configured() -> bool:
    return get_email_provider() is not None


def sms_configured() -> bool:
    return get_sms_provider() is not None


def available_channels() -> list:
    return get_registry().available_channels()


def send_otp_via_provider(method: str, to: str, otp: str, purpose: str,
                          expiry_minutes: int = 5) -> bool:
    """Deliver an OTP over the configured provider for ``method``.

    ``method`` is ``"email"`` or ``"mobile"``. Returns True only if a provider
    was configured AND the send succeeded.
    """
    if method == "email":
        provider = get_email_provider()
        if provider is None:
            log.warning("[EMAIL DELIVERY UNCONFIGURED] OTP for %s (%s) could not be delivered", to, purpose)
            return False
        from .email.templates import otp_email_html, otp_email_text
        return provider.send(
            to,
            "Your NIET Research Portal OTP",
            otp_email_html(otp, purpose, expiry_minutes),
            otp_email_text(otp, expiry_minutes),
        )

    provider = get_sms_provider()
    if provider is None:
        log.warning("[SMS DELIVERY UNCONFIGURED] OTP for %s could not be delivered", to)
        return False
    message = (
        f"Your NIET Research Portal verification code is {otp}.\n"
        f"This OTP is valid for {expiry_minutes} minutes.\n"
        f"Do not share this OTP with anyone."
    )
    return provider.send(to, message)


def send_message_via_provider(method: str, to: str, message: str) -> bool:
    """Send a free-form notification (not an OTP) over the configured channel."""
    if method == "email":
        provider = get_email_provider()
        if provider is None:
            return False
        return provider.send(to, "NIET Research Portal", message, message)
    provider = get_sms_provider()
    if provider is None:
        return False
    return provider.send(to, message)
