'use client';

import { createContext, useCallback, useContext, useState } from 'react';
import { BuildComponent } from '@/lib/data';

export interface BuildDetail {
  id: string;
  name: string;
  budget: string;
  currency: string;
  totalPrice: string | null;
  components: BuildComponent[];
  createdAt: string;
}

interface BuildDetailSidebarContextValue {
  isOpen: boolean;
  selectedBuild: BuildDetail | null;
  isModified: boolean;
  openSidebar: (build: BuildDetail) => void;
  closeSidebar: () => void;
  updateComponent: (categorySlug: string, comp: BuildComponent) => void;
  resetModified: () => void;
}

const BuildDetailSidebarContext = createContext<BuildDetailSidebarContextValue | null>(null);

export function BuildDetailSidebarProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedBuild, setSelectedBuild] = useState<BuildDetail | null>(null);
  const [isModified, setIsModified] = useState(false);

  const openSidebar = useCallback((build: BuildDetail) => {
    setSelectedBuild(build);
    setIsModified(false);
    setIsOpen(true);
  }, []);

  const closeSidebar = useCallback(() => {
    setIsOpen(false);
    setTimeout(() => { setSelectedBuild(null); setIsModified(false); }, 300);
  }, []);

  const updateComponent = useCallback((categorySlug: string, comp: BuildComponent) => {
    setSelectedBuild((prev) => {
      if (!prev) return prev;
      const components = prev.components.map((c) =>
        c.category === categorySlug ? comp : c,
      );
      if (!components.find((c) => c.category === categorySlug)) components.push(comp);
      const newTotal = components.reduce((s, c) => s + c.price, 0);
      return { ...prev, components, totalPrice: String(newTotal) };
    });
    setIsModified(true);
  }, []);

  const resetModified = useCallback(() => setIsModified(false), []);

  return (
    <BuildDetailSidebarContext.Provider value={{ isOpen, selectedBuild, isModified, openSidebar, closeSidebar, updateComponent, resetModified }}>
      {children}
    </BuildDetailSidebarContext.Provider>
  );
}

export function useBuildDetailSidebar() {
  const ctx = useContext(BuildDetailSidebarContext);
  if (!ctx) throw new Error('useBuildDetailSidebar must be used inside BuildDetailSidebarProvider');
  return ctx;
}
