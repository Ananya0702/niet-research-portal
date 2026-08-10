from sqlalchemy import text
from app.database import engine

# (table, column, ddl) — idempotent ALTER TABLE ADD COLUMN for existing tables.
ADD_MIGRATIONS = [
    ("faculty", "phone",             "VARCHAR(20)"),
    ("faculty", "dob",               "DATE"),
    ("faculty", "gender",            "VARCHAR(20)"),
    ("faculty", "nationality",       "VARCHAR(50)"),
    ("faculty", "employee_id",       "VARCHAR(50)"),
    ("faculty", "qualification",     "VARCHAR(200)"),
    ("faculty", "orcid_id",          "VARCHAR(50)"),
    ("faculty", "current_position",  "VARCHAR(100)"),
    ("faculty", "office_address",    "VARCHAR(255)"),
    ("faculty", "institution",       "VARCHAR(100)"),
    ("faculty", "specialization",    "VARCHAR(200)"),
    ("faculty", "research_interests","TEXT"),
    ("faculty", "biography",         "TEXT"),
    ("faculty", "languages_spoken",  "VARCHAR(255)"),
    ("faculty", "scopus_author_id",  "VARCHAR(50)"),
    ("faculty", "scholar_connected", "TINYINT(1)"),
    ("faculty", "orcid_connected",   "TINYINT(1)"),
    ("faculty", "scopus_connected",  "TINYINT(1)"),
    ("faculty", "scholar_sync_status", "VARCHAR(20)"),
    ("faculty", "orcid_sync_status",   "VARCHAR(20)"),
    ("faculty", "scopus_sync_status",  "VARCHAR(20)"),
    ("faculty", "last_scholar_sync",   "DATETIME"),
    ("faculty", "last_orcid_sync",     "DATETIME"),
    ("faculty", "last_scopus_sync",    "DATETIME"),
    ("faculty", "mobile_number",       "VARCHAR(20)"),
    ("faculty", "mobile_country_code", "VARCHAR(6)"),
    ("faculty", "email_verified",      "TINYINT(1)"),
    ("faculty", "mobile_verified",     "TINYINT(1)"),
    ("faculty", "otp_hash",            "VARCHAR(255)"),
    ("faculty", "otp_expiry",          "DATETIME"),
    ("faculty", "otp_attempts",        "INTEGER"),
    ("faculty", "otp_resend_count",    "INTEGER"),
    ("faculty", "otp_last_sent",       "DATETIME"),
    ("faculty", "otp_method",          "VARCHAR(10)"),
    ("faculty", "last_password_changed","DATETIME"),
    ("faculty", "password_history",    "TEXT"),
    ("faculty", "failed_attempts",     "INTEGER"),
    ("faculty", "lock_until",          "DATETIME"),
    ("faculty", "token_version",       "INTEGER"),
    ("faculty", "force_password_reset","TINYINT(1)"),
    ("faculty", "updated_at",          "DATETIME"),
    ("publications", "authors",             "VARCHAR(1000)"),
    ("publications", "source_platform",     "VARCHAR(30)"),
    ("publications", "source_id",           "VARCHAR(200)"),
    ("publications", "external_url",        "VARCHAR(500)"),
    ("publications", "sync_timestamp",      "DATETIME"),
    ("achievements", "description",       "TEXT"),
    ("achievements", "achievement_date",  "DATE"),
    ("achievements", "certificate_url",   "VARCHAR(500)"),
    ("announcement_reads", "admin_id",     "INTEGER"),
    ("announcements_v2", "created_by_admin_id", "INTEGER"),
    ("announcements_v2", "updated_by",     "INTEGER"),
    ("announcements_v2", "published_at",   "DATETIME"),
    ("announcements_v2", "delivery_count", "INTEGER"),
    ("announcements_v2", "target_roles",       "JSON"),
    ("announcements_v2", "target_school_ids",  "JSON"),
    ("announcements_v2", "target_dept_ids",    "JSON"),
]

