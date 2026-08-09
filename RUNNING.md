# Run O bits

This version uses **online Supabase** for Auth and PostgreSQL. You only need to run the local backend and frontend.

Open **2 terminals**.

## Before Running

Check these files exist.

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

For phone/iPad testing on the same WiFi, use your laptop IP for the backend:

```env
VITE_BACKEND_URL=http://192.168.100.6:3000
```

Replace `192.168.100.6` with your own IPv4 address.

## Terminal 1: Backend

```powershell
cd "D:\Document\GitHub\Multiplayer_Educational_Game\backend"
npm.cmd install
npm.cmd run dev
```

Backend test:

```txt
http://localhost:3000/api/health
```

Phone/iPad backend test:

```txt
http://192.168.100.6:3000/api/health
```

## Terminal 2: Frontend

The normal frontend command now runs HTTPS on port `5174`.

```powershell
cd "D:\Document\GitHub\Multiplayer_Educational_Game\frontend"
npm.cmd install
npm.cmd run dev
```

Open on laptop:

```txt
https://localhost:5174
```

Open on phone/iPad:

```txt
https://192.168.100.6:5174
```

Accept the browser security warning for the local HTTPS certificate.

## Camera Testing

Use the HTTPS link for QR scanning:

```txt
https://localhost:5174
https://YOUR_IPV4:5174
```

Do not use the HTTP link for phone/iPad camera testing.

## If Port 5174 Is Already Used

Find the process:

```powershell
netstat -ano | Select-String ":5174"
```

Stop the process by replacing `PID_NUMBER`:

```powershell
taskkill /PID PID_NUMBER /F
```

Then start frontend again:

```powershell
npm.cmd run dev
```

## Optional HTTP Debug Mode

Only use this if you do not need camera scanning:

```powershell
npm.cmd run dev:http
```

## Supabase Schema Updates

When you add new migration files:

```powershell
cd "D:\Document\GitHub\Multiplayer_Educational_Game"
npx.cmd supabase db push --dry-run
npx.cmd supabase db push
```
