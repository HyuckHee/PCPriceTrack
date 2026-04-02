'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

interface Alert {
  id: string;
  targetPrice: string;
  isActive: boolean;
  triggeredAt: string | null;
  product: { id: string; name: string; slug: string };
}

function getToken() {
  return typeof window !== 'undefined' ? (localStorage.getItem('token') ?? '') : '';
}

export default function AlertsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!getToken()) router.push('/login');
  }, [router]);

  const { data: alerts = [], isLoading, isError } = useQuery<Alert[]>({
    queryKey: ['alerts'],
    queryFn: () => api.get<Alert[]>('/alerts', getToken()),
    retry: false,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete('/alerts/' + id, getToken()),
    onSuccess: (_, id) => {
      queryClient.setQueryData<Alert[]>(['alerts'], (prev) => prev?.filter((a) => a.id !== id));
      toast.success('알림이 삭제되었습니다.');
    },
    onError: () => toast.error('삭제에 실패했습니다.'),
  });

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => api.patch<Alert>('/alerts/' + id + '/deactivate', {}, getToken()),
    onSuccess: (updated) => {
      queryClient.setQueryData<Alert[]>(['alerts'], (prev) =>
        prev?.map((a) => (a.id === updated.id ? updated : a)),
      );
      toast.success('알림이 비활성화되었습니다.');
    },
    onError: () => toast.error('비활성화에 실패했습니다.'),
  });

  if (isLoading) return <p className="text-gray-400">Loading…</p>;
  if (isError) return <p className="text-red-400">알림을 불러오지 못했습니다.</p>;

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">가격 알림</h1>

      {alerts.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-gray-400 mb-4">설정된 알림이 없습니다.</p>
          <Link href="/products" className="text-blue-400 hover:underline text-sm">
            상품을 둘러보고 가격 알림을 설정해보세요
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
                  목표가: <span className="text-white">${parseFloat(alert.targetPrice).toFixed(2)}</span>
                  {!alert.isActive && <span className="ml-2 text-gray-500">· 비활성</span>}
                  {alert.triggeredAt && <span className="ml-2 text-green-400">· 달성됨</span>}
                </div>
              </div>
              <div className="flex gap-2">
                {alert.isActive && (
                  <button
                    onClick={() => deactivateMutation.mutate(alert.id)}
                    disabled={deactivateMutation.isPending}
                    className="text-xs text-gray-400 hover:text-white bg-gray-800 px-2 py-1 rounded disabled:opacity-50"
                  >
                    비활성화
                  </button>
                )}
                <button
                  onClick={() => deleteMutation.mutate(alert.id)}
                  disabled={deleteMutation.isPending}
                  className="text-xs text-red-400 hover:text-red-300 bg-gray-800 px-2 py-1 rounded disabled:opacity-50"
                >
                  삭제
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
