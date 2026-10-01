# Hack Knight

Website for Hack Knight, the Queens College hackathon: the public site, participant registration, and an admin dashboard.

## Repo layout

| Folder | What it is |
|---|---|
| `frontend/` | Vite + React + TypeScript single-page app (public site and admin) |
| `backend/` | Express + TypeScript API, the only client of Supabase data and storage |
| `supabase/` | Supabase CLI project: database migrations, local dev config, and sample data |
| `docs/` | Developer docs: setup, architecture, stack guides, testing, git workflow, design system |

## Getting started

New here? Follow [docs/getting-started.md](docs/getting-started.md). It starts from a machine with nothing installed and ends with the full site running locally on sample data.

To understand how the pieces fit together, read [docs/architecture.md](docs/architecture.md). [docs/README.md](docs/README.md) links every other guide.
