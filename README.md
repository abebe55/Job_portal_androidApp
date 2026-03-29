# Local Job Portal

A cross-platform mobile job portal for Ethiopia — connecting local job seekers with employers.
Built with React Native (Expo) + Django REST Framework + MongoDB.

## Project Structure

```
job-portal/
├── backend/          Django REST API
│   ├── users/        Auth, registration, profiles
│   ├── jobs/         Job listings CRUD
│   ├── applications/ Apply & track applications
│   ├── cvs/          CV builder
│   └── config/       Django settings & URLs
└── mobile/           React Native (Expo) app
    ├── app/          Screens (Expo Router)
    ├── context/      AuthContext (JWT state)
    ├── services/     Axios API calls
    ├── i18n/         English & Amharic translations
    └── utils/        Secure token storage
```

## Quick Start

### Backend
```bash
cd backend
pip install -r requirements.txt
cp .env.example .env        # fill in SECRET_KEY and MONGO_URI
python manage.py migrate
python manage.py runserver
```

### Mobile
```bash
cd mobile
npm install
v9b
# a = Android  |  i = iOS  |  w = Web
```

## Features

- JWT authentication (Job Seeker & Employer roles)
- Job listing, search, filter by location / industry / skill level
- Apply for jobs with cover letter
- Track application status (pending → reviewed → accepted / rejected)
- Employer: post jobs, view applicants, update status, delete jobs
- CV builder
- English / Amharic (አማርኛ) language toggle

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Mobile | React Native, Expo, Expo Router, TypeScript |
| State | React Context + JWT (expo-secure-store) |
| API Client | Axios |
| i18n | i18next + react-i18next |
| Backend | Django 3.2, Django REST Framework |
| Auth | SimpleJWT |
| Database | MongoDB Atlas (via Djongo) |
