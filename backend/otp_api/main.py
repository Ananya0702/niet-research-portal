from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, EmailStr
from dotenv import load_dotenv

import os
import random
import smtplib
from email.message import EmailMessage
from datetime import datetime, timedelta


# Load .env file
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

app = FastAPI(title="Email OTP API")


# Gmail credentials from .env
EMAIL_ADDRESS = os.getenv("EMAIL_ADDRESS")
EMAIL_APP_PASSWORD = os.getenv("EMAIL_APP_PASSWORD")


# Temporary OTP storage
otp_storage = {}


# Request model for sending OTP
class OTPRequest(BaseModel):
    email: EmailStr


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

    email = request.email

    # Generate a 6-digit OTP
    otp = str(random.randint(100000, 999999))

    # OTP expires after 5 minutes
    expiry_time = datetime.now() + timedelta(minutes=5)

    # Store OTP
    otp_storage[email] = {
        "otp": otp,
        "expires_at": expiry_time
    }

    # Create email
    message = EmailMessage()

    message["Subject"] = "Your OTP Verification Code"
    message["From"] = EMAIL_ADDRESS
    message["To"] = email

    message.set_content(
        f"""
Hello,

Your OTP for verification is:

{otp}

This OTP is valid for 5 minutes.

If you did not request this OTP, please ignore this email.

Regards,
OTP Verification System
"""
    )

    try:
        # Local/dev bypass: if credentials missing or placeholders, skip actual email sending
        if not EMAIL_ADDRESS or not EMAIL_APP_PASSWORD or \
           EMAIL_ADDRESS == "your_email@gmail.com" or \
           EMAIL_APP_PASSWORD == "your_gmail_app_password":
            print(f"[DEV OTP] {email} -> {otp} (expires {expiry_time})")
            return {
                "success": True,
                "message": "OTP sent successfully (dev mode)"
            }

        # Connect to Gmail SMTP
        with smtplib.SMTP("smtp.gmail.com", 587) as server:

            server.starttls()

            # Login using Gmail App Password
            server.login(
                EMAIL_ADDRESS,
                EMAIL_APP_PASSWORD
            )

            # Send email
            server.send_message(message)

        return {
            "success": True,
            "message": "OTP sent successfully"
        }

    except Exception as e:

        # Remove OTP if sending failed
        otp_storage.pop(email, None)

        raise HTTPException(
            status_code=500,
            detail=f"Failed to send OTP: {str(e)}"
        )


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
