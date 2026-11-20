from __future__ import annotations

import csv
import hashlib
import hmac
import io
import os
import secrets
import sqlite3
from datetime import date, datetime, timedelta
from pathlib import Path
from typing import Any

from fastapi import Depends, FastAPI, Header, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, ConfigDict, EmailStr, Field


ROOT = Path(__file__).resolve().parent
DATABASE = Path(os.environ.get("SOLAR_DB_PATH", ROOT / "solar_tracker.db"))
STATUSES = [
    "New Enquiry",
    "Contacted",
    "Site Visit Scheduled",
    "Site Visit Completed",
    "Quotation Sent",
    "Negotiation",
    "Approved",
    "Installation In Progress",
    "Installation Completed",
    "Rejected",
]
PROPERTY_TYPES = ["Residential", "Commercial", "Industrial"]
SOURCES = ["Website", "Phone", "Referral", "Advertisement"]

app = FastAPI(title="Solar Installation Enquiry Tracker API", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def connect() -> sqlite3.Connection:
    db = sqlite3.connect(DATABASE)
    db.row_factory = sqlite3.Row
    db.execute("PRAGMA foreign_keys = ON")
    return db


def initialize_database() -> None:
    DATABASE.parent.mkdir(parents=True, exist_ok=True)
    with connect() as db:
        db.executescript(
            """
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT NOT NULL UNIQUE,
                phone TEXT NOT NULL DEFAULT '',
                role TEXT NOT NULL CHECK(role IN ('Admin', 'Employee')),
                password_hash TEXT NOT NULL,
                created_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS sessions (
                token TEXT PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                created_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS employees (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
                title TEXT NOT NULL DEFAULT 'Sales consultant',
                created_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS customers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                mobile TEXT NOT NULL UNIQUE,
                email TEXT NOT NULL DEFAULT '',
                address TEXT NOT NULL DEFAULT '',
                city TEXT NOT NULL DEFAULT '',
                state TEXT NOT NULL DEFAULT '',
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS enquiries (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
                customer_name TEXT NOT NULL,
                mobile TEXT NOT NULL,
                email TEXT NOT NULL DEFAULT '',
                address TEXT NOT NULL DEFAULT '',
                city TEXT NOT NULL DEFAULT '',
                state TEXT NOT NULL DEFAULT '',
                consumer_number TEXT NOT NULL DEFAULT '',
                capacity_kw REAL NOT NULL DEFAULT 0,
                monthly_bill REAL NOT NULL DEFAULT 0,
                property_type TEXT NOT NULL DEFAULT 'Residential',
                source TEXT NOT NULL DEFAULT 'Website',
                enquiry_date TEXT NOT NULL,
                assigned_employee_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
                status TEXT NOT NULL DEFAULT 'New Enquiry',
                remarks TEXT NOT NULL DEFAULT '',
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS follow_ups (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                enquiry_id INTEGER NOT NULL REFERENCES enquiries(id) ON DELETE CASCADE,
                scheduled_at TEXT NOT NULL,
                notes TEXT NOT NULL DEFAULT '',
                completed INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS status_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                enquiry_id INTEGER NOT NULL REFERENCES enquiries(id) ON DELETE CASCADE,
                status TEXT NOT NULL,
                changed_at TEXT NOT NULL,
                changed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
                note TEXT NOT NULL DEFAULT ''
            );
            CREATE INDEX IF NOT EXISTS idx_enquiries_status ON enquiries(status);
            CREATE INDEX IF NOT EXISTS idx_follow_ups_scheduled ON follow_ups(scheduled_at);
            """
        )
        enquiry_columns = {row["name"] for row in db.execute("PRAGMA table_info(enquiries)")}
        if "customer_id" not in enquiry_columns:
            db.execute("ALTER TABLE enquiries ADD COLUMN customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL")
        if db.execute("SELECT COUNT(*) FROM users").fetchone()[0] == 0:
            now = datetime.now().isoformat(timespec="seconds")
            seed_users = [
                ("Aarav Mehta", "admin@solarflow.in", "+91 98765 43210", "Admin", "Solar@123"),
                ("Riya Sharma", "riya@solarflow.in", "+91 98765 43211", "Employee", "Solar@123"),
                ("Kabir Patel", "kabir@solarflow.in", "+91 98765 43212", "Employee", "Solar@123"),
                ("Ananya Rao", "ananya@solarflow.in", "+91 98765 43213", "Employee", "Solar@123"),
            ]
            for name, email, phone, role, password in seed_users:
                db.execute(
                    "INSERT INTO users(name,email,phone,role,password_hash,created_at) VALUES(?,?,?,?,?,?)",
                    (name, email, phone, role, hash_password(password), now),
                )
            people = db.execute("SELECT id,name FROM users WHERE role='Employee'").fetchall()
            employee_ids = {row["name"]: row["id"] for row in people}
            examples = [
                ("Priya Kapoor", "+91 98100 22001", "priya.kapoor@email.com", "14 Green Park, South Extension", "New Delhi", "Delhi", "DL-08421-20", 5.0, 4800, "Residential", "Website", 0, "New Enquiry", "Interested in a rooftop system for a new home."),
                ("Rahul Verma", "+91 98200 22002", "rahul.v@email.com", "22 Lake View Road", "Pune", "Maharashtra", "MH-11934-08", 3.0, 3200, "Residential", "Referral", 1, "Site Visit Scheduled", "Prefers a weekend site visit."),
                ("Meera Iyer", "+91 98300 22003", "meera.iyer@email.com", "8 Sunrise Avenue", "Chennai", "Tamil Nadu", "TN-22184-17", 10.0, 12500, "Commercial", "Phone", 2, "Quotation Sent", "Proposal sent; follow up on financing options."),
                ("Arjun Singh", "+91 98400 22004", "arjun.s@email.com", "31 Orchard Lane", "Jaipur", "Rajasthan", "RJ-09144-02", 6.0, 6900, "Residential", "Advertisement", 0, "Negotiation", "Comparing inverter options."),
                ("Neha Desai", "+91 98500 22005", "neha.desai@email.com", "5 Riverfront Plaza", "Ahmedabad", "Gujarat", "GJ-33801-10", 15.0, 21400, "Commercial", "Website", 1, "Approved", "Project approved, awaiting installation planning."),
                ("Vikram Nair", "+91 98600 22006", "vikram.nair@email.com", "19 Palm Grove", "Kochi", "Kerala", "KL-51720-05", 4.0, 4300, "Residential", "Referral", 2, "Contacted", "Call back requested after 5 PM."),
                ("Sana Khan", "+91 98700 22007", "sana.khan@email.com", "42 Industrial Estate", "Hyderabad", "Telangana", "TS-60115-23", 25.0, 39200, "Industrial", "Phone", 1, "Installation In Progress", "Structure installation has started."),
                ("Dev Malhotra", "+91 98800 22008", "dev.m@email.com", "7 Hillcrest Road", "Bengaluru", "Karnataka", "KA-74029-12", 8.0, 9500, "Residential", "Website", 0, "Site Visit Completed", "Roof assessment completed."),
                ("Isha Kulkarni", "+91 98900 22009", "isha.k@email.com", "16 Market Street", "Mumbai", "Maharashtra", "MH-44002-19", 12.0, 18700, "Commercial", "Advertisement", 2, "Rejected", "Customer postponed the project."),
                ("Aditya Bose", "+91 99000 22010", "aditya.b@email.com", "3 Parkside", "Kolkata", "West Bengal", "WB-21042-07", 5.0, 5100, "Residential", "Referral", 1, "Installation Completed", "System commissioned successfully."),
            ]
            enquiry_ids: list[int] = []
            for index, person in enumerate(examples):
                name, mobile, email, address, city, state, consumer, capacity, bill, prop, source, staff, status, remarks = person
                day = date.today() - timedelta(days=(index * 17 + 1))
                cursor = db.execute(
                    """INSERT INTO enquiries(customer_name,mobile,email,address,city,state,consumer_number,
                    capacity_kw,monthly_bill,property_type,source,enquiry_date,assigned_employee_id,status,
                    remarks,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
                    (name, mobile, email, address, city, state, consumer, capacity, bill, prop, source,
                     day.isoformat(), employee_ids[people[staff]["name"]], status, remarks, now, now),
                )
                enquiry_id = cursor.lastrowid
                enquiry_ids.append(enquiry_id)
                db.execute(
                    "INSERT INTO status_history(enquiry_id,status,changed_at,note) VALUES(?,?,?,?)",
                    (enquiry_id, status, now, "Enquiry created" if status == "New Enquiry" else "Status updated"),
                )
            followups = [
                (enquiry_ids[1], 1, "Confirm the site visit time with the customer."),
                (enquiry_ids[2], 0, "Review the quotation and discuss available options."),
                (enquiry_ids[3], 2, "Check if the customer has selected an inverter."),
                (enquiry_ids[5], 0, "Call back after 5 PM as requested."),
                (enquiry_ids[0], 4, "First introduction call and requirements check."),
            ]
            for enquiry_id, day_offset, notes in followups:
                scheduled = (datetime.now() + timedelta(days=day_offset)).replace(hour=11, minute=0, second=0, microsecond=0)
                db.execute(
                    "INSERT INTO follow_ups(enquiry_id,scheduled_at,notes,created_at) VALUES(?,?,?,?)",
                    (enquiry_id, scheduled.isoformat(timespec="minutes"), notes, now),
                )
        now = datetime.now().isoformat(timespec="seconds")
        db.execute(
            """INSERT OR IGNORE INTO employees(user_id,created_at)
            SELECT id,created_at FROM users WHERE role='Employee'"""
        )
        for row in db.execute(
            """SELECT id,customer_name,mobile,email,address,city,state,created_at,updated_at
            FROM enquiries WHERE customer_id IS NULL"""
        ).fetchall():
            customer_id = upsert_customer(db, dict(row))
            db.execute("UPDATE enquiries SET customer_id=? WHERE id=?", (customer_id, row["id"]))


def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 240_000).hex()
    return f"{salt}${digest}"


def password_matches(password: str, stored: str) -> bool:
    salt, expected = stored.split("$", 1)
    actual = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 240_000).hex()
    return hmac.compare_digest(actual, expected)


def upsert_customer(db: sqlite3.Connection, values: dict[str, Any]) -> int:
    now = datetime.now().isoformat(timespec="seconds")
    db.execute(
        """INSERT INTO customers(name,mobile,email,address,city,state,created_at,updated_at)
        VALUES(?,?,?,?,?,?,?,?)
        ON CONFLICT(mobile) DO UPDATE SET name=excluded.name,email=excluded.email,
        address=excluded.address,city=excluded.city,state=excluded.state,updated_at=excluded.updated_at""",
        (
            values["customer_name"] if "customer_name" in values else values["name"],
            values["mobile"],
            values.get("email", ""),
            values.get("address", ""),
            values.get("city", ""),
            values.get("state", ""),
            values.get("created_at", now),
            values.get("updated_at", now),
        ),
    )
    row = db.execute("SELECT id FROM customers WHERE mobile=?", (values["mobile"],)).fetchone()
    return row["id"]


class RegisterInput(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    email: EmailStr
    phone: str = Field(min_length=7, max_length=30)
    password: str = Field(min_length=8, max_length=128)


class LoginInput(BaseModel):
    email: EmailStr
    password: str


class EmployeeInput(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    email: EmailStr
    phone: str = Field(min_length=7, max_length=30)
    password: str = Field(min_length=8, max_length=128)


class EnquiryInput(BaseModel):
    customer_name: str = Field(min_length=2, max_length=120)
    mobile: str = Field(min_length=7, max_length=30)
    email: str = ""
    address: str = ""
    city: str = ""
    state: str = ""
    consumer_number: str = ""
    capacity_kw: float = Field(ge=0, le=10000)
    monthly_bill: float = Field(ge=0, le=100000000)
    property_type: str = "Residential"
    source: str = "Website"
    enquiry_date: str
    assigned_employee_id: int | None = None
    status: str = "New Enquiry"
    remarks: str = ""

    model_config = ConfigDict(str_strip_whitespace=True)


class FollowUpInput(BaseModel):
    enquiry_id: int
    scheduled_at: str
    notes: str = ""
    completed: bool = False


def current_user(authorization: str | None = Header(default=None)) -> dict[str, Any]:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Please sign in to continue.")
    token = authorization[7:]
    with connect() as db:
        row = db.execute(
            "SELECT u.id,u.name,u.email,u.phone,u.role FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token=?",
            (token,),
        ).fetchone()
    if row is None:
        raise HTTPException(status_code=401, detail="Your session has expired. Please sign in again.")
    return dict(row)


def require_admin(user: dict[str, Any] = Depends(current_user)) -> dict[str, Any]:
    if user["role"] != "Admin":
        raise HTTPException(status_code=403, detail="Administrator access is required.")
    return user


def enquiry_record(row: sqlite3.Row) -> dict[str, Any]:
    result = dict(row)
    result["id"] = f"ENQ-{result['id']:04d}"
    return result


def numeric_id(enquiry_id: str) -> int:
    value = enquiry_id.removeprefix("ENQ-")
    if not value.isdigit():
        raise HTTPException(status_code=404, detail="Enquiry not found.")
    return int(value)


@app.on_event("startup")
def startup() -> None:
    initialize_database()


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/api/auth/register")
def register(payload: RegisterInput) -> dict[str, Any]:
    now = datetime.now().isoformat(timespec="seconds")
    with connect() as db:
        if db.execute("SELECT 1 FROM users LIMIT 1").fetchone():
            role = "Employee"
        else:
            role = "Admin"
        try:
            cursor = db.execute(
                "INSERT INTO users(name,email,phone,role,password_hash,created_at) VALUES(?,?,?,?,?,?)",
                (payload.name, payload.email.lower(), payload.phone, role, hash_password(payload.password), now),
            )
        except sqlite3.IntegrityError as exc:
            raise HTTPException(status_code=409, detail="An account with this email already exists.") from exc
        if role == "Employee":
            db.execute("INSERT INTO employees(user_id,created_at) VALUES(?,?)", (cursor.lastrowid, now))
        token = secrets.token_urlsafe(32)
        db.execute("INSERT INTO sessions(token,user_id,created_at) VALUES(?,?,?)", (token, cursor.lastrowid, now))
        user = dict(db.execute("SELECT id,name,email,phone,role FROM users WHERE id=?", (cursor.lastrowid,)).fetchone())
    return {"token": token, "user": user}


@app.post("/api/auth/login")
def login(payload: LoginInput) -> dict[str, Any]:
    with connect() as db:
        row = db.execute("SELECT * FROM users WHERE email=?", (payload.email.lower(),)).fetchone()
        if row is None or not password_matches(payload.password, row["password_hash"]):
            raise HTTPException(status_code=401, detail="Email or password is incorrect.")
        token = secrets.token_urlsafe(32)
        db.execute(
            "INSERT INTO sessions(token,user_id,created_at) VALUES(?,?,?)",
            (token, row["id"], datetime.now().isoformat(timespec="seconds")),
        )
        user = {key: row[key] for key in ("id", "name", "email", "phone", "role")}
    return {"token": token, "user": user}


@app.post("/api/auth/logout")
def logout(user: dict[str, Any] = Depends(current_user), authorization: str = Header(...)) -> dict[str, bool]:
    with connect() as db:
        db.execute("DELETE FROM sessions WHERE token=?", (authorization[7:],))
    return {"success": True}


@app.get("/api/auth/me")
def me(user: dict[str, Any] = Depends(current_user)) -> dict[str, Any]:
    return user


@app.get("/api/employees")
def list_employees(_: dict[str, Any] = Depends(current_user)) -> list[dict[str, Any]]:
    with connect() as db:
        rows = db.execute(
            """SELECT u.id,u.name,u.email,u.phone,u.role,
            COUNT(e.id) AS assigned_enquiries,
            SUM(CASE WHEN e.status='Installation Completed' THEN 1 ELSE 0 END) AS conversions
            FROM employees em JOIN users u ON u.id=em.user_id
            LEFT JOIN enquiries e ON e.assigned_employee_id=u.id
            GROUP BY u.id ORDER BY u.name"""
        ).fetchall()
    return [dict(row) for row in rows]


@app.post("/api/employees", status_code=201)
def add_employee(payload: EmployeeInput, _: dict[str, Any] = Depends(require_admin)) -> dict[str, Any]:
    with connect() as db:
        try:
            cursor = db.execute(
                "INSERT INTO users(name,email,phone,role,password_hash,created_at) VALUES(?,?,?,?,?,?)",
                (payload.name, payload.email.lower(), payload.phone, "Employee", hash_password(payload.password),
                 datetime.now().isoformat(timespec="seconds")),
            )
        except sqlite3.IntegrityError as exc:
            raise HTTPException(status_code=409, detail="An account with this email already exists.") from exc
        db.execute(
            "INSERT INTO employees(user_id,created_at) VALUES(?,?)",
            (cursor.lastrowid, datetime.now().isoformat(timespec="seconds")),
        )
        row = db.execute("SELECT id,name,email,phone,role FROM users WHERE id=?", (cursor.lastrowid,)).fetchone()
    return dict(row)


@app.delete("/api/employees/{employee_id}")
def delete_employee(employee_id: int, _: dict[str, Any] = Depends(require_admin)) -> dict[str, bool]:
    with connect() as db:
        cursor = db.execute("DELETE FROM users WHERE id=? AND role='Employee'", (employee_id,))
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Employee not found.")
    return {"success": True}


@app.get("/api/enquiries")
def list_enquiries(
    search: str = Query(default=""),
    status: str = Query(default=""),
    sort: str = Query(default="newest", pattern="^(newest|oldest)$"),
    _: dict[str, Any] = Depends(current_user),
) -> list[dict[str, Any]]:
    sql = """SELECT e.*,u.name AS assigned_employee FROM enquiries e
    LEFT JOIN users u ON u.id=e.assigned_employee_id WHERE 1=1"""
    params: list[Any] = []
    if search:
        term = f"%{search.strip()}%"
        sql += " AND (e.customer_name LIKE ? OR e.mobile LIKE ? OR e.email LIKE ? OR e.city LIKE ? OR CAST(e.id AS TEXT) LIKE ?)"
        params.extend([term, term, term, term, term.replace("ENQ-", "")])
    if status:
        sql += " AND e.status=?"
        params.append(status)
    sql += " ORDER BY e.enquiry_date " + ("ASC" if sort == "oldest" else "DESC") + ", e.id DESC"
    with connect() as db:
        rows = db.execute(sql, params).fetchall()
    return [enquiry_record(row) for row in rows]


@app.post("/api/enquiries", status_code=201)
def create_enquiry(payload: EnquiryInput, user: dict[str, Any] = Depends(current_user)) -> dict[str, Any]:
    validate_enquiry(payload)
    now = datetime.now().isoformat(timespec="seconds")
    assigned_id = payload.assigned_employee_id
    if user["role"] == "Employee":
        assigned_id = user["id"]
    with connect() as db:
        customer_id = upsert_customer(db, payload.model_dump())
        cursor = db.execute(
            """INSERT INTO enquiries(customer_id,customer_name,mobile,email,address,city,state,consumer_number,capacity_kw,
            monthly_bill,property_type,source,enquiry_date,assigned_employee_id,status,remarks,created_at,updated_at)
            VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
            (customer_id, *enquiry_values(payload, assigned_id), now, now),
        )
        db.execute(
            "INSERT INTO status_history(enquiry_id,status,changed_at,changed_by,note) VALUES(?,?,?,?,?)",
            (cursor.lastrowid, payload.status, now, user["id"], "Enquiry created"),
        )
        row = db.execute(
            "SELECT e.*,u.name AS assigned_employee FROM enquiries e LEFT JOIN users u ON u.id=e.assigned_employee_id WHERE e.id=?",
            (cursor.lastrowid,),
        ).fetchone()
    return enquiry_record(row)


def validate_enquiry(payload: EnquiryInput) -> None:
    if payload.status not in STATUSES:
        raise HTTPException(status_code=422, detail="Choose a valid enquiry status.")
    if payload.property_type not in PROPERTY_TYPES:
        raise HTTPException(status_code=422, detail="Choose a valid property type.")
    if payload.source not in SOURCES:
        raise HTTPException(status_code=422, detail="Choose a valid enquiry source.")
    try:
        date.fromisoformat(payload.enquiry_date)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail="Enter a valid enquiry date.") from exc


