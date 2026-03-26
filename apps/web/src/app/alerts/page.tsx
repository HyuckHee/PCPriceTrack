'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';

interface Alert {
  id: string;
  targetPrice: string;
  isActive: boolean;
  triggeredAt: string | null;
  product: { id: string; name: string; slug: string };
}

export default function AlertsPage() {
  const router = useRouter();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { router.push('/login'); return; }

    api.get<Alert[]>('/alerts', token)
      .then(setAlerts)
      .catch(() => setError('Failed to load alerts'))
      .finally(() => setLoading(false));
  }, [router]);

  async function handleDelete(id: string) {
    const token = localStorage.getItem('token') ?? '';
    await api.delete('/alerts/' + id, token);
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  }

  async function handleDeactivate(id: string) {
    const token = localStorage.getItem('token') ?? '';
    const updated = await api.patch<Alert>('/alerts/' + id + '/deactivate', {}, token);
    setAlerts((prev) => prev.map((a) => (a.id === id ? updated : a)));
  }

  if (loading) return <p className="text-gray-400">Loading…</p>;
  if (error) return <p className="text-red-400">{error}</p>;

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">My Alerts</h1>

      {alerts.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-gray-400 mb-4">No alerts yet.</p>
          <Link href="/products" className="text-blue-400 hover:underline text-sm">
            Browse products to set up price alerts
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className={`bg-gray-900 border rounded-xl px-4 py-3 flex items-center justify-between ${
                alert.isActive ? 'border-gray-800' : 'border-gray-800 opacity-50'
              }`}
            >
              <div>
                <Link href={`/products/${alert.product.slug}`} className="font-medium text-sm hover:text-blue-400">
                  {alert.product.name}
                </Link>
                <div className="text-sm text-gray-400 mt-0.5">
                  Target: <span className="text-white">${parseFloat(alert.targetPrice).toFixed(2)}</span>
                  {!alert.isActive && <span className="ml-2 text-gray-500">· Inactive</span>}
                  {alert.triggeredAt && <span className="ml-2 text-green-400">· Triggered</span>}
                </div>
              </div>
              <div className="flex gap-2">
                {alert.isActive && (
                  <button
                    onClick={() => handleDeactivate(alert.id)}
                    className="text-xs text-gray-400 hover:text-white bg-gray-800 px-2 py-1 rounded"
                  >
                    Disable
                  </button>
                )}
                <button
                  onClick={() => handleDelete(alert.id)}
                  className="text-xs text-red-400 hover:text-red-300 bg-gray-800 px-2 py-1 rounded"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
