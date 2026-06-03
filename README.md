# 🎓 NIET Research Portal

A full-stack **Faculty Research Analytics System** built for NIET institution to manage, analyze, and visualize academic research performance across faculty, departments, and institution levels.

---

## 🚀 Features (Phase 1)

- 🔐 JWT Authentication (Faculty Login System)
- 👨‍🏫 Role-based access (Faculty / HOD / Dean ready)
- 📊 Faculty Research Dashboard API
- 📚 Publications, Projects, Patents tracking
- 📈 Citation & KPI analytics engine
- 🗄️ MySQL database integration
- ⚡ FastAPI REST backend with Swagger UI

---

## 🏗️ Tech Stack

- Backend: FastAPI (Python)
- Database: MySQL
- Authentication: JWT + bcrypt
- ORM: SQLAlchemy
- API Testing: Swagger UI (/docs)

---

## 📁 Project Structure

niet-portal/
│
├── backend/
│ ├── app/
│ │ ├── routers/
│ │ │ ├── auth.py
│ │ │ ├── faculty.py
│ │ │ └── publications.py
│ │ │
│ │ ├── security.py
│ │ ├── dependencies.py
│ │ ├── database.py
│ │ ├── models.py
│ │ └── main.py
│ │
│ ├── requirements.txt
│ └── .env
│
├── database/
│ ├── schema.sql
│ └── seed_data.sql
│
└── README.md


---
## ⚙️ Setup Instructions

### 1. Clone the Repository

git clone https://github.com/Ananya0702/niet-research-portal.git

cd niet-research-portal/backend


---

### 2. Create Virtual Environment

python -m venv venv
venv\Scripts\activate


---

### 3. Install Dependencies

pip install -r requirements.txt


---

### 4. Configure Environment Variables

Create a `.env` file in `backend/`:


DATABASE_URL=mysql+pymysql://username:password@localhost/niet_research
SECRET_KEY=niet_secret_key


---

### 5. Run the Server

uvicorn app.main:app --reload


---

### 6. Open API Documentation

http://127.0.0.1:8000/docs


---

## 📡 API Endpoints

### Authentication
- POST `/auth/login`
- GET `/auth/me`

### Faculty Dashboard
- GET `/faculty/{id}/dashboard`

---

## 🧠 System Workflow

- Faculty logs in with credentials
- JWT token is generated
- Token is used for secure API access
- Dashboard APIs return analytics data dynamically

---

## 📌 Future Enhancements

- HOD Dashboard (Department-level analytics)
- Dean Dashboard (Institution-wide analytics)
- ML-based publication classification
- Google Scholar auto-sync system
- Live deployment (Vercel + Railway)

---

## 👨‍💻 Author

Name: Ananya Shukla  
Course: B.Tech CSE (Data Science)  
Institute: NIET (Noida Institute of Engineering and Technology)  
Project: NIET Research Portal (Academic Research Analytics System)

---

⭐ If you like this project, give it a star!
