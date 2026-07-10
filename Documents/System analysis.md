## Real-Time Service Request Management System: System Analysis

## 1. Problem Statement

### 1.1 Business objectives

The organization currently handles customer service requests through manual processes such as phone calls, spreadsheets, and verbal handoffs. This causes delayed updates, poor visibility across staff, inconsistent tracking, and difficulty monitoring multiple requests at once.

The organization needs a centralized web application where:

- Operators can record service requests on behalf of requesters.
- Operators can manage requests they created.
- Supervisors can monitor and manage all requests.
- Status changes appear live for connected users.
- Multiple requests can be processed concurrently without one task blocking the API.
- Active processing can recover after a backend restart using persisted request state.

The objective is to replace manual tracking with a responsive, authenticated, real-time system that improves visibility, reduces delays, preserves status history, and supports reliable concurrent handling.

### 1.2 Users

| Role | Description |
|---|---|
| **Operator** | Creates service requests on behalf of named requesters. May manually update or cancel only requests they created, subject to transition and terminal-state rules. Must authenticate before using the system. |
| **Supervisor** | Monitors all active and completed requests in real time. May manually update or cancel any non-terminal request. Must authenticate before using the system. |

Both roles authenticate through a login screen. All request-related REST endpoints and the WebSocket connection require a valid JWT. Authorization decisions are enforced on the backend and are not dependent on hidden frontend controls.

### 1.3 Key domain distinctions

- `requester_name` identifies the person for whom the service is requested.
- `created_by` identifies the authenticated Operator or Supervisor who entered the request.
- Cancelling a request is a status transition to `cancelled`, not a physical database deletion.
- PostgreSQL is the source of truth for request state and restart recovery.

### 1.4 Assumptions

- The system is used internally by Operators and Supervisors, not directly by external customers.
- Operators enter a requester's name when creating a service request.
- A long-running operation is simulated with asynchronous processing delays because no external fulfillment service is specified.
- Requests are independent; one request does not depend on another request finishing.
- The application runs as a single backend process for this assignment.
- Persisted `pending` and `in_progress` requests are recoverable after a backend restart.
- A restarted `in_progress` request resumes from its persisted state; exact remaining wall-clock processing time is not preserved.
- Network conditions are sufficiently stable for WebSockets in a typical office, LAN, or cloud environment.
- No payment, billing, customer account, or multi-tenant functionality is required.

### 1.5 Scope

#### In scope

- Authentication for Operators and Supervisors.
- Role-based and ownership-based authorization.
- Creating requests with title, description, priority, and requester name.
- Viewing all requests and individual request details.
- Manual status updates according to permissions and valid transitions.
- Cancelling eligible requests according to permissions.
- Automatic background status progression.
- Concurrent processing of multiple independent requests.
- Restart recovery for persisted active requests.
- Search by title, description, or requester name.
- Filtering by status and priority.
- Status history and timestamps.
- Live status counts and WebSocket broadcasts.
- Responsive web interface.
- Persistent relational storage in PostgreSQL.

#### Out of scope

- Direct customer login or customer-side submission.
- Payment processing or billing.
- Multiple organizations or tenants.
- Native mobile applications.
- Email, SMS, or third-party integrations.
- Distributed task queues, external workers, or message brokers.
- Guaranteed preservation of the exact remaining delay across a process restart.

## 2. Discovery Questions and Resolved Decisions

The assignment did not provide direct stakeholder access, so the following questions were used to derive and clarify the requirements.

### 2.1 Business context

1. Who submits requests?
   - An authenticated internal user records the request on behalf of a requester, whose name is stored in `requester_name`.
2. What does processing mean?
   - It is a simulated long-running asynchronous operation.
3. What is the request lifecycle?
   - `pending`, `in_progress`, `completed`, or `cancelled`.
4. Can requests run simultaneously?
   - Yes. Every active request is processed independently.
