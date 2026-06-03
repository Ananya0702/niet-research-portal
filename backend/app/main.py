from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine, Base
from app.routers import auth, faculty, publications

Base.metadata.create_all(bind=engine)

app = FastAPI(title="NIET Research Portal API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router,         prefix="/auth",        tags=["Auth"])
app.include_router(faculty.router,      prefix="/faculty",     tags=["Faculty"])
app.include_router(publications.router, prefix="/publications", tags=["Publications"])

@app.get("/")
def root():
    return {"message": "NIET Research Portal API is running ✓"}