# Hancy Arena Real V1 — corrected

This package fixes the Next.js root-layout error. It includes the required `app/layout.tsx` with `<html>` and `<body>` tags.

## 1. Install
Open CMD in this folder and run:

```bash
npm install
```

## 2. Supabase keys
Copy `.env.example` to `.env.local` and fill:

```env
NEXT_PUBLIC_SUPABASE_URL=YOUR_PROJECT_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_PUBLISHABLE_OR_ANON_KEY
```

Do NOT put the Supabase service-role/secret key in the browser or commit it.

## 3. Run

```bash
npm run dev
```

Open http://localhost:3000

Your existing Supabase database/schema can remain as-is. Do not rerun the SQL just for this frontend fix.
