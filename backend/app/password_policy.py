"""Password policy enforcement — strength, live validation and reuse checks."""

import json
import re
from typing import List

MIN_LENGTH = 8
MAX_LENGTH = 64
HISTORY_SIZE = 5

SPECIAL_CHARS = set("!@#$%^&*()-_=+[]{};:'\",.<>/?\\|`~")


def check_policy(password: str) -> dict:
    """Return dict of rule -> bool for live UI validation."""
    if not password:
        password = ""
    return {
        "length": MIN_LENGTH <= len(password) <= MAX_LENGTH,
        "uppercase": bool(re.search(r"[A-Z]", password)),
        "lowercase": bool(re.search(r"[a-z]", password)),
        "number": bool(re.search(r"[0-9]", password)),
        "special": any(c in SPECIAL_CHARS for c in password),
    }


def policy_errors(password: str) -> List[str]:
    rules = check_policy(password)
    errors = []
    if not rules["length"]:
        errors.append("Password must be 8–64 characters long.")
    if not rules["uppercase"]:
        errors.append("At least one uppercase letter is required.")
    if not rules["lowercase"]:
        errors.append("At least one lowercase letter is required.")
    if not rules["number"]:
        errors.append("At least one number is required.")
    if not rules["special"]:
        errors.append("At least one special character is required.")
    return errors


def password_strength(password: str) -> str:
    """Weak / Medium / Strong based on satisfied rules."""
    rules = check_policy(password)
    score = sum(1 for v in rules.values() if v)
    if score <= 2:
        return "Weak"
    if score <= 4:
        return "Medium"
    return "Strong"


def load_history(history: str) -> List[str]:
    if not history:
        return []
    try:
        data = json.loads(history)
        return data if isinstance(data, list) else []
    except Exception:
        return [h for h in str(history).split(",") if h]


def record_password(faculty, new_hash: str) -> None:
    """Add a hash to the password history ring buffer (keeps HISTORY_SIZE)."""
    history = load_history(faculty.password_history or "")
    history.append(new_hash)
    history = history[-HISTORY_SIZE:]
    faculty.password_history = json.dumps(history)


def is_reused(faculty, verify_password_fn, new_password: str, current_hash: str) -> bool:
    """True if the new password matches the current one or any of the last N."""
    if verify_password_fn(new_password, current_hash):
        return True
    for h in load_history(faculty.password_history or ""):
        try:
            if verify_password_fn(new_password, h):
                return True
        except Exception:
            continue
    return False
