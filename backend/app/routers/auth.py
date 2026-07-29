from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Faculty
from app.security import verify_password, create_access_token, decode_token

from pydantic import BaseModel

router = APIRouter()

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


class LoginRequest(BaseModel):
    email: str
    password: str


@router.post("/login")
def login(request: LoginRequest, db: Session = Depends(get_db)):

    faculty = db.query(Faculty).filter(
        Faculty.email == request.email
    ).first()

    if not faculty:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    if not faculty.password_hash:
        raise HTTPException(status_code=500, detail="Password not set in DB")

    if not verify_password(request.password, faculty.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = create_access_token({
        "faculty_id": faculty.faculty_id,
        "name": faculty.name,
        "email": faculty.email,
        "role": faculty.role,
        "dept_id": faculty.dept_id
    })

    return {
        "access_token": token,
        "token_type": "bearer",
        "role": faculty.role,
        "name": faculty.name,
        "faculty_id": faculty.faculty_id
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