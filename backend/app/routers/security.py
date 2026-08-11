"""Security module — OTP-based forgot password, change password and account
mobile verification, with brute-force protection and audit logging.

Change-password via email delegates to the EXISTING external Email OTP API
through app.otp_integration (POST /send-otp, POST /verify-otp). The portal never
generates, stores or logs OTP values; the external service enforces 5-minute
expiry and single-use, while the portal enforces send rate limits, the 60s
resend cooldown and the failed-attempt cap, and records activity logs.
Mobile OTP (SMS via app.notifications) remains for forgot password, change
password (mobile method) and contact verification.

Exposes:
  - Public (no auth):  forgot-password request / verify / reset
  - Authenticated:     change-password request / verify / confirm
                       account info read + edit + mobile verify
"""

import re
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_faculty_allow_force_reset as get_current_faculty
from app.models import Faculty, SecurityAuditLog
from app.security import get_password_hash, verify_password
from app.security_otp import (
    issue_otp, validate_otp, parse_user_agent,
)
from app.password_policy import check_policy, password_strength, record_password, is_reused
import app.otp_integration as otp_integration
import app.notifier as notifier
from app.notifications import available_channels

router = APIRouter()

P = "#534AB7"
DEFAULT_COUNTRY_CODE = "+91"

# ── Schemas ──────────────────────────────────────────────────────────────────
class ForgotRequest(BaseModel):
    identifier: str                 # registered mobile number (or email)

class OtpVerify(BaseModel):
    identifier: str
    otp: str

class ResetPassword(BaseModel):
    identifier: str
    otp: str
    new_password: str

class ChangePasswordRequest(BaseModel):
    purpose: Optional[str] = None   # "change_password" (default) | "verify_contact"

class ChangePasswordVerify(BaseModel):
    otp: str

class ChangePasswordConfirm(BaseModel):
    otp: str
    new_password: str

class EmailOtpRequest(BaseModel):
    email: str

class EmailOtpVerify(BaseModel):
    otp: str

class EmailOtpConfirm(BaseModel):
    new_password: str

class ContactUpdate(BaseModel):
    email: Optional[str] = None
    mobile_number: Optional[str] = None
    country_code: Optional[str] = None

class ContactVerify(BaseModel):
    field: str                      # "mobile" (email verification disabled)
    otp: str


# ── Helpers ──────────────────────────────────────────────────────────────────
_EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def _audit(db: Session, faculty_id, action, status="success",
           request=None, method=None, detail=None):
    """Write a SecurityAuditLog entry. Commits via caller (or here)."""
    ua = request.headers.get("user-agent", "") if request else ""
    meta = parse_user_agent(ua)
    ip = request.client.host if request and request.client else None
    db.add(SecurityAuditLog(
        faculty_id=faculty_id,
        action=action,
        status=status,
        method=method,
        detail=(detail or "")[:500],
        ip_address=ip,
        user_agent=ua[:300],
        device=meta["device"],
        browser=meta["browser"],
    ))


def _mask_mobile_full(mobile: str, country: str = DEFAULT_COUNTRY_CODE) -> str:
    """Mask a mobile number keeping the last 4 digits: +91 ******8395."""
    mobile = (mobile or "").strip()
    if not mobile:
        return ""
    if len(mobile) <= 4:
        return f"{country or ''} {mobile}".strip()
    return f"{country or ''} {'*' * (len(mobile) - 4)}{mobile[-4:]}".strip()


def _deliver(db: Session, fac: Faculty, purpose: str, otp: str,
             request=None) -> tuple:
    """Deliver the OTP via SMS. Returns (delivered: bool, masked: str)."""
    if not fac.mobile_number:
        return False, ""
    ok = notifier.otp_sms(fac.mobile_number, otp)
    masked = _mask_mobile_full(fac.mobile_number, fac.mobile_country_code or DEFAULT_COUNTRY_CODE)
    _audit(db, fac.faculty_id, "otp_generated",
           status="success" if ok else "failed",
           method="mobile", request=request,
           detail=(f"OTP sent via SMS to {masked} for {purpose}"
                   if ok else f"SMS delivery failed for {masked} ({purpose})"))
    return ok, masked


