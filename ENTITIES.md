# Entity Generation Guide

This guide explains how to generate SeaORM entities from an existing PostgreSQL database.

## Prerequisites

1. Install `sea-orm-cli`:
```bash
cargo install sea-orm-cli
```

2. Have a running PostgreSQL database with your schema

3. Set the `DATABASE_URL` environment variable or update `.env` file

## Generate Entities

### Method 1: Using Environment Variable

If you have a `.env` file with `DATABASE_URL` set:

```bash
sea-orm-cli generate entity \
  -o backend/src/entities \
  --with-serde both
```

### Method 2: Specify Database URL Directly

```bash
sea-orm-cli generate entity \
  -o backend/src/entities \
  --with-serde both \
  --database-url "postgres://username:password@localhost:5432/database_name"
```

## Options Explained

- `-o backend/src/entities` - Output directory for generated entity files
- `--with-serde both` - Add serde serialization/deserialization support (for JSON)
- `--database-url` - PostgreSQL connection string (optional if DATABASE_URL is set)

## Additional Options

For more control over entity generation:

```bash
sea-orm-cli generate entity \
  -o backend/src/entities \
  --with-serde both \
  --with-copy-enums \
  --date-time-crate chrono \
  --lib
```

Options:
- `--with-copy-enums` - Derive Copy trait for enums
- `--date-time-crate chrono` - Use chrono for date/time types
- `--lib` - Generate a library structure

## After Generation

1. The entities will be created in `backend/src/entities/`
2. Each table will have its own file
3. The `mod.rs` file will automatically export all entities
4. The `prelude.rs` file will re-export commonly used types

## Example Entity Structure

After generation, you'll have:
```
backend/src/entities/
├── mod.rs              # Module declarations
├── prelude.rs          # Re-exports
├── users.rs            # User entity
├── posts.rs            # Post entity
└── ...                 # Other entities
```

## Using Generated Entities

In your code:

```rust
use backend::entities::prelude::*;
use sea_orm::*;

// Query users
let users: Vec<users::Model> = Users::find()
    .all(&db)
    .await?;

// Create a new user
let new_user = users::ActiveModel {
    name: Set("John Doe".to_string()),
    email: Set("john@example.com".to_string()),
    ..Default::default()
};
let user = new_user.insert(&db).await?;
```

## Regenerating Entities

When your database schema changes:

1. Update your database schema
2. Run the entity generation command again
3. The old entity files will be overwritten
4. Review the changes and update your code if needed

## Tips

- Keep your entity generation command in a script for easy regeneration
- Version control your entities to track schema changes
- Consider using migrations to manage schema evolution
- Test entity changes thoroughly before deploying

## Troubleshooting

### Connection Error
- Verify DATABASE_URL is correct
- Ensure PostgreSQL is running
- Check firewall/network settings

### Missing Tables
- Verify you're connecting to the correct database
- Check that tables exist in the schema
- Ensure your database user has proper permissions

### Type Mapping Issues
- Review SeaORM documentation for type mappings
- Use appropriate features in Cargo.toml (with-chrono, with-uuid, etc.)
