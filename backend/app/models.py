from sqlalchemy import Column, Integer, String, Float, Boolean, Text, Date, DateTime, Enum, ForeignKey
from sqlalchemy.dialects.mysql import LONGTEXT
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
    school_id         = Column(Integer, ForeignKey("schools.school_id"), nullable=True)
    name              = Column(String(100))
    email             = Column(String(150), unique=True, index=True)
    password_hash     = Column(String(255))
    role              = Column(String(20), default="faculty")
    designation       = Column(String(100))
    is_phd            = Column(Boolean, default=False)
    joining_year      = Column(Integer)
    google_scholar_id = Column(String(50))
    scopus_author_id  = Column(String(50))
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

    # ── Extended profile fields ──
    phone              = Column(String(20))
    dob                = Column(Date, nullable=True)
    gender             = Column(String(20))
    nationality        = Column(String(50))
    employee_id        = Column(String(50))
    qualification      = Column(String(200))
    orcid_id           = Column(String(50))
    current_position   = Column(String(100))
    office_address     = Column(String(255))
    institution        = Column(String(100))
    specialization     = Column(String(200))
    research_interests = Column(Text)
    biography          = Column(Text)
    languages_spoken   = Column(String(255))

    # ── Research platform sync state ──
    scholar_connected    = Column(Boolean, default=False)
    orcid_connected      = Column(Boolean, default=False)
    scopus_connected     = Column(Boolean, default=False)
    scholar_sync_status  = Column(String(20), default="idle")   # idle | running | done | error
    orcid_sync_status    = Column(String(20), default="idle")
    scopus_sync_status   = Column(String(20), default="idle")
    last_scholar_sync    = Column(DateTime, nullable=True)
    last_orcid_sync      = Column(DateTime, nullable=True)
    last_scopus_sync     = Column(DateTime, nullable=True)

    # ── Account security ──
    mobile_number        = Column(String(20), nullable=True)
    mobile_country_code  = Column(String(6), nullable=True)   # e.g. +91
    email_verified       = Column(Boolean, default=False)
    mobile_verified      = Column(Boolean, default=False)
    otp_hash             = Column(String(255), nullable=True)
    otp_expiry           = Column(DateTime, nullable=True)
    otp_attempts         = Column(Integer, default=0)
    otp_resend_count     = Column(Integer, default=0)
    otp_last_sent        = Column(DateTime, nullable=True)
    otp_method           = Column(String(10), nullable=True)   # email | mobile
    last_password_changed= Column(DateTime, nullable=True)
    password_history     = Column(Text, nullable=True)         # JSON array of hashed past passwords
    failed_attempts      = Column(Integer, default=0)
    lock_until           = Column(DateTime, nullable=True)
    token_version        = Column(Integer, default=0)          # bumped to invalidate all sessions
    force_password_reset = Column(Boolean, default=False)
    updated_at           = Column(DateTime, onupdate=func.now())

    department     = relationship("Department", back_populates="faculty",
                                   foreign_keys=[dept_id])
    publications   = relationship("Publication", back_populates="faculty")
    citations      = relationship("CitationYearly", back_populates="faculty")
    research_areas = relationship("FacultyResearchArea", back_populates="faculty")
    achievements   = relationship("Achievement", back_populates="faculty")
    projects       = relationship("Project", back_populates="faculty")
    patents        = relationship("Patent", back_populates="faculty")
    education      = relationship("FacultyEducation", back_populates="faculty",
                                  cascade="all, delete-orphan")
    experience     = relationship("FacultyExperience", back_populates="faculty",
                                  cascade="all, delete-orphan")
    certifications = relationship("FacultyCertification", back_populates="faculty",
                                  cascade="all, delete-orphan")
    academic_links = relationship("FacultyAcademicLink", back_populates="faculty",
                                  cascade="all, delete-orphan")
    social_links   = relationship("FacultySocialLink", back_populates="faculty",
                                  cascade="all, delete-orphan")

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
    authors           = Column(String(1000), nullable=True)

    # ── Research platform provenance ──
    source_platform   = Column(String(30), default="manual")  # google_scholar | orcid | scopus | manual
    source_id         = Column(String(200), nullable=True)    # provider-native id (orcid work put-code, scopus eid, ...)
    external_url      = Column(String(500), nullable=True)    # canonical link on the provider
    sync_timestamp    = Column(DateTime, nullable=True)
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

