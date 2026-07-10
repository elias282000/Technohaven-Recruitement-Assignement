## Real-Time Service Request Management System: System Design

## 1. Technology Stack and Justification

| Layer | Technology | Justification |
|---|---|---|
| Backend framework | **FastAPI (Python)** | Native async support, Pydantic validation, OpenAPI generation, lifecycle hooks, and native WebSockets. |
| Database | **PostgreSQL** | Durable relational storage, constraints, foreign keys, and a reliable source of truth for restart recovery. |
| ORM | **SQLAlchemy async** | Async database access with testable models and transaction boundaries. |
| Authentication | **JWT (`python-jose`) + bcrypt (`passlib`)** | Stateless authentication works for both REST and WebSocket access. |
| Real-time communication | **Native FastAPI WebSockets** | Meets the real-time requirement without adding Socket.IO. |
| Concurrency and recovery | **`asyncio.create_task` + FastAPI lifespan/startup hook** | Enables independent non-blocking tasks and rescheduling of persisted active requests after restart. |
| Frontend | **React with Vite** | Component-based interface and minimal tooling overhead. |
| Styling | **Tailwind CSS** | Supports the required responsive polished dashboard design. |
| Frontend state | **Hooks, reducer, and Context** | Sufficient for authentication, requests, summaries, and WebSocket state without Redux. |

## 2. High-Level Architecture

```mermaid
graph TB
    subgraph Client["Client Browser"]
        UI["React UI"]
        WSClient["WebSocket Client"]
    end

    subgraph Backend["FastAPI Backend"]
        REST["REST Routers"]
        WSRoute["WebSocket Route"]
        Auth["JWT Authentication"]
        Services["Business Services"]
        TaskManager["Background Task Manager"]
        Recovery["Startup Recovery"]
        WSManager["WebSocket Connection Manager"]
    end

    subgraph Data["Data Layer"]
        DB[("PostgreSQL")]
    end

    UI -->|HTTPS REST| REST
    WSClient <-->|WebSocket + JWT| WSRoute
    REST --> Auth
    WSRoute --> Auth
    REST --> Services
    WSRoute --> WSManager
    Services --> DB
    Services --> TaskManager
    TaskManager --> Services
    Services --> WSManager
    Recovery --> DB
    Recovery --> TaskManager
    WSManager --> WSClient
```

PostgreSQL is authoritative. The task manager contains only local runtime task references and can be rebuilt from the database after restart.

## 3. Component Design

```mermaid
graph TB
    subgraph Routers["Routers"]
        AuthRouter["auth.py"]
        RequestRouter["requests.py"]
        WebSocketRouter["websocket.py"]
    end

    subgraph Services["Services"]
        AuthService["auth_service.py"]
        RequestService["request_service.py"]
    end

    subgraph Core["Core Infrastructure"]
        Security["security.py"]
        Config["config.py"]
        WSManager["websocket_manager.py"]
        TaskManager["task_manager.py"]
        Recovery["startup_recovery.py"]
    end

    subgraph Data["Data Layer"]
        Models["models.py"]
        Schemas["schemas.py"]
        Database["database.py"]
    end

    AuthRouter --> AuthService
    RequestRouter --> RequestService
    WebSocketRouter --> Security
    WebSocketRouter --> WSManager

    AuthService --> Security
    AuthService --> Models
    RequestService --> Models
    RequestService --> TaskManager
    RequestService --> WSManager

    TaskManager --> RequestService
    Recovery --> Models
    Recovery --> TaskManager
    Models --> Database
    Config --> Database
    Config --> Security
    Config --> TaskManager
```

### 3.1 Responsibilities

#### Routers

- Parse HTTP or WebSocket input.
- Resolve the current authenticated user.
- Call service functions.
- Return HTTP responses or WebSocket connection outcomes.
- Contain no ownership, transition, or persistence rules.

#### Services

- Authenticate credentials.
- Create and query requests.
- Enforce Operator ownership and Supervisor permissions.
- Validate status transitions.
- Persist request and history changes transactionally.
- Trigger WebSocket broadcasts after successful commits.
- Coordinate task scheduling.

#### Core

- Read environment configuration.
- Hash passwords and issue/validate JWTs.
- Track WebSocket connections.
- Track running background tasks by request ID.
- Recover persisted active requests at startup.

#### Data layer

- Define SQLAlchemy models and relationships.
- Define Pydantic input/output schemas.
- Provide async sessions and engine lifecycle.

## 4. Database Design

### 4.1 Entity relationship diagram