def _apply_new_password(db: Session, fac: Faculty, new_password: str,
                        request=None, action="password_changed") -> None:
    """Validate + set a new password, enforcing history. Bumps token_version."""
    from app.password_policy import policy_errors
    errors = policy_errors(new_password)
    if errors:
        raise HTTPException(status_code=400, detail=errors[0])
    if is_reused(fac, verify_password, new_password, fac.password_hash or ""):
        raise HTTPException(status_code=400,
                            detail="You cannot reuse your current password or any of your last 5 passwords.")
    new_hash = get_password_hash(new_password)
    record_password(fac, fac.password_hash or "")
    fac.password_hash = new_hash
    fac.last_password_changed = datetime.now()
    fac.token_version = (fac.token_version or 0) + 1  # invalidate all sessions
    fac.otp_hash = None
    fac.otp_expiry = None
    fac.otp_attempts = 0
    fac.otp_resend_count = 0
    fac.force_password_reset = False
    db.commit()
    _audit(db, fac.faculty_id, action, request=request, detail="Password updated successfully")


def _send_changed_notification(fac: Faculty, request=None) -> None:
    ua = request.headers.get("user-agent", "") if request else ""
    meta = parse_user_agent(ua)
    now = datetime.now()
    info = {
        "date": now.strftime("%d %b %Y"),
        "time": now.strftime("%I:%M %p"),
        "ip": (request.client.host if request and request.client else "—"),
        "browser": meta["browser"],
        "device": meta["device"],
    }
    notifier.password_changed_email(fac.email, info)
    if fac.mobile_number:
        notifier.send_sms(fac.mobile_number, "Your NIET Research Portal password was changed successfully. If this was not you, contact the administrator.")


# ══ FORGOT PASSWORD (public) ═════════════════════════════════════════════════
@router.post("/forgot-password/request")
def forgot_request(payload: ForgotRequest, request: Request, db: Session = Depends(get_db)):
    identifier = (payload.identifier or "").strip().lower()
    if not identifier or not _EMAIL_RE.match(identifier):
        raise HTTPException(status_code=400, detail="Please enter a valid registered email address.")
    fac = db.query(Faculty).filter(Faculty.email == identifier).first()
    if not fac or not fac.is_active:
        # Do not reveal whether the account exists.
        raise HTTPException(status_code=404, detail="Account not found.")

    flow = otp_integration.begin_forgot_password_flow(fac.faculty_id, identifier)
    if not flow["ok"]:
        _audit(db, fac.faculty_id, "otp_failed", status="failed", method="email",
               request=request, detail=f"Forgot-password OTP blocked: {flow['message']}")
        db.commit()
        raise HTTPException(status_code=429, detail=flow["message"])

    result = otp_integration.send_otp(identifier)
    if not result["ok"]:
        _audit(db, fac.faculty_id, "otp_failed", status="failed", method="email",
               request=request, detail=result["message"])
        db.commit()
        raise HTTPException(status_code=503 if result["retryable"] else 400,
                            detail=result["message"])

    _audit(db, fac.faculty_id, "otp_requested", status="success", method="email",
           request=request,
           detail=f"Forgot-password OTP sent to {flow['masked_email']}")
    db.commit()
    return {
        "message": "OTP has been sent to your registered email.",
        "method": "email",
        "masked_contact": flow["masked_email"],
        "expires_in_seconds": otp_integration.FLOW_EXPIRY_MINUTES * 60,
        "retry_after_seconds": otp_integration.RESEND_COOLDOWN_SECONDS,
    }


