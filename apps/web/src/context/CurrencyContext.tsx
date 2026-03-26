'use client';

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

export type DisplayCurrency = 'KRW' | 'USD';

interface CurrencyContextValue {
  displayCurrency: DisplayCurrency;
  usdToKrw: number;
  setDisplayCurrency: (c: DisplayCurrency) => void;
}

const CurrencyContext = createContext<CurrencyContextValue>({
  displayCurrency: 'KRW',
  usdToKrw: 1380,
  setDisplayCurrency: () => {},
});

export function CurrencyProvider({
  children,
  usdToKrw,
}: {
  children: ReactNode;
  usdToKrw: number;
}) {
  const [displayCurrency, setDisplayCurrencyState] = useState<DisplayCurrency>('KRW');

  // 저장된 설정 복원 (hydration 이후)
  useEffect(() => {
    const saved = localStorage.getItem('displayCurrency') as DisplayCurrency | null;
    if (saved === 'USD' || saved === 'KRW') {
      setDisplayCurrencyState(saved);
    }
  }, []);

  const setDisplayCurrency = (c: DisplayCurrency) => {
    setDisplayCurrencyState(c);
    localStorage.setItem('displayCurrency', c);
  };

  return (
    <CurrencyContext.Provider value={{ displayCurrency, usdToKrw, setDisplayCurrency }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  return useContext(CurrencyContext);
}
