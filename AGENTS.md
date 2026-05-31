# AGENTS.md

# Skill Verse Engineering Guidelines

This file defines the architecture, implementation patterns, and operational rules for AI coding agents and contributors working in this repository.

Agents must follow these instructions before making changes.

---

# Agent Workflow Rules

## Before Starting Any Task

1. Read this file completely.
2. Inspect ONLY files relevant to the requested task.
3. Do NOT scan the entire repository unless explicitly required.
4. Reuse existing patterns before creating new abstractions.
5. Preserve architectural consistency over personal preference.
6. Avoid introducing new dependencies unless necessary.
7. Prefer modifying existing implementations over duplicating logic.
8. Keep changes minimal and focused.

---

# Project Architecture

The repository is split into:

```txt
/server     -> Django REST API
/client     -> React + TypeScript frontend
```

Backend and frontend are separate applications.

Never:
- Cross-import runtime code between backend/frontend
- Duplicate business logic across both layers
- Implement backend responsibilities in frontend code

Communication happens only through HTTP API contracts.

---

# Technology Stack

## Backend

- Django
- Django REST Framework
- SimpleJWT
- MySQL
- django-cors-headers
- drf-spectacular
- django-filter
- Pillow
- django-cleanup
- python-decouple
- django-anymail[resend]

## Frontend

- React
- TypeScript
- Vite
- ESLint
- Modern CSS

Do not replace core stack choices unless explicitly requested.

---

# Repository Structure

## Backend

```txt
server/
└── core/
    ├── core/      -> project configuration
    ├── api/       -> primary API application
    └── manage.py
```

## Frontend

```txt
client/app/
├── src/
│   ├── components/
│   ├── pages/
│   ├── services/
│   ├── hooks/
│   ├── types/
│   ├── assets/
│   └── main.tsx
├── public/
└── package.json
```

---

# Backend Standards

## API Rules

- Use Django REST Framework for all APIs.
- Prefer:
  - ViewSets
  - APIView
  - serializers.py
  - service modules
- Avoid large monolithic views.

## Business Logic Rules

Business-critical logic belongs in:
- services/
- model methods
- dedicated utility modules

Do NOT place business logic in:
- serializers
- urls.py
- settings.py
- React components

## URL Structure

Routing flow:

```txt
core.urls -> api.urls -> feature routes
```

Each feature should own its own:
- urls.py
- serializers.py
- views.py
- services.py (if needed)

## Database Rules

- Use explicit model fields.
- Avoid magic behavior.
- Use migrations for schema changes.
- Never edit old migrations unless explicitly required.

## Authentication

- JWT only.
- Stateless authentication.
- Frontend stores and sends tokens.
- Never use Django sessions for SPA authentication.

## Environment Variables

Use:

```python
from decouple import config
```

Never:
- hardcode secrets
- commit `.env`
- expose backend secrets to frontend

---

# Frontend Standards

## Component Rules

Use:
- TypeScript function components
- Named props interfaces
- Small reusable components

Avoid:
- massive page components
- deeply nested JSX
- duplicated UI logic

## Recommended Structure

```txt
src/
├── components/
├── pages/
├── layouts/
├── hooks/
├── services/
├── lib/
├── types/
├── constants/
└── assets/
```

## Styling Rules

- Keep styling consistent.
- Use shared tokens/custom properties.
- Prefer component-scoped styles.
- Maintain responsive behavior from the start.

Avoid:
- inline style overload
- arbitrary spacing systems
- inconsistent breakpoints

## State Management

Before introducing global state:
1. Use local component state
2. Use context if shared
3. Introduce external state libraries only if justified

Avoid unnecessary complexity.

---

# API Communication Standards

## Frontend API Layer

API calls should live inside:
```txt
src/services/
```

Avoid calling fetch/axios directly inside large UI components.

## Request Rules

- Centralize API configuration.
- Centralize auth token handling.
- Handle refresh-token flow consistently.
- Use typed API responses.

---

# File Creation Rules

Before creating a new file:
1. Check whether similar logic already exists.
2. Extend existing modules when reasonable.
3. Create new files only when responsibility separation improves clarity.

Avoid:
- duplicate utility files
- multiple files with overlapping responsibilities
- premature abstractions

---

# Dependency Rules

Before adding a dependency:
1. Check if existing stack already solves the problem.
2. Prefer native platform/browser features.
3. Prefer lightweight libraries.
4. Avoid overlapping packages.

Any added dependency must:
- be justified
- be added to the correct lockfile
- align with current architecture

---

# Code Quality Rules

## General

- Prefer explicitness over clever abstractions.
- Use descriptive naming.
- Keep functions focused.
- Keep modules small.

## Comments

Add comments only when:
- intent is non-obvious
- business reasoning matters
- workaround explanations are necessary

Do not add redundant comments.

---

# Testing Expectations

## Backend

Add tests for:
- serializers
- endpoints
- services
- permissions
- critical business logic

## Frontend

Add tests for:
- stateful logic
- reusable hooks
- critical UI behavior

At minimum:
- run lint
- run build
- ensure TypeScript passes

---

# Performance Guidelines

Avoid:
- unnecessary re-renders
- premature memoization
- duplicated API calls
- loading unnecessary assets

Prefer:
- simple predictable implementations
- incremental optimization

---

# Security Rules

Never:
- expose secrets
- trust frontend validation alone
- bypass authentication checks
- hardcode credentials
- disable security protections for convenience

Validate:
- permissions
- ownership
- authentication
- input data

on the backend.

---

# Implementation Priority

When making decisions, prioritize:

1. Existing architecture consistency
2. Maintainability
3. Simplicity
4. Readability
5. Performance optimization

---

# Current Project Reality

This project is still evolving.

Agents should:
- avoid overengineering
- avoid enterprise-level abstractions too early
- build incrementally
- keep architecture clean and scalable

Favor practical, maintainable implementations.