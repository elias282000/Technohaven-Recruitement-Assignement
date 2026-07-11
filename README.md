# Real-Time Service Request Management System

A full-stack, real-time service request management application developed for a technical test assignment. The system allows authenticated Operators and Supervisors to create, monitor, update, and cancel service requests while receiving live updates through native WebSockets. Requests are processed concurrently in the background without blocking incoming API requests.

---

## Table of Contents

- [Project Overview](#project-overview)
- [Business Problem](#business-problem)
- [Users and Roles](#users-and-roles)
- [Core Features](#core-features)
- [Project Documentation](#project-documentation)
- [Technology Stack](#technology-stack)
- [Architecture Overview](#architecture-overview)
- [Project Structure](#project-structure)
- [Request Lifecycle](#request-lifecycle)
- [Authorization Rules](#authorization-rules)
- [Database Design](#database-design)
- [API Documentation](#api-documentation)
- [WebSocket Events](#websocket-events)
- [Concurrent Processing](#concurrent-processing)
- [Restart Recovery](#restart-recovery)
- [Frontend State and Recovery](#frontend-state-and-recovery)
- [Assumptions](#assumptions)
- [Key Design Decisions](#key-design-decisions)
- [Environment Configuration](#environment-configuration)
- [Database Setup](#database-setup)
- [Backend Setup](#backend-setup)
- [Frontend Setup](#frontend-setup)
- [Running the Application](#running-the-application)
- [Testing](#testing)
- [Postman Testing](#postman-testing)
- [Security Notes](#security-notes)
- [Known Assignment-Level Limitations](#known-assignment-level-limitations)
- [Git History](#git-history)
- [Acceptance Status](#acceptance-status)

---

## Project Overview

The Real-Time Service Request Management System replaces manual request tracking with a centralized web application. It provides:

- authenticated access;
- role-based and ownership-based authorization;
- request creation and monitoring;
- manual and automatic status progression;
- live WebSocket updates;
- concurrent background processing;
- restart recovery from persisted PostgreSQL state;
- responsive desktop, tablet, and mobile interfaces;
- request history and timestamps;
- keyword search and filters;
- live dashboard counts;
- clear loading, validation, conflict, permission, offline, and recovery states.

PostgreSQL is the authoritative source of truth. WebSocket messages notify connected clients that state has changed, and the frontend reconciles through REST to reload the latest persisted state.

---

## Business Problem

The organization previously handled service requests manually through spreadsheets, phone calls, and verbal handoffs. This caused delayed updates, poor visibility, inconsistent tracking, difficulty monitoring several requests at once, and no reliable status history.

This application addresses those issues by providing a real-time, authenticated, persistent, and concurrent request-management workflow.

---

## Users and Roles

### Operator

An Operator can:

- log in;
- create service requests;
- view all requests;
- view request details and history;
- search and filter requests;
- manually update only requests they created;
- cancel only requests they created;
- receive live updates.

### Supervisor

A Supervisor can:

- log in;
- create service requests;
- view all requests;
- view request details and history;
- search and filter requests;
- manually update any non-terminal request;
- cancel any non-terminal request;
- monitor global request counts;
- receive live updates.

Backend authorization is the security boundary. The frontend may hide unavailable controls, but every permission rule is enforced by the backend.

---

## Core Features

- JWT login and protected routes
- Operator and Supervisor roles
- Request creation with title, description, requester name, and priority
- Request listing and details
- Request status history
- Manual status transitions
- Automatic background progression
- Soft cancellation
- Search by title, description, and requester name
- Filter by status and priority
- Live dashboard summary
- Native WebSocket updates
- Automatic WebSocket reconnection
- REST reconciliation after reconnect
- Concurrent request processing
- Startup recovery for active requests
- Responsive desktop, tablet, and mobile UI
- Loading, empty, validation, permission, conflict, offline, and recovery states
- Global frontend error boundary
- Automated backend tests
- Postman acceptance testing

---

## Project Documentation

- [System Analysis](docs/Documents/System%20analysis.md)
- [System Design](docs/Documents/System%20Design.md)
- [Technical Test Assignment](docs/Documents/Technical%20Test%20Assignment.pdf)
- [Acceptance Test Report](docs/testing/phase-4-acceptance-test-report.md)
- [Defect Log](docs/testing/phase-4-defect-log.md)
- [Postman Collection](docs/Service%20Request%20Management%20-%20Acceptance.postman_collection.json)
- [Postman Environment](docs/Service%20Request.postman_environment.json)

---

## Technology Stack

| Layer | Technology |
|---|---|
| Backend | FastAPI |
| Language | Python |
| Database | PostgreSQL |
| ORM | SQLAlchemy async |
| Validation | Pydantic |
| Authentication | JWT using `python-jose` |
| Password hashing | `passlib[bcrypt]` |
| Real-time communication | Native FastAPI WebSockets |
| Concurrency | `asyncio.create_task` |
| Frontend | React with Vite |
| Frontend language | TypeScript |
| Styling | Tailwind CSS |
| State management | React hooks and Context |
| Version control | Git |
| API testing | Postman |
| Development environment | CachyOS / Arch Linux |

---

## Architecture Overview

```mermaid
graph TB
    subgraph Client["React Client"]
        UI["Pages and Components"]
        Auth["AuthContext"]
        RT["RealtimeContext"]
        APIClient["REST API Client"]
        WS["WebSocket Client"]
        ErrorBoundary["App Error Boundary"]
    end

    subgraph Backend["FastAPI Backend"]
        Routers["REST and WebSocket Routers"]
        Services["Business Services"]
        Security["JWT and Password Security"]
        TaskManager["Background Task Manager"]
        Recovery["Startup Recovery"]
        WSManager["WebSocket Manager"]
    end

    subgraph Data["Persistence"]
        DB[("PostgreSQL")]
    end

    UI --> Auth
    UI --> RT
    UI --> APIClient
    RT --> WS
    ErrorBoundary --> UI

    APIClient -->|REST + Bearer JWT| Routers
    WS <-->|WebSocket + JWT| Routers

    Routers --> Services
    Routers --> Security
    Services --> DB
    Services --> TaskManager
    Services --> WSManager
    Recovery --> DB
    Recovery --> TaskManager
    WSManager --> WS

    RT -->|Event triggers REST reconciliation| APIClient
```

### Architectural principles

- PostgreSQL is the durable source of truth.
- Routers contain HTTP or WebSocket input/output logic only.
- Services enforce business rules and persistence orchestration.
- Models and schemas define database and API data shapes.
- Core modules contain configuration, authentication, WebSocket management, task scheduling, and recovery.
- WebSocket events are change notifications, not the final source of request state.
- Status updates and history writes are committed before broadcasts occur.

---

## Project Structure

```text
.
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth.py
│   │   │   ├── dependencies.py
│   │   │   ├── __init__.py
│   │   │   ├── requests.py
│   │   │   └── websocket.py
│   │   ├── core/
│   │   │   ├── background_processing.py
│   │   │   ├── config.py
│   │   │   ├── __init__.py
│   │   │   ├── security.py
│   │   │   ├── startup_recovery.py
│   │   │   ├── task_manager.py
│   │   │   ├── websocket_events.py
│   │   │   └── websocket_manager.py
│   │   ├── db/
│   │   │   ├── database.py
│   │   │   ├── init_db.py
│   │   │   ├── __init__.py
│   │   │   ├── models.py
│   │   │   ├── seed_users.py
│   │   │   └── verify_db.py
│   │   ├── schemas/
│   │   │   ├── auth.py
│   │   │   ├── __init__.py
│   │   │   └── requests.py
│   │   ├── services/
│   │   │   ├── auth_service.py
│   │   │   ├── __init__.py
│   │   │   └── request_service.py
│   │   ├── __init__.py
│   │   └── main.py
│   ├── tests/
│   │   ├── test_auth_api.py
│   │   ├── test_background_processing.py
│   │   ├── test_health.py
│   │   ├── test_models.py
│   │   ├── test_request_api.py
│   │   ├── test_request_broadcasts.py
│   │   ├── test_request_schemas.py
│   │   ├── test_request_service.py
│   │   ├── test_security.py
│   │   ├── test_task_manager.py
│   │   ├── test_websocket_api.py
│   │   ├── test_websocket_events.py
│   │   └── test_websocket_manager.py
│   ├── pyproject.toml
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── auth/
│   │   │   ├── errors/
│   │   │   ├── layout/
│   │   │   ├── realtime/
│   │   │   ├── requests/
│   │   │   └── ui/
│   │   ├── contexts/
│   │   ├── hooks/
│   │   ├── lib/
│   │   ├── pages/
│   │   ├── services/
│   │   ├── types/
│   │   ├── App.tsx
│   │   ├── index.css
│   │   ├── main.tsx
│   │   └── vite-env.d.ts
│   ├── eslint.config.js
│   ├── index.html
│   ├── package.json
│   ├── package-lock.json
│   └── vite.config.ts
├── docs/
│   ├── Documents/
│   │   ├── System analysis.md
│   │   ├── System Design.md
│   │   └── Technical Test Assignment.pdf
│   ├── Service Request Management - Acceptance.postman_collection.json
│   ├── Service Request.postman_environment.json
│   └── testing/
│       ├── evidence/
│       │   ├── backend-compileall.txt
│       │   ├── backend-pytest.txt
│       │   ├── database-verification.txt
│       │   ├── desktop_dashboard.png
│       │   ├── desktop_requests.png
│       │   ├── frontend-build.txt
│       │   ├── frontend-lint.txt
│       │   ├── mobile_login.png
│       │   ├── mobile_requests.png
│       │   ├── postman-console.txt
│       │   ├── tablet_dashboard.png
│       │   └── websocket_reconnecting.png
│       ├── phase-4-acceptance-test-report.md
│       └── phase-4-defect-log.md
└── README.md
```

---

## Request Lifecycle

```mermaid
stateDiagram-v2
    [*] --> Pending: Request created
    Pending --> InProgress: Manual or automatic start
    Pending --> Cancelled: Authorized cancellation
    InProgress --> Completed: Manual or automatic completion
    InProgress --> Cancelled: Authorized cancellation
    Completed --> [*]
    Cancelled --> [*]
```

### Valid transitions

| Current status | Requested status | Valid |
|---|---|---|
| `pending` | `in_progress` | Yes |
| `pending` | `cancelled` | Yes |
| `in_progress` | `completed` | Yes |
| `in_progress` | `cancelled` | Yes |
| `pending` | `completed` | No |
| `in_progress` | `pending` | No |
| Any status | Same status | No |
| `completed` | Any status | No |
| `cancelled` | Any status | No |

`completed` and `cancelled` are terminal states.

---

## Authorization Rules

| Operation | Operator | Supervisor |
|---|---|---|
| Create request | Allowed | Allowed |
| View all requests | Allowed | Allowed |
| View request details/history | Allowed | Allowed |
| Update own request | Allowed if transition is valid and the request is non-terminal | Allowed |
| Update another user's request | Forbidden | Allowed if transition is valid and the request is non-terminal |
| Cancel own request | Allowed if active | Allowed |
| Cancel another user's request | Forbidden | Allowed if active |
| Modify completed request | Forbidden | Forbidden |
| Modify cancelled request | Forbidden | Forbidden |

### Important field distinction

- `requester_name` is the person for whom service is requested.
- `created_by` is the authenticated internal user who created the record.

The backend derives `created_by` from the JWT. If a client submits a `created_by` field, it is ignored and cannot override the authenticated creator.

---

## Database Design

### `users`

| Column | Description |
|---|---|
| `id` | Primary key |
| `email` | Unique login email |
| `hashed_password` | bcrypt hash |
| `role` | `operator` or `supervisor` |
| `created_at` | Account creation timestamp |

### `service_requests`

| Column | Description |
|---|---|
| `id` | Primary key |
| `title` | Request title |
| `description` | Request description |
| `requester_name` | Person requesting service |
| `priority` | `low`, `medium`, or `high` |
| `status` | Current lifecycle status |
| `created_by` | Foreign key to `users.id` |
| `created_at` | Creation timestamp |
| `updated_at` | Last-update timestamp |

### `request_status_history`

| Column | Description |
|---|---|
| `id` | Primary key |
| `request_id` | Foreign key to `service_requests.id` |
| `old_status` | Status before transition |
| `new_status` | Status after transition |
| `changed_at` | Transition timestamp |

### Integrity rules

- email is unique;
- all required business fields are non-null;
- role, priority, and status values are constrained;
- every request references a valid creator;
- every history row references a valid request;
- status update and history insertion occur in one transaction;
- WebSocket broadcasts happen only after commit.

---

## API Documentation

All endpoints except `/auth/login` require:

```http
Authorization: Bearer <token>
```

### Authentication

#### Login

```http
POST /auth/login
```

Request:

```json
{
  "email": "operator@example.com",
  "password": "your-password"
}
```

Response:

```json
{
  "access_token": "<jwt>",
  "token_type": "bearer"
}
```

#### Current user

```http
GET /auth/me
```

### Requests

| Method | Endpoint | Purpose |
|---|---|---|
| `POST` | `/requests` | Create a request |
| `GET` | `/requests` | List, search, and filter requests |
| `GET` | `/requests/{id}` | Get request details |
| `GET` | `/requests/{id}/history` | Get request history |
| `PATCH` | `/requests/{id}/status` | Perform a valid status transition |
| `DELETE` | `/requests/{id}` | Soft-cancel a request |

#### Create request

```json
{
  "title": "Printer not working",
  "description": "The third-floor printer is jammed.",
  "requester_name": "Ayesha Rahman",
  "priority": "medium"
}
```

#### Search and filters

```text
GET /requests?q=ayesha&status=in_progress&priority=high
```

#### Update status

```json
{
  "status": "in_progress"
}
```

### Common response codes

| Status | Meaning |
|---|---|
| `200` | Request succeeded |
| `201` | Request created |
| `401` | Missing, invalid, or expired authentication |
| `403` | Authenticated user lacks permission |
| `404` | Resource does not exist |
| `409` | Invalid or terminal-state transition |
| `422` | Validation failed |

### Interactive API documentation

```text
http://127.0.0.1:8000/docs
```

OpenAPI JSON:

```text
http://127.0.0.1:8000/openapi.json
```

---

## WebSocket Events

### Connection URL

```text
ws://127.0.0.1:8000/ws?token=<jwt>
```

### `connection_established`

```json
{
  "type": "connection_established",
  "data": {
    "user_id": 1,
    "role": "operator"
  }
}
```

### `request_created`

Sent after a request is successfully committed.

### `request_updated`

Sent after a status transition is successfully committed.

### Connection behavior

- non-authentication disconnects trigger automatic reconnect;
- reconnection uses bounded exponential backoff;
- the delay begins at approximately one second;
- the delay is capped at approximately fifteen seconds;
- close code `1008` is treated as authentication failure;
- authentication failure clears the session instead of reconnecting;
- logout and component cleanup cancel timers and close the socket.

The frontend treats WebSocket events as change notifications and reloads authoritative REST data after each relevant event.

---

## Concurrent Processing

Each active request is assigned an independent `asyncio` task.

```python
task = asyncio.create_task(
    process_request(request_id),
)
```

The task manager tracks running tasks by request ID and avoids duplicate local scheduling.

### Automatic processing flow

1. Load request state from PostgreSQL.
2. Stop if the request is missing or terminal.
3. If `pending`, wait for the configured pending delay.
4. Reload the request.
5. Attempt `pending -> in_progress`.
6. Wait for the configured completion delay.
7. Reload the request.
8. Attempt `in_progress -> completed`.
9. Stop if the request was manually changed or cancelled.
10. Log task-level failures without crashing the application.

Manual and automatic changes use the same transition service.

---

## Restart Recovery

During FastAPI startup:

1. connect to PostgreSQL;
2. query requests with status `pending` or `in_progress`;
3. schedule one task per active request;
4. avoid duplicate local scheduling;
5. continue application startup.

A recovered `in_progress` request continues toward `completed`; it is not reset to `pending`.

During shutdown:

1. close WebSocket connections;
2. cancel and await local background tasks;
3. dispose the database engine.

---

## Frontend State and Recovery

### Authentication

- JWT is stored in local storage.
- `/auth/me` restores authenticated user state.
- authenticated REST `401` responses clear the stored token;
- WebSocket close code `1008` also clears authentication;
- protected routes redirect to login.

### Real-time state

`RealtimeContext` manages:

- connection status;
- WebSocket lifecycle;
- reconnect attempts;
- event subscriptions;
- automatic backoff;
- logout on authentication failure.

### Error handling

The frontend includes:

- field validation;
- network error messages;
- permission-denied messages;
- not-found handling;
- state-conflict handling;
- loading and empty states;
- reconnecting and offline banners;
- a global React error boundary.

---

## Assumptions

- The application is used internally by Operators and Supervisors.
- External customers do not log in directly.
- Request fulfillment is simulated through configurable asynchronous delays.
- Requests are independent.
- The assignment runs using one backend process.
- PostgreSQL is available before the backend starts.
- Active request status survives restart, but exact remaining delay time does not.
- No distributed worker or message broker is required.

---

## Key Design Decisions

### PostgreSQL as the source of truth

Request status is persisted before any WebSocket event is sent. The frontend reloads REST data after events so disconnected clients can reconcile with persisted state.

### Native WebSockets

The system uses FastAPI WebSockets directly instead of Socket.IO.

### Shared transition service

Manual actions and background workers use the same transition validation and persistence logic.

### Local asyncio task manager

`asyncio.create_task` satisfies assignment-scale non-blocking concurrency without introducing Celery or Redis.

### React Context instead of Redux

Authentication and real-time connection state are managed through Context and hooks without an extra state-management dependency.

---

## Environment Configuration

Create real `.env` files from the included examples.

### Backend `.env.example`

```env
DATABASE_URL=postgresql+asyncpg://service_request_app:CHANGE_ME@127.0.0.1:5432/service_request_db
JWT_SECRET_KEY=replace-with-a-long-random-secret
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440
PENDING_PROCESSING_DELAY_SECONDS=5
COMPLETION_PROCESSING_DELAY_SECONDS=10
FRONTEND_ORIGINS=http://localhost:5173,http://localhost:4173
```

### Frontend `.env.example`

```env
VITE_API_BASE_URL=http://127.0.0.1:8000
```

Never commit real `.env` files.

---

## Database Setup

### 1. Start PostgreSQL

```fish
sudo systemctl enable --now postgresql
```

### 2. Create the database user and database

```fish
sudo -u postgres psql
```

```sql
CREATE USER service_request_app
WITH PASSWORD 'replace-with-a-strong-password';

CREATE DATABASE service_request_db
OWNER service_request_app;

GRANT ALL PRIVILEGES
ON DATABASE service_request_db
TO service_request_app;
```

Exit:

```sql
\q
```

### 3. Configure the backend

Create `backend/.env` from `backend/.env.example` and set the real database password and JWT secret.

### 4. Initialize the database

```fish
cd backend
source .venv/bin/activate.fish
python -m app.db.init_db
```

### 5. Seed the required users

```fish
python -m app.db.seed_users
```

### 6. Verify the database

```fish
python -m app.db.verify_db
```

---

## Backend Setup

### Requirements

- Python 3.12 or later
- PostgreSQL
- `pip`
- virtual-environment support

### Install

```fish
cd backend

python -m venv .venv
source .venv/bin/activate.fish

python -m pip install --upgrade pip
pip install -r requirements.txt
cp .env.example .env
```

For Bash or Zsh:

```bash
source .venv/bin/activate
```

### Initialize

```fish
python -m app.db.init_db
python -m app.db.seed_users
python -m app.db.verify_db
```

### Run

```fish
fastapi dev app/main.py
```

Alternative:

```fish
uvicorn app.main:app --reload
```

Backend:

```text
http://127.0.0.1:8000
```

Swagger:

```text
http://127.0.0.1:8000/docs
```

---

## Frontend Setup

### Requirements

- Node.js
- npm

### Install

```fish
cd frontend
npm install
cp .env.example .env
```

### Run

```fish
npm run dev
```

Frontend:

```text
http://localhost:5173
```

### Build

```fish
npm run build
```

### Preview

```fish
npm run preview
```

Preview URL:

```text
http://localhost:4173
```

---

## Running the Application

Use three terminals.

### Terminal 1 — PostgreSQL

```fish
sudo systemctl start postgresql
```

### Terminal 2 — Backend

```fish
cd backend
source .venv/bin/activate.fish
fastapi dev app/main.py
```

### Terminal 3 — Frontend

```fish
cd frontend
npm run dev
```

Open:

```text
http://localhost:5173
```

---

## Testing

Testing evidence is stored in:

```text
docs/testing/
```

The completed acceptance report covers FR-1 through FR-17 and NFR-1 through NFR-13.

### Test documents

- [Acceptance Test Report](docs/testing/phase-4-acceptance-test-report.md)
- [Defect Log](docs/testing/phase-4-defect-log.md)

### Backend tests

```fish
cd backend
source .venv/bin/activate.fish
pytest -v
```

Evidence:

- [Backend pytest output](docs/testing/evidence/backend-pytest.txt)
- [Backend compile output](docs/testing/evidence/backend-compileall.txt)
- [Database verification output](docs/testing/evidence/database-verification.txt)

### Python compilation

```fish
python -m compileall app tests
```

### Database verification

```fish
python -m app.db.verify_db
```

### Frontend lint

```fish
cd frontend
npm run lint
```

Evidence:

- [Frontend lint output](docs/testing/evidence/frontend-lint.txt)

### Frontend build

```fish
npm run build
```

Evidence:

- [Frontend build output](docs/testing/evidence/frontend-build.txt)

### Responsive and recovery evidence

#### Desktop dashboard

![Desktop dashboard](docs/testing/evidence/desktop_dashboard.png)

#### Desktop requests

![Desktop requests](docs/testing/evidence/desktop_requests.png)

#### Tablet dashboard

![Tablet dashboard](docs/testing/evidence/tablet_dashboard.png)

#### Mobile login

![Mobile login](docs/testing/evidence/mobile_login.png)

#### Mobile requests

![Mobile requests](docs/testing/evidence/mobile_requests.png)

#### WebSocket reconnecting state

![WebSocket reconnecting state](docs/testing/evidence/websocket_reconnecting.png)

### Postman console evidence

- [Postman console output](docs/testing/evidence/postman-console.txt)

---

## Postman Testing

Import:

- [Acceptance Postman Collection](docs/Service%20Request%20Management%20-%20Acceptance.postman_collection.json)
- [Postman Environment](docs/Service%20Request.postman_environment.json)

Configure:

```text
baseUrl
operatorEmail
operatorPassword
supervisorEmail
supervisorPassword
```

Recommended folder order:

```text
00 - Health
01 - Authentication
02 - Request Creation and Retrieval
03 - Validation
04 - Search and Filters
05 - Authorization and Status Transitions
06 - Cancellation
07 - Concurrency Seed Requests
08 - History and Terminal Integrity
```

### WebSocket testing in Postman

Connect to:

```text
ws://127.0.0.1:8000/ws?token=<valid-token>
```

Invalid or missing tokens should be rejected with close code `1008`.

---

## Security Notes

- Passwords are stored only as bcrypt hashes.
- Password and hash fields are never returned through APIs.
- `created_by` is derived from JWT identity.
- Unauthorized submitted creator IDs are ignored.
- Ownership rules are enforced server-side.
- Pydantic validates backend input.
- SQLAlchemy uses parameterized queries.
- React escapes normal text content.
- JWTs expire after a configured duration.
- Runtime authentication failures clear the client session.
- Stack traces are not exposed in UI error messages.
- Real `.env` files are ignored by Git.

---

## Known Assignment-Level Limitations

- The application assumes a single backend process.
- Background task references are stored in local memory.
- PostgreSQL preserves request state, but not exact remaining delay duration.
- After restart, a recovered task begins a new configured delay for its persisted stage.
- Horizontal scaling would require a distributed task queue.
- Multiple backend instances would require a shared WebSocket broker.
- Dashboard counts are calculated from the complete request collection instead of a dedicated aggregation endpoint.
- Long-running fulfillment is simulated.
- No direct customer portal is included.
- No payment, billing, tenancy, SMS, or email integration is included.

---

## Git History

```text
e592ef5 test: complete tests acceptance verification
71bec8c updt: system analysis and system design is updated according to the implementation
e9272e3 feat: polish recovery and error handling states
1531b69 feat: add real-time frontend synchronization
2eb6039 feat: add frontend request management workflow
d5ed5e8 feat: add frontend authentication and dashboard shell
ebcfec6 feat: add authenticated WebSocket broadcasts
c2d5281 feat: add concurrent request processing and recovery
119cc0f feat: implement request management APIs
8bc53d7 feat: implement JWT authentication
f41c7e8 feat: add async database models
4f1ddfa chore: scaffold backend and frontend projects
e74a5bf Document: system analysis and system design added
2271a76 first commit
```

Review the current history with:

```fish
git log --oneline
```

---

## Acceptance Status

Testing completed successfully.

### Functional requirements

```text
FR-1 through FR-17: PASS
```

### Non-functional requirements

```text
NFR-1 through NFR-13: PASS
```

The implementation satisfies the mandatory assignment requirements:

- REST APIs
- native WebSocket communication
- concurrent background processing
- persistent PostgreSQL storage
- responsive React interface
- role-based and ownership-based authorization
- input validation
- structured error handling
- restart recovery
- meaningful Git history
- system analysis
- system design
- testing evidence
- complete project documentation

---

## End Note
Thank you very much for this opportunity. I hope to get to learn more with you.