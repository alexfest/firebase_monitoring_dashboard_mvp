/**
 * Firestore Seeder
 * Usage:
 *   # from your Next.js project root (where package.json is)
 *   # 1) copy this file to scripts/seed.mjs
 *   # 2) ensure FIREBASE_* envs are available (see below)
 *   # 3) run:
 *   node scripts/seed.mjs
 *
 * Env needed (same as your app):
 *   FIREBASE_PROJECT_ID
 *   FIREBASE_CLIENT_EMAIL
 *   FIREBASE_PRIVATE_KEY  (escaped newlines: \n)
 *
 * Optional: this script will try to load ".env.local" if those vars are missing.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Minimal .env loader (no external deps) ---
function hydrateEnvFrom(file) {
  try {
    const p = path.resolve(process.cwd(), file);
    if (!fs.existsSync(p)) return;
    const txt = fs.readFileSync(p, 'utf8');
    for (const line of txt.split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
      if (!m) continue;
      let [, k, v] = m;
      // strip quotes
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      process.env[k] = process.env[k] ?? v;
    }
    console.log(`Loaded env from ${file}`);
  } catch (e) {
    console.warn(`Could not load ${file}:`, e.message);
  }
}

// Try .env.local then .env if FIREBASE_* not set
const required = ["FIREBASE_PROJECT_ID","FIREBASE_CLIENT_EMAIL","FIREBASE_PRIVATE_KEY"];
const missing = required.filter(k => !process.env[k]);
if (missing.length) hydrateEnvFrom('.env.local');
const stillMissing = required.filter(k => !process.env[k]);
if (stillMissing.length) hydrateEnvFrom('.env');

// Validate
const errs = required.filter(k => !process.env[k]);
if (errs.length) {
  console.error("Missing required env:", errs.join(', '));
  console.error("Add them to .env.local or export them in your shell and retry.");
  process.exit(1);
}

// Init admin
initializeApp({
  credential: cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  }),
});

const db = getFirestore();

// Helper to make past N hourly buckets ending now (UTC)
function* hourlyWindows(n) {
  const end = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(end.getTime() - i * 60 * 60 * 1000);
    const start = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), d.getUTCHours(), 0, 0, 0));
    yield start;
  }
}

function hourKey(d) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth()+1)}${pad(d.getUTCDate())}${pad(d.getUTCHours())}`;
}

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function seedRealtime() {
    const docRef = db.doc('metrics/realtime');
  const payload = {
    onlineUsers: randInt(5, 30),
    queueDepth: randInt(0, 10),
    lastUpdated: new Date().toISOString(),
  };
  await docRef.set(payload, { merge: true });
  console.log('✓ seeded metrics/realtime', payload);
}

async function seedHourlyOrders(hours = 24) {
  const col = db.collection('metrics/hourly/orders');
  const batchSize = 500;
  let count = 0;
  let batch = db.batch();

  for (const start of hourlyWindows(hours)) {
    const key = hourKey(start);
    const docRef = col.doc(key);

    const orders = randInt(0, 20);
    const revenue = Array.from({ length: orders }).reduce((sum) => sum + (Math.random() * 50 + 10), 0);

    batch.set(docRef, {
      ts: Timestamp.fromDate(start),
      count: orders,
      revenue: Number(revenue.toFixed(2)),
      updatedAt: Timestamp.now(),
    }, { merge: true });

    count++;
    if (count % batchSize === 0) {
      await batch.commit();
      batch = db.batch();
    }
  }

  await batch.commit();
  console.log(`✓ seeded ${hours} hourly buckets in metrics/hourly/orders`);
}

(async () => {
  const hours = Number(process.argv.find(a => a.startsWith('--hours='))?.split('=')[1] ?? 24);
  await seedRealtime();
  await seedHourlyOrders(hours);
  console.log('Done.');
  process.exit(0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