@router.post("/forgot-password/verify")
def forgot_verify(payload: OtpVerify, request: Request, db: Session = Depends(get_db)):
    identifier = (payload.identifier or "").strip().lower()
    fac = db.query(Faculty).filter(Faculty.email == identifier).first()
    if not fac or not fac.is_active:
        raise HTTPException(status_code=404, detail="Account not found.")

    flow = otp_integration.get_forgot_password_flow(fac.faculty_id)
    if not flow or not flow.get("email"):
        raise HTTPException(status_code=400,
                            detail="No OTP was requested. Please request a new OTP first.")
    if flow.get("attempts", 0) >= otp_integration.MAX_ATTEMPTS:
        otp_integration.end_forgot_password_flow(fac.faculty_id)
        raise HTTPException(status_code=429,
                            detail="Too many incorrect attempts. Please request a new OTP.")

    result = otp_integration.verify_otp(flow["email"], payload.otp.strip())
    db.commit()
    if not result["ok"]:
        if not result["retryable"]:
            flow["attempts"] = flow.get("attempts", 0) + 1
            otp_integration.set_forgot_password_flow(fac.faculty_id, flow)
        msg = result["message"]
        if "expired" in msg.lower():
            msg = "OTP expired. Please request a new OTP."
        _audit(db, fac.faculty_id, "otp_failed", status="failed", method="email",
               request=request, detail=f"Forgot-password OTP verification failed: {msg}")
        db.commit()
        raise HTTPException(status_code=503 if result["retryable"] else 400,
                            detail=msg)

    flow["verified"] = True
    flow["verified_at"] = datetime.now()
    otp_integration.set_forgot_password_flow(fac.faculty_id, flow)
    _audit(db, fac.faculty_id, "otp_verified", status="success", method="email",
           request=request, detail="Forgot-password OTP verified")
    db.commit()
    return {"message": "OTP verified successfully"}


@router.post("/forgot-password/reset")
def forgot_reset(payload: ResetPassword, request: Request, db: Session = Depends(get_db)):
    identifier = (payload.identifier or "").strip().lower()
    fac = db.query(Faculty).filter(Faculty.email == identifier).first()
    if not fac or not fac.is_active:
        raise HTTPException(status_code=404, detail="Account not found.")

    flow = otp_integration.get_forgot_password_flow(fac.faculty_id)
    if not flow or not flow.get("email") or not flow.get("verified"):
        raise HTTPException(status_code=400,
                            detail="OTP not verified. Please verify the OTP before resetting your password.")

    _apply_new_password(db, fac, payload.new_password, request=request,
                        action="password_reset")
    otp_integration.end_forgot_password_flow(fac.faculty_id)
    _audit(db, fac.faculty_id, "password_reset", request=request,
           detail="Password reset via forgot-password flow")
    db.commit()
    notifier.password_reset_email(fac.email, {
        "date": datetime.now().strftime("%d %b %Y"),
        "time": datetime.now().strftime("%I:%M %p"),
        "ip": (request.client.host if request.client else "—"),
        "browser": parse_user_agent(request.headers.get("user-agent", ""))["browser"],
    })
    return {"message": "Password reset successfully. Please login with your new password."}


# ══ CHANGE PASSWORD (authenticated) ══════════════════════════════════════════
def _sms_configured() -> bool:
    return "mobile" in (set(available_channels()) or set())


def _available_methods(fac: Faculty) -> list:
    """Advertise the Mobile OTP method for this account."""
    methods = []
    if fac.mobile_number:
        methods.append({
            "method": "mobile",
            "label": "Mobile",
            "contact": _mask_mobile_full(fac.mobile_number, fac.mobile_country_code or DEFAULT_COUNTRY_CODE),
            "verified": bool(fac.mobile_verified),
            "configured": _sms_configured(),
        })
    return methods


@router.post("/change-password/options")
def change_password_options(db: Session = Depends(get_db),
                            current=Depends(get_current_faculty)):
    fac = db.query(Faculty).filter(Faculty.faculty_id == current["faculty_id"]).first()
    if not fac:
        raise HTTPException(status_code=404, detail="Faculty not found")
    return {"methods": _available_methods(fac), "sms_configured": _sms_configured()}