def enquiry_values(payload: EnquiryInput, assigned_id: int | None) -> tuple[Any, ...]:
    return (
        payload.customer_name, payload.mobile, payload.email, payload.address, payload.city, payload.state,
        payload.consumer_number, payload.capacity_kw, payload.monthly_bill, payload.property_type, payload.source,
        payload.enquiry_date, assigned_id, payload.status, payload.remarks,
    )


@app.get("/api/enquiries/{enquiry_id}")
def get_enquiry(enquiry_id: str, _: dict[str, Any] = Depends(current_user)) -> dict[str, Any]:
    with connect() as db:
        row = db.execute(
            "SELECT e.*,u.name AS assigned_employee FROM enquiries e LEFT JOIN users u ON u.id=e.assigned_employee_id WHERE e.id=?",
            (numeric_id(enquiry_id),),
        ).fetchone()
        if row is None:
            raise HTTPException(status_code=404, detail="Enquiry not found.")
        result = enquiry_record(row)
        result["history"] = [dict(item) for item in db.execute(
            """SELECT h.status,h.changed_at,h.note,u.name AS changed_by FROM status_history h
            LEFT JOIN users u ON u.id=h.changed_by WHERE h.enquiry_id=? ORDER BY h.id DESC""",
            (row["id"],),
        )]
        result["enquiry_history"] = [
            {**dict(item), "id": f"ENQ-{item['id']:04d}"}
            for item in db.execute(
                """SELECT id,status,enquiry_date,capacity_kw FROM enquiries
                WHERE customer_id=? ORDER BY enquiry_date DESC,id DESC""",
                (row["customer_id"],),
            )
        ]
        result["follow_ups"] = [dict(item) for item in db.execute(
            "SELECT id,scheduled_at,notes,completed FROM follow_ups WHERE enquiry_id=? ORDER BY scheduled_at",
            (row["id"],),
        )]
    return result


@app.put("/api/enquiries/{enquiry_id}")
def update_enquiry(
    enquiry_id: str,
    payload: EnquiryInput,
    user: dict[str, Any] = Depends(current_user),
) -> dict[str, Any]:
    validate_enquiry(payload)
    db_id = numeric_id(enquiry_id)
    now = datetime.now().isoformat(timespec="seconds")
    with connect() as db:
        existing = db.execute("SELECT status FROM enquiries WHERE id=?", (db_id,)).fetchone()
        if existing is None:
            raise HTTPException(status_code=404, detail="Enquiry not found.")
        assigned_id = user["id"] if user["role"] == "Employee" else payload.assigned_employee_id
        customer_id = upsert_customer(db, payload.model_dump())
        db.execute(
            """UPDATE enquiries SET customer_id=?,customer_name=?,mobile=?,email=?,address=?,city=?,state=?,consumer_number=?,
            capacity_kw=?,monthly_bill=?,property_type=?,source=?,enquiry_date=?,assigned_employee_id=?,status=?,
            remarks=?,updated_at=? WHERE id=?""",
            (customer_id, *enquiry_values(payload, assigned_id), now, db_id),
        )
        if existing["status"] != payload.status:
            db.execute(
                "INSERT INTO status_history(enquiry_id,status,changed_at,changed_by,note) VALUES(?,?,?,?,?)",
                (db_id, payload.status, now, user["id"], "Status updated"),
            )
        row = db.execute(
            "SELECT e.*,u.name AS assigned_employee FROM enquiries e LEFT JOIN users u ON u.id=e.assigned_employee_id WHERE e.id=?",
            (db_id,),
        ).fetchone()
    return enquiry_record(row)


@app.delete("/api/enquiries/{enquiry_id}")
def delete_enquiry(enquiry_id: str, _: dict[str, Any] = Depends(current_user)) -> dict[str, bool]:
    with connect() as db:
        cursor = db.execute("DELETE FROM enquiries WHERE id=?", (numeric_id(enquiry_id),))
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Enquiry not found.")
    return {"success": True}


@app.get("/api/follow-ups")
def list_followups(
    include_completed: bool = False,
    _: dict[str, Any] = Depends(current_user),
) -> list[dict[str, Any]]:
    sql = """SELECT f.*,e.customer_name,e.mobile,e.email,e.city,e.status AS enquiry_status
    FROM follow_ups f JOIN enquiries e ON e.id=f.enquiry_id"""
    if not include_completed:
        sql += " WHERE f.completed=0"
    sql += " ORDER BY f.scheduled_at ASC"
    with connect() as db:
        rows = db.execute(sql).fetchall()
    result = []
    for row in rows:
        item = dict(row)
        item["enquiry_id"] = f"ENQ-{item['enquiry_id']:04d}"
        item["completed"] = bool(item["completed"])
        result.append(item)
    return result


@app.post("/api/follow-ups", status_code=201)
def create_followup(payload: FollowUpInput, _: dict[str, Any] = Depends(current_user)) -> dict[str, Any]:
    try:
        datetime.fromisoformat(payload.scheduled_at)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail="Enter a valid follow-up date and time.") from exc
    with connect() as db:
        enquiry_id = numeric_id(str(payload.enquiry_id)) if str(payload.enquiry_id).startswith("ENQ-") else payload.enquiry_id
        if db.execute("SELECT 1 FROM enquiries WHERE id=?", (enquiry_id,)).fetchone() is None:
            raise HTTPException(status_code=404, detail="Enquiry not found.")
        cursor = db.execute(
            "INSERT INTO follow_ups(enquiry_id,scheduled_at,notes,completed,created_at) VALUES(?,?,?,?,?)",
            (enquiry_id, payload.scheduled_at, payload.notes, int(payload.completed), datetime.now().isoformat(timespec="seconds")),
        )
        row = db.execute(
            """SELECT f.*,e.customer_name,e.mobile,e.email,e.city,e.status AS enquiry_status
            FROM follow_ups f JOIN enquiries e ON e.id=f.enquiry_id WHERE f.id=?""",
            (cursor.lastrowid,),
        ).fetchone()
    item = dict(row)
    item["enquiry_id"] = f"ENQ-{item['enquiry_id']:04d}"
    item["completed"] = bool(item["completed"])
    return item


@app.patch("/api/follow-ups/{followup_id}")
def update_followup(
    followup_id: int,
    completed: bool,
    _: dict[str, Any] = Depends(current_user),
) -> dict[str, bool]:
    with connect() as db:
        cursor = db.execute("UPDATE follow_ups SET completed=? WHERE id=?", (int(completed), followup_id))
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Follow-up not found.")
    return {"success": True}


@app.delete("/api/follow-ups/{followup_id}")
def delete_followup(followup_id: int, _: dict[str, Any] = Depends(current_user)) -> dict[str, bool]:
    with connect() as db:
        cursor = db.execute("DELETE FROM follow_ups WHERE id=?", (followup_id,))
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Follow-up not found.")
    return {"success": True}


@app.get("/api/customers")
def list_customers(_: dict[str, Any] = Depends(current_user)) -> list[dict[str, Any]]:
    with connect() as db:
        rows = db.execute(
            """SELECT e.*,u.name AS assigned_employee,c.id AS customer_id,
            (SELECT COUNT(*) FROM enquiries related WHERE related.customer_id=c.id) AS enquiry_count
            FROM customers c JOIN enquiries e ON e.customer_id=c.id
            LEFT JOIN users u ON u.id=e.assigned_employee_id
            WHERE e.status IN ('Approved','Installation In Progress','Installation Completed')
            AND e.id=(
                SELECT current.id FROM enquiries current
                WHERE current.customer_id=c.id
                AND current.status IN ('Approved','Installation In Progress','Installation Completed')
                ORDER BY current.updated_at DESC,current.id DESC LIMIT 1
            )
            ORDER BY e.updated_at DESC"""
        ).fetchall()
    return [enquiry_record(row) for row in rows]


@app.get("/api/dashboard")
def dashboard(_: dict[str, Any] = Depends(current_user)) -> dict[str, Any]:
    with connect() as db:
        counts = {row["status"]: row["total"] for row in db.execute(
            "SELECT status,COUNT(*) AS total FROM enquiries GROUP BY status"
        ).fetchall()}
        total = db.execute("SELECT COUNT(*) FROM enquiries").fetchone()[0]
        followups = db.execute(
            """SELECT f.*,e.customer_name,e.mobile,e.email,e.city,e.status AS enquiry_status
            FROM follow_ups f JOIN enquiries e ON e.id=f.enquiry_id
            WHERE f.completed=0 AND f.scheduled_at>=? ORDER BY f.scheduled_at LIMIT 6""",
            (datetime.now().isoformat(timespec="minutes"),),
        ).fetchall()
        pending_followups = db.execute("SELECT COUNT(*) FROM follow_ups WHERE completed=0").fetchone()[0]
        recent = db.execute(
            """SELECT e.*,u.name AS assigned_employee FROM enquiries e LEFT JOIN users u ON u.id=e.assigned_employee_id
            ORDER BY e.enquiry_date DESC,e.id DESC LIMIT 6"""
        ).fetchall()
        monthly = db.execute(
            """SELECT activity.month,activity.count,COALESCE(completed.count,0) AS completed
            FROM (
                SELECT substr(enquiry_date,1,7) AS month,COUNT(*) AS count FROM enquiries
                WHERE enquiry_date>=date('now','start of month','-5 months') GROUP BY month
            ) activity
            LEFT JOIN (
                SELECT substr(changed_at,1,7) AS month,COUNT(*) AS count FROM status_history
                WHERE status='Installation Completed' AND changed_at>=date('now','start of month','-5 months')
                GROUP BY month
            ) completed ON completed.month=activity.month
            ORDER BY activity.month"""
        ).fetchall()
        history = db.execute(
            """SELECT substr(changed_at,1,10) AS day,COUNT(*) AS count FROM status_history
            WHERE changed_at>=datetime('now','-6 days') GROUP BY day ORDER BY day"""
        ).fetchall()
    followup_result = []
    for row in followups:
        item = dict(row)
        item["enquiry_id"] = f"ENQ-{item['enquiry_id']:04d}"
        item["completed"] = bool(item["completed"])
        followup_result.append(item)
    return {
        "total": total,
        "new": counts.get("New Enquiry", 0),
        "pending": sum(count for status, count in counts.items() if status not in ("Installation Completed", "Rejected")),
        "followups": pending_followups,
        "site_visits": counts.get("Site Visit Scheduled", 0),
        "approved": counts.get("Approved", 0),
        "rejected": counts.get("Rejected", 0),
        "converted": counts.get("Installation Completed", 0),
        "status_counts": counts,
        "monthly": [dict(row) for row in monthly],
        "daily": [dict(row) for row in history],
        "recent": [enquiry_record(row) for row in recent],
        "upcoming_followups": followup_result,
    }


