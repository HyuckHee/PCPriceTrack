'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { api } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
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
      localStorage.setItem('token', res.tokens.accessToken);
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
    </div>
  );
}