@router.post("/change-password/request")
def change_password_request(payload: ChangePasswordRequest, request: Request,
                            db: Session = Depends(get_db),
                            current=Depends(get_current_faculty)):
    fac = db.query(Faculty).filter(Faculty.faculty_id == current["faculty_id"]).first()
    if not fac:
        raise HTTPException(status_code=404, detail="Faculty not found")

    purpose_kind = payload.purpose or "change_password"
    if not fac.mobile_number:
        raise HTTPException(status_code=400,
                            detail="No registered mobile number. Add and verify one in Account Information to use OTP-based services.")
    if purpose_kind != "verify_contact" and not fac.mobile_verified:
        raise HTTPException(status_code=400,
                            detail="Mobile number is not verified. Verify it in Account Information first.")
    if not _sms_configured():
        raise HTTPException(status_code=503,
                            detail="SMS delivery is not configured. Please contact the administrator.")

    try:
        otp = issue_otp(fac, "mobile")
    except ValueError as e:
        raise HTTPException(status_code=429, detail=str(e))
    db.commit()

    purpose = ("verifying your mobile number" if purpose_kind == "verify_contact"
               else "changing your password")
    delivered, masked = _deliver(db, fac, purpose, otp, request)
    db.commit()
    if not delivered:
        raise HTTPException(status_code=503, detail="SMS delivery failed. Please try again later.")
    return {
        "message": "OTP Sent Successfully",
        "method": "mobile",
        "masked_contact": masked,
        "expires_in_seconds": 5 * 60,
    }


@router.post("/change-password/verify")
def change_password_verify(payload: ChangePasswordVerify, request: Request,
                           db: Session = Depends(get_db),
                           current=Depends(get_current_faculty)):
    fac = db.query(Faculty).filter(Faculty.faculty_id == current["faculty_id"]).first()
    if not fac:
        raise HTTPException(status_code=404, detail="Faculty not found")
    ok, msg = validate_otp(fac, payload.otp.strip(), consume=False)
    db.commit()
    _audit(db, fac.faculty_id, "otp_verified" if ok else "otp_failed",
           status="success" if ok else "failed",
           method=fac.otp_method, request=request,
           detail=("OTP verified for password change" if ok else f"OTP verification failed: {msg}"))
    db.commit()
    if not ok:
        raise HTTPException(status_code=400, detail=msg)
    return {"message": "OTP verified successfully"}


@router.post("/change-password/confirm")
def change_password_confirm(payload: ChangePasswordConfirm, request: Request,
                            db: Session = Depends(get_db),
                            current=Depends(get_current_faculty)):
    fac = db.query(Faculty).filter(Faculty.faculty_id == current["faculty_id"]).first()
    if not fac:
        raise HTTPException(status_code=404, detail="Faculty not found")
    ok, msg = validate_otp(fac, payload.otp.strip())
    db.commit()
    if not ok:
        raise HTTPException(status_code=400, detail=msg)

    # Current password check happens client-side BEFORE OTP request; here we
    # still verify OTP (already done above) and then set the new password.
    _apply_new_password(db, fac, payload.new_password, request=request,
                        action="password_changed")
    _audit(db, fac.faculty_id, "password_changed", request=request,
           detail="Password changed via OTP verification")
    db.commit()
    _send_changed_notification(fac, request)
    return {
        "message": "Password changed successfully. Please login again.",
        "logout_all": True,
    }


# ══ CHANGE PASSWORD via EMAIL OTP (authenticated) ════════════════════════════
# Delegates to the EXISTING external Email OTP API (app.otp_integration ->
# POST /send-otp, POST /verify-otp). The portal never generates, stores or logs
# OTP values. The external service enforces 5-minute expiry and single-use; the
# portal enforces the send rate limit, 60s resend cooldown and failed-attempt
# cap, and writes the activity log.

FLOW_EXPIRY_MINUTES = otp_integration.FLOW_EXPIRY_MINUTES
MAX_ATTEMPTS = otp_integration.MAX_ATTEMPTS


def _registered_email(fac: Faculty) -> str:
    return (fac.email or "").strip().lower()


