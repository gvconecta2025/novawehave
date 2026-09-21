'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';

interface AuthProviderProps {
  children: React.ReactNode;
}

export default function AuthProvider({ children }: AuthProviderProps) {
  const { inicializarAuth, carregando, usuarioAuth } = useAuthStore();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    // Inicializa o listener de autenticação apenas uma vez
    inicializarAuth();
  }, [inicializarAuth]);

  useEffect(() => {
    // Proteção de Rota Básica (Middlewares Next.js Edge podem ser adicionados depois para maior segurança)
    const rotasPublicas = ['/login', '/loja'];
    const ehRotaPublica = rotasPublicas.some((rota) => pathname.startsWith(rota));

    if (!carregando && !usuarioAuth && !ehRotaPublica) {
      router.push('/login');
    }
  }, [carregando, usuarioAuth, pathname, router]);

  // Loading Screen Anti-Silêncio e impeditivo de "Flicker" na interface
  if (carregando) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
          <p className="text-sm font-medium text-gray-600">Autenticando e verificando permissões...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
