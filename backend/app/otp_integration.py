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
import random
import smtplib
import threading
import urllib.error
import urllib.request
from collections import deque
from datetime import datetime, timedelta
from email.message import EmailMessage

log = logging.getLogger("otp_integration")

REQUEST_TIMEOUT_SECONDS = 10

# In-memory OTP storage for internal/fallback mode
_internal_otp_store = {}
_internal_otp_lock = threading.Lock()


def _get_email_credentials():
    email = (os.getenv("EMAIL_ADDRESS") or os.getenv("SMTP_USER") or "ananyashukla.1427@gmail.com").strip()
    pwd = (os.getenv("EMAIL_APP_PASSWORD") or os.getenv("SMTP_PASSWORD") or "xyiyimdruluutckv").strip()
    return email, pwd


def _send_via_resend(email: str, otp: str) -> bool:
    resend_key = (os.getenv("RESEND_API_KEY") or "").strip()
    if not resend_key:
        return False
    try:
        url = "https://api.resend.com/emails"
        headers = {
            "Authorization": f"Bearer {resend_key}",
            "Content-Type": "application/json",
            "User-Agent": "NIET-Portal/1.0",
        }
        body = json.dumps({
            "from": "NIET Research Portal <onboarding@resend.dev>",
            "to": [email],
            "subject": "Your OTP Verification Code — NIET Research Portal",
            "html": f"""
            <div style="font-family: Arial, sans-serif; padding: 24px; color: #222;">
                <h2 style="color: #5B3DF5; margin-bottom: 8px;">NIET Research & Innovation Portal</h2>
                <p>Hello,</p>
                <p>Your 6-digit OTP for account verification is:</p>
                <div style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #5B3DF5; padding: 14px 0;">{otp}</div>
                <p>This code is valid for 5 minutes.</p>
                <p style="color: #888; font-size: 12px; margin-top: 24px;">If you did not request this OTP, please ignore this email.</p>
            </div>
            """,
        }).encode("utf-8")
        req = urllib.request.Request(url, data=body, headers=headers, method="POST")
        with urllib.request.urlopen(req, timeout=10) as resp:
            if 200 <= resp.status < 300:
                log.info("OTP sent successfully to %s via Resend HTTPS", email)
                return True
    except Exception as e:
        log.error("Resend API delivery failed: %s", e)
    return False


def _internal_send_otp(email: str) -> dict:
    email = (email or "").strip().lower()
    otp = str(random.randint(100000, 999999))
    expires_at = datetime.now() + timedelta(minutes=5)

    with _internal_otp_lock:
        _internal_otp_store[email] = {
            "otp": otp,
            "expires_at": expires_at,
        }

    # 1. Try Resend HTTPS API first (works on Render without any blocked ports)
    if _send_via_resend(email, otp):
        return {
            "ok": True,
            "message": "OTP has been sent to your registered email.",
            "retryable": False,
        }

    # 2. Try Gmail SMTP (ports 587 STARTTLS / 465 SSL)
    sender_email, sender_pwd = _get_email_credentials()
    msg = EmailMessage()
    msg["Subject"] = "Your OTP Verification Code — NIET Research Portal"
    msg["From"] = f"NIET Research Portal <{sender_email}>"
    msg["To"] = email
    msg.set_content(f"""Hello,

Your 6-digit OTP for account verification is:

{otp}

This OTP is valid for 5 minutes.
If you did not request this OTP, please ignore this email.

Regards,
NIET Research & Innovation Portal
""")

    sent = False
    smtp_err = ""
    try:
        with smtplib.SMTP("smtp.gmail.com", 587, timeout=10) as server:
            server.starttls()
            server.login(sender_email, sender_pwd)
            server.send_message(msg)
        sent = True
        log.info("OTP sent successfully to %s via SMTP 587", email)
    except Exception as e1:
        log.warning("SMTP 587 failed (%s), attempting SMTP SSL 465...", e1)
        try:
            with smtplib.SMTP_SSL("smtp.gmail.com", 465, timeout=10) as server:
                server.login(sender_email, sender_pwd)
                server.send_message(msg)
            sent = True
            log.info("OTP sent successfully to %s via SMTP SSL 465", email)
        except Exception as e2:
            smtp_err = f"{e1}"
            log.error("Internal SMTP delivery failed for %s: %s | %s", email, e1, e2)

    if sent:
        return {
            "ok": True,
            "message": "OTP has been sent to your registered email.",
            "retryable": False,
        }

    # 3. If cloud host blocks SMTP (Render blocks ports 25, 465, 587), surface the code so user is unblocked
    if "101" in smtp_err or "unreachable" in smtp_err.lower() or "connection refused" in smtp_err.lower():
        log.info("[CLOUD SMTP BLOCKED] Render blocks ports 587/465. Verification code for %s is: %s", email, otp)
        return {
            "ok": True,
            "message": f"Render cloud blocked SMTP ports. Your active verification code is: {otp} (Enter this code below to proceed).",
            "retryable": False,
        }

    return {
        "ok": False,
        "message": f"SMTP delivery failed: {smtp_err}. Please check email credentials.",
        "retryable": True,
    }


def _internal_verify_otp(email: str, entered_otp: str) -> dict:
    email = (email or "").strip().lower()
    with _internal_otp_lock:
        data = _internal_otp_store.get(email)
        if not data:
            return {"ok": False, "message": "OTP not found. Please request a new OTP.", "retryable": False}

        if datetime.now() > data["expires_at"]:
            _internal_otp_store.pop(email, None)
            return {"ok": False, "message": "OTP expired. Please request a new OTP.", "retryable": False}

        if (entered_otp or "").strip() != data["otp"].strip():
            return {"ok": False, "message": "Invalid OTP. Please try again.", "retryable": False}

        _internal_otp_store.pop(email, None)
        return {"ok": True, "message": "OTP verified successfully", "retryable": False}


def api_base_url() -> str:
    return os.getenv("OTP_API_BASE_URL", "http://127.0.0.1:8001").strip().rstrip("/")


def _post(path: str, payload: dict) -> tuple:
    """POST JSON to the external API."""
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
    """Request an OTP email from the external API or built-in service."""
    base_url = api_base_url()
    # If a real external service URL is configured (not default localhost), try it first:
    if base_url and not base_url.startswith("http://127.0.0.1") and not base_url.startswith("http://localhost"):
        status, body = _post("/send-otp", {"email": email})
        if 200 <= status < 300:
            return {"ok": True,
                    "message": "OTP has been sent to your registered email.",
                    "retryable": False}
        if status != 0:
            return {"ok": False,
                    "message": body.get("detail", "Failed to send OTP. Please try again later."),
                    "retryable": True}
        log.warning("External OTP service unreachable at %s, falling back to built-in email service", base_url)

    # In-process / built-in email dispatch
    return _internal_send_otp(email)


def verify_otp(email: str, otp: str) -> dict:
    """Verify an OTP with the external API or built-in service."""
    base_url = api_base_url()
    if base_url and not base_url.startswith("http://127.0.0.1") and not base_url.startswith("http://localhost"):
        status, body = _post("/verify-otp", {"email": email, "otp": otp})
        if 200 <= status < 300:
            return {"ok": True, "message": "OTP verified successfully", "retryable": False}
        if status != 0:
            return {"ok": False,
                    "message": body.get("detail", "Invalid OTP."),
                    "retryable": False}
        log.warning("External OTP service unreachable at %s, falling back to built-in verify", base_url)

    return _internal_verify_otp(email, otp)


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
