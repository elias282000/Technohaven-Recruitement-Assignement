# Submission Notes

## Project

Real-Time Service Request Management System

## Main entry points

- Frontend: `frontend/`
- Backend: `backend/`
- README: `README.md`
- System Analysis: `docs/Documents/System analysis.md`
- System Design: `docs/Documents/System Design.md`
- Testing report: `docs/testing/phase-4-acceptance-test-report.md`
- Postman collection: `docs/Service Request Management - Acceptance.postman_collection.json`

## Local URLs

- Frontend: `http://localhost:5173`
- Frontend preview: `http://localhost:4173`
- Backend: `http://127.0.0.1:8000`
- Swagger: `http://127.0.0.1:8000/docs`
- WebSocket: `ws://127.0.0.1:8000/ws?token=<jwt>`

## Setup summary

```fish
# Backend
cd backend
python -m venv .venv
source .venv/bin/activate.fish
pip install -r requirements.txt
cp .env.example .env
python -m app.db.init_db
python -m app.db.seed_users
fastapi dev app/main.py

# Frontend
cd frontend
npm ci
cp .env.example .env
npm run dev