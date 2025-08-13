
# Firestore Monitoring Dashboard (Next.js + Vercel)

A minimal, production-ready starter that reads **pre-aggregated metrics** and **realtime counters** from Firestore.

## Features
- Next.js App Router + Tailwind
- `/api/metrics` route (server-side) using **Firebase Admin SDK**
- Optional **client-side** realtime listener to `metrics/realtime/counters`
- Simple cards + table UI

## Quick start

```bash
# 1) Install
npm i

# 2) Copy env
cp .env.example .env.local
# Fill values (see below)

# 3) Run
npm run dev
```

Open http://localhost:3000

## Environment variables

**Server (Admin SDK)** — keep these secret (Vercel Project → Settings → Environment Variables)
```
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project-id.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEv...\n-----END PRIVATE KEY-----\n"
```

> Note: escape newlines in the private key as `\n`.

**Client (Public)**
```
NEXT_PUBLIC_FB_API_KEY=...
NEXT_PUBLIC_FB_AUTH_DOMAIN=your-project-id.firebaseapp.com
NEXT_PUBLIC_FB_PROJECT_ID=your-project-id
```

## Firestore structure (example)

Create/write these documents via Cloud Functions:
```
metrics/realtime/counters -> {
  onlineUsers: number,
  queueDepth: number,
  lastUpdated: ISO8601 string
}

metrics/hourly/orders/{yyyymmddHH} -> {
  ts: Firestore Timestamp (start of hour),
  count: number,
  revenue: number
}
```

## Security (recommended rules)

```
rules_version = '2';
service cloud.firestore {
  match /databases/{db}/documents {
    function isAdmin() {
      return request.auth.token.role == "admin";
    }

    match /metrics/{doc=**} {
      allow read: if isAdmin();
      allow write: if false; // write via server/CF only
    }
  }
}
```

Grant `role: "admin"` to your dashboard users via custom claims, and run the dashboard behind auth (NextAuth, Firebase Auth, etc.) if exposing publicly.

## Deploy to Vercel
- Push to GitHub
- Import the repo in Vercel
- Add env vars (above)
- Deploy

## Notes
- The sample page will show an empty table until you populate `metrics/hourly/orders` and the `metrics/realtime/counters` doc.
- Use Cloud Scheduler + Functions to roll up hourly/daily metrics.
