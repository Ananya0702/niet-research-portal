from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, EmailStr
from dotenv import load_dotenv

import os
import secrets
import smtplib
from email.message import EmailMessage
from datetime import datetime, timedelta
from urllib.parse import urlencode


# Load .env file
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

app = FastAPI(title="Email OTP API")


# Gmail credentials from .env
EMAIL_ADDRESS = os.getenv("EMAIL_ADDRESS")
EMAIL_APP_PASSWORD = os.getenv("EMAIL_APP_PASSWORD")
ALLOW_IN_APP_FALLBACK = (os.getenv("OTP_ALLOW_IN_APP_FALLBACK") or "").lower() in {"1", "true", "yes"}
PORTAL_URL = (os.getenv("PORTAL_URL") or "").strip().rstrip("/")


# Temporary OTP storage
otp_storage = {}


# Request model for sending OTP
class OTPRequest(BaseModel):
    email: EmailStr
    purpose: str = "account verification"


# Request model for verifying OTP
class VerifyOTPRequest(BaseModel):
    email: EmailStr
    otp: str


@app.get("/")
def home():
    return {
        "message": "Email OTP API is running!"
    }


@app.post("/send-otp")
def send_otp(request: OTPRequest):

    email = str(request.email).strip().lower()
    is_activation = request.purpose == "account_activation"
    if is_activation and not PORTAL_URL:
        raise HTTPException(status_code=503, detail="PORTAL_URL is not configured on the OTP service.")

    # Generate a 6-digit OTP
    otp = str(secrets.randbelow(900000) + 100000)

    # OTP expires after 5 minutes
    expiry_time = datetime.now() + timedelta(minutes=5)

    # Store OTP
    otp_storage[email] = {
        "otp": otp,
        "expires_at": expiry_time,
        "attempts": 0,
    }

    # Create email
    message = EmailMessage()

    message["Subject"] = ("Set up your NIET Research Portal account" if is_activation
                          else "Your OTP Verification Code")
    message["From"] = EMAIL_ADDRESS or "NIET Research Portal <no-reply@niet.co.in>"
    message["To"] = email

    setup_link = (f"{PORTAL_URL}/forgot-password?{urlencode({'activation': '1', 'email': email})}"
                  if is_activation else "")
    purpose_text = "activate your account and set your password" if is_activation else request.purpose
    message.set_content(
        f"""
Hello,

Your OTP to {purpose_text} is:

{otp}

This OTP is valid for 5 minutes. Enter it on the NIET Research Portal.
{f'Open account setup: {setup_link}' if is_activation else ''}

If you did not request this OTP, please ignore this email.

Regards,
OTP Verification System
"""
    )

    try:
        if not EMAIL_ADDRESS or not EMAIL_APP_PASSWORD or EMAIL_ADDRESS == "your_email@gmail.com":
            raise RuntimeError("OTP email credentials are not configured")
        with smtplib.SMTP("smtp.gmail.com", 587, timeout=15) as server:
            server.ehlo()
            server.starttls()
            server.ehlo()
            server.login(EMAIL_ADDRESS, EMAIL_APP_PASSWORD)
            server.send_message(message)
        return {"success": True, "delivery": "email", "message": "OTP sent to your registered email."}
    except Exception as e:
        if ALLOW_IN_APP_FALLBACK:
            return {
                "success": True,
                "delivery": "in_app_fallback",
                "message": "Email delivery is unavailable. Use the temporary code shown on this screen.",
                "fallback_code": otp,
            }
        otp_storage.pop(email, None)
        raise HTTPException(status_code=503, detail="OTP email delivery failed. Please contact the administrator.") from e


@app.post("/verify-otp")
def verify_otp(request: VerifyOTPRequest):

    email = request.email
    entered_otp = request.otp

    # Check if OTP exists
    if email not in otp_storage:
        raise HTTPException(
            status_code=400,
            detail="OTP not found. Please request a new OTP."
        )

    saved_data = otp_storage[email]

    if saved_data.get("attempts", 0) >= 5:
        del otp_storage[email]
        raise HTTPException(status_code=400, detail="Too many invalid attempts. Please request a new OTP.")

    saved_otp = saved_data["otp"]
    expiry_time = saved_data["expires_at"]

    # Check expiry
    if datetime.now() > expiry_time:

        del otp_storage[email]

        raise HTTPException(
            status_code=400,
            detail="OTP expired. Please request a new OTP."
        )

    # Check OTP
    if entered_otp != saved_otp:
        saved_data["attempts"] = saved_data.get("attempts", 0) + 1

        raise HTTPException(
            status_code=400,
            detail="Invalid OTP. Please try again."
        )

    # OTP is valid, remove it after successful verification
    del otp_storage[email]

    return {
        "success": True,
        "message": "OTP verified successfully"
    }