class PublicationSource(Base):
    """Maps a publication to every research platform it was found on.
    A single merged publication can be available on multiple platforms."""
    __tablename__ = "publication_sources"
    id              = Column(Integer, primary_key=True)
    pub_id          = Column(Integer, ForeignKey("publications.pub_id"))
    platform        = Column(String(30))   # google_scholar | orcid | scopus | manual
    source_id       = Column(String(200), nullable=True)
    external_url    = Column(String(500), nullable=True)
    sync_timestamp  = Column(DateTime, nullable=True)

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
    achievement_id  = Column(Integer, primary_key=True)
    faculty_id      = Column(Integer, ForeignKey("faculty.faculty_id"))
    title           = Column(String(300))
    category        = Column(String(50))
    issuer          = Column(String(200))
    year            = Column(Integer)
    amount          = Column(Float, nullable=True)
    description     = Column(Text)
    achievement_date = Column(Date, nullable=True)
    certificate_url = Column(String(500))
    faculty         = relationship("Faculty", back_populates="achievements")

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

class FacultyEducation(Base):
    __tablename__ = "faculty_education"
    education_id = Column(Integer, primary_key=True)
    faculty_id   = Column(Integer, ForeignKey("faculty.faculty_id"))
    degree       = Column(String(150))
    university   = Column(String(200))
    institute    = Column(String(200))
    year         = Column(Integer)
    percentage   = Column(Float, nullable=True)
    description  = Column(Text)
    faculty      = relationship("Faculty", back_populates="education")

class FacultyExperience(Base):
    __tablename__ = "faculty_experience"
    experience_id = Column(Integer, primary_key=True)
    faculty_id    = Column(Integer, ForeignKey("faculty.faculty_id"))
    organization  = Column(String(200))
    position      = Column(String(150))
    start_date    = Column(Date, nullable=True)
    end_date      = Column(Date, nullable=True)
    is_current    = Column(Boolean, default=False)
    description   = Column(Text)
    faculty       = relationship("Faculty", back_populates="experience")

class FacultyCertification(Base):
    __tablename__ = "faculty_certifications"
    cert_id        = Column(Integer, primary_key=True)
    faculty_id     = Column(Integer, ForeignKey("faculty.faculty_id"))
    name           = Column(String(200))
    issuing_org    = Column(String(200))
    issue_date     = Column(Date, nullable=True)
    expiry_date    = Column(Date, nullable=True)
    credential_id  = Column(String(100))
    credential_url = Column(String(500))
    certificate_url = Column(String(500))
    faculty        = relationship("Faculty", back_populates="certifications")

class FacultyAcademicLink(Base):
    __tablename__ = "faculty_academic_links"
    link_id      = Column(Integer, primary_key=True)
    faculty_id   = Column(Integer, ForeignKey("faculty.faculty_id"))
    platform     = Column(String(50))  # google_scholar | scopus | orcid | publons | wos
    url          = Column(String(500))
    is_connected = Column(Boolean, default=False)
    faculty      = relationship("Faculty", back_populates="academic_links")

class FacultySocialLink(Base):
    __tablename__ = "faculty_social_links"
    link_id    = Column(Integer, primary_key=True)
    faculty_id = Column(Integer, ForeignKey("faculty.faculty_id"))
    platform   = Column(String(50))  # linkedin | twitter | researchgate | github | website
    url        = Column(String(500))
    faculty    = relationship("Faculty", back_populates="social_links")


class SecurityAuditLog(Base):
    """Security audit trail for logins, OTPs and password changes."""
    __tablename__ = "security_audit_logs"
    log_id           = Column(Integer, primary_key=True)
    faculty_id       = Column(Integer, ForeignKey("faculty.faculty_id"), nullable=True)
    action           = Column(String(60))    # login_success | login_failed | account_locked | otp_generated | otp_verified | otp_failed | password_changed | password_reset | forced_reset | contact_verified
    ip_address       = Column(String(60), nullable=True)
    user_agent       = Column(String(300), nullable=True)
    device           = Column(String(60), nullable=True)
    browser          = Column(String(60), nullable=True)
    method           = Column(String(10), nullable=True)   # email | mobile
    status           = Column(String(10), default="success")  # success | failed
    detail           = Column(String(500), nullable=True)
    created_at       = Column(DateTime, server_default=func.now())