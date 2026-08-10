"""Fast2SMS provider."""

import json
import logging
import urllib.request

from ..base import SmsProvider, _env

log = logging.getLogger("notifications.fast2sms")

API_URL = "https://www.fast2sms.com/dev/bulkV2"


class Fast2SmsProvider(SmsProvider):
    name = "fast2sms"

    def is_configured(self) -> bool:
        return bool(_env("FAST2SMS_API_KEY"))

    def send(self, to_mobile: str, message: str) -> bool:
        api_key = _env("FAST2SMS_API_KEY")
        if not api_key:
            return False
        try:
            payload = json.dumps({
                "route": _env("FAST2SMS_ROUTE", default="q"),
                "message": message,
                "language": _env("FAST2SMS_LANGUAGE", default="english"),
                "flash": 0,
                "numbers": to_mobile,
            }).encode("utf-8")
            req = urllib.request.Request(API_URL, data=payload, method="POST")
            req.add_header("authorization", api_key)
            req.add_header("Content-Type", "application/json")
            with urllib.request.urlopen(req, timeout=15) as resp:
                return 200 <= resp.status < 300
        except Exception as e:
            log.error("Fast2SMS send failed: %s", e)
            return False
