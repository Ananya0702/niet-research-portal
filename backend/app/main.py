from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.database import engine, Base
import logging
import os


def _setup_logging():
    """Emit app/provider diagnostics to stderr/console.

    OTP values are NEVER logged or returned in API responses — they are
    delivered only to the registered mobile number via the configured SMS
    gateway.
    """
    logger = logging.getLogger("notifications")
    logger.setLevel(os.getenv("LOG_LEVEL", "INFO"))
    if not logger.handlers:
        handler = logging.StreamHandler()
        handler.setFormatter(logging.Formatter(
            "%(asctime)s %(levelname)s [%(name)s] %(message)s"))
        logger.addHandler(handler)
    logger.propagate = False


_setup_logging()
from app.routers import auth, faculty, publications, projects, patents, achievements, hod
from app.routers import auth, faculty, publications, projects, patents, achievements, hod, dean
from app.routers import auth, faculty, publications, projects, patents, achievements, hod, dean, ml
from app.routers import collaborations
from app.routers import sync
from app.routers import students
from app.routers import activity
from app.routers import announcements
from app.routers import admin
from app.routers import profile
from app.routers import security
from app.security import get_password_hash
from app.database import SessionLocal
from app.routers.admin import Admin

Base.metadata.create_all(bind=engine)

from app.migrations import run_migrations
run_migrations()

# Seed default admin on startup
def seed_admin():
    db = SessionLocal()
    try:
        existing = db.query(Admin).filter(Admin.email == "admin@niet.co.in").first()
        if not existing:
            admin_user = Admin(
                username="admin",
                email="admin@niet.co.in",
                password_hash=get_password_hash("admin123"),
                is_active=True,
            )
            db.add(admin_user)
            db.commit()
            print("✅ Default admin created: admin@niet.co.in / admin123")
    except Exception as e:
        print(f"Admin seed skipped: {e}")
    finally:
        db.close()

seed_admin()

app = FastAPI(title="NIET Research Portal API", version="1.0.0")


def _cors_origins():
    """Local dev origins by default; extra production origins come from the
    comma-separated CORS_ORIGINS env var (e.g. the Vercel frontend URL)."""
    default = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
    ]
    extra = os.getenv("CORS_ORIGINS", "")
    return default + [o.strip() for o in extra.split(",") if o.strip()]


app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router,          prefix="/auth",          tags=["Auth"])
app.include_router(faculty.router,       prefix="/faculty",       tags=["Faculty"])
app.include_router(publications.router,  prefix="/publications",  tags=["Publications"])
app.include_router(projects.router,      prefix="/projects",      tags=["Projects"])
app.include_router(patents.router,       prefix="/patents",       tags=["Patents"])
app.include_router(achievements.router,  prefix="/achievements",  tags=["Achievements"])
app.include_router(hod.router,           prefix="/hod",           tags=["HOD"])
app.include_router(dean.router,          prefix="/dean",          tags=["Dean"])
app.include_router(ml.router,            prefix="/ml",            tags=["ML"])
app.include_router(collaborations.router, prefix="/collaborations", tags=["Collaborations"])
app.include_router(sync.router, prefix="/sync", tags=["Sync"])
app.include_router(students.router, prefix="/students", tags=["Students"])
app.include_router(activity.router, prefix="/activity", tags=["Activity"])
app.include_router(announcements.router, prefix="/announcements", tags=["Announcements"])
app.include_router(admin.router, prefix="/admin", tags=["Admin"])
app.include_router(profile.router, prefix="/profile", tags=["Profile"])
app.include_router(security.router, prefix="/security", tags=["Security"])

UPLOAD_ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "uploads")
os.makedirs(UPLOAD_ROOT, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_ROOT), name="uploads")
@app.get("/")
def root():
    return {"message": "NIET Research Portal API is running ✓"}