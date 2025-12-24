# RMR Revamp

A modern full-stack application built with Rust backend and Next.js frontend.

## Tech Stack

### Backend
- **Rust** - Systems programming language
- **Axum** (v0.7) - Web framework
- **SeaORM** (v1.x) - Async ORM for PostgreSQL
- **Seography** (v1.x) - GraphQL framework for SeaORM
- **Tokio** - Async runtime
- **Tower** - Middleware and utilities

### Frontend
- **Next.js** (v16) - React framework
- **Ant Design** - UI component library
- **TypeScript** - Type-safe JavaScript
- **Tailwind CSS** - Utility-first CSS framework

### Database
- **PostgreSQL** - Relational database

## Project Structure

```
rmr_revamp/
├── backend/              # Rust backend library
│   ├── src/
│   │   ├── entities/     # SeaORM entities (generated)
│   │   └── lib.rs
│   └── server/           # Axum server binary
│       └── src/
│           └── main.rs
├── frontend/             # Next.js frontend
│   ├── src/
│   │   └── app/
│   └── package.json
├── Cargo.toml            # Rust workspace configuration
└── .env.example          # Environment variables template
```

## Prerequisites

- **Rust** (1.85.0 or later)
- **Node.js** (20.x or later)
- **PostgreSQL** (14 or later)
- **sea-orm-cli** - For entity generation

Install sea-orm-cli:
```bash
cargo install sea-orm-cli
```

## Setup

### 1. Clone the repository

```bash
git clone <repository-url>
cd rmr_revamp
```

### 2. Database Setup

Create a PostgreSQL database:
```bash
createdb rmr_db
```

Copy the environment file and update with your database credentials:
```bash
cp .env.example .env
```

Edit `.env` and set your `DATABASE_URL`:
```env
DATABASE_URL=postgres://roots_data:Froggie19581953@localhost:5432/rmr_loco_development
```

### 3. Generate Entities

After setting up your database schema, generate SeaORM entities:

```bash
sea-orm-cli generate entity \
  -o backend/src/entities \
  --with-serde both \
  --seaography \
  --database-url "postgres://roots_data:Froggie19581953@localhost:5432/rmr_loco_development"
```

This will generate Rust entity files based on your existing PostgreSQL database tables.

### 4. Backend Setup

Build and run the backend server:

```bash
cd backend/server
cargo run
```

The backend will start on `http://localhost:3000` (or the port specified in `.env`).

Available endpoints:
- `GET /` - Root endpoint
- `GET /health` - Health check endpoint

### 5. Frontend Setup

Install dependencies and start the development server:

```bash
cd frontend
npm install
npm run dev
```

The frontend will start on `http://localhost:3001` (Next.js default).

## Development

### Backend Development

Build the backend:
```bash
cargo build
```

Run tests:
```bash
cargo test
```

Check code:
```bash
cargo check
```

### Frontend Development

Run development server:
```bash
cd frontend
npm run dev
```

Build for production:
```bash
cd frontend
npm run build
```

Run linter:
```bash
cd frontend
npm run lint
```

## Environment Variables

### Backend (.env)

```env
# Database Configuration
DATABASE_URL=postgres://postgres:postgres@localhost:5432/rmr_db

# Server Configuration
HOST=0.0.0.0
PORT=3000

# Logging
RUST_LOG=debug
```

### Frontend

Create `frontend/.env.local` for frontend-specific variables:

```env
NEXT_PUBLIC_API_URL=http://localhost:3000
```

## Entity Generation

When your database schema changes, regenerate entities:

```bash
sea-orm-cli generate entity \
  -o backend/src/entities \
  --with-serde both \
  --database-url "${DATABASE_URL}"
```

## Adding GraphQL

Seography is included for GraphQL support. To implement GraphQL endpoints:

1. Define your GraphQL schema using Seography
2. Add GraphQL endpoint in `backend/server/src/main.rs`
3. Configure query resolvers

Example GraphQL integration will be added in future updates.

## Production Deployment

### Backend

Build optimized release:
```bash
cargo build --release
```

The binary will be in `target/release/backend-server`.

### Frontend

Build for production:
```bash
cd frontend
npm run build
npm start
```

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
