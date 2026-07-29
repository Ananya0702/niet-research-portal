from sqlalchemy import Column, Integer, String, Float, Boolean, Text, Date, DateTime, Enum, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base

class School(Base):
    __tablename__ = "schools"
    school_id   = Column(Integer, primary_key=True, index=True)
    school_name = Column(String(100), unique=True)
    created_at  = Column(DateTime, server_default=func.now())
    departments = relationship("Department", back_populates="school")

class Department(Base):
    __tablename__ = "departments"
    dept_id          = Column(Integer, primary_key=True, index=True)
    school_id        = Column(Integer, ForeignKey("schools.school_id"), nullable=True)
    dept_code        = Column(String(20), unique=True)
    dept_name        = Column(String(100))
    hod_faculty_id   = Column(Integer, nullable=True)
    established_year = Column(Integer)
    school           = relationship("School", back_populates="departments")
    faculty          = relationship("Faculty", back_populates="department",
                                    foreign_keys="Faculty.dept_id")

class Faculty(Base):
    __tablename__ = "faculty"
    faculty_id        = Column(Integer, primary_key=True, index=True)
    dept_id           = Column(Integer, ForeignKey("departments.dept_id"), nullable=True)
    name              = Column(String(100))
    email             = Column(String(150), unique=True, index=True)
    password_hash     = Column(String(255))
    role              = Column(String(20), default="faculty")
    designation       = Column(String(100))
    is_phd            = Column(Boolean, default=False)
    joining_year      = Column(Integer)
    google_scholar_id = Column(String(50))
    h_index           = Column(Float, default=0)
    i10_index         = Column(Float, default=0)
    avg_impact_factor = Column(Float, default=0)
    research_score    = Column(Float, default=0)
    total_publications= Column(Integer, default=0)
    total_citations   = Column(Integer, default=0)
    profile_photo_url = Column(String(255))
    bio               = Column(Text)
    is_active         = Column(Boolean, default=True)
    created_at        = Column(DateTime, server_default=func.now())

    department     = relationship("Department", back_populates="faculty",
                                   foreign_keys=[dept_id])
    publications   = relationship("Publication", back_populates="faculty")
    citations      = relationship("CitationYearly", back_populates="faculty")
    research_areas = relationship("FacultyResearchArea", back_populates="faculty")
    achievements   = relationship("Achievement", back_populates="faculty")
    projects       = relationship("Project", back_populates="faculty")
    patents        = relationship("Patent", back_populates="faculty")

class Publication(Base):
    __tablename__ = "publications"
    pub_id            = Column(Integer, primary_key=True, index=True)
    faculty_id        = Column(Integer, ForeignKey("faculty.faculty_id"))
    title             = Column(String(500))
    journal_name      = Column(String(300))
    doi               = Column(String(200))
    indexing          = Column(String(20), default="None")
    quartile          = Column(String(5), default="N/A")
    impact_factor     = Column(Float, default=0)
    year              = Column(Integer)
    citations_count   = Column(Integer, default=0)
    ml_topic          = Column(String(100))
    publication_type  = Column(String(20))  # "Journal" or "Conference"
    abstract          = Column(Text)
    conference_name   = Column(String(300))
    conference_location = Column(String(200))
    publisher         = Column(String(200))
    volume            = Column(String(20))
    issue             = Column(String(20))
    pages             = Column(String(50))
    issn              = Column(String(20))
    isbn              = Column(String(20))
    keywords          = Column(String(500))
    research_area     = Column(String(100))
    sub_area          = Column(String(100))
    language          = Column(String(30), default="English")
    country           = Column(String(100))
    pdf_url           = Column(String(500))
    publication_url   = Column(String(500))
    dataset_url       = Column(String(500))
    github_url        = Column(String(500))
    status            = Column(String(30), default="Published")
    submission_date   = Column(Date)
    acceptance_date   = Column(Date)
    created_at        = Column(DateTime, server_default=func.now())
    updated_at        = Column(DateTime, onupdate=func.now())
    faculty           = relationship("Faculty", back_populates="publications")

class CitationYearly(Base):
    __tablename__ = "citations_yearly"
    id              = Column(Integer, primary_key=True)
    faculty_id      = Column(Integer, ForeignKey("faculty.faculty_id"))
    year            = Column(Integer)
    citations_count = Column(Integer, default=0)
    faculty         = relationship("Faculty", back_populates="citations")

class FacultyResearchArea(Base):
    __tablename__ = "faculty_research_areas"
    id                = Column(Integer, primary_key=True)
    faculty_id        = Column(Integer, ForeignKey("faculty.faculty_id"))
    area_name         = Column(String(100))
    pub_count         = Column(Integer, default=0)
    expertise_percent = Column(Float, default=0)
    faculty           = relationship("Faculty", back_populates="research_areas")

class Achievement(Base):
    __tablename__ = "achievements"
    achievement_id = Column(Integer, primary_key=True)
    faculty_id     = Column(Integer, ForeignKey("faculty.faculty_id"))
    title          = Column(String(300))
    category       = Column(String(50))
    issuer         = Column(String(200))
    year           = Column(Integer)
    amount         = Column(Float, nullable=True)
    faculty        = relationship("Faculty", back_populates="achievements")

class Project(Base):
    __tablename__ = "projects"
    project_id   = Column(Integer, primary_key=True)
    dept_id      = Column(Integer, ForeignKey("departments.dept_id"), nullable=True)
    faculty_id   = Column(Integer, ForeignKey("faculty.faculty_id"), nullable=True)
    title        = Column(String(300))
    sponsor_type = Column(String(50))
    sponsor_name = Column(String(200))
    amount_lakhs = Column(Float, default=0)
    status       = Column(String(20), default="Ongoing")
    start_date   = Column(Date)
    end_date     = Column(Date)
    faculty      = relationship("Faculty", back_populates="projects")

class Patent(Base):
    __tablename__ = "patents"

    patent_id = Column(Integer, primary_key=True)

    faculty_id = Column(Integer, ForeignKey("faculty.faculty_id"))

    title = Column(String(255))

    dept_code = Column(String(50), ForeignKey("departments.dept_code"))

    filing_date = Column(Date)

    grant_date = Column(Date)

    status = Column(String(20), default="Filed")

    application_number = Column(String(100))

    patent_number = Column(String(100))

    ipc_class = Column(String(50))

    description = Column(Text)

    department = Column(String(100))

    school = Column(String(100))

    ipr_type = Column(String(50))

    title_type = Column(String(30))

    publication_number = Column(String(100))

    year = Column(Integer)

    publication_date = Column(Date)

    faculty = relationship("Faculty", back_populates="patents")