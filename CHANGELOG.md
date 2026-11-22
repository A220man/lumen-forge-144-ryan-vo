# Changelog

## 1.6.0 — work-in-progress checkpoint

Partial code published for continued development. Known issues: STATUS.md.

## 1.5.1 — work-in-progress checkpoint

### Added
- Video playback API endpoint with HLS/DASH stream support
- Playback info response including stream URL, type, and poster image
- Updated playback tests verifying 200 response with playback configuration
- Playback feature moved from planned to in_progress

### Changed
- backend/app/api/playback.py: implemented router with /playback/{source_id} endpoint
- backend/tests/test_playback.py: updated tests to verify playback info response

## 1.5.0 — work-in-progress checkpoint

Partial code published for continued development. Known issues: STATUS.md.

## 1.4.0 — work-in-progress checkpoint

Partial code published for continued development. Known issues: STATUS.md.

## 1.3.0 — work-in-progress checkpoint

Partial code published for continued development. Known issues: STATUS.md.

## 1.2.0 — work-in-progress checkpoint

Partial code published for continued development. Known issues: STATUS.md.

## 1.1.0 — work-in-progress checkpoint

Partial code published for continued development. Known issues: STATUS.md.

## 1.0.0 — work-in-progress checkpoint

Partial code published for continued development. Known issues: STATUS.md.

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-10-23

### Added
- FastAPI backend with health endpoint
- React + TypeScript + Vite frontend
- Docker Compose with backend, frontend, Keycloak
- Keycloak realm import for local development
- OIDC SPA PKCE authentication flow (planned)
- SSRF-protected DNS-pinned fetch (planned)
- Video source CRUD API (planned)
- Mobile-optimized video playback (planned)
- Search and browse workflows (planned)
- Portfolio metadata (portfolio.json)
- Comprehensive README with architecture diagram
- MIT License