5. What happens after a backend restart?
   - The application queries PostgreSQL for `pending` and `in_progress` requests and reschedules their background tasks.

### 2.2 Users and access

6. Do roles have different permissions?
   - Yes. Operators manage only their own requests; Supervisors manage all requests.
7. Is authentication required?
   - Yes, for all request APIs and WebSocket connections.
8. Who may cancel requests?
   - Operators may cancel their own eligible requests. Supervisors may cancel any eligible request.

### 2.3 Functional behavior

9. What fields are required when creating a request?
   - Title, description, priority, and requester name.
10. Are completed and cancelled requests retained?
   - Yes, for visibility and history.
11. What search and filters are required?
   - Keyword search plus status and priority filtering.
12. How are live updates scoped?
   - Relevant request events are broadcast to all authenticated connected clients.

### 2.4 Status coordination

13. Can manual and automatic processing conflict?
   - Both paths use the same transition validation. The worker reloads the database state before each automatic change.
14. Can terminal requests change?
   - No. `completed` and `cancelled` are terminal.
15. How is duplicate recovery avoided?
   - The running process maintains a task registry keyed by request ID and schedules at most one local task per request.

### 2.5 Non-functional expectations

16. How quickly should live updates appear?
   - Normally within approximately one second.
17. Should disconnected WebSockets recover?
   - Yes. The frontend should reconnect automatically.
18. Must data survive server restarts?
   - Yes. PostgreSQL persists data, and active processing is rescheduled from persisted statuses.
19. Is the UI responsive?
   - Yes, for desktop and mobile web viewports.

## 3. Business Rules

### 3.1 Request creation

- Any authenticated Operator or Supervisor may create a service request.
- A new request must contain title, description, priority, and `requester_name`.
- The backend derives `created_by` from the authenticated JWT identity; the client cannot choose it.
- Every new request begins with `pending` status.

### 3.2 Status values

The allowed statuses are:

- `pending`
- `in_progress`
- `completed`
- `cancelled`

### 3.3 Valid status transitions

The approved transitions are:

- `pending` → `in_progress`
- `pending` → `cancelled`
- `in_progress` → `completed`
- `in_progress` → `cancelled`

The following are invalid:

- transitions from `completed` or `cancelled`;
- moving backward from `in_progress` to `pending`;
- skipping directly from `pending` to `completed`;
- changing a request to its current status.

### 3.4 Manual update authorization

- An Operator may update only a request whose `created_by` matches the Operator's user ID.
- A Supervisor may update any request.
- The requested transition must be valid.
- Terminal requests cannot be updated.

### 3.5 Cancellation authorization

- An Operator may cancel only a request they created.
- A Supervisor may cancel any request.
- Only `pending` and `in_progress` requests may be cancelled.
- Cancellation retains the record and creates a status-history entry.

### 3.6 Automatic processing

- Background processing advances `pending` to `in_progress`, then `in_progress` to `completed`.
- The worker reloads the request from PostgreSQL immediately before each transition.
- If the request is terminal, missing, or no longer eligible for the intended transition, the worker stops.
- All transitions pass through one service-layer transition function so validation, history logging, timestamps, and broadcasts remain consistent.

### 3.7 Restart recovery

- On startup, the application queries all requests in `pending` or `in_progress` status.
- It schedules one local `asyncio` task per active request.
- `pending` resumes toward `in_progress`; `in_progress` resumes toward `completed`.
- The database state is never overwritten merely because the server restarted.

## 4. Functional Requirements

| ID | Requirement | Description |
|---|---|---|
| FR-1 | Create service request | An authenticated user can create a request with title, description, priority, and `requester_name`. The backend records the authenticated user as `created_by` and assigns `pending` status. |
| FR-2 | View all requests | Authenticated users can view all requests with requester, creator, priority, current status, and timestamps. |
| FR-3 | View request details | Authenticated users can view a specific request's full details and status history. |
| FR-4 | Manually update status | An Operator can update only their own request; a Supervisor can update any request. Only valid transitions from non-terminal states are accepted. |
| FR-5 | Automatic status progression | Each new or recovered active request progresses asynchronously according to the approved lifecycle. The worker reloads current database state before every transition. |
| FR-6 | Cancel request | An Operator can cancel only their own non-terminal request; a Supervisor can cancel any non-terminal request. Cancellation changes status to `cancelled` rather than deleting the row. |
| FR-7 | Search requests | Users can search requests by keyword across title, description, and requester name. |
| FR-8 | Filter requests | Users can filter by status and priority, including combined filters. |
| FR-9 | Real-time event broadcast | Request creation and every successful status change are pushed to authenticated connected clients through WebSockets without polling. |
| FR-10 | Live request summary | The dashboard displays live counts for each status and updates them when WebSocket events arrive. |
| FR-11 | Concurrent request processing | Multiple requests can progress independently at the same time without blocking standard API calls. |
| FR-12 | Validation feedback | Backend Pydantic validation and matching frontend validation provide clear errors for invalid title, description, requester name, priority, filters, and status changes. |
| FR-13 | Connection status indicator | The frontend shows connected, reconnecting, or disconnected WebSocket state and automatically attempts reconnection. |
| FR-14 | History and timestamps | Every request stores creation and last-update timestamps. Every successful status change stores old status, new status, and change time. |
| FR-15 | User authentication | Operators and Supervisors log in with email and password and receive an expiring JWT. |
| FR-16 | Role and ownership access control | Backend authorization distinguishes Supervisor-wide control from Operator ownership-limited control for updates and cancellation. |
| FR-17 | Protected REST and WebSocket access | All request APIs and WebSocket connections require a valid JWT; invalid or expired tokens are rejected. |

## 5. Non-Functional Requirements

| ID | Requirement | Description |
|---|---|---|
| NFR-1 | Performance | Standard CRUD responses should normally complete within approximately 200 ms under normal assignment/demo load, excluding simulated background processing. |
| NFR-2 | Responsive UI | The interface must adapt cleanly to desktop and mobile screen sizes. |
| NFR-3 | Real-time latency | Successful request events should normally reach connected clients within approximately one second. |
| NFR-4 | Scalability | The stateless REST layer, async processing model, and WebSocket manager should support increased assignment-scale concurrency without redesigning core modules. |
| NFR-5 | Reliability and recovery | A failure in one request task must not crash the API or other tasks. Persisted `pending` and `in_progress` requests must be rescheduled after backend restart. |
| NFR-6 | Availability | The frontend must recover gracefully from dropped WebSocket connections using automatic reconnection and state refresh where necessary. |
| NFR-7 | Security | Inputs must be validated and safely handled to reduce SQL injection and XSS risks. Authorization must be enforced server-side. |
| NFR-8 | Maintainability | Code must follow the documented router, service, model/schema, and core separation. |
| NFR-9 | Data integrity | PostgreSQL must enforce non-null fields, unique email, foreign keys, and valid role, priority, and status values. Status and history writes must remain consistent. |
| NFR-10 | Usability | A request should be creatable using only four required business fields: title, description, requester name, and priority. Current status and available actions must be clear at a glance. |
| NFR-11 | Configurability | Database URL, JWT secret, token duration, processing delays, ports, and related settings must be configured through environment variables. |
| NFR-12 | Authentication security | Passwords must be stored only as bcrypt hashes and never returned through APIs. |
| NFR-13 | Session expiry | JWTs must expire after a configured fixed duration, such as 24 hours. |

## 6. Acceptance Summary

The system is acceptable when all 17 functional and 13 non-functional requirements are demonstrably satisfied. Particular attention must be given to ownership authorization, terminal-state protection, requester-name consistency, concurrent processing, history integrity, WebSocket delivery, reconnect behavior, and recovery of persisted active requests after backend restart.
