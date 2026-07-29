from fastapi import APIRouter, Depends, BackgroundTasks
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Publication
from app.routers.auth import get_current_faculty
from pydantic import BaseModel

router = APIRouter()

class ClassifyRequest(BaseModel):
    title:        str
    journal_name: str

@router.post("/classify")
def classify_publication(req: ClassifyRequest,
                          current=Depends(get_current_faculty)):
    """
    Given a title and journal name, returns ML predictions.
    Called from frontend when faculty adds a publication.
    """
    from app.ml.classifier import process_publication
    result = process_publication(req.title, req.journal_name)
    return result

@router.post("/classify-all")
def classify_all_publications(
    db: Session = Depends(get_db),
    current=Depends(get_current_faculty)
):
    """
    Runs ML on ALL existing publications that have no topic assigned.
    Useful for bulk classification of existing data.
    """
    from app.ml.classifier import process_publication

    pubs = db.query(Publication).filter(
        Publication.ml_topic == None
    ).all()

    updated = 0
    for pub in pubs:
        try:
            result = process_publication(
                pub.title or "",
                pub.journal_name or ""
            )
            pub.ml_topic = result["ml_topic"]
            updated += 1
        except Exception:
            continue

    db.commit()
    return {"message": f"Classified {updated} publications successfully"}