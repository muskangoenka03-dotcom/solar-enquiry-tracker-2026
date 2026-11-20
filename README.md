# Solar Installation Enquiry Tracker

A responsive solar sales workspace with a React dashboard, FastAPI REST API, and a persistent SQLite database.

## Requirements

- Python 3.10+
- Node.js 18+

## Start the backend

From the project root:

```powershell
py -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r backend\requirements.txt
python -m uvicorn backend.main:app --reload
```

The API is available at `http://localhost:8000`; interactive API documentation is at `http://localhost:8000/docs`. SQLite is created at `backend\solar_tracker.db` on first launch.

## Start the frontend

In a second terminal:

```powershell
cd frontend
npm.cmd install
npm.cmd run dev
```

Open `http://localhost:5173`.

## Demo account

- Email: `admin@solarflow.in`
- Password: `Solar@123`

The first launch seeds an admin, three employees, sample enquiries, and follow-ups. Change demo credentials and add production authentication controls before deploying publicly. New registrations are assigned the Employee role.

## Included workflows

- Login, registration, and logout with Admin/Employee roles.
- Enquiry creation, search, status filtering, date ordering, editing, deletion, details, and status history.
- Follow-up scheduling, overdue/upcoming tracking, completion, and deletion.
- Customer and employee directories with project and conversion metrics.
- Dashboard charts, analytics, and CSV export.

Employees can manage enquiries and follow-ups. Only admins can add or remove team members.
