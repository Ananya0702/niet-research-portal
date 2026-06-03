from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Faculty
from app.auth import verify_password, create_access_token, decode_token
from pydantic import BaseModel

router = APIRouter()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

class LoginRequest(BaseModel):
    email: str
    password: str

@router.post("/login")
def login(request: LoginRequest, db: Session = Depends(get_db)):
    # Find faculty by email
    faculty = db.query(Faculty).filter(Faculty.email == request.email).first()
    if not faculty:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if not verify_password(request.password, faculty.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    # Create JWT token with role info
    token = create_access_token({
        "faculty_id": faculty.faculty_id,
        "name":       faculty.name,
        "email":      faculty.email,
        "role":       faculty.role,
        "dept_id":    faculty.dept_id
    })
    return {
        "access_token": token,
        "token_type":   "bearer",
        "role":         faculty.role,
        "name":         faculty.name,
        "faculty_id":   faculty.faculty_id
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
    return {
        "faculty_id": faculty.faculty_id,
        "name":       faculty.name,
        "email":      faculty.email,
        "role":       faculty.role,
        "dept_id":    faculty.dept_id,
        "designation":faculty.designation
    }

def get_current_faculty(token: str = Depends(oauth2_scheme)):
    payload = decode_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return payload