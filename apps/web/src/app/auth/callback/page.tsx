'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';

function AuthCallbackInner() {
  const router = useRouter();
  const params = useSearchParams();

  useEffect(() => {
    const token = params.get('token');
    if (token) {
      localStorage.setItem('token', token);
      toast.success('로그인되었습니다!');
      router.replace('/products');
    } else {
      toast.error('로그인에 실패했습니다.');
      router.replace('/login');
    }
  }, [params, router]);

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <p className="text-gray-400 text-sm animate-pulse">로그인 처리 중...</p>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense>
      <AuthCallbackInner />
    </Suspense>
  );
}
