"""OTP service — generation, hashing, expiry, attempt/resend limits and rate limiting.

Design:
- OTPs are 6-digit, generated from a cryptographically secure source.
- Only the SHA-256 hash of the OTP is persisted (never the plaintext).
- A hash is tagged with a nonce so two identical OTPs still hash differently.
- All limits are enforced server-side; nothing is trusted from the client.
"""

import hashlib
import os
import secrets
from datetime import datetime, timedelta

OTP_EXPIRY_MINUTES = 5
MAX_ATTEMPTS = 5
MAX_RESENDS = 3
RESEND_COOLDOWN_SECONDS = 30
HOUR_LIMIT = 5  # max OTP requests per hour per account

# In-memory per-account hourly counters keyed by faculty_id.
# Survives until process restart; acceptable for this portal.
_hourly = {}


def generate_otp() -> str:
    return f"{secrets.randbelow(1_000_000):06d}"


def hash_otp(otp: str, nonce: str = None) -> str:
    nonce = nonce or secrets.token_hex(16)
    h = hashlib.sha256(f"{nonce}:{otp}".encode()).hexdigest()
    return f"{nonce}${h}"


def verify_otp(otp: str, stored_hash: str) -> bool:
    if not stored_hash or "$" not in stored_hash:
        return False
    nonce, h = stored_hash.split("$", 1)
    computed = hashlib.sha256(f"{nonce}:{otp}".encode()).hexdigest()
    return secrets.compare_digest(computed, h)


def is_expired(expiry: datetime) -> bool:
    if not expiry:
        return True
    return datetime.now() >= expiry


def _hour_key(faculty_id) -> str:
    return f"{faculty_id}:{datetime.now():%Y%m%d%H}"


def hourly_remaining(faculty_id) -> int:
    key = _hour_key(faculty_id)
    used = _hourly.get(key, 0)
    return max(0, HOUR_LIMIT - used)


def consume_hourly(faculty_id) -> None:
    key = _hour_key(faculty_id)
    _hourly[key] = _hourly.get(key, 0) + 1


def can_resend(faculty, now: datetime = None) -> tuple:
    """Return (allowed: bool, wait_seconds: int)."""
    now = now or datetime.now()
    if (faculty.otp_resend_count or 0) >= MAX_RESENDS:
        return False, 0
    last = faculty.otp_last_sent
    if last:
        elapsed = (now - last).total_seconds()
        if elapsed < RESEND_COOLDOWN_SECONDS:
            return False, int(RESEND_COOLDOWN_SECONDS - elapsed)
    return True, 0


def issue_otp(faculty, method: str, now: datetime = None) -> str:
    """Generate, persist (hashed) and return the plaintext OTP to be delivered.

    Enforces the hourly rate limit, resend cooldown and resend cap by raising
    ValueError with a user-facing message when a limit is hit.
    """
    now = now or datetime.now()

    if hourly_remaining(faculty.faculty_id) <= 0:
        raise ValueError("Too many OTP requests for this hour. Please try again later.")

    allowed, wait = can_resend(faculty, now)
    if not allowed:
        if (faculty.otp_resend_count or 0) >= MAX_RESENDS:
            raise ValueError("Maximum OTP resend limit reached. Please try again later.")
        raise ValueError(f"Please wait {wait} seconds before requesting another OTP.")

    otp = generate_otp()
    faculty.otp_hash = hash_otp(otp)
    faculty.otp_expiry = now + timedelta(minutes=OTP_EXPIRY_MINUTES)
    faculty.otp_attempts = 0
    faculty.otp_method = method
    faculty.otp_last_sent = now
    faculty.otp_resend_count = (faculty.otp_resend_count or 0) + 1
    consume_hourly(faculty.faculty_id)
    return otp


def validate_otp(faculty, otp: str, now: datetime = None, consume: bool = True) -> tuple:
    """Validate a submitted OTP. Returns (ok: bool, message: str).

    Enforces expiry, max attempts and one-time use (invalidation on success).

    When ``consume`` is False the OTP is validated but NOT invalidated, so a
    later authoritative step (password reset / change) can consume it.
    """
    now = now or datetime.now()

    if not faculty.otp_hash:
        return False, "No OTP has been requested."

    if is_expired(faculty.otp_expiry):
        return False, "OTP Expired. Please request a new OTP."

    if (faculty.otp_attempts or 0) >= MAX_ATTEMPTS:
        return False, "Too many invalid attempts. Please request a new OTP."

    if verify_otp(otp, faculty.otp_hash):
        if consume:
            # One-time use: invalidate immediately after successful verification.
            faculty.otp_hash = None
            faculty.otp_expiry = None
            faculty.otp_attempts = 0
            faculty.otp_resend_count = 0
            faculty.otp_last_sent = None
        return True, "OK"

    faculty.otp_attempts = (faculty.otp_attempts or 0) + 1
    remaining = MAX_ATTEMPTS - faculty.otp_attempts
    if remaining <= 0:
        return False, "Too many invalid attempts. Please request a new OTP."
    return False, f"Invalid OTP. {remaining} attempt(s) remaining."


# ── Client metadata helpers ──────────────────────────────────────────────────
def parse_user_agent(ua: str) -> dict:
    ua = ua or ""
    ua_l = ua.lower()
    browser = "Unknown"
    if "edg/" in ua_l:
        browser = "Edge"
    elif "firefox/" in ua_l:
        browser = "Firefox"
    elif "chrome/" in ua_l:
        browser = "Chrome"
    elif "safari/" in ua_l:
        browser = "Safari"
    elif "msie" in ua_l or "trident" in ua_l:
        browser = "Internet Explorer"

    device = "Desktop"
    if "mobile" in ua_l or "android" in ua_l:
        device = "Mobile"
    elif "ipad" in ua_l:
        device = "Tablet"
    elif "iphone" in ua_l or "ipod" in ua_l:
        device = "Mobile"

    os_name = "Unknown"
    if "windows" in ua_l:
        os_name = "Windows"
    elif "mac os" in ua_l:
        os_name = "macOS"
    elif "linux" in ua_l:
        os_name = "Linux"
    elif "android" in ua_l:
        os_name = "Android"
    elif "ios" in ua_l:
        os_name = "iOS"

    return {"browser": browser, "device": device, "os": os_name}