# (ddl) — idempotent CREATE TABLE IF NOT EXISTS for new tables.
CREATE_MIGRATIONS = [
    (
        "security_audit_logs",
        """CREATE TABLE IF NOT EXISTS security_audit_logs (
            log_id       INT AUTO_INCREMENT PRIMARY KEY,
            faculty_id   INT NULL,
            action       VARCHAR(60) NOT NULL,
            ip_address   VARCHAR(60) NULL,
            user_agent   VARCHAR(300) NULL,
            device       VARCHAR(60) NULL,
            browser      VARCHAR(60) NULL,
            method       VARCHAR(10) NULL,
            status       VARCHAR(10) DEFAULT 'success',
            detail       VARCHAR(500) NULL,
            created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_sal_faculty (faculty_id),
            INDEX idx_sal_action (action),
            INDEX idx_sal_created (created_at)
        )""",
    ),
    (
        "announcement_notifications",
        """CREATE TABLE IF NOT EXISTS announcement_notifications (
            notification_id  INT AUTO_INCREMENT PRIMARY KEY,
            announcement_id  INT NOT NULL,
            faculty_id       INT NULL,
            admin_id         INT NULL,
            is_read          TINYINT(1) NOT NULL DEFAULT 0,
            read_at          DATETIME NULL,
            delivered_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_notif_announcement (announcement_id),
            INDEX idx_notif_faculty (faculty_id),
            INDEX idx_notif_admin (admin_id),
            INDEX idx_notif_read (is_read)
        )""",
    ),
    (
        "publication_sources",
        """CREATE TABLE IF NOT EXISTS publication_sources (
            id             INT AUTO_INCREMENT PRIMARY KEY,
            pub_id         INT NOT NULL,
            platform       VARCHAR(30) NOT NULL,
            source_id      VARCHAR(200) NULL,
            external_url   VARCHAR(500) NULL,
            sync_timestamp DATETIME NULL,
            INDEX idx_ps_pub (pub_id),
            INDEX idx_ps_platform (platform),
            UNIQUE KEY uq_ps_pub_platform (pub_id, platform)
        )""",
    ),
]

# (table, column, ddl) — idempotent ALTER TABLE MODIFY COLUMN (type change).
MODIFY_MIGRATIONS = [
    ("faculty_academic_links", "platform", "VARCHAR(100)"),
    ("faculty_social_links",   "platform", "VARCHAR(100)"),
]


def _column_exists(conn, table, column):
    return conn.execute(
        text(
            "SELECT COUNT(*) FROM information_schema.COLUMNS "
            "WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = :t AND COLUMN_NAME = :c"
        ),
        {"t": table, "c": column},
    ).scalar()


def _column_type(conn, table, column):
    row = conn.execute(
        text(
            "SELECT COLUMN_TYPE FROM information_schema.COLUMNS "
            "WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = :t AND COLUMN_NAME = :c"
        ),
        {"t": table, "c": column},
    ).first()
    return str(row[0]).upper() if row else None


def run_migrations():
    with engine.begin() as conn:
        for table, column, ddl in ADD_MIGRATIONS:
            if not _column_exists(conn, table, column):
                conn.execute(text(f"ALTER TABLE `{table}` ADD COLUMN `{column}` {ddl} NULL"))
                print(f"[MIGRATION] added {table}.{column} {ddl}")

        for table, column, ddl in MODIFY_MIGRATIONS:
            current = _column_type(conn, table, column)
            target = ddl.upper()
            if current and current != target and not current.startswith(target):
                conn.execute(text(f"ALTER TABLE `{table}` MODIFY COLUMN `{column}` {ddl} NULL"))
                print(f"[MIGRATION] modified {table}.{column} {current} -> {target}")

        for table, ddl in CREATE_MIGRATIONS:
            conn.execute(text(ddl))
            print(f"[MIGRATION] ensured table {table}")