@router.post("/change-password/email/request")
def change_password_email_request(payload: EmailOtpRequest, request: Request,
                                  db: Session = Depends(get_db),
                                  current=Depends(get_current_faculty)):
    fac = db.query(Faculty).filter(Faculty.faculty_id == current["faculty_id"]).first()
    if not fac:
        raise HTTPException(status_code=404, detail="Faculty not found")

    email = (payload.email or "").strip().lower()
    if not email or not _EMAIL_RE.match(email):
        raise HTTPException(status_code=400, detail="Please enter a valid registered email address.")
    if email != _registered_email(fac):
        raise HTTPException(status_code=400, detail="Email not registered.")

    flow = otp_integration.begin_change_password_flow(fac.faculty_id, email)
    if not flow["ok"]:
        _audit(db, fac.faculty_id, "otp_failed", status="failed", method="email",
               request=request, detail=f"OTP request blocked: {flow['message']}")
        db.commit()
        raise HTTPException(status_code=429, detail=flow["message"])

    result = otp_integration.send_otp(email)
    if not result["ok"]:
        _audit(db, fac.faculty_id, "otp_failed", status="failed", method="email",
               request=request, detail=result["message"])
        db.commit()
        raise HTTPException(status_code=503 if result["retryable"] else 400,
                            detail=result["message"])

    _audit(db, fac.faculty_id, "otp_requested", status="success", method="email",
           request=request,
           detail=f"OTP sent to {flow['masked_email']} for password change")
    db.commit()
    return {
        "message": "OTP has been sent to your registered email.",
        "method": "email",
        "masked_contact": flow["masked_email"],
        "expires_in_seconds": FLOW_EXPIRY_MINUTES * 60,
        "retry_after_seconds": otp_integration.RESEND_COOLDOWN_SECONDS,
    }


@router.post("/change-password/email/verify")
def change_password_email_verify(payload: EmailOtpVerify, request: Request,
                                 db: Session = Depends(get_db),
                                 current=Depends(get_current_faculty)):
    fac = db.query(Faculty).filter(Faculty.faculty_id == current["faculty_id"]).first()
    if not fac:
        raise HTTPException(status_code=404, detail="Faculty not found")

    flow = otp_integration.get_flow(fac.faculty_id)
    if not flow or not flow.get("email"):
        raise HTTPException(status_code=400,
                            detail="No OTP was requested. Please request a new OTP first.")

    if flow.get("attempts", 0) >= otp_integration.MAX_ATTEMPTS:
        otp_integration.end_change_password_flow(fac.faculty_id)
        raise HTTPException(status_code=429,
                            detail="Too many incorrect attempts. Please request a new OTP.")

    result = otp_integration.verify_otp(flow["email"], payload.otp.strip())
    if not result["ok"]:
        if not result["retryable"]:
            flow["attempts"] = flow.get("attempts", 0) + 1
            otp_integration.set_flow(fac.faculty_id, flow)
        msg = result["message"]
        if "expired" in msg.lower():
            msg = "OTP expired. Please request a new OTP."
        _audit(db, fac.faculty_id, "otp_failed", status="failed", method="email",
               request=request, detail=f"Email OTP verification failed: {msg}")
        db.commit()
        raise HTTPException(status_code=503 if result["retryable"] else 400,
                            detail=msg)

    flow["verified"] = True
    flow["verified_at"] = datetime.now()
    otp_integration.set_flow(fac.faculty_id, flow)
    _audit(db, fac.faculty_id, "otp_verified", status="success", method="email",
           request=request, detail="Email OTP verified for password change")
    db.commit()
    return {"message": "OTP verified successfully"}


@router.post("/change-password/email/confirm")
def change_password_email_confirm(payload: EmailOtpConfirm, request: Request,
                                  db: Session = Depends(get_db),
                                  current=Depends(get_current_faculty)):
    fac = db.query(Faculty).filter(Faculty.faculty_id == current["faculty_id"]).first()
    if not fac:
        raise HTTPException(status_code=404, detail="Faculty not found")

    flow = otp_integration.get_flow(fac.faculty_id)
    if not flow or not flow.get("email") or not flow.get("verified"):
        raise HTTPException(status_code=400,
                            detail="OTP not verified. Please verify the OTP before changing your password.")

    _apply_new_password(db, fac, payload.new_password, request=request,
                        action="password_changed")
    otp_integration.end_change_password_flow(fac.faculty_id)
    _audit(db, fac.faculty_id, "password_changed", request=request,
           detail="Password changed via email OTP verification")
    db.commit()
    _send_changed_notification(fac, request)
    return {
        "message": "Password changed successfully. Please login again.",
        "logout_all": True,
    }


