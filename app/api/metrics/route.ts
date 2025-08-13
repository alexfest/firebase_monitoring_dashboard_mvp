
import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import { Timestamp } from 'firebase-admin/firestore';

export async function GET() {
  try {
    const now = new Date();
    const since = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const snap = await adminDb.collection('metrics/hourly/orders')
      .where('ts', '>=', Timestamp.fromDate(since))
      .orderBy('ts', 'asc')
      .get();

    const ordersHourly = snap.docs.map(d => {
      const data = d.data();
      const ts = (data.ts instanceof Timestamp) ? data.ts.toDate().toISOString() : (data.ts ?? new Date().toISOString());
      return {
        ts,
        count: Number(data.count ?? 0),
        revenue: Number(data.revenue ?? 0)
      };
    });

    const realtimeRef = adminDb.doc('metrics/realtime');
    const realtimeDoc = await realtimeRef.get();
    const realtime = realtimeDoc.exists ? realtimeDoc.data() : {};

    return NextResponse.json({ ordersHourly, realtime });
  } catch (e: any) {
    console.error('API /metrics error:', e);
    return NextResponse.json({ ordersHourly: [], realtime: {}, error: e?.message ?? 'Unknown error' }, { status: 200 });
  }
}
