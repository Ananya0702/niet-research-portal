"""Provider-independent OTP delivery abstraction.

This package defines the channel provider interfaces (email / SMS) and a
registry that picks the first configured provider for each channel. The
authentication business logic (routers/security.py, security_otp.py) never
talks to a concrete gateway — it asks the registry for a provider, so new
email or SMS services can be added purely by configuration.
"""

from .base import (
    get_email_provider,
    get_sms_provider,
    email_configured,
    sms_configured,
    available_channels,
    send_otp_via_provider,
    send_message_via_provider,
)

__all__ = [
    "get_email_provider",
    "get_sms_provider",
    "email_configured",
    "sms_configured",
    "available_channels",
    "send_otp_via_provider",
    "send_message_via_provider",
]
