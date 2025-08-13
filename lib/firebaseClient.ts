
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, doc, onSnapshot } from 'firebase/firestore';

let app = getApps()[0];
if (!app) {
  app = initializeApp({
    apiKey: process.env.NEXT_PUBLIC_FB_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FB_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FB_PROJECT_ID,
  });
}

export const listenRealtime = (cb: (data: any) => void) => {
  try {
    const db = getFirestore();
    const ref = doc(db, 'metrics/realtime/counters');
    return onSnapshot(ref, (snap) => cb(snap.data()));
  } catch (e) {
    console.warn('Realtime listener error:', e);
    return () => {};
  }
};
