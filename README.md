# Multi-School Student Result Management Platform

## Architecture & Stack
- Next.js 15 (App Router, Tailwind CSS, shadcn/ui)
- Supabase (PostgreSQL, Auth, RPCs, RLS)
- PDF Generation (`@react-pdf/renderer`)
- CSV Parsing (`papaparse`)

## Setup Instructions (Production/Staging)

Since this platform relies on Supabase for Authentication, Database, and Edge Functions/RPCs, you must link it to a Supabase project.

### 1. Create a Supabase Project
Go to [Supabase](https://supabase.com) and create a new project.

### 2. Configure Environment Variables
Copy `.env.example` to `.env.local` and populate the values from your Supabase Project Settings > API and Database settings.
```env
NEXT_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
DATABASE_URL=postgres://postgres.<your-project>:<password>@aws-0-eu-central-1.pooler.supabase.com:6543/postgres
```

### 3. Run Database Migrations
Go to your Supabase project's SQL Editor and run the migrations in this order:
1. `supabase/migrations/20240101000000_initial_schema.sql`
2. `supabase/migrations/20240101000001_rls_policies.sql`
3. `supabase/migrations/20240101000002_import_rpc.sql`
4. `supabase/seed.sql`

### 4. Create the First Super Admin
Since you cannot create a Super Admin from the UI initially, create a user in Supabase Auth (via the dashboard). Then, in the SQL editor, run:
```sql
INSERT INTO profiles (id, role, name, status)
VALUES ('<THE_AUTH_USER_UUID>', 'SUPER_ADMIN', 'System Admin', 'ACTIVE');
```

### 5. Run the Application
```bash
npm run dev
```

Go to `http://localhost:3000/login` and log in with your Super Admin credentials. From there, you can create Schools and School Admins.

## Features Implemented
- **Transactional CSV Import**: The upload process parses and validates data first. Once confirmed, a Postgres RPC processes all rows in a single ACID transaction.
- **Strict Tenant Isolation**: PostgreSQL Row Level Security (RLS) ensures that School Admins can only view and manage their own school's data.
- **Server-Side PDF Generation**: Reliable PDF generation directly from the server using `@react-pdf/renderer`.
- **Public Results Portal**: Secure, non-enumerable public access using UUIDs, enforcing publication status checks.
