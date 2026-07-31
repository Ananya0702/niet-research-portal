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
