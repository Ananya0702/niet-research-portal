"""Standalone ML classification microservice.

Exposes the research-paper field classifier (app/ml/classifier.py) as an
independent FastAPI service so it can be deployed and scaled separately from
the main portal backend. The main backend continues to classify in-process;
this service exists for independent deployment (Railway/Docker) and for any
future consumer that wants classification over HTTP.

Run locally:
    uvicorn ml_api:app --port 8002

Endpoints:
    GET  /health         liveness probe
    POST /classify       full prediction (ml_topic, indexing, quartile, ...)
    POST /classify-type  publication type only ("Journal"|"Conference"|"Other")
"""

import os

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

APP_NAME = "NIET ML Classification API"

app = FastAPI(title=APP_NAME, version="1.0.0")


def _cors_origins():
    """Comma-separated CORS_ORIGINS env var; open by default because this
    service exposes no sensitive data and uses no credentials."""
    raw = os.getenv("CORS_ORIGINS", "")
    origins = [o.strip() for o in raw.split(",") if o.strip()]
    return origins or ["*"]


app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins(),
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


class ClassifyRequest(BaseModel):
    title: str
    journal_name: str = ""


@app.get("/")
def root():
    return {"message": f"{APP_NAME} is running", "health": "/health"}


@app.get("/health")
def health():
    return {"status": "ok", "service": "ml-classification"}


@app.post("/classify")
def classify(req: ClassifyRequest):
    """Full ML prediction — same shape the portal stores on publications."""
    from app.ml.classifier import process_publication

    try:
        return process_publication(req.title or "", req.journal_name or "")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Classification failed: {e}")


@app.post("/classify-type")
def classify_type(req: ClassifyRequest):
    """Publication type only — Journal / Conference / Other."""
    from app.ml.classifier import classify_publication_type

    try:
        return {
            "publication_type": classify_publication_type(
                req.title or "", req.journal_name or ""
            )
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Classification failed: {e}")
