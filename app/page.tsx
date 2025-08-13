
'use client';
import { useEffect, useState } from 'react';
import { Card } from '@/components/Card';
import { listenRealtime } from '@/lib/firebaseClient';

type Point = { ts: string; count: number; revenue: number };
type Payload = { ordersHourly: Point[]; realtime: Record<string, any> };

export default function Dashboard() {
  const [data, setData] = useState<Payload | null>(null);
  const [realtime, setRealtime] = useState<Record<string, any> | null>(null);

  // Poll server metrics (secure via Admin SDK)
  useEffect(() => {
    const load = async () => {
      const res = await fetch('/api/metrics', { cache: 'no-store' });
      if (res.ok) setData(await res.json());
      else setData({ ordersHourly: [], realtime: {} });
    };
    load();
    const id = setInterval(load, 10000);
    return () => clearInterval(id);
  }, []);

  // Optional: live counters directly from Firestore (read-only doc)
  useEffect(() => {
    const unsub = listenRealtime((d) => setRealtime(d));
    return () => unsub?.();
  }, []);

  const counters = realtime ?? data?.realtime ?? {};

  return (
    <main className="p-6 space-y-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-semibold">Monitoring</h1>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card title="Online users" value={counters?.onlineUsers ?? 0} />
        <Card title="Queue depth" value={counters?.queueDepth ?? 0} />
        <Card title="Last updated" value={counters?.lastUpdated ? new Date(counters.lastUpdated).toLocaleString() : '—'} />
      </section>

      <section className="space-y-2">
        <h2 className="font-medium">Orders (last 24h)</h2>
        <SimpleTable rows={data?.ordersHourly ?? []} />
      </section>
    </main>
  );
}

function SimpleTable({ rows }: { rows: { ts: string; count: number; revenue: number }[] }) {
  if (!rows.length) {
    return <div className="text-sm text-gray-500 border rounded-2xl p-4">No data yet. Populate <code>metrics/hourly/orders</code> with Cloud Functions.</div>;
  }
  return (
    <div className="overflow-x-auto border rounded-2xl">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="p-2 text-left">Time</th>
            <th className="p-2 text-right">Orders</th>
            <th className="p-2 text-right">Revenue</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.ts} className="border-t">
              <td className="p-2">{new Date(r.ts).toLocaleString()}</td>
              <td className="p-2 text-right">{r.count}</td>
              <td className="p-2 text-right">${Number(r.revenue ?? 0).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
