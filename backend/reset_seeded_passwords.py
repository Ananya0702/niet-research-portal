"""Bulk-reset portal accounts that still use a known weak default password.

Only accounts whose CURRENT password is one of the known weak defaults are
touched:
    * 'password123'  - the seeded faculty/HOD/Dean password
    * 'admin123'     - the auto-seeded admin password

Accounts that already have an individual password are left untouched unless
--include-all is passed.

The new passwords are written to a local CSV (git-ignored) so they can be
distributed, and each affected session is invalidated by bumping
token_version.

Usage:
    python reset_seeded_passwords.py                       # dry run
    python reset_seeded_passwords.py --apply               # perform the reset
    python reset_seeded_passwords.py --apply --include-all # also reset custom-password accounts
    python reset_seeded_passwords.py --apply --require-change
        # forces a password change at next login (only for accounts with a
        # working email - the OTP reset mail must be deliverable)

Never commit the generated CSV - it contains plaintext passwords.
"""

import argparse
import csv
import os
import secrets
import string
import sys
from datetime import datetime

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal
from app.models import Faculty
from app.routers.admin import Admin
from app.security import get_password_hash, verify_password
from app.password_policy import SPECIAL_CHARS, check_policy

WEAK_DEFAULTS = ("password123", "admin123")
CSV_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                        "credentials_reset_%s.csv")


def generate_password() -> str:
    """Policy-compliant random password (8-64 chars, upper, lower, digit, special)."""
    specials = "".join(sorted(SPECIAL_CHARS))
    while True:
        core = "".join(secrets.choice(string.ascii_letters + string.digits) for _ in range(9))
        pwd = "Ni#" + core + secrets.choice(string.ascii_uppercase) \
            + secrets.choice(string.digits) + secrets.choice(specials)
        if all(check_policy(pwd).values()):
            return pwd


def is_weak(account_hash: str) -> bool:
    return any(verify_password(p, account_hash) for p in WEAK_DEFAULTS)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--apply", action="store_true",
                    help="actually change passwords (default is a dry run)")
    ap.add_argument("--include-all", action="store_true",
                    help="also reset accounts that have individual passwords")
    ap.add_argument("--require-change", action="store_true",
                    help="force a password change at next login (needs a deliverable email)")
    args = ap.parse_args()

    db = SessionLocal()
    now = datetime.now()
    rows = []

    try:
        # ── Admin ─────────────────────────────────────────────────────
        for admin in db.query(Admin).all():
            if args.include_all or is_weak(admin.password_hash):
                rows.append({
                    "kind": "admin",
                    "email": admin.email,
                    "name": admin.username,
                    "role": "admin",
                    "weak": is_weak(admin.password_hash),
                    "hash": admin.password_hash,
                    "obj": admin,
                })

        # ── Faculty / HOD / Dean ──────────────────────────────────────
        for fac in db.query(Faculty).all():
            if args.include_all or is_weak(fac.password_hash):
                rows.append({
                    "kind": "faculty",
                    "email": fac.email,
                    "name": fac.name,
                    "role": fac.role or "faculty",
                    "weak": is_weak(fac.password_hash),
                    "hash": fac.password_hash,
                    "obj": fac,
                })

        weak_count = sum(1 for r in rows if r["weak"])
        print(f"\nAccounts selected : {len(rows)}  (weak-default: {weak_count})")
        if not rows:
            print("Nothing to reset.\n")
            return

        if not args.apply:
            print("\nDry run - no changes made. Affected accounts:\n")
            for r in rows:
                flag = "WEAK DEFAULT" if r["weak"] else "custom password"
                print(f"  {r['role']:<9} {str(r['email']):<40} [{flag}]"
                      f"{'  INACTIVE' if getattr(r['obj'], 'is_active', True) is False else ''}")
            print("\nRe-run with --apply to perform the reset.\n")
            return

        # ── Apply ─────────────────────────────────────────────────────
        stamp = now.strftime("%Y%m%d_%H%M%S")
        csv_path = CSV_PATH % stamp
        out = []
        for r in rows:
            new_pwd = generate_password()
            obj = r["obj"]
            obj.password_hash = get_password_hash(new_pwd)
            if r["kind"] == "faculty":
                obj.last_password_changed = now
                obj.password_history = "[]"
                obj.token_version = (obj.token_version or 0) + 1
                if args.require_change:
                    obj.force_password_reset = True
            out.append({
                "email": r["email"],
                "name": r["name"],
                "role": r["role"],
                "new_password": new_pwd,
                "must_change_at_login": "yes" if args.require_change else "no",
            })
            print(f"  reset {r['role']:<9} {r['email']}")

        db.commit()

        with open(csv_path, "w", newline="", encoding="utf-8") as fh:
            w = csv.DictWriter(fh, fieldnames=["email", "name", "role",
                                               "new_password", "must_change_at_login"])
            w.writeheader()
            w.writerows(out)

        print(f"\n{len(out)} account(s) updated.")
        print(f"Credentials written to: {csv_path}")
        print("This file contains plaintext passwords - share it securely and delete it afterwards.\n")
    finally:
        db.close()


if __name__ == "__main__":
    main()
