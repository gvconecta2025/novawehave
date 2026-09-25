'use client';

import MenuLateral from '@/components/modulos/pdv/MenuLateral';

export default function AppLayoutWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-gray-50 font-sans">
      <MenuLateral />
      <div className="flex-1 overflow-y-auto transition-all duration-300">
        {children}
      </div>
    </div>
  );
}
