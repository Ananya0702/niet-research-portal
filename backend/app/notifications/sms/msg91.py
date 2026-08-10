"""MSG91 SMS provider (legacy HTTP API)."""

import logging
import urllib.parse
import urllib.request

from ..base import SmsProvider, _env

log = logging.getLogger("notifications.msg91")

API_URL = "https://api.msg91.com/api/sendhttp.php"


class Msg91SmsProvider(SmsProvider):
    name = "msg91"

    def is_configured(self) -> bool:
        return bool(_env("MSG91_AUTH_KEY") and _env("MSG91_SENDER_ID"))

    def send(self, to_mobile: str, message: str) -> bool:
        auth_key = _env("MSG91_AUTH_KEY")
        sender = _env("MSG91_SENDER_ID")
        if not (auth_key and sender):
            return False
        try:
            params = {
                "authkey": auth_key,
                "mobiles": to_mobile,
                "message": message,
                "sender": sender,
                "route": _env("MSG91_ROUTE", default="4"),
                "country": _env("MSG91_COUNTRY", default="91"),
            }
            url = f"{API_URL}?{urllib.parse.urlencode(params)}"
            with urllib.request.urlopen(url, timeout=15) as resp:
                return 200 <= resp.status < 300
        except Exception as e:
            log.error("MSG91 send failed: %s", e)
            return False