@app.get("/api/reports")
def reports(_: dict[str, Any] = Depends(current_user)) -> dict[str, Any]:
    with connect() as db:
        totals = db.execute(
            """SELECT COUNT(*) AS total,
            SUM(CASE WHEN status='Installation Completed' THEN 1 ELSE 0 END) AS converted,
            SUM(CASE WHEN status='Approved' THEN 1 ELSE 0 END) AS approved,
            SUM(CASE WHEN status='Rejected' THEN 1 ELSE 0 END) AS rejected,
            COALESCE(SUM(capacity_kw),0) AS capacity FROM enquiries"""
        ).fetchone()
        monthly = db.execute(
            "SELECT substr(enquiry_date,1,7) AS month,COUNT(*) AS count FROM enquiries GROUP BY month ORDER BY month"
        ).fetchall()
        employees = db.execute(
            """SELECT u.name,COUNT(e.id) AS assigned,
            SUM(CASE WHEN e.status='Installation Completed' THEN 1 ELSE 0 END) AS converted
            FROM employees em JOIN users u ON u.id=em.user_id
            LEFT JOIN enquiries e ON e.assigned_employee_id=u.id
            GROUP BY u.id ORDER BY assigned DESC,u.name"""
        ).fetchall()
        statuses = db.execute("SELECT status,COUNT(*) AS count FROM enquiries GROUP BY status").fetchall()
    result = dict(totals)
    result["conversion_rate"] = round((result["converted"] or 0) * 100 / result["total"], 1) if result["total"] else 0
    result["monthly"] = [dict(row) for row in monthly]
    result["employees"] = [dict(row) for row in employees]
    result["statuses"] = [dict(row) for row in statuses]
    return result


@app.get("/api/reports/export")
def export_reports(_: dict[str, Any] = Depends(current_user)) -> StreamingResponse:
    with connect() as db:
        rows = db.execute(
            """SELECT e.id,e.customer_name,e.mobile,e.email,e.city,e.state,e.capacity_kw,e.monthly_bill,
            e.property_type,e.source,e.enquiry_date,e.status,u.name AS assigned_employee,e.remarks
            FROM enquiries e LEFT JOIN users u ON u.id=e.assigned_employee_id ORDER BY e.enquiry_date DESC"""
        ).fetchall()
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Enquiry ID", "Customer", "Mobile", "Email", "City", "State", "Capacity (kW)", "Monthly bill",
                     "Property", "Source", "Enquiry date", "Status", "Assigned employee", "Remarks"])
    for row in rows:
        writer.writerow([f"ENQ-{row['id']:04d}", *[row[key] for key in (
            "customer_name", "mobile", "email", "city", "state", "capacity_kw", "monthly_bill", "property_type",
            "source", "enquiry_date", "status", "assigned_employee", "remarks")]])
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="solar-enquiries.csv"'},
    )
