# Skill Verse Guidelines

This document captures the current structure, conventions, and implementation guardrails observed in the repository as of May 3, 2026. The codebase is still in an early scaffold stage, so these guidelines combine established patterns with the constraints already implied by the chosen stack.

## Project Shape

- The repository is split into `server/` and `client/`.
- `server/` is a Django project managed with Pipenv.
- `client/app/` is a Vite + React + TypeScript application.
- Keep backend and frontend concerns separate. Shared concepts should align by naming and API contracts, not by cross-importing code across the two runtimes.

## Backend Guidelines

### Current Structure

- Django entrypoint: `server/core/manage.py`
- Project config package: `server/core/core/`
- Main application package: `server/core/api/`
- URL routing is intended to flow from `core.urls` into `api.urls`.

### Backend Conventions To Keep

- Use Django app modules for server features rather than placing business logic directly in `settings.py` or root config files.
- Keep `core/` focused on project-wide configuration and top-level URL composition.
- Keep feature logic in `api/` or future dedicated apps.
- Add URL routes in app-local `urls.py`, then mount them from `core.urls`.
- Prefer explicit imports and small modules over large mixed-purpose files.

### Recommended Backend Patterns For New Work

- For API endpoints, prefer Django REST Framework views/serializers instead of ad hoc Django view functions.
- Introduce `serializers.py` when models and endpoints become real.
- Keep models in `models.py` until they become large enough to justify a `models/` package.
- Add tests alongside each feature using Django or DRF test clients.
- Move secrets and environment-specific settings out of source code and into environment variables or a dedicated local settings strategy.

### Backend Guardrails

- Do not hardcode credentials, secret keys, or permissive production settings.
- Keep CORS and host settings environment-aware.
- Match every installed dependency in settings with an actual package declaration in `Pipfile`.
- If MySQL remains the database, ensure the corresponding driver dependency is declared and documented.

## Frontend Guidelines

### Current Structure

- Frontend root: `client/app/`
- App entry: `src/main.tsx`
- Main component: `src/App.tsx`
- Global styles: `src/index.css`
- Component/page styles: `src/App.css`
- Static assets live in `src/assets/` and `public/`.

### Frontend Conventions To Keep

- Use TypeScript React function components.
- Keep the root render path minimal in `main.tsx`.
- Import component-scoped CSS alongside the component that uses it.
- Use CSS custom properties for theme tokens before introducing one-off literal values everywhere.
- Follow the existing ESLint and TypeScript strictness rather than disabling warnings casually.

### Recommended Frontend Patterns For New Work

- Replace starter content in `App.tsx` with product-specific UI before building additional pages on top of it.
- Break UI into small components once `App.tsx` starts carrying multiple responsibilities.
- Prefer semantic HTML and accessible labels/alt text.
- Keep assets intentional; remove starter logos and demo copy once real product work begins.
- If React Compiler stays enabled, favor straightforward component code and avoid premature memoization.

### Frontend Guardrails

- Preserve TypeScript-first development.
- Keep styling consistent through shared tokens and layout conventions.
- Avoid mixing demo scaffolding with production features in the same component for long.
- Maintain responsive behavior from the start because the current CSS already includes mobile breakpoints.

## Tooling And Dependency Guidelines

- Backend dependency management is Pipenv-based; update `Pipfile` and lockfile together.
- Frontend dependency management is npm-based via `package.json` and `package-lock.json`.
- Respect the existing Vite + React + TypeScript toolchain instead of introducing parallel build systems.
- Respect the existing ESLint flat config and fix warnings rather than muting rules by default.

## Backend Core Dependencies (Required Stack)

The backend uses the following stable dependency set:

- Django (core framework)
- Django REST Framework (`rest_framework`) for APIs
- MySQL database backend (`mysqlclient`)
- CORS handling (`django-cors-headers`)
- Environment variables (`python-decouple`)
- Image/file handling (`Pillow`)
- JWT authentication (`djangorestframework-simplejwt`)
- API schema documentation (`drf-spectacular`)
- Filtering support (`django-filter`)
- File cleanup automation (`django-cleanup`)
- Email delivery via Resend (`django-anymail[resend]`)

All backend features must align with this stack unless explicitly justified.

---

## Authentication Strategy

- Authentication is JWT-based using `SimpleJWT`.
- The frontend must never use Django session authentication for login state.
- API authentication is stateless and token-driven.
- Tokens are issued from backend and consumed by the React frontend.

---

## Email System

- Email sending is handled only in the Django backend (never in React).
- Email provider: Resend via `django-anymail`.
- API keys must be loaded from environment variables using `python-decouple`.
- All email-related logic must live in a dedicated service layer (e.g. `api/services/email_service.py`).
- Email should be triggered from backend views, signals, or service functions only.

---

## Media Handling

- Uploaded files are stored using Django `MEDIA_ROOT`.
- Media files are served only in development using `django.conf.urls.static`.
- Image handling requires the `Pillow` package.
- All file uploads must go through Django backend, never directly from frontend to storage.

---

## Environment Variable Rules

- All secrets must be stored in `.env`.
- Environment variables must be accessed using `decouple.config()`.
- Do NOT use `os.environ.get()` inside application logic unless there is a specific reason.
- `.env` must never be committed to version control.

---

## Backend Guardrails (Updated)

- Do not hardcode credentials, API keys, or secret tokens anywhere in the codebase.
- Do not implement email, authentication, or background jobs in the frontend layer.
- All business-critical logic must remain in Django API layer or service modules.
- Keep CORS and host configuration environment-aware.
- Ensure every installed dependency is reflected in `Pipfile` and lockfile.



## File Placement Rules

- Backend config changes belong under `server/core/core/`.
- Backend app logic belongs under `server/core/api/` unless a new Django app is created for a distinct domain.
- Frontend runtime code belongs under `client/app/src/`.
- Frontend static public assets belong under `client/app/public/`.
- Images imported by components belong under `client/app/src/assets/`.

## Testing Expectations

- Add backend tests when creating models, serializers, or endpoints.
- Add frontend tests once non-trivial UI or stateful logic appears.
- At minimum, run lint/build checks for the frontend and Django checks/tests for the backend before merging meaningful work.

## Naming And Style

- Prefer descriptive names over abbreviations.
- Keep modules focused on one responsibility.
- Favor explicitness over clever abstractions because the codebase is still young.
- Add comments only when the reason for a block is not obvious from the code itself.

## Current Reality Check

- The repository is currently closer to a scaffold than a mature product codebase.
- Several configuration choices already imply future standards, but many domain patterns are not established yet.
- Treat this document as a living baseline and refine it as real models, APIs, pages, and tests are added.
