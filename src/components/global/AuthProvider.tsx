'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const { configurarAutenticacao, usuarioAuth, carregando } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const desinscrever = configurarAutenticacao();
    return () => {
      if (desinscrever) desinscrever();
    };
  }, [configurarAutenticacao]);

  // AÇÃO 1: Route Guard (Blindagem de Rotas)
  useEffect(() => {
    // Aguarda que o Firebase resolva se o utilizador está logado ou não
    if (carregando) return; 

    // Definição das Rotas Públicas (incluindo a loja e a página de comparação)
    const rotasPublicasExatas = ['/', '/login', '/comparar'];
    const ehRotaPublica = rotasPublicasExatas.includes(pathname) || pathname.startsWith('/produto/');

    // Expulsa o invasor caso não esteja logado e tente aceder a uma rota privada
    if (!usuarioAuth && !ehRotaPublica) {
      console.warn('[ROUTE GUARD] Tentativa de acesso não autorizado intercetada. A redirecionar para o login.');
      router.push('/login');
    }
  }, [usuarioAuth, carregando, pathname, router]);

  return <>{children}</>;
}
