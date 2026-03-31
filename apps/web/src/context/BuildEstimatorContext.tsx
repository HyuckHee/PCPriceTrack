'use client';

import { createContext, useCallback, useContext, useState } from 'react';

interface BuildEstimatorContextValue {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
}

const BuildEstimatorContext = createContext<BuildEstimatorContextValue | null>(null);

export function BuildEstimatorProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((v) => !v), []);

  return (
    <BuildEstimatorContext.Provider value={{ isOpen, open, close, toggle }}>
      {children}
    </BuildEstimatorContext.Provider>
  );
}

export function useBuildEstimator() {
  const ctx = useContext(BuildEstimatorContext);
  if (!ctx) throw new Error('useBuildEstimator must be used inside BuildEstimatorProvider');
  return ctx;
}
