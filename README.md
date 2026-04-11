# JobPortal Ethiopia

A full-stack bilingual job marketplace connecting Ethiopian job seekers with verified employers — with admin oversight and a fee-based job posting model.

## Project Structure

```
job-portal/
├── backend/        Django REST API (Python)
├── mobile/         React Native / Expo app (Job Seeker & Employer)
└── admin-web/      Next.js admin dashboard
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Django 3.2, Django REST Framework, SimpleJWT |
| Database | MongoDB Atlas (via djongo) |
| Mobile | React Native, Expo, Expo Router, TypeScript |
| Admin Web | Next.js 14, TypeScript |
| Payment | Chapa (Ethiopian payment gateway) |
| Email | Gmail SMTP |
| i18n | i18next (English + Amharic) |

## Features

### Job Seeker
- Register, verify email via OTP, browse & search jobs
- Apply with cover letter, track application status
- Full CV builder (education, experience, skills, documents)
- English / Amharic language toggle

### Employer
- Register with document verification (business license, national ID, etc.)
- Post jobs with multi-section form
- 7-stage job workflow: `draft → under_review → approved → payment_pending → published → closed`
- Pay job posting fee via Chapa, view applicants, accept/reject with notes
- Extend job deadline with fee payment

### Admin (Web Panel)
- Dashboard: jobs, users, employers, revenue stats
- Approve/reject employer verification documents
- Approve/reject job posts, set posting fee per job
- Manage users, view all transactions
- Configure commission rate

## Quick Start

### 1. Backend

```bash
cd backend
pip install -r requirements.txt
cp .env.example .env        # fill in your values
python manage.py runserver
```

### 2. Mobile App

```bash
cd mobile
npm install
npx expo start
# Press 'a' for Android | 'w' for Web
```

### 3. Admin Web

```bash
cd admin-web
npm install
npm run dev
# Open http://localhost:3001
```

## Environment Variables

Copy `backend/.env.example` to `backend/.env` and fill in:

```env
SECRET_KEY=your-django-secret-key
MONGO_URI=mongodb+srv://...
MONGO_DB_NAME=jobportal
CHAPA_SECRET_KEY=CHASECK_TEST-...
BACKEND_URL=http://127.0.0.1:8000
FRONTEND_URL=http://localhost:8081
EMAIL_HOST_USER=your@gmail.com
EMAIL_HOST_PASSWORD=your-app-password
```

## Deployment

| Part | Platform | Notes |
|------|----------|-------|
| Backend | Railway / Render | Set env vars in dashboard |
| Admin Web | Vercel | Set `NEXT_PUBLIC_API_URL` |
| Mobile Web | Vercel / Netlify | Set `EXPO_PUBLIC_API_URL`, build: `npx expo export --platform web` |

## User Roles

| Role | Access |
|------|--------|
| Job Seeker | Browse jobs, apply, CV builder |
| Employer | Post jobs, manage applicants, payments |
| Admin | Full platform management |

## API Overview

Base URL: `http://127.0.0.1:8000/api/`

| Endpoint | Description |
|----------|-------------|
| `POST /auth/register/` | Register (jobseeker or employer) |
| `POST /token/` | Login → JWT tokens |
| `GET /jobs/` | Public job listings |
| `POST /jobs/create/` | Employer: post a job |
| `POST /applications/apply/` | Job seeker: apply |
| `GET /auth/profile/` | Get current user profile |
| `POST /auth/send-otp/` | Send email verification OTP |
| `POST /auth/verify-otp/` | Verify OTP |

---

*Built for Software Engineering course project — Ethiopia, 2026*
