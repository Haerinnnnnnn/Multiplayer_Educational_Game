# Run The System

This project now uses the online Supabase project for Auth and PostgreSQL.

Open **2 terminals**.

## Before Running

Make sure these local environment files exist.

### Backend

`backend/.env`

```env
SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
PORT=3000
```

### Frontend

`frontend/.env.local`

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_ANON_KEY
VITE_BACKEND_URL=http://localhost:3000
```

If you access the frontend from another device on the same WiFi, change `VITE_BACKEND_URL` to your computer IP, for example:

```env
VITE_BACKEND_URL=http://192.168.100.6:3000
```

## Terminal 1: Backend

```powershell
cd "D:\Document\GitHub\Multiplayer_Educational_Game\backend"
npm.cmd install
npm.cmd run dev
```

Backend check:

```txt
http://localhost:3000/api/health
```

If using another device on the same WiFi:

```txt
http://192.168.100.6:3000/api/health
```

## Terminal 2: Frontend

Use normal Vite mode when connecting to the online Supabase project:

```powershell
cd "D:\Document\GitHub\Multiplayer_Educational_Game\frontend"
npm.cmd install
npm.cmd run dev
```

Open on laptop:

```txt
http://localhost:5173
```

If Vite says port `5173` is used and switches to another port like `5174`, use the port shown in the frontend terminal.

## Phone / iPad Testing

If testing from a phone or iPad on the same WiFi, run the frontend with host mode:

```powershell
cd "D:\Document\GitHub\Multiplayer_Educational_Game\frontend"
npm.cmd run dev:host
```

Open:

```txt
http://192.168.100.6:5173
```

Replace `192.168.100.6` with your computer IP address.

## HTTPS Camera Testing

`npm.cmd run dev:https` is mainly for camera testing.

Important: in the current frontend config, HTTPS mode proxies Supabase requests to local Docker Supabase at `127.0.0.1:54321`. Use normal `npm.cmd run dev` or `npm.cmd run dev:host` when testing the online Supabase project.

## Supabase Schema Updates

When you add new migration files under `supabase/migrations`, push them to the online Supabase project from the repo root:

```powershell
cd "D:\Document\GitHub\Multiplayer_Educational_Game"
npx.cmd supabase db push --dry-run
npx.cmd supabase db push
```
