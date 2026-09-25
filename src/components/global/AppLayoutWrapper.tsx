'use client';

import MenuLateral from '@/components/modulos/pdv/MenuLateral';
import { ReactNode } from 'react';

interface AppLayoutWrapperProps {
  children: ReactNode;
}

export default function AppLayoutWrapper({ children }: AppLayoutWrapperProps) {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-gray-50 font-sans text-gray-900">
      {/* A Sidebar expansiva (w-16 hover:w-64 flex-shrink-0) já está configurada internamente no componente */}
      <MenuLateral />
      
      {/* O flex-1 garante que o conteúdo ocupe o restante do ecrã e seja empurrado suavemente */}
      <div className="flex-1 overflow-y-auto transition-all duration-300 relative custom-scrollbar">
        {children}
      </div>
    </div>
  );
}
