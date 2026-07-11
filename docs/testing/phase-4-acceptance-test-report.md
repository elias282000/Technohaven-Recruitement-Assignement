# Phase 4 Acceptance Test Report

## Project

Real-Time Service Request Management System

## Objective

Verify FR-1 through FR-17 and NFR-1 through NFR-13 against the final implementation using Postman, browser UI testing, automated tests, database inspection, WebSocket testing, concurrency testing, and restart recovery.

## Environment

| Item | Actual value |
| --- | --- |
| Operating system | Cachy os (Arch based Linux) |
| Python | 3.14.6 |
| FastAPI | 0.139.0 |
| PostgreSQL | 18.4 |
| Node.js | 26.4.0 |
| npm | 12.0.0 |
| Browser | Brave Browser |
| Postman | **12.17.5-1** |
| Backend URL | `http://127.0.0.1:8000` |
| Frontend URL | `http://localhost:5173` |
| WebSocket URL | `ws://127.0.0.1:8000/ws` |
| Test date | 11/7/2026 |
| Tester | Elias Ur Rahman |

## API Perfromance in Postman

| Endpoint | Run 1 | Run 2 | Run 3 | Run 4 | Run 5 | Average |
| --- | --- | --- | --- | --- | --- | --- |
| GET /requests | 8 | 8 | 6 | 8 | 7 | 7 |
| GET /requests/{id} | 14 | 6 | 5 | 5 | 7 | 7 |
| GET/requests/{id}}/history | 6 | 7 | 5 | 6 | 7 | 6 |
| POST /requests | 23 | 29 | 39 | 35 | 31 | 31 |

## Automated checks

| Check | Result | Evidence |
| --- | --- | --- |
| Backend tests | PASS | `evidence/backend-pytest.txt` |
| Python compilation | PASS | `evidence/backend-compileall.txt` |
| Database verification | PASS | `evidence/database-verification.txt` |
| Frontend lint | PASS | `evidence/frontend-lint.txt` |
| Frontend build | PASS | `evidence/frontend-build.txt` |
| Postman collection | PASS | `evidence/postman-console.txt` |

## Functional requirements

| ID | Requirement | Evidence | Actual result | Status |
| --- | --- | --- | --- | --- |
| FR-1 | Create request | Postman folder 02 | Authenticated users successfully created requests with title, description, requester name, and priority. New requests were stored with `pending` status, and `created_by` was derived from the authenticated JWT user. When an extra unauthorized `created_by` field was submitted, it was ignored and did not override the authenticated creator. | PASS |
| FR-2 | View all requests | Folder 02 + UI | Both Operator and Supervisor accounts successfully retrieved the complete request list, including requester, creator, priority, status, and timestamps. | PASS |
| FR-3 | View details/history | Folder 02 + UI | Request details loaded successfully for valid IDs, and status-history entries were displayed in chronological order. Missing request IDs returned `404`. | PASS |
| FR-4 | Manual status update | Folder 05 | Valid manual transitions succeeded for authorized users. Invalid, same-state, backward, skipped, and terminal-state transitions were rejected with `409`. | PASS |
| FR-5 | Automatic progression | Timed Postman observation | Newly created requests progressed asynchronously from `pending` to `in_progress` and then to `completed` after the configured delays, without blocking API requests. | PASS |
| FR-6 | Cancellation | Folder 06 | Authorized users successfully cancelled eligible active requests. Cancellation changed the status to `cancelled`, retained the database record, and prevented later automatic completion. | PASS |
| FR-7 | Search | Folder 04 | Keyword search correctly matched request title, description, and requester name, including mixed-case searches. | PASS |
| FR-8 | Filters | Folder 04 | Status and priority filters returned only matching requests, and combined search, status, and priority filtering worked correctly. | PASS |
| FR-9 | WebSocket broadcast | Postman WebSocket + two clients | Authenticated WebSocket clients received `connection_established`, `request_created`, and `request_updated` events. Connected browser clients updated automatically without polling. | PASS |
| FR-10 | Live summary | Two-browser dashboard test | Dashboard counts for total, pending, in-progress, completed, and cancelled requests updated automatically after creation, transition, and cancellation events. | PASS |
| FR-11 | Concurrent processing | Folder 07 + health check | Multiple requests were created rapidly and progressed independently in parallel. The health endpoint and other API requests remained responsive during background processing. | PASS |
| FR-12 | Validation | Folder 03 | Invalid input, including blank fields, missing requester name, unsupported priority, and invalid status values, was rejected with clear `422` validation responses. | PASS |
| FR-13 | Connection status/recovery | Browser restart test | The frontend displayed connecting, live, and reconnecting states correctly. After backend restart, the WebSocket reconnected automatically and authoritative REST state was refreshed. | PASS |
| FR-14 | History/timestamps | Folder 08 + SQL | Creation and update timestamps were stored correctly. Every successful status transition created exactly one history row with old status, new status, and change time. Failed transitions created no history entry. | PASS |
| FR-15 | Authentication | Folder 01 | Valid Operator and Supervisor credentials returned JWT access tokens. Invalid credentials returned `401`, and `/auth/me` returned the authenticated user without password fields. | PASS |
| FR-16 | Role/ownership | Folders 05–06 | Operators could update and cancel only requests they created. Attempts to modify another user’s request returned `403`. Supervisors could update or cancel any eligible non-terminal request. | PASS |
| FR-17 | Protected REST/WebSocket | Folder 01 + WS test | Missing, invalid, and unauthorized REST tokens were rejected with `401`. Invalid or missing WebSocket tokens were rejected with close code `1008`. Invalid runtime sessions cleared the token and redirected the user to login. | PASS |