```mermaid
erDiagram
    USERS ||--o{ SERVICE_REQUESTS : creates
    SERVICE_REQUESTS ||--o{ REQUEST_STATUS_HISTORY : logs

    USERS {
        int id PK
        string email UK
        string hashed_password
        string role
        datetime created_at
    }

    SERVICE_REQUESTS {
        int id PK
        string title
        string description
        string requester_name
        string priority
        string status
        int created_by FK
        datetime created_at
        datetime updated_at
    }

    REQUEST_STATUS_HISTORY {
        int id PK
        int request_id FK
        string old_status
        string new_status
        datetime changed_at
    }
```

### 4.2 Constraints

#### `users`

- `email`: unique and non-null.
- `hashed_password`: non-null.
- `role`: constrained to `operator` or `supervisor`.

#### `service_requests`

- `title`, `description`, and `requester_name`: non-null and validated for non-blank values.
- `priority`: constrained to `low`, `medium`, or `high`.
- `status`: constrained to `pending`, `in_progress`, `completed`, or `cancelled`.
- `created_by`: non-null foreign key to `users.id`.
- `updated_at`: updated on every successful status change.

#### `request_status_history`

- `request_id`: non-null foreign key to `service_requests.id`.
- `old_status` and `new_status`: constrained to valid status values.
- One history row is created for each successful status transition.

### 4.3 Consistency boundary

The request status update, `updated_at` change, and history insertion occur in one database transaction. The WebSocket event is sent only after the transaction commits successfully. This prevents clients from receiving an update that was not persisted.

## 5. Authorization Matrix

| Operation | Operator | Supervisor |
|---|---|---|
| Create request | Allowed | Allowed |
| List all requests | Allowed | Allowed |
| View request details/history | Allowed | Allowed |
| Manually update own request | Allowed if non-terminal and transition is valid | Allowed |
| Manually update another user's request | Forbidden | Allowed if non-terminal and transition is valid |
| Cancel own request | Allowed if `pending` or `in_progress` | Allowed |
| Cancel another user's request | Forbidden | Allowed if `pending` or `in_progress` |
| Update/cancel `completed` request | Forbidden | Forbidden |
| Update/cancel `cancelled` request | Forbidden | Forbidden |

The backend service layer enforces this matrix. The frontend may hide unavailable controls but is not a security boundary.

## 6. Status Transition Design

### 6.1 State diagram

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

### 6.2 Transition table

| Current status | Requested status | Valid | Notes |
|---|---|---|---|
| `pending` | `in_progress` | Yes | Manual or automatic |
| `pending` | `cancelled` | Yes | Must satisfy authorization |
| `in_progress` | `completed` | Yes | Manual or automatic |
| `in_progress` | `cancelled` | Yes | Must satisfy authorization |
| Any status | Same status | No | No-op transitions are rejected |
| `pending` | `completed` | No | Cannot skip processing |
| `in_progress` | `pending` | No | Backward transition prohibited |
| `completed` | Any status | No | Terminal |
| `cancelled` | Any status | No | Terminal |

A single service-layer function validates and executes all manual and automatic transitions.

## 7. API Design

All endpoints except `/auth/login` require `Authorization: Bearer <token>`.

| Method | Endpoint | Purpose | Authorization |
|---|---|---|---|
| POST | `/auth/login` | Authenticate and issue JWT | Public |
| GET | `/auth/me` | Return current user | Any authenticated user |
| POST | `/requests` | Create a request | Any authenticated user |
| GET | `/requests` | List/search/filter requests | Any authenticated user |
| GET | `/requests/{id}` | Get request details | Any authenticated user |
| PATCH | `/requests/{id}/status` | Perform a valid manual status transition | Operator owns request; Supervisor any request |
| GET | `/requests/{id}/history` | Get status history | Any authenticated user |
| DELETE | `/requests/{id}` | Cancel request by transitioning to `cancelled` | Operator owns request; Supervisor any request |
| WS | `/ws?token=<jwt>` | Receive live events | Any authenticated user |

### 7.1 Create request

**Request**

```json
{
  "title": "Printer not working",
  "description": "The third-floor printer is jammed.",
  "requester_name": "Ayesha Rahman",
  "priority": "medium"
}
```

**Response — `201 Created`**

```json
{
  "id": 42,
  "title": "Printer not working",
  "description": "The third-floor printer is jammed.",
  "requester_name": "Ayesha Rahman",
  "priority": "medium",
  "status": "pending",
  "created_by": 3,
  "created_at": "2026-07-10T09:15:00Z",
  "updated_at": "2026-07-10T09:15:00Z"
}
```

### 7.2 List query parameters

```text
GET /requests?status=in_progress&priority=high&q=ayesha
```

- `status`: optional valid status.
- `priority`: optional valid priority.
- `q`: optional case-insensitive keyword search across title, description, and requester name.

### 7.3 Manual status update

**Request**

```json
{
  "status": "in_progress"
}
```

Possible outcomes:

- `200 OK`: transition succeeded.
- `403 Forbidden`: Operator does not own the request.
- `404 Not Found`: request does not exist.
- `409 Conflict`: request is terminal or transition is invalid.
- `422 Unprocessable Entity`: malformed or unknown status value.

### 7.4 Cancellation

`DELETE /requests/{id}` performs a soft cancellation transition; it does not remove the row.

Possible outcomes:

- `200 OK`: request changed to `cancelled`.
- `403 Forbidden`: Operator does not own the request.
- `404 Not Found`: request does not exist.
- `409 Conflict`: request is already terminal.

## 8. WebSocket Design

### 8.1 Connection flow

```mermaid
sequenceDiagram
    participant C as React Client
    participant WSR as WebSocket Route
    participant Sec as Security
    participant WSM as Connection Manager

    C->>WSR: Connect /ws?token=JWT
    WSR->>Sec: Validate JWT
    alt Invalid or expired token
        WSR-->>C: Close with policy/auth error
    else Valid token
        WSR->>WSM: Register connection
        WSR-->>C: connection_established
        Note over C,WSM: Client remains registered until disconnect
    end
```

### 8.2 Event types

#### `request_created`

Sent after a request is committed.

#### `request_updated`

Sent after a successful status transition is committed.

Suggested event envelope:

```json
{
  "type": "request_updated",
  "data": {
    "id": 42,
    "status": "in_progress",
    "updated_at": "2026-07-10T09:16:00Z"
  }
}
```

The frontend updates the request collection and recalculates status-summary counts from the event data. On reconnection, it should refresh the REST list to recover any events missed while disconnected.

## 9. Concurrent Processing Design

### 9.1 New request flow

```mermaid
sequenceDiagram
    participant C as Client
    participant API as Request Router
    participant S as Request Service
    participant DB as PostgreSQL
    participant TM as Task Manager
    participant WS as WebSocket Manager

    C->>API: POST /requests
    API->>S: create_request(user, payload)
    S->>DB: INSERT status=pending
    DB-->>S: Commit request
    S->>TM: schedule(request_id)
    S->>WS: broadcast request_created
    S-->>API: Created request
    API-->>C: 201 Created
```

Scheduling is non-blocking. The API does not wait for automatic processing to finish.

### 9.2 Independent tasks

```mermaid
sequenceDiagram
    participant Loop as Async Event Loop
    participant A as Task Request A
    participant B as Task Request B
    participant S as Request Service

    par Concurrent execution
        Loop->>A: run process_request(A)
        A->>S: attempt automatic transition
    and
        Loop->>B: run process_request(B)
        B->>S: attempt automatic transition
    end

    Note over Loop: Failure in A must not stop B or the API
```

### 9.3 Task registry

The task manager maintains an in-memory dictionary similar to:

```text
request_id -> asyncio.Task
```

Before scheduling, it checks whether a non-finished local task already exists for that request. Completed tasks remove themselves from the registry through a done callback.

This registry prevents duplicate local scheduling but is not durable. Durability comes from PostgreSQL and startup recovery.

## 10. Automatic Transition Algorithm

Conceptual behavior for `process_request(request_id)`:

1. Open a new async database session.
2. Load the current request from PostgreSQL.
3. Stop if missing, `completed`, or `cancelled`.
4. If `pending`, wait for the configured pending-processing delay.
5. Reload the request.
6. Attempt `pending` → `in_progress` through the shared transition service.
7. Stop if the request changed manually, was cancelled, or is otherwise no longer eligible.
8. Wait for the configured completion delay.
9. Reload the request.
10. Attempt `in_progress` → `completed` through the shared transition service.
11. Catch and log task-level failures without crashing the application.

For a recovered request already in `in_progress`, the worker begins at the completion stage rather than resetting it to `pending`.

The reload before every transition prevents a background task from completing a request that a user already cancelled or completed.

## 11. Startup Recovery Design

### 11.1 Recovery flow

```mermaid
sequenceDiagram
    participant App as FastAPI Lifespan
    participant DB as PostgreSQL
    participant TM as Task Manager
    participant T as Recovered Tasks

    App->>DB: Query status IN (pending, in_progress)
    DB-->>App: Active request IDs and statuses
    loop Each active request
        App->>TM: schedule(request_id)
        TM->>T: asyncio.create_task(process_request)
    end
    App-->>App: Continue startup
```

### 11.2 Recovery rules

- Recovery runs after the database connection is available and before normal application operation is considered ready.
- Only `pending` and `in_progress` requests are rescheduled.
- `completed` and `cancelled` requests are never rescheduled.
- The persisted status determines the recovery stage.
- The task manager's duplicate check is used for both new and recovered requests.
- Every task still reloads current state before transitions, so recovery remains safe if a user changes a request shortly after startup.

### 11.3 Assignment-level limitation

This design preserves request state and resumes logical processing after restart, but it does not preserve the exact remaining sleep duration. A recovered task begins a new configured delay for its persisted stage. This limitation is acceptable for the simulated assignment workflow and must be documented in the README.

## 12. Race and Consistency Handling

Manual actions and background tasks may attempt to change the same request close together. The implementation must ensure that only a transition valid for the latest persisted state succeeds.

The simplest acceptable approach is:

1. Reload the request inside the transition service.
2. Validate current status, requested status, role, and ownership.
3. Update the request and insert history within one transaction.
4. Commit.
5. Broadcast only after commit.

For stronger protection, the update may include the expected current status in its database condition. If another transition wins first, the affected-row count is zero and the service returns a conflict instead of overwriting the newer state.

## 13. Authentication Flow

```mermaid
sequenceDiagram
    participant C as React Client
    participant AR as Auth Router
    participant AS as Auth Service
    participant Sec as Security
    participant DB as PostgreSQL

    C->>AR: POST /auth/login
    AR->>AS: authenticate(email, password)
    AS->>DB: Find user by email
    DB-->>AS: User record
    AS->>Sec: Verify bcrypt password
    alt Invalid credentials
        AS-->>AR: Authentication error
        AR-->>C: 401 Unauthorized
    else Valid credentials
        AS->>Sec: Issue JWT(user_id, role, expiry)
        Sec-->>AS: Access token
        AS-->>AR: Token response
        AR-->>C: 200 OK
    end
```

The JWT identity is used to derive `created_by` and enforce ownership. The client must never submit a trusted creator ID.

## 14. End-to-End Lifecycle

```mermaid
sequenceDiagram
    participant Op as Operator Client
    participant API as FastAPI
    participant S as Request Service
    participant DB as PostgreSQL
    participant TM as Task Manager
    participant WS as WebSocket Manager
    participant Sup as Supervisor Client

    Op->>API: POST request with requester_name
    API->>S: create_request
    S->>DB: Insert pending request
    S->>TM: Schedule background task
    S->>WS: Broadcast request_created
    WS-->>Sup: New request appears

    TM->>S: Attempt pending to in_progress
    S->>DB: Reload, validate, update + history
    S->>WS: Broadcast request_updated
    WS-->>Op: Status becomes in_progress
    WS-->>Sup: Status becomes in_progress

    alt Authorized cancellation before completion
        Op->>API: DELETE own request
        API->>S: cancel_request
        S->>DB: Reload, authorize, set cancelled + history
        S->>WS: Broadcast request_updated
        Note over TM: Later reload sees terminal status and stops
    else Normal automatic completion
        TM->>S: Attempt in_progress to completed
        S->>DB: Reload, validate, update + history
        S->>WS: Broadcast request_updated
        WS-->>Op: Status becomes completed
        WS-->>Sup: Status becomes completed
    end
```

## 15. Recommended Backend Structure

```text
backend/
├── app/
│   ├── main.py
│   ├── api/
│   │   ├── auth.py
│   │   ├── requests.py
│   │   └── websocket.py
│   ├── core/
│   │   ├── config.py
│   │   ├── security.py
│   │   ├── websocket_manager.py
│   │   ├── task_manager.py
│   │   └── startup_recovery.py
│   ├── db/
│   │   ├── database.py
│   │   └── models.py
│   ├── schemas/
│   │   ├── auth.py
│   │   └── requests.py
│   └── services/
│       ├── auth_service.py
│       └── request_service.py
├── tests/
├── .env.example
└── requirements.txt
```

The exact filenames may vary slightly, but the architectural responsibilities must remain separated.

## 16. Design Summary

The design uses PostgreSQL as the durable source of truth, a shared service-layer transition function for both manual and automatic changes, and an `asyncio` task manager for non-blocking processing. Ownership and role rules are explicit, `requester_name` is present throughout the data model and API, terminal states are protected, and active requests are safely rescheduled at startup. Status persistence and history are committed before WebSocket broadcast, keeping the database, audit trail, and live interface consistent.
