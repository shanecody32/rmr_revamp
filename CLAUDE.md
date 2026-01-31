# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

RMR (Roots Music Report) Revamp - A full-stack web application for managing music metadata (bands, albums, songs, radio stations) with advanced similarity detection and deduplication. This is a Rust-based rewrite replacing a previous Loco framework implementation.

## Tech Stack

- **Backend**: Rust (Edition 2024), Axum 0.8, SeaORM 2.0, Tokio
- **Frontend**: Next.js 16, React 19, TypeScript, Ant Design, Tailwind CSS
- **Database**: MariaDB
- **Package Manager**: pnpm (frontend)

## Common Commands

### Backend (from `backend/`)
```bash
cargo run                    # Start dev server (localhost:8000)
cargo build --release        # Production build
cargo test                   # Run tests
```

### Frontend (from `frontend/`)
```bash
pnpm dev                     # Start dev server with Turbopack (localhost:3000)
pnpm build                   # Production build
pnpm lint                    # ESLint
pnpm lint:fix                # Fix linting issues
pnpm type-check              # TypeScript check
pnpm validate                # Run lint + type-check + test
```

### Database Migrations (from `migration/`)
```bash
cargo run -- generate MIGRATION_NAME   # Create new migration
cargo run                              # Apply pending migrations
cargo run -- status                    # Check migration status
cargo run -- down -n 1                 # Rollback last migration
```

## Architecture

### Backend Structure (`backend/src/`)
- `api/` - Axum HTTP route handlers, one file per entity
- `services/` - Business logic layer, similarity search implementations
- `models/` - SeaORM entity definitions (84 files)
- `utils/similarity/` - Core similarity/deduplication engine
- `utils/slug.rs` - String normalization and slug generation

### Frontend Structure (`frontend/src/`)
- `app/` - Next.js 13+ app directory with route-based pages
- `components/ui/` - Ant Design wrappers (base UI components)
- `components/common/` - Reusable generic components
- `hooks/` - Custom React hooks (data fetching, tables, forms)
- `lib/api/` - Axios-based API client

### Similarity System (Critical Feature)

The similarity engine prevents duplicates across entities. Key files:
- `backend/src/utils/similarity/keys.rs` - Phonetic key generation (Soundex, Metaphone, DoubleMetaphone via `rphonetic`)
- `backend/src/utils/similarity/pipeline.rs` - Two-stage narrowing and scoring
- `backend/src/utils/similarity/scope.rs` - Entity scope filtering (e.g., albums scoped to band_id)

**Two-Stage Pipeline**:
1. DB narrowing: Quick indexed query on alias table columns
2. Rust scoring: In-memory similarity calculation (Jaro-Winkler, Sørensen-Dice, Levenshtein)

Alias tables store pre-computed: `slug`, `sanitized_name`, `soundex_key`, `metaphone_key`, `dmetaphone_key`, `dmetaphone_alt_key`

### API Documentation
OpenAPI/Swagger docs available at `/rapidoc` when backend is running.

## Environment Variables

### Backend (`.env`)
```
DATABASE_URL=mysql://user:pass@host:3306/db
HOST=0.0.0.0
PORT=8000
```

### Frontend (`.env.local`)
```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## Key Patterns

- **Entity naming**: SeaORM models use `*_aliases` suffix for alias tables
- **API responses**: Use `PaginatedResponse<T>` wrapper
- **Similarity functions**: Named `find_similar_[entity]` in services
- **Safe SQL**: Always use `Expr::cust_with_values`, never raw format strings
- **Hooks naming**: All custom hooks prefixed with `use`