## Non-functional requirements

| ID | Requirement | Verification | Actual result | Status |
| --- | --- | --- | --- | --- |
| NFR-1 | Performance | Postman response times | Standard CRUD and read operations remained responsive under local assignment-scale load. Background processing did not delay normal API responses, and health checks remained fast while multiple requests were active. | PASS |
| NFR-2 | Responsive UI | 375×812, 768×1024, 1440×900 | The interface remained usable across mobile, tablet, and desktop viewports. Navigation, cards, tables, filters, modals, forms, banners, and dashboard counts adapted without horizontal overflow. | PASS |
| NFR-3 | Real-time latency | Commit-to-client observation | Request creation and status changes appeared on connected clients shortly after commit, within the expected local real-time interval and without manual refresh. | PASS |
| NFR-4 | Assignment-scale concurrency | Folder 07 | The async task model handled several simultaneous requests without serial execution, API blocking, or interference between independent tasks. | PASS |
| NFR-5 | Reliability/restart recovery | Pending/in-progress restart tests | A failure or restart did not corrupt stored request state. Persisted `pending` and `in_progress` requests were rescheduled at startup and resumed from their stored lifecycle stage. | PASS |
| NFR-6 | WebSocket recovery | Disconnect/reconnect test | Temporary WebSocket disconnection triggered automatic bounded reconnection. After reconnecting, `connection_established` caused REST reconciliation and recovered missed changes. | PASS |
| NFR-7 | Security | Negative auth/ownership/XSS/SQL-like input | Invalid authentication and unauthorized ownership actions were rejected server-side. SQL-like and script-like values were handled as ordinary text without execution. An unauthorized `created_by` field was ignored, and the backend retained the creator derived from the JWT. | PASS |
| NFR-8 | Maintainability | Architecture review | The implementation followed the documented separation between routers, services, models, schemas, core infrastructure, frontend services, contexts, hooks, pages, and components. | PASS |
| NFR-9 | Data integrity | SQL constraints/history review | Primary keys, foreign keys, non-null constraints, unique email, valid enum values, timestamps, and transactional request/history updates were verified. Request state and history remained consistent. | PASS |
| NFR-10 | Usability | Complete UI workflow | Users could complete the full workflow using clear forms, statuses, actions, filters, history, loading states, empty states, error states, permission messages, and recovery feedback. | PASS |
| NFR-11 | Configurability | `.env` review | Database connection, JWT settings, token lifetime, CORS origins, frontend API URL, and processing delays were loaded from environment configuration rather than hardcoded values. | PASS |
| NFR-12 | Password security | DB hash + API response review | Passwords were stored only as bcrypt hashes in PostgreSQL. Neither `password` nor `hashed_password` was returned by login, `/auth/me`, or request-related API responses. | PASS |
| NFR-13 | Session expiry | Invalid/expired token behavior | Replacing the stored JWT with an invalid token caused the next protected request to return `401`, clear authentication state and local storage, and redirect the user to the login page. | PASS |

## Final decision

*   ACCEPTED

## Known assignment-level limitations

*   Background tasks are local to one backend process.
*   PostgreSQL persists state, but exact remaining delay is not preserved after restart.
*   Horizontal scaling would require a distributed task queue and shared WebSocket broker.
*   Dashboard counts are calculated from the authoritative request collection.534