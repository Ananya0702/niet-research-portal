"""Universal CLI tool to sync Google Scholar publications and metrics for any faculty member
directly to the live Aiven MySQL database.

Usage examples:
    python backend/sync_faculty_scholar.py --scholar-id hjOd4fgAAAAJ
    python backend/sync_faculty_scholar.py --email sovers@niet.co.in
    python backend/sync_faculty_scholar.py --name "Sovers Singh Bisht" --scholar-id hjOd4fgAAAAJ
"""

import os
import sys
import argparse
import requests
from datetime import datetime
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Ensure local backend imports work
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from app.models import Faculty, Publication, PublicationSource, CitationYearly
from app.scraper import scholar_sync

from dotenv import load_dotenv
load_dotenv()

AIVEN_HOST = os.getenv("AIVEN_HOST", os.getenv("DB_HOST", "mysql-fc51b9c-ananyashukla-4395.h.aivencloud.com"))
AIVEN_PORT = int(os.getenv("AIVEN_PORT", os.getenv("DB_PORT", "21023")))
AIVEN_USER = os.getenv("AIVEN_USER", os.getenv("DB_USER", "avnadmin"))
AIVEN_DB   = os.getenv("AIVEN_DB", os.getenv("DB_NAME", "defaultdb"))
AIVEN_PASS = os.getenv("AIVEN_PASSWORD", os.getenv("DB_PASSWORD", ""))


def fast_classify_topic(title: str) -> str:
    t = (title or "").lower()
    if any(k in t for k in ["blockchain", "contract", "ledger", "ethereum", "crypto"]):
        return "Blockchain"
    if any(k in t for k in ["deep learning", "neural", "cnn", "lstm", "rnn", "transformer"]):
        return "Deep Learning"
    if any(k in t for k in ["machine learning", "svm", "classification", "regression", "clustering", "predict"]):
        return "Machine Learning"
    if any(k in t for k in ["iot", "sensor", "wireless", "vanet", "manet", "adhoc", "network", "routing", "mobile"]):
        return "Internet of Things"
    if any(k in t for k in ["cyber", "security", "attack", "intrusion", "malware", "auth", "encryption"]):
        return "Cyber Security"
    if any(k in t for k in ["cloud", "edge", "fog", "computing"]):
        return "Edge Computing"
    if any(k in t for k in ["covid", "epidemic", "health", "medical", "disease"]):
        return "Biomedical Engineering"
    return "Data Science"


