# 🎓 NIET Research Portal

A full-stack **Faculty Research Analytics System** built for NIET to manage, analyze, and visualize academic research performance across faculty, departments, schools, and the institution level.

---

## 🚀 Features

### Authentication & Access
- 🔐 JWT Authentication — separate Faculty and Admin login systems
- 👨‍🏫 Role-based access: Faculty / HOD / Dean R&D / Admin
- 🛡️ Strict scope enforcement (server-side validated) — HOD sees their department, Dean sees their school, Admin sees everything

### Research Modules
- 📚 Publications (scope views: My / Department / School / All)
- 📈 Citation & KPI analytics engine
- 🏗️ Projects, Patents / IPR tracking
- 🏅 Achievements, Student Research, Collaborations
- 🤖 ML-based publication classification (indexing, quartile, research topic)
- 🧑‍🔬 Google Scholar auto-sync (publications + h-index, i10, citations)

### Announcement Module (Enterprise)
- 📣 Multi-role audience targeting (Everyone / Admin / Dean / HOD / Faculty / Students)
- 🏫 School & Department org targeting with RBAC normalization
- ⏰ UTC-based lifecycle: Draft → Scheduled → Published → Expired
- 🔔 Per-user notification delivery, read tracking, unread badge
- 📌 Pinned ordering, attachments, full history metadata
- 🔄 Real-time updates via SSE (`/announcements/stream`)
- 📊 List filters (status, role, school, department, category, priority, date range)

### Dashboards
- 📊 Faculty Research Dashboard
- 🏛️ HOD Dashboard (department-level analytics)
- 🏫 Dean Dashboard (school-level analytics)
- 🛠️ Admin Panel (faculty / school / department management)

### Profile
- 👤 Personal profile with research areas, education, experience, certifications
- 🔗 Dynamic academic & social links (Google Scholar, ORCID, Scopus, LinkedIn, etc.)

---

## 🏗️ Tech Stack

- **Backend:** FastAPI (Python), Uvicorn
- **Frontend:** React 19, Vite, Axios, React Router
- **Database:** MySQL
- **Authentication:** JWT + bcrypt
- **ORM:** SQLAlchemy
- **ML / NLP:** scikit-learn, transformers, rapidfuzz
- **Scraping:** BeautifulSoup, requests, scholarly
- **API Testing:** Swagger UI (`/docs`)

---

## 📁 Project Structure
```text
niet-portal/
│
├── requirements.txt                # Python dependencies
├── .gitignore
├── README.md
│
├── backend/
│ ├── app/
│ │ ├── main.py                     # FastAPI app entry (registers all routers)
│ │ ├── database.py                 # SQLAlchemy engine / session
│ │ ├── models.py                   # ORM models
│ │ ├── migrations.py               # Idempotent schema migrations
│ │ ├── security.py                 # JWT + password hashing
│ │ ├── dependencies.py             # Auth dependencies
│ │ ├── routers/
│ │ │ ├── auth.py                   # Faculty login / JWT
│ │ │ ├── admin.py                  # Admin login + org management
│ │ │ ├── faculty.py                # Faculty dashboard / profile / analytics
│ │ │ ├── profile.py                # Extended profile + links
│ │ │ ├── publications.py           # Publications CRUD + scope + counts
│ │ │ ├── projects.py               # Projects module
│ │ │ ├── patents.py                # Patents / IPR module
│ │ │ ├── achievements.py           # Achievements module
│ │ │ ├── collaborations.py         # Collaborations module
│ │ │ ├── students.py               # Student research module
│ │ │ ├── hod.py                    # HOD department analytics
│ │ │ ├── dean.py                   # Dean school analytics
│ │ │ ├── announcements.py          # Announcement module (targeting, SSE)
│ │ │ ├── sync.py                   # Google Scholar auto-sync
│ │ │ ├── ml.py                     # ML classification API
│ │ │ └── activity.py               # Activity log
│ │ ├── scraper/
│ │ │ └── scholar_sync.py           # Google Scholar scraper
│ │ ├── ml/
│ │ │ ├── classifier.py             # Publication classification
│ │ │ └── data/                     # Journal / SJR lookup data
│ │ └── uploads/                    # Runtime uploads (gitignored)
│ │
│ ├── NIET_Research_Seed_Data.sql   # Seed data
│ └── .env                          # DB credentials (gitignored)
│
└── frontend/
  ├── index.html
  ├── package.json
  ├── vite.config.js
  ├── public/                       # Static assets (logos, favicon)
  └── src/
    ├── main.jsx
    ├── App.jsx                     # Routing
    ├── components/
    │ ├── Layout.jsx
    │ └── Sidebar.jsx               # Nav + notification bell
    ├── pages/                      # Login, Dashboard, Publications, Announcements,
    │                               # Profile, AdminPanel, HODDashboard, DeanDashboard,
    │                               # Projects, Patents, Achievements, Reports, etc.
    └── services/
      └── api.js                    # Axios client (token handling)
```

