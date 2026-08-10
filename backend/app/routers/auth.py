from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Faculty
from app.security import verify_password, create_access_token, decode_token
from app.security_otp import parse_user_agent
from datetime import datetime, timedelta

from pydantic import BaseModel

router = APIRouter()

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

MAX_FAILED_ATTEMPTS = 5
LOCK_MINUTES = 15


class LoginRequest(BaseModel):
    email: str
    password: str


@router.post("/login")
def login(request: LoginRequest, req: Request, db: Session = Depends(get_db)):

    faculty = db.query(Faculty).filter(
        Faculty.email == request.email
    ).first()

    def _audit(action, status, detail):
        from app.models import SecurityAuditLog
        ua = req.headers.get("user-agent", "")
        meta = parse_user_agent(ua)
        db.add(SecurityAuditLog(
            faculty_id=faculty.faculty_id if faculty else None,
            action=action,
            status=status,
            detail=detail[:500],
            ip_address=req.client.host if req.client else None,
            user_agent=ua[:300],
            device=meta["device"],
            browser=meta["browser"],
        ))
        db.commit()

    # Brute-force protection — check lock before validating credentials.
    if faculty:
        now = datetime.now()
        if faculty.lock_until and faculty.lock_until > now:
            remaining = int((faculty.lock_until - now).total_seconds() // 60)
            _audit("login_failed", "failed", f"Blocked locked account (lock {remaining} min remaining)")
            raise HTTPException(status_code=423,
                                detail=f"Too many failed attempts. Please try again after {LOCK_MINUTES} minutes.")

    if not faculty:
        _audit("login_failed", "failed", "Unknown email attempted login")
        raise HTTPException(status_code=401, detail="Invalid email or password")

    if not faculty.password_hash:
        raise HTTPException(status_code=500, detail="Password not set in DB")

    if not verify_password(request.password, faculty.password_hash):
        faculty.failed_attempts = (faculty.failed_attempts or 0) + 1
        if faculty.failed_attempts >= MAX_FAILED_ATTEMPTS:
            faculty.lock_until = datetime.now() + timedelta(minutes=LOCK_MINUTES)
            _audit("account_locked", "failed",
                   f"Account locked after {MAX_FAILED_ATTEMPTS} failed attempts")
            raise HTTPException(status_code=423,
                                detail=f"Too many failed attempts. Please try again after {LOCK_MINUTES} minutes.")
        db.commit()
        _audit("login_failed", "failed", f"Invalid password (attempt {faculty.failed_attempts}/{MAX_FAILED_ATTEMPTS})")
        raise HTTPException(status_code=401, detail="Invalid email or password")

    # Success — reset counters.
    faculty.failed_attempts = 0
    faculty.lock_until = None
    db.commit()

    _audit("login_success", "success", "Successful login")

    token = create_access_token({
        "faculty_id": faculty.faculty_id,
        "name": faculty.name,
        "email": faculty.email,
        "role": faculty.role,
        "dept_id": faculty.dept_id,
        "school_id": faculty.school_id,
        "token_version": faculty.token_version or 0,
    })

    return {
        "access_token": token,
        "token_type": "bearer",
        "role": faculty.role,
        "name": faculty.name,
        "faculty_id": faculty.faculty_id,
        "dept_id": faculty.dept_id,
        "school_id": faculty.school_id,
        "force_password_reset": bool(faculty.force_password_reset),
    }


@router.get("/me")
def get_me(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):

    payload = decode_token(token)

    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")

    faculty = db.query(Faculty).filter(
        Faculty.faculty_id == payload["faculty_id"]
    ).first()

    if not faculty:
        raise HTTPException(status_code=404, detail="Faculty not found")

    return faculty
def get_current_faculty(token: str = Depends(oauth2_scheme)):
    payload = decode_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return payload