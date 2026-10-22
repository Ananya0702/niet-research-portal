"""Export the local MySQL database to a .sql file for import into managed MySQL.

The bundled NIET_Research_Seed_Data.sql only seeds 4 tables (faculty,
publications, citations_yearly, faculty_research_areas) and predates the
current schema. This script dumps the ENTIRE live database - schools,
departments, publications, publication_sources, projects, patents,
achievements, admin, activity and audit logs - so a fresh managed MySQL
(Aiven / Railway / PlanetScale) comes up identical to local.

Usage:
    python export_database.py                 # -> backend/NIET_Research_Full_Dump.sql
    python export_database.py --output other.sql

The dump contains password hashes and personal data: never commit it and
delete it once the import is verified.
"""

import argparse
import os
import shutil
import subprocess
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from app.database import DATABASE_URL
from sqlalchemy.engine import make_url

BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
DEFAULT_OUT = os.path.join(BACKEND_DIR, "NIET_Research_Full_Dump.sql")

MYSQLDUMP_CANDIDATES = [
    r"C:\Program Files\MySQL\MySQL Server 8.0\bin\mysqldump.exe",
    r"C:\Program Files\MySQL\MySQL Server 8.4\bin\mysqldump.exe",
    r"C:\xampp\mysql\bin\mysqldump.exe",
    "/usr/bin/mysqldump",
    "/usr/local/bin/mysqldump",
]


def find_mysqldump() -> str:
    found = shutil.which("mysqldump")
    if found:
        return found
    for path in MYSQLDUMP_CANDIDATES:
        if os.path.exists(path):
            return path
    raise SystemExit(
        "mysqldump not found. Install MySQL Server (or MySQL Shell) and retry, "
        "or dump the database from MySQL Workbench instead."
    )


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--output", default=DEFAULT_OUT)
    args = ap.parse_args()

    dump_bin = find_mysqldump()
    out_path = os.path.abspath(args.output)

    # The password in .env is URL-encoded (the app builds its connection URL by
    # string concatenation). Decode it exactly the way SQLAlchemy does, so the
    # CLI tools get the real password instead of the encoded form.
    url = make_url(DATABASE_URL)
    host, port = url.host, url.port or 3306
    user, password = url.username, url.password or ""
    db_name = url.database

    cmd = [
        dump_bin,
        f"--host={host}",
        f"--port={port}",
        f"--user={user}",
        "--single-transaction",
        "--skip-lock-tables",
        "--no-tablespaces",
        "--routines",
        "--triggers",
        "--events",
        "--set-gtid-purged=OFF",
        "--default-character-set=utf8mb4",
        "--hex-blob",
        f"--result-file={out_path}",
        db_name,
    ]

    # Pass the password via MYSQL_PWD so it never appears in the process args.
    env = dict(os.environ, MYSQL_PWD=password)

    print(f"Dumping '{db_name}' from {host}:{port} ...")
    proc = subprocess.run(cmd, capture_output=True, text=True, env=env)
    if proc.returncode != 0:
        sys.stderr.write(proc.stderr)
        raise SystemExit(f"mysqldump failed with code {proc.returncode}")

    size_kb = os.path.getsize(out_path) / 1024
    print(f"OK -> {out_path}  ({size_kb:,.0f} KB)")

    print("\nImport into managed MySQL (Aiven):")
    print(f"  mysql -h <host> -P <port> -u avnadmin -p --ssl-mode=REQUIRED \\")
    print(f"        {db_name} < \"{os.path.basename(out_path)}\"")
    print("  (MySQL Workbench: open the dump file and run it against the target schema)")
    print("\nDo NOT commit this file - it contains password hashes and personal data.")


if __name__ == "__main__":
    main()