# ══ ACCOUNT CONTACT INFO (authenticated) ═════════════════════════════════════
@router.get("/account-info")
def get_account_info(db: Session = Depends(get_db),
                     current=Depends(get_current_faculty)):
    fac = db.query(Faculty).filter(Faculty.faculty_id == current["faculty_id"]).first()
    if not fac:
        raise HTTPException(status_code=404, detail="Faculty not found")
    return {
        "faculty_id": fac.faculty_id,
        "username": fac.employee_id or "",
        "name": fac.name,
        "email": fac.email,
        "email_verified": bool(fac.email_verified),
        "mobile_number": fac.mobile_number or "",
        "mobile_country_code": fac.mobile_country_code or DEFAULT_COUNTRY_CODE,
        "mobile_display": _mask_mobile_full(fac.mobile_number, fac.mobile_country_code or DEFAULT_COUNTRY_CODE),
        "mobile_verified": bool(fac.mobile_verified),
        "last_password_changed": fac.last_password_changed.isoformat() if fac.last_password_changed else None,
        "force_password_reset": bool(fac.force_password_reset),
        "locked": bool(fac.lock_until and fac.lock_until > datetime.now()),
        "methods": _available_methods(fac),
    }


@router.put("/account-info")
def update_account_info(payload: ContactUpdate, db: Session = Depends(get_db),
                        current=Depends(get_current_faculty)):
    fac = db.query(Faculty).filter(Faculty.faculty_id == current["faculty_id"]).first()
    if not fac:
        raise HTTPException(status_code=404, detail="Faculty not found")

    if payload.email is not None:
        new_email = (payload.email or "").strip().lower()
        if not new_email or "@" not in new_email:
            raise HTTPException(status_code=400, detail="Invalid email address.")
        existing = db.query(Faculty).filter(Faculty.email == new_email,
                                            Faculty.faculty_id != fac.faculty_id).first()
        if existing:
            raise HTTPException(status_code=400, detail="That email is already registered.")
        fac.email = new_email
        fac.email_verified = False

    if payload.mobile_number is not None:
        new_mobile = (payload.mobile_number or "").strip()
        if new_mobile and len(new_mobile) < 7:
            raise HTTPException(status_code=400, detail="Invalid mobile number.")
        existing = db.query(Faculty).filter(Faculty.mobile_number == new_mobile,
                                            Faculty.faculty_id != fac.faculty_id).first()
        if existing:
            raise HTTPException(status_code=400, detail="That mobile number is already registered.")
        fac.mobile_number = new_mobile or None
        fac.mobile_verified = False

    if payload.country_code is not None:
        cc = (payload.country_code or "").strip().lstrip("+")
        fac.mobile_country_code = f"+{cc}" if cc else DEFAULT_COUNTRY_CODE

    db.commit()
    return {"message": "Account information updated",
            "email_verified": bool(fac.email_verified),
            "mobile_verified": bool(fac.mobile_verified)}


@router.post("/account-info/verify")
def verify_contact(payload: ContactVerify, request: Request, db: Session = Depends(get_db),
                   current=Depends(get_current_faculty)):
    fac = db.query(Faculty).filter(Faculty.faculty_id == current["faculty_id"]).first()
    if not fac:
        raise HTTPException(status_code=404, detail="Faculty not found")
    if payload.field != "mobile":
        raise HTTPException(status_code=400,
                            detail="Only mobile number verification is supported.")
    if not fac.mobile_number:
        raise HTTPException(status_code=400, detail="No mobile number to verify.")
    ok, msg = validate_otp(fac, payload.otp.strip())
    if ok:
        fac.mobile_verified = True
    db.commit()
    _audit(db, fac.faculty_id, "contact_verified" if ok else "otp_failed",
           status="success" if ok else "failed",
           method="mobile", request=request,
           detail="mobile verified" if ok else msg)
    db.commit()
    if not ok:
        raise HTTPException(status_code=400, detail=msg)
    return {"message": "Mobile number verified successfully",
            "email_verified": bool(fac.email_verified),
            "mobile_verified": bool(fac.mobile_verified)}


# ══ PASSWORD POLICY HINT (authenticated) ═════════════════════════════════════
class StrengthCheck(BaseModel):
    password: str

@router.post("/password/strength")
def password_strength_check(payload: StrengthCheck):
    rules = check_policy(payload.password or "")
    return {"rules": rules, "strength": password_strength(payload.password or "")}
