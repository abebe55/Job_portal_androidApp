# JobPortal Admin Web Panel

Web-only admin dashboard. Runs separately from the mobile app.

## Setup

```bash
cd admin-web
npm install
npm run dev
```

Opens at http://localhost:3001

## Login

Use a Django superuser or a user with `is_staff=True` or `role='admin'`.

Create one via:
```bash
cd backend
python manage.py createsuperuser
```

## Features

- Dashboard — overview stats (jobs, users, revenue)
- Job Approvals — approve or reject employer job posts
- Users — view all users, approve/suspend accounts
- Commission — set the job posting fee (ETB)
- Transactions — view all Chapa payments and commission deductions
