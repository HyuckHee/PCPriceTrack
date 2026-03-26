import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import Link from 'next/link';
import { CurrencyProvider } from '@/context/CurrencyContext';
import { CurrencyToggle } from '@/components/CurrencyToggle';
import { getUsdToKrw } from '@/lib/exchange-rate';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'PCPriceTrack',
  description: 'PC 부품 최저가 비교 사이트',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const usdToKrw = await getUsdToKrw();

  return (
    <html lang="ko">
      <body className={`${inter.className} bg-gray-950 text-gray-100 min-h-screen`}>
        <CurrencyProvider usdToKrw={usdToKrw}>
          <header className="border-b border-gray-800 bg-gray-900">
            <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
              <Link href="/" className="font-bold text-lg text-white tracking-tight">
                PCPriceTrack
              </Link>
              <div className="flex items-center gap-4">
                <CurrencyToggle />
                <nav className="flex items-center gap-6 text-sm text-gray-400">
                  <Link href="/products" className="hover:text-white transition-colors">상품</Link>
                  <Link href="/deals" className="hover:text-white transition-colors">특가</Link>
                  <Link href="/alerts" className="hover:text-white transition-colors">가격 알림</Link>
                  <Link href="/login" className="hover:text-white transition-colors">로그인</Link>
                </nav>
              </div>
            </div>
          </header>
          <main className="max-w-7xl mx-auto px-4 py-8">
            {children}
          </main>
        </CurrencyProvider>
      </body>
    </html>
  );
}