def sync_faculty(scholar_id: str = None, email: str = None, name: str = None, orcid: str = None, db_pass: str = None):
    password = db_pass or AIVEN_PASS
    db_url = f"mysql+pymysql://{AIVEN_USER}:{password}@{AIVEN_HOST}:{AIVEN_PORT}/{AIVEN_DB}"

    print(f"\n🔑 Connecting to live database: {AIVEN_HOST}:{AIVEN_PORT}...")
    engine = create_engine(
        db_url,
        connect_args={"ssl_verify_cert": False, "ssl_verify_identity": False},
        pool_pre_ping=True,
    )
    Session = sessionmaker(bind=engine)
    db = Session()

    try:
        # Find faculty
        query = db.query(Faculty)
        if email:
            faculty = query.filter(Faculty.email.ilike(f"%{email.strip()}%")).first()
        elif scholar_id:
            faculty = query.filter(Faculty.google_scholar_id == scholar_id.strip()).first()
        elif orcid:
            faculty = query.filter(Faculty.orcid_id == orcid.strip()).first()
        elif name:
            faculty = query.filter(Faculty.name.ilike(f"%{name.strip()}%")).first()
        else:
            print("❌ Must provide at least one of: --scholar-id, --email, --name, or --orcid")
            return

        if not faculty:
            print(f"❌ Faculty not found with provided criteria (scholar_id={scholar_id}, email={email}, name={name})")
            return

        print(f"✅ Found Faculty: ID {faculty.faculty_id} — {faculty.name} ({faculty.email})")

        # Update scholar_id if given
        target_scholar_id = scholar_id or faculty.google_scholar_id
        if scholar_id and faculty.google_scholar_id != scholar_id:
            faculty.google_scholar_id = scholar_id
            db.commit()
            print(f"   Updated google_scholar_id to: {scholar_id}")

        if not target_scholar_id:
            print("⚠️ No Google Scholar ID associated with this faculty. Please provide --scholar-id.")
            return

        # Fetch works
        print(f"\n📡 Fetching Google Scholar data for ID '{target_scholar_id}'...")
        data = scholar_sync.fetch_scholar_data(
            target_scholar_id,
            author_name=faculty.name,
            orcid_id=faculty.orcid_id
        )

        publications = data.get("publications", [])
        h_index = data.get("h_index", 0)
        i10_index = data.get("i10_index", 0)
        citedby = data.get("citedby", 0)

        print(f"📊 Retrieved {len(publications)} publications (h-index: {h_index}, i10-index: {i10_index}, Citations: {citedby})")

        now = datetime.now()
        existing_pubs = db.query(Publication).filter(Publication.faculty_id == faculty.faculty_id).all()
        existing_titles = {p.title.strip().lower() for p in existing_pubs if p.title}

        inserted_count = 0
        for idx, p in enumerate(publications):
            title = (p.get("title") or "").strip()
            if not title:
                continue

            # Check if this exact paper is already in DB for this faculty
            if title.lower() in existing_titles:
                continue

            cit = p.get("citations_count", 0)
            quartile = "Q1" if cit >= 30 else ("Q2" if cit >= 10 else ("Q3" if cit >= 3 else "Q4"))
            topic = fast_classify_topic(title)

            new_pub = Publication(
                faculty_id       = faculty.faculty_id,
                title            = title,
                journal_name     = p.get("journal_name") or "Academic Proceedings",
                doi              = p.get("doi"),
                indexing         = "Scopus" if cit >= 5 else "Google Scholar",
                quartile         = quartile,
                year             = p.get("year") or now.year,
                citations_count  = cit,
                ml_topic         = topic,
                impact_factor    = 0.0,
                publication_type = p.get("publication_type") or "Journal",
                authors          = p.get("authors") or faculty.name,
                source_platform  = "google_scholar",
                source_id        = p.get("source_id") or f"gs_{idx+1}",
                external_url     = f"https://scholar.google.com/citations?user={target_scholar_id}",
                sync_timestamp   = now,
            )
            db.add(new_pub)
            db.flush()

            db.add(PublicationSource(
                pub_id         = new_pub.pub_id,
                platform       = "google_scholar",
                source_id      = new_pub.source_id,
                external_url   = new_pub.external_url,
                sync_timestamp = now,
            ))
            existing_titles.add(title.lower())
            inserted_count += 1

        # Update metrics
        if h_index:
            faculty.h_index = float(h_index)
        if i10_index:
            faculty.i10_index = float(i10_index)
        if citedby:
            faculty.total_citations = int(citedby)

        total_p = db.query(Publication).filter(Publication.faculty_id == faculty.faculty_id).count()
        faculty.total_publications = total_p
        faculty.google_scholar_sync_status = "synced"

        # Update yearly citations
        cur_year = now.year
        cy = db.query(CitationYearly).filter(
            CitationYearly.faculty_id == faculty.faculty_id,
            CitationYearly.year == cur_year
        ).first()
        if cy:
            cy.citations_count = faculty.total_citations
        else:
            db.add(CitationYearly(
                faculty_id=faculty.faculty_id,
                year=cur_year,
                citations_count=faculty.total_citations,
            ))

        db.commit()
        print(f"\n🎉 Successfully synced {inserted_count} new publications for {faculty.name}!")
        print(f"   Total Publications: {faculty.total_publications}")
        print(f"   Total Citations:    {faculty.total_citations}")
        print(f"   H-Index:            {faculty.h_index}")
        print(f"   i10-Index:          {faculty.i10_index}")

    except Exception as e:
        db.rollback()
        print(f"❌ Sync failed: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Sync Google Scholar for a faculty member")
    parser.add_argument("--scholar-id", help="12-character Google Scholar user ID")
    parser.add_argument("--email", help="Faculty registered email address")
    parser.add_argument("--name", help="Faculty name")
    parser.add_argument("--orcid", help="ORCID iD")
    parser.add_argument("--password", help="Aiven DB password override")
    args = parser.parse_args()

    sync_faculty(
        scholar_id=args.scholar_id,
        email=args.email,
        name=args.name,
        orcid=args.orcid,
        db_pass=args.password
    )
