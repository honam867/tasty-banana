# Database Setup Guide - PostgreSQL with Drizzle ORM

This guide will help you set up PostgreSQL and run the database migrations for this project.

## Prerequisites

1. **PostgreSQL installed** (version 12 or higher recommended)
   - Download from: https://www.postgresql.org/download/
   - Or use Docker: `docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=password postgres`

2. **Create a database** for the project:
   ```sql
   CREATE DATABASE your_database_name;
   ```

## Configuration

1. **Set up environment variables** in your `.env` file (in the `server` directory):
   ```env
   POSTGRES_URL=postgresql://username:password@localhost:5432/your_database_name
   ```

   Example for local development:
   ```env
   POSTGRES_URL=postgresql://postgres:password@localhost:5432/tasty_banana
   ```

## Running Migrations

### Option 1: Run migrations programmatically (Recommended)
```bash
npm run db:migrate
```

This runs the `server/src/db/migrate.js` script which applies all pending migrations.

### Option 2: Push schema directly to database (Development)
```bash
npm run db:push
```

This pushes your schema changes directly without generating migration files. Useful during rapid development.

## Database Schema

### Users Table
The `users` table contains the following fields:

| Field | Type | Constraints | Default |
|-------|------|-------------|---------|
| id | UUID | PRIMARY KEY | gen_random_uuid() |
| username | VARCHAR(255) | NOT NULL, UNIQUE | - |
| password | VARCHAR(500) | NOT NULL | - |
| email | VARCHAR(255) | NOT NULL, UNIQUE | - |
| first_name | VARCHAR(100) | NOT NULL | - |
| last_name | VARCHAR(100) | NOT NULL | - |
| phone | VARCHAR(20) | NOT NULL, UNIQUE | - |
| role | VARCHAR(50) | NOT NULL | 'user' |
| status | VARCHAR(50) | NOT NULL | 'active' |
| created_at | TIMESTAMP | NOT NULL | now() |
| updated_at | TIMESTAMP | NOT NULL | now() |

**Valid Roles:** owner, admin, mod, warehouse, user
**Valid Statuses:** active, inactive

## Development Workflow

1. **Make schema changes** in `server/src/db/schema.js`
2. **Generate migrations**: `npm run db:generate`
3. **Apply migrations**: `npm run db:migrate`
4. **View database**: `npm run db:studio` (opens Drizzle Studio in browser)

## Troubleshooting

### Connection Issues
- Verify PostgreSQL is running: `pg_isready`
- Check `POSTGRES_URL` format is correct
- Ensure database exists
- Check firewall settings for port 5432

### Migration Errors
- Check migration files in `server/drizzle/` directory
- View migration history in `server/drizzle/meta/_journal.json`
- For fresh start, drop and recreate database, then run migrations again

## Drizzle Studio

Launch the visual database browser:
```bash
npm run db:studio
```

This opens a web interface where you can:
- View and edit data
- Inspect table structures
- Run queries
- Monitor connections

