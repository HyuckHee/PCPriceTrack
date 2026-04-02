'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const form = new FormData(e.currentTarget);
    const email = form.get('email') as string;
    const password = form.get('password') as string;
    const name = form.get('name') as string;

    try {
      const res = await api.post<{ tokens: { accessToken: string }; user: { id: string } }>(
        isRegister ? '/auth/register' : '/auth/login',
        isRegister ? { email, password, name } : { email, password },
      );
      await login(res.tokens.accessToken);
      toast.success(isRegister ? '회원가입이 완료되었습니다!' : '로그인되었습니다!');
      router.push('/products');
    } catch (err) {
      const msg = (err as Error).message;
      setError(msg);
      toast.error(isRegister ? '회원가입에 실패했습니다.' : '로그인에 실패했습니다.', { description: msg });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-sm mx-auto mt-16">
      <h1 className="text-2xl font-bold mb-6 text-center">{isRegister ? 'Create account' : 'Sign in'}</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        {isRegister && (
          <input
            name="name"
            placeholder="Name"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500"
          />
        )}
        <input
          name="email"
          type="email"
          placeholder="Email"
          required
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500"
        />
        <input
          name="password"
          type="password"
          placeholder="Password"
          required
          minLength={8}
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500"
        />
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg transition-colors"
        >
          {loading ? 'Loading…' : isRegister ? 'Create account' : 'Sign in'}
        </button>
      </form>

      <p className="text-center text-sm text-gray-400 mt-4">
        {isRegister ? 'Already have an account?' : "Don't have an account?"}{' '}
        <button onClick={() => setIsRegister(!isRegister)} className="text-blue-400 hover:underline">
          {isRegister ? 'Sign in' : 'Register'}
        </button>
      </p>

      <div className="mt-6">
        <div className="relative flex items-center gap-3 mb-4">
          <div className="flex-1 h-px bg-gray-700" />
          <span className="text-xs text-gray-500">또는 소셜 로그인</span>
          <div className="flex-1 h-px bg-gray-700" />
        </div>

        <div className="flex flex-col gap-3">
          <a
            href={`${API_BASE}/auth/kakao`}
            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg bg-[#FEE500] hover:bg-[#F6DC00] text-[#3A1D1D] font-medium text-sm transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M9 1.5C4.86 1.5 1.5 4.19 1.5 7.5c0 2.12 1.27 3.99 3.19 5.12l-.81 3.03a.28.28 0 0 0 .42.3L7.8 13.7c.39.05.79.08 1.2.08 4.14 0 7.5-2.69 7.5-6s-3.36-6-7.5-6z" fill="#3A1D1D"/>
            </svg>
            카카오로 로그인
          </a>

          <a
            href={`${API_BASE}/auth/google`}
            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg bg-white hover:bg-gray-100 text-gray-800 font-medium text-sm transition-colors border border-gray-200"
          >
            <svg width="18" height="18" viewBox="0 0 18 18">
              <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
              <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
              <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
              <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
            </svg>
            Google로 로그인
          </a>
        </div>
      </div>
    </div>
  );
}
