"""OTP Integration Service — client for the external Email OTP API.

The portal does NOT generate, store or verify OTPs. It delegates to the
configured external service (``POST /send-otp``, ``POST /verify-otp``) and only
enforces policy around it: rate limits, attempt caps, expiry and single-use are
handled by the external API. OTP values are never logged or returned by the
portal.

Configuration:
    OTP_API_BASE_URL   base URL of the external Email OTP API
                       (default http://127.0.0.1:8001)
"""

import json
import logging
import os
import threading
import urllib.error
import urllib.request
from collections import deque
from datetime import datetime, timedelta

log = logging.getLogger("otp_integration")

REQUEST_TIMEOUT_SECONDS = 10


def api_base_url() -> str:
    return os.getenv("OTP_API_BASE_URL", "http://127.0.0.1:8001").strip().rstrip("/")


def _post(path: str, payload: dict) -> tuple:
    """POST JSON to the external API.

    Returns ``(http_status, body_dict)``. Network failures / timeouts return
    ``(0, {})``; HTTP errors return the status code and parsed error body. Never
    raises, so callers always get a tuple they can map to a user-facing error.
    """
    url = f"{api_base_url()}{path}"
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(url, data=data, method="POST")
    req.add_header("Content-Type", "application/json")
    req.add_header("Accept", "application/json")
    try:
        with urllib.request.urlopen(req, timeout=REQUEST_TIMEOUT_SECONDS) as resp:
            raw = resp.read().decode("utf-8", "replace")
            try:
                parsed = json.loads(raw) if raw else {}
            except ValueError:
                parsed = {}
            return resp.status, parsed
    except urllib.error.HTTPError as e:
        raw_bytes = e.read()
        raw = raw_bytes.decode("utf-8", "replace") if raw_bytes else ""
        try:
            parsed = json.loads(raw) if raw else {}
        except ValueError:
            parsed = {}
        return e.code, parsed
    except Exception as e:
        log.warning("External OTP API unreachable (%s): %s", path, e)
        return 0, {}


def send_otp(email: str) -> dict:
    """Request an OTP email from the external API.

    Returns ``{"ok": bool, "message": str, "retryable": bool}``.
    """
    status, body = _post("/send-otp", {"email": email})
    if status == 0:
        return {"ok": False,
                "message": "OTP service is unreachable. Please try again later.",
                "retryable": True}
    if 200 <= status < 300:
        return {"ok": True,
                "message": "OTP has been sent to your registered email.",
                "retryable": False}
    return {"ok": False,
            "message": body.get("detail", "Failed to send OTP. Please try again later."),
            "retryable": True}


def verify_otp(email: str, otp: str) -> dict:
    """Verify an OTP with the external API.

    Returns ``{"ok": bool, "message": str, "retryable": bool}``. ``retryable``
    is True only for transport-level failures, so the portal can decide whether
    to count the attempt.
    """
    status, body = _post("/verify-otp", {"email": email, "otp": otp})
    if status == 0:
        return {"ok": False,
                "message": "OTP service is unreachable. Please try again later.",
                "retryable": True}
    if 200 <= status < 300:
        return {"ok": True, "message": "OTP verified successfully", "retryable": False}
    return {"ok": False,
            "message": body.get("detail", "Invalid OTP."),
            "retryable": False}


# ── Portal-side policy for the external Email OTP API ────────────────────────
# The external service enforces expiry and single-use (it deletes an OTP after a
# successful verify) but does NOT rate-limit sends, gate resends, or cap failed
# attempts. The portal enforces those here, in memory, keyed by faculty id, so no
# OTP is ever generated or stored by the portal.

FLOW_EXPIRY_MINUTES = 5            # matches the external API's OTP lifetime
RESEND_COOLDOWN_SECONDS = 60       # min wait between sends
MAX_REQUESTS_PER_WINDOW = 3        # sends allowed per faculty per window
REQUEST_WINDOW_MINUTES = 10
MAX_ATTEMPTS = 5                   # failed verify attempts per OTP

# In-memory per-faculty flow state. Survives until process restart, which is
# acceptable: the external API's OTP store is also in memory.
_flows = {}
_flows_lock = threading.Lock()


