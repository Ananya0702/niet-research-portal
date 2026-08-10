"""Generic HTTP SMS provider.

Sends a GET/POST to a configured URL (e.g. any REST SMS gateway). This is the
catch-all provider so unknown/legacy gateways work without writing code.
"""

import logging
import urllib.parse
import urllib.request

from ..base import SmsProvider, _env

log = logging.getLogger("notifications.generic_http")


class GenericHttpSmsProvider(SmsProvider):
    name = "generic_http"

    def is_configured(self) -> bool:
        return bool(_env("SMS_GATEWAY_URL"))

    def send(self, to_mobile: str, message: str) -> bool:
        url = _env("SMS_GATEWAY_URL")
        if not url:
            log.warning("[SMS DELIVERY UNCONFIGURED] Message for %s could not be delivered", to_mobile)
            return False
        try:
            params = {
                "to": to_mobile,
                "message": message,
                **self._extra(),
            }
            full = f"{url}?{urllib.parse.urlencode(params)}" if "?" not in url \
                else f"{url}&{urllib.parse.urlencode(params)}"
            urllib.request.urlopen(full, timeout=10).read()
            return True
        except Exception as e:
            log.error("SMS send failed: %s", e)
            return False

    def _extra(self):
        extra = {}
        for k, v in {
            "SMS_API_KEY": "api_key",
            "SMS_SENDER": "sender",
        }.items():
            val = _env(k)
            if val:
                extra[v] = val
        return extra
