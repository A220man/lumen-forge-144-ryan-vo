# Product development plan

Each round completes one feature or repair. Future items are planned, not implemented claims.

## Current round

auth

## Roadmap

### skeleton — FastAPI/React skeleton with Docker and basic project structure

Status: done

Acceptance:
- Backend FastAPI app runs with health endpoint
- Frontend React+Vite app builds and serves
- Docker Compose brings up both services
- Basic project structure matches owned-app contract

Implementation: `backend/app/main.py`, `backend/app/api/health.py`, `backend/app/core/config.py`, `backend/requirements.txt`, `backend/Dockerfile`, `backend/.dockerignore`, `backend/tests/test_health.py`, `frontend/package.json`, `frontend/vite.config.ts`, `frontend/src/main.tsx`, `frontend/src/App.tsx`, `frontend/src/api/client.ts`, `frontend/Dockerfile`, `frontend/.dockerignore`, `frontend/nginx.conf`, `compose.yaml`, `.env.example`, `.gitignore`, `pyproject.toml`, `portfolio.json`

Tests: `backend/tests/test_health.py`, `frontend/src/__tests__/App.test.tsx`

### auth — OIDC Keycloak authentication with SPA PKCE flow

Status: in_progress

Acceptance:
- Login redirects to Keycloak
- Callback exchanges code for tokens with PKCE
- Access token stored in memory, not localStorage
- Protected API endpoints require valid token
- Logout clears session and redirects to Keycloak logout

Implementation: `backend/app/models/auth.py`, `backend/app/services/auth.py`, `backend/app/api/auth.py`, `backend/tests/test_auth.py`, `frontend/src/api/auth.ts`, `frontend/src/App.tsx`, `frontend/src/__tests__/App.test.tsx`

Tests: `backend/tests/test_auth.py`, `frontend/src/__tests__/App.test.tsx`

### source-management — Video source CRUD with SSRF-protected fetch

Status: planned

Acceptance:
- Create/list/update/delete video sources
- DNS-pinned fetch prevents SSRF via DNS rebinding
- Source test endpoint validates connectivity
- Pagination and filtering on list endpoint

### playback — Video playback with mobile-friendly controls

Status: planned

Acceptance:
- Video player loads and plays HLS/DASH streams
- Controls persist on mobile (no 3s auto-hide)
- Picture-in-picture support
- Poster image displays with correct aspect ratio

### search-browse — Search and browse workflows

Status: planned

Acceptance:
- Search across configured sources
- Browse categories/hot list
- Detail view with metadata
- Export/import source configurations

