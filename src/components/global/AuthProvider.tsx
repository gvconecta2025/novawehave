'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/store/useAuthStore';

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const configurarAutenticacao = useAuthStore((state) => state.configurarAutenticacao);

  useEffect(() => {
    // Inicia a escuta do Firebase Auth
    const desinscrever = configurarAutenticacao();

    // Blindagem Absoluta: O React só executará a limpeza se for uma função válida.
    // Isso impede o colapso "r is not a function" durante a renderização.
    return () => {
      if (typeof desinscrever === 'function') {
        desinscrever();
      }
    };
  }, [configurarAutenticacao]);

  return <>{children}</>;
}
