# ProjectFlow

ProjectFlow is a full-stack Project Management System built with React and Django REST Framework.

It helps admins manage projects, assign tasks to employees, and track project progress.

## Features

- User Login and Authentication
- Admin and Employee Dashboards
- Create, Edit, and Delete Projects
- Create and Assign Tasks
- Track Tasks with a Kanban Board
- Task File Upload and Download
- Employee Task Submissions
- Admin Submission Review

## Tech Stack

**Frontend:** React, Vite, JavaScript, CSS

**Backend:** Python, Django REST Framework

**Authentication:** JWT

**Database:** Django Database (SQLite for local development)

## Project Structure

```text
Final_ProjectFlow/
├── login/    # React Frontend
└── PMS/      # Django Backend
```

## Run Locally

**Backend:**

```bash
cd PMS
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

**Frontend:**

```bash
cd login
npm install
npm run dev
```

## Project Workflow

1. Admin creates a project.
2. Admin assigns tasks to employees.
3. Employees view tasks and download attachments.
4. Employees submit completed work.
5. Admin reviews submitted work.

## Author

Shahriar Hossain Arafat
Lionel Sami
