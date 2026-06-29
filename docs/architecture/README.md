# GigMatch AI Architecture

## Initial System Overview

GigMatch AI is planned as a developer-focused AI SaaS prototype for matching freelancers, students, and developers with relevant tech gigs.

This milestone creates only the project foundation:

- A React + Vite + TypeScript frontend
- A FastAPI backend
- Placeholder frontend pages for role-specific flows
- Placeholder backend routers for planned modules
- Documentation and environment templates

No real authentication, database, AI, resume parsing, or matching logic is implemented in this milestone.

## Planned Architecture

### Frontend

The frontend will provide role-specific experiences for:

- Freelancers and students creating smart profiles
- Clients posting tech gigs
- Admins reviewing system and evaluation views

Current frontend scope is limited to routing, layout primitives, and placeholder pages.

### Backend

The FastAPI backend will eventually expose APIs for:

- Auth session support
- Profile management
- Gig management
- Matching workflows
- Evaluation metrics

Current backend scope is limited to a health endpoint and planned-module status routes.

### Database

Supabase PostgreSQL is planned for later milestones. It will eventually store users, profiles, gigs, extracted skills, matching results, and evaluation artifacts.

No database models or migrations are included yet.

### AI Layer

Future AI modules may include:

- Resume parsing
- Gig parsing
- Skill extraction
- Transformer embeddings
- pgvector semantic search
- Hybrid ranking
- Explainability
- Skill-gap analysis

No AI logic or mock AI output is included yet.

## Milestone Note

This milestone intentionally creates a clean, runnable foundation only. Product features will be introduced in later milestones after the project structure is stable.
