# 🎓 NIET Research Portal

A full-stack **Faculty Research Analytics System** built for NIET institution to manage and visualize academic research performance across faculty, departments, and institution levels.

---

## 🚀 Features (Phase 1)

- 🔐 JWT Authentication system (Faculty Login)
- 👨‍🏫 Role-based access (Faculty / HOD / Dean ready)
- 📊 Faculty Research Dashboard API
- 📚 Publications, Projects, Patents tracking
- 📈 Citation & KPI analytics engine
- 🗄️ MySQL integrated backend
- ⚡ FastAPI RESTful backend

---

## 🏗️ Tech Stack

- **Backend:** FastAPI (Python)
- **Database:** MySQL
- **Auth:** JWT + bcrypt
- **ORM:** SQLAlchemy
- **Testing:** Swagger UI (/docs)

---

## 📊 System Architecture

Frontend → FastAPI Backend → MySQL Database  
Authentication via JWT tokens

---

## 🔐 Authentication Flow

1. Faculty logs in with email & password  
2. Password verified using bcrypt  
3. JWT token generated  
4. Token used for protected APIs  

---

## 📡 API Endpoints

### Auth
- POST `/auth/login`
- GET `/auth/me`

### Faculty Dashboard
- GET `/faculty/{id}/dashboard`

---

## 🧠 Dashboard Features

- Total Publications
- Citation Analytics
- H-index / I10-index tracking
- Research Areas breakdown
- Recent publications list
- Projects & Patents overview

---

## 📂 Project Structure
backend/app/
├── routers/
├── security.py
├── models.py
├── database.py
├── main.py

---

## ⚙️ Setup Instructions

```bash
git clone <repo-url>
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload

📌 Future Work (Phases)
HOD Dashboard (Department Analytics)
Dean Dashboard (Institution Analytics)
ML-based Publication Classification
Google Scholar Auto Sync
Deployment (Vercel + Railway)

👨‍💻 Author

NIET Research Portal Project — Academic Full Stack System

---
