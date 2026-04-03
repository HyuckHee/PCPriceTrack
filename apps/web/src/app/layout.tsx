import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import Link from 'next/link';
import Image from 'next/image';
import { Toaster } from 'sonner';
import { NuqsAdapter } from 'nuqs/adapters/next/app';
import { QueryProvider } from '@/components/QueryProvider';
import { CurrencyProvider } from '@/context/CurrencyContext';
import { CurrencyToggle } from '@/components/CurrencyToggle';
import { BuildEstimatorProvider } from '@/context/BuildEstimatorContext';
import { BuildDetailSidebarProvider } from '@/context/BuildDetailSidebarContext';
import BuildEstimatorButton from '@/components/BuildEstimatorButton';
import BuildEstimatorPanel from '@/components/BuildEstimatorPanel';
import BuildDetailSidebar from '@/components/BuildDetailSidebar';
import { AuthProvider } from '@/context/AuthContext';
import AuthNav from '@/components/AuthNav';
import { getUsdToKrw } from '@/lib/exchange-rate';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'PCPriceTrack - 조립 PC 견적 & 특가 정보',
  description: 'PC 부품 최저가 비교 사이트',
  icons: {
    icon: '/logo2.png',
    apple: '/logo2.png',
  },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const usdToKrw = await getUsdToKrw();

  return (
    <html lang="ko">
      <body className={`${inter.className} bg-gray-900 text-gray-100 min-h-screen`}>
        <QueryProvider>
        <NuqsAdapter>
        <AuthProvider>
        <CurrencyProvider usdToKrw={usdToKrw}>
          <BuildEstimatorProvider>
          <BuildDetailSidebarProvider>
            <header className="border-b border-gray-800 bg-gray-900">
              <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
                <Link href="/" className="flex items-center shrink-0">
                  <Image
                    src="/logo.svg"
                    alt="PCPriceTrack"
                    width={208}
                    height={68}
                    className="object-contain"
                    priority
                  />
                </Link>
                <div className="flex items-center gap-3">
                  <BuildEstimatorButton />
                  <CurrencyToggle />
                  <nav className="flex items-center gap-6 text-sm text-gray-400">
                    <Link href="/products" className="hover:text-white transition-colors">상품</Link>
                    <Link href="/deals" className="hover:text-white transition-colors">특가</Link>
                    <Link href="/alerts" className="hover:text-white transition-colors">가격 알림</Link>
                    <Link href="/admin" className="hover:text-gray-300 transition-colors text-gray-600">관리</Link>
                    <AuthNav />
                  </nav>
                </div>
              </div>
            </header>
            <main className="max-w-7xl mx-auto px-4 py-8">
              {children}
            </main>
            <BuildEstimatorPanel />
            <BuildDetailSidebar />
            <Toaster theme="dark" position="bottom-right" richColors />
          </BuildDetailSidebarProvider>
          </BuildEstimatorProvider>
        </CurrencyProvider>
        </AuthProvider>
        </NuqsAdapter>
        </QueryProvider>
      </body>
    </html>
  );
}