---

## ⚙️ Setup Instructions

### 1. Clone the Repository
```bash
git clone https://github.com/Ananya0702/niet-research-portal.git
cd niet-research-portal
```

### 2. Backend Setup

Create a virtual environment and activate it:
```bash
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate  # Linux/macOS
```

Install dependencies:
```bash
pip install -r requirements.txt
```

Configure environment variables — create a `.env` file in `backend/`:
```
DATABASE_URL=mysql+pymysql://username:password@localhost/niet_research
SECRET_KEY=niet_secret_key
```

Set up the database (create the `niet_research` schema and load seed data):
```sql
-- run against MySQL
SOURCE backend/NIET_Research_Seed_Data.sql;
```

Run the server:
```bash
cd backend
uvicorn app.main:app --reload
```

Open API documentation:
```
http://127.0.0.1:8000/docs
```

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

The frontend runs on `http://localhost:5173` (Vite) and proxies API calls to the backend.

---

## 🔑 Demo Accounts

| Role       | Email                  | Password     |
|------------|------------------------|--------------|
| Admin      | admin@niet.co.in       | admin123     |
| Dean R&D   | dean@niet.co.in        | password123  |
| HOD        | neha@niet.co.in        | password123  |

---

## 📡 Key API Endpoints

### Authentication
- `POST /auth/login` — Faculty login
- `POST /admin/login` — Admin login

### Faculty
- `GET /faculty/{id}/dashboard` — Faculty analytics dashboard
- `GET /faculty/me/profile` — Own profile
- `GET /faculty/me/analytics` — Own analytics

### Publications
- `GET /publications/` — List (scope + filters)
- `POST /publications/` — Add publication
- `GET /publications/stats/counts` — Publication counts

### Sync
- `POST /sync/scholar` — Google Scholar auto-sync

### Announcements
- `GET /announcements/` — List (filters)
- `POST /announcements/` — Create
- `GET /announcements/options` — Audience / org options
- `GET /announcements/notifications` — My notifications
- `GET /announcements/unread/count` — Unread badge
- `GET /announcements/stream` — SSE real-time feed

### Analytics
- `GET /hod/dashboard` — HOD department analytics
- `GET /dean/dashboard` — Dean school analytics
- `GET /admin/dashboard` — Admin dashboard

---

## 🧠 System Workflow

- Faculty / Admin logs in with credentials
- JWT token is generated (faculty vs admin token)
- Token is used for secure, role-scoped API access
- Dashboards return analytics data dynamically based on the user's scope
- Google Scholar sync pulls publications + citation metrics automatically

---

## 📌 Future Enhancements

- ORCID auto-sync (publications via ORCID public API + citation counts via Crossref)
- Scopus auto-sync (requires Elsevier API key)
- Publication source tagging & filtering (Scholar / ORCID / Scopus / Manual)
- Live deployment (e.g., Vercel + Railway)

---

## 👨‍💻 Author

Name: Ananya Shukla  
Name: Akanksha Singh

Course: B.Tech CSE (Data Science)  
Institute: NIET (Noida Institute of Engineering and Technology)  
Project: NIET Research Portal (Academic Research Analytics System)

---

⭐ If you like this project, give it a star!
