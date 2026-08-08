# Run The System

Open **3 terminals**.

## Terminal 1: Supabase

```powershell
cd "D:\Document\APU\FYPPPPPPP\FYP code 2"
npx.cmd supabase start
```

Supabase Studio:

```txt
http://127.0.0.1:54323
```

## Terminal 2: Backend

```powershell
cd "D:\Document\APU\FYPPPPPPP\FYP code 2\backend"
npm.cmd install
npm.cmd run dev
```

Backend check:

```txt
http://127.0.0.1:3000/api/health
```

## Terminal 3: Frontend

Use HTTPS frontend for laptop and phone / iPad camera testing:

```powershell
cd "D:\Document\APU\FYPPPPPPP\FYP code 2\frontend"
npm.cmd install
npm.cmd run dev:https
```

Open on laptop:

```txt
https://localhost:5173
```

Open on phone / iPad same WiFi:

```txt
https://192.168.100.6:5173
```

If Vite says port `5173` is used and switches to another port like `5174`, use the port shown in the frontend terminal.

## Stop Supabase

```powershell
cd "D:\Document\APU\FYPPPPPPP\FYP code 2"
npx.cmd supabase stop
```
