'use client';

import { createContext, useCallback, useContext, useState } from 'react';
import type { BuildComponent } from '@/lib/data';

interface PendingBudget {
  budget: number;
  currency: string;
}

interface BuildEstimatorContextValue {
  isOpen: boolean;
  pendingBudget: PendingBudget | null;
  open: () => void;
  close: () => void;
  toggle: () => void;
  openWithBudget: (budget: number, currency: string) => void;
  clearPendingBudget: () => void;
  components: (BuildComponent | null)[];
  setComponents: (components: (BuildComponent | null)[]) => void;
}

const BuildEstimatorContext = createContext<BuildEstimatorContextValue | null>(null);

export function BuildEstimatorProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [pendingBudget, setPendingBudget] = useState<PendingBudget | null>(null);
  const [components, setComponentsState] = useState<(BuildComponent | null)[]>([]);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((v) => !v), []);

  const openWithBudget = useCallback((budget: number, currency: string) => {
    setPendingBudget({ budget, currency });
    setIsOpen(true);
  }, []);

  const clearPendingBudget = useCallback(() => setPendingBudget(null), []);
  const setComponents = useCallback((c: (BuildComponent | null)[]) => setComponentsState(c), []);

  return (
    <BuildEstimatorContext.Provider value={{
      isOpen, pendingBudget,
      open, close, toggle, openWithBudget, clearPendingBudget,
      components, setComponents,
    }}>
      {children}
    </BuildEstimatorContext.Provider>
  );
}

export function useBuildEstimator() {
  const ctx = useContext(BuildEstimatorContext);
  if (!ctx) throw new Error('useBuildEstimator must be used inside BuildEstimatorProvider');
  return ctx;
}
