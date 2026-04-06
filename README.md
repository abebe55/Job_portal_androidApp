# Local Job Portal

A full-stack bilingual job marketplace for Ethiopia — connecting local job seekers with
verified employers, with admin oversight and a fee-based job posting model.

## System Components

```
job-portal/
├── backend/          Django REST API
│   ├── users/        Auth, registration, profiles, employer verification
│   ├── jobs/         Job listings with 7-stage approval workflow
│   ├── applications/ Apply & track applications
│   ├── cvs/          CV builder with Ethiopian-specific fields
│   ├── wallet/       Wallet, Chapa payment integration, commission
│   └── config/       Django settings & URLs
├── mobile/           React Native (Expo) — Job Seeker & Employer app
│   ├── app/          Screens (Expo Router)
│   ├── context/      AuthContext (JWT state)
│   ├── services/     Axios API calls
│   ├── i18n/         English & Amharic translations
│   └── utils/        Secure token storage
├── admin-web/        Next.js — Admin dashboard
│   ├── app/          Pages (dashboard, jobs, employers, users, transactions)
│   ├── components/   AdminLayout
│   └── lib/          API client
└── documentations/   Project report & presentation guide
```

## Quick Start

### Backend
```bash
cd backend
pip install -r requirements.txt
cp .env.example .env        # fill in SECRET_KEY
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

### Mobile App
```bash
cd mobile
npm install
npx expo start
# a = Android  |  i = iOS  |  w = Web
```

### Admin Web Panel
```bash
cd admin-web
npm install
npm run dev
# Open http://localhost:3000 — login with superuser account
```

## Features

**Job Seeker:**
- JWT authentication with role-based access
- Browse and search published jobs (keyword / location / industry / skill level)
- Apply for jobs with cover letter
- Track application status (pending → reviewed → accepted / rejected)
- Full CV builder with Ethiopian education levels, TVET fields, experience entries, document uploads
- English / Amharic (አማርኛ) language toggle

**Employer:**
- Employer verification with document upload (business license, national ID, etc.)
- Post jobs with multi-section form (type, level, description, compensation)
- 7-stage job workflow: draft → under_review → approved → payment_pending → published → closed
- Pay job posting fee via Chapa payment gateway
- View applicants, accept/reject with notes
- Wallet with balance, deposit history, transaction log

**Admin (Web Panel):**
- Dashboard: total jobs, pending approvals, users, employers, revenue
- Review and approve/reject employer verification documents
- Review and approve/reject job posts, set posting fee per job
- Manage all users (view, suspend)
- View all wallet transactions and commission revenue
- Configure job posting fee / commission rate

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Mobile | React Native, Expo, Expo Router, TypeScript |
| Admin Web | Next.js, TypeScript |
| State | React Context + JWT (expo-secure-store) |
| API Client | Axios |
| i18n | i18next + react-i18next |
| Backend | Django 4.x, Django REST Framework |
| Auth | SimpleJWT |
| Payment | Chapa (Ethiopian payment gateway) |
| Database | SQLite (dev) / PostgreSQL (production) |

## User Roles

| Role | Access |
|------|--------|
| Job Seeker | Browse jobs, apply, track applications, build CV |
| Employer | Post jobs, manage applicants, wallet & payments |
| Admin | Full platform management via web panel |

##  How to Run the Project

### Backend
```bash
cd backend
pip install -r requirements.txt
cp .env.example .env        # fill in SECRET_KEY
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

### Mobile App
```bash
cd mobile
npm install
npx expo start
# Press 'a' for Android  |  'i' for iOS  |  'w' for Web
```
adb install android\app\build\outputs\apk\debug\app-debug.apk

### Admin Web Panel
```bash
cd admin-web
npm install
npm run dev
# Open http://localhost:3000
# Login with the superuser account created above
```

---

*Report prepared for Software Engineering course project submission — March 2026*
