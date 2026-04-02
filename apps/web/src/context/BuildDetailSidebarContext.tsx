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
  openSidebar: (build: BuildDetail) => void;
  closeSidebar: () => void;
}

const BuildDetailSidebarContext = createContext<BuildDetailSidebarContextValue | null>(null);

export function BuildDetailSidebarProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedBuild, setSelectedBuild] = useState<BuildDetail | null>(null);

  const openSidebar = useCallback((build: BuildDetail) => {
    setSelectedBuild(build);
    setIsOpen(true);
  }, []);

  const closeSidebar = useCallback(() => {
    setIsOpen(false);
    setTimeout(() => setSelectedBuild(null), 300); // 애니메이션 후 초기화
  }, []);

  return (
    <BuildDetailSidebarContext.Provider value={{ isOpen, selectedBuild, openSidebar, closeSidebar }}>
      {children}
    </BuildDetailSidebarContext.Provider>
  );
}

export function useBuildDetailSidebar() {
  const ctx = useContext(BuildDetailSidebarContext);
  if (!ctx) throw new Error('useBuildDetailSidebar must be used inside BuildDetailSidebarProvider');
  return ctx;
}
