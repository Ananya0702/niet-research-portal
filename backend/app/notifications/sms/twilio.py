"""Twilio SMS provider."""

import base64
import logging
import urllib.parse
import urllib.request

from ..base import SmsProvider, _env

log = logging.getLogger("notifications.twilio")

API_BASE = "https://api.twilio.com/2010-04-01/Accounts"


class TwilioSmsProvider(SmsProvider):
    name = "twilio"

    def is_configured(self) -> bool:
        return bool(
            _env("TWILIO_ACCOUNT_SID")
            and _env("TWILIO_AUTH_TOKEN")
            and _env("TWILIO_FROM")
        )

    def send(self, to_mobile: str, message: str) -> bool:
        sid = _env("TWILIO_ACCOUNT_SID")
        token = _env("TWILIO_AUTH_TOKEN")
        from_number = _env("TWILIO_FROM")
        if not (sid and token and from_number):
            return False
        try:
            data = urllib.parse.urlencode({
                "To": to_mobile,
                "From": from_number,
                "Body": message,
            }).encode("utf-8")
            req = urllib.request.Request(f"{API_BASE}/{sid}/Messages.json", data=data)
            auth = base64.b64encode(f"{sid}:{token}".encode()).decode("ascii")
            req.add_header("Authorization", f"Basic {auth}")
            req.add_header("Content-Type", "application/x-www-form-urlencoded")
            with urllib.request.urlopen(req, timeout=15) as resp:
                return 200 <= resp.status < 300
        except Exception as e:
            log.error("Twilio send failed: %s", e)
            return False
