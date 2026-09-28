'use client';

import { useEffect, useState } from 'react';
import MenuLateral from '@/components/modulos/pdv/MenuLateral';

interface AppLayoutWrapperProps {
  children: React.ReactNode;
}

export default function AppLayoutWrapper({ 
  children 
}: AppLayoutWrapperProps) {
  const [montado, setMontado] = useState(false);

  useEffect(() => {
    setMontado(true);
  }, []);

  if (!montado) {
    return (
      <div 
        className="flex h-screen w-full items-center justify-center bg-gray-50"
      >
        <div 
          className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"
        >
        </div>
      </div>
    );
  }

  return (
    <div 
      className="flex h-screen w-full bg-gray-50 overflow-hidden"
    >
      
      {/* 
        A Sidebar (MenuLateral) assume o seu próprio espaço (flex-shrink-0). 
        Como estamos em layout Flex, ela nunca sobreporá o main indevidamente. 
      */}
      <MenuLateral />
      
      {/* 
        O conteúdo principal (main) ocupa estritamente o espaço restante (flex-1).
        A transição de opacidade/animação garante uma entrada suave e premium.
      */}
      <main 
        className="flex flex-1 flex-col h-full w-full relative overflow-hidden bg-gray-50 transition-opacity duration-700 ease-out animate-[fadeIn_0.5s_ease-out_forwards]"
      >
        <div 
          className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar pb-24 md:pb-8"
        >
          {children}
        </div>
      </main>

    </div>
  );
}