def _flow_key(namespace: str, faculty_id) -> str:
    return f"{namespace}:{faculty_id}"


def _prune_flows(now: datetime) -> None:
    cutoff = now - timedelta(minutes=REQUEST_WINDOW_MINUTES + FLOW_EXPIRY_MINUTES + 1)
    for key in [k for k, v in _flows.items() if v.get("last_activity", now) < cutoff]:
        _flows.pop(key, None)


def _mask_email(email: str) -> str:
    if not email or "@" not in email:
        return email or ""
    local, _, domain = email.partition("@")
    if len(local) <= 2:
        masked = local[0] + "*" * max(1, len(local) - 1)
    else:
        masked = local[:2] + "*" * (len(local) - 2)
    return f"{masked}@{domain}"


def begin_flow(namespace: str, faculty_id, email: str) -> dict:
    """Start (or restart) an OTP flow for a faculty member.

    ``namespace`` separates independent flows (e.g. change-password vs
    forgot-password) so they do not share rate-limit or attempt state.
    Enforces the per-window send limit and the resend cooldown. Returns
    ``{"ok": bool, "message": str, "retry_after": int, "masked_email": str}``.
    """
    now = datetime.now()
    email = (email or "").strip().lower()
    with _flows_lock:
        _prune_flows(now)
        key = _flow_key(namespace, faculty_id)
        flow = _flows.get(key)
        last = flow["last_sent"] if flow else None
        sends = flow["sends"] if flow else deque()

        # Resend cooldown
        if last is not None:
            wait = RESEND_COOLDOWN_SECONDS - (now - last).total_seconds()
            if wait > 0:
                return {"ok": False,
                        "message": f"Please wait {int(wait)} seconds before requesting another OTP.",
                        "retry_after": int(wait),
                        "masked_email": _mask_email(email)}

        # Window send limit
        cutoff = now - timedelta(minutes=REQUEST_WINDOW_MINUTES)
        while sends and sends[0] < cutoff:
            sends.popleft()
        if len(sends) >= MAX_REQUESTS_PER_WINDOW:
            return {"ok": False,
                    "message": "Too many OTP requests. Please try again after some time.",
                    "retry_after": 0,
                    "masked_email": _mask_email(email)}

        sends.append(now)
        _flows[key] = {
            "email": email,
            "last_sent": now,
            "last_activity": now,
            "sends": sends,
            "attempts": 0,
            "verified": False,
            "verified_at": None,
        }
        return {"ok": True, "message": "OK", "retry_after": 0,
                "masked_email": _mask_email(email)}


def get_flow(namespace: str, faculty_id):
    """Return the current flow dict (or None). Safe to mutate via callers."""
    with _flows_lock:
        _prune_flows(datetime.now())
        return _flows.get(_flow_key(namespace, faculty_id))


def set_flow(namespace: str, faculty_id, flow: dict) -> None:
    with _flows_lock:
        _flows[_flow_key(namespace, faculty_id)] = flow


def end_flow(namespace: str, faculty_id) -> None:
    with _flows_lock:
        _flows.pop(_flow_key(namespace, faculty_id), None)


def begin_change_password_flow(faculty_id: int, email: str) -> dict:
    return begin_flow("change_password", faculty_id, email)


def get_change_password_flow(faculty_id: int):
    return get_flow("change_password", faculty_id)


def set_change_password_flow(faculty_id: int, flow: dict) -> None:
    set_flow("change_password", faculty_id, flow)


def end_change_password_flow(faculty_id: int) -> None:
    end_flow("change_password", faculty_id)


def begin_forgot_password_flow(faculty_id, email: str) -> dict:
    return begin_flow("forgot_password", faculty_id, email)


def get_forgot_password_flow(faculty_id):
    return get_flow("forgot_password", faculty_id)


def set_forgot_password_flow(faculty_id, flow: dict) -> None:
    set_flow("forgot_password", faculty_id, flow)


def end_forgot_password_flow(faculty_id) -> None:
    end_flow("forgot_password", faculty_id)
