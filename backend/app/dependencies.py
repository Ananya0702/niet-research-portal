from datetime import datetime

from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.security import decode_token
from app.database import get_db
from app.models import Faculty

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


def get_current_faculty(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    return _resolve(token, db)


def get_current_faculty_allow_force_reset(token: str = Depends(oauth2_scheme),
                                          db: Session = Depends(get_db)):
    """Like get_current_faculty but allows a user under forced password reset
    to access the security endpoints needed to change their password."""
    return _resolve(token, db, block_force_reset=False)


def _resolve(token, db, block_force_reset=True):
    payload = decode_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")

    faculty_id = payload.get("faculty_id")
    if not faculty_id:
        raise HTTPException(status_code=401, detail="Invalid token")

    faculty = db.query(Faculty).filter(Faculty.faculty_id == faculty_id).first()
    if not faculty:
        raise HTTPException(status_code=401, detail="Account not found")
    if not faculty.is_active:
        raise HTTPException(status_code=403, detail="Account is deactivated")

    # Session invalidation: token_version bumped on password change/reset.
    if (faculty.token_version or 0) != (payload.get("token_version") or 0):
        raise HTTPException(status_code=401,
                            detail="Your session has expired. Please login again.")

    # Account lockout should not silently block authenticated users whose
    # lock has expired; but block while actively locked.
    if faculty.lock_until and faculty.lock_until > datetime.now():
        raise HTTPException(status_code=423,
                            detail="Account temporarily locked due to multiple failed attempts.")

    # Admin forced password reset — force the user to change their password.
    if block_force_reset and faculty.force_password_reset:
        raise HTTPException(
            status_code=403,
            detail="force_password_reset:You must change your password before continuing.",
        )

    return payload
