'use client';

import { useAuthStore } from '@/store/useAuthStore';
import AppLayoutWrapper from '@/components/global/AppLayoutWrapper';
import Link from 'next/link';

export default function WorkspaceGarantiasTrocahub() {
  const { 
    perfilRbac, 
    carregando: authCarregando 
  } = useAuthStore();
  
  // Barreira RBAC (Acesso Permitido para Vendedores e Gestão)
  const acessoPermitido = [
    'Master', 
    'Supervisor', 
    'Admin/Dev', 
    'Vendedores', 
    'Folguista'
  ].includes(perfilRbac || '');

  // Bloqueio de Carregamento
  if (authCarregando) {
    return (
      <div 
        className="flex h-screen items-center justify-center bg-gray-50"
      >
        <div 
          className="h-8 w-8 animate-spin rounded-full border-4 border-gray-900 border-t-transparent"
        >
        </div>
      </div>
    );
  }

  // Bloqueio de Acesso Não Autorizado
  if (!acessoPermitido) {
    return (
      <div 
        className="flex h-screen w-full flex-col items-center justify-center bg-gray-100 p-8 font-sans"
      >
        <div 
          className="flex max-w-md flex-col items-center justify-center rounded-2xl border border-red-200 bg-white p-10 text-center shadow-2xl"
        >
          <span 
            className="mb-4 text-6xl"
          >
            ⛔
          </span>
          <h1 
            className="mb-2 text-2xl font-black text-gray-900"
          >
            Acesso Restrito
          </h1>
          <p 
            className="mb-6 text-sm text-gray-500"
          >
            O seu perfil ({perfilRbac}) não tem permissões para aceder à gestão de Trocas e Garantias.
          </p>
          <Link 
            href="/pdv" 
            className="rounded-xl bg-gray-900 px-6 py-2.5 font-bold text-white transition hover:bg-gray-800 shadow-md"
          >
            Voltar ao PDV
          </Link>
        </div>
      </div>
    );
  }

  return (
    <AppLayoutWrapper>
      <div 
        className="flex min-h-full flex-col items-center justify-center p-6 md:p-8 bg-gray-50/50 relative overflow-hidden"
      >
        
        {/* Elemento Decorativo de Fundo */}
        <div 
          className="absolute inset-0 z-0 flex items-center justify-center opacity-[0.03] pointer-events-none"
        >
          <span 
            className="text-[25rem] grayscale"
          >
            🛡️
          </span>
        </div>

        {/* Card Minimalista Centralizado */}
        <div 
          className="relative z-10 flex w-full max-w-2xl flex-col items-center text-center rounded-3xl border border-gray-200 bg-white p-10 md:p-16 shadow-[0_20px_50px_rgba(0,0,0,0.05)] transition-all"
        >
          
          <div 
            className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-gray-900 to-gray-700 shadow-xl"
          >
            <span 
              className="text-4xl text-white"
            >
              🔄
            </span>
          </div>
          
          <h1 
            className="mb-4 text-3xl font-black tracking-tight text-gray-900 md:text-4xl"
          >
            Módulo RMA Desativado
          </h1>
          
          <div 
            className="mb-10 max-w-lg"
          >
            <p 
              className="text-base font-medium leading-relaxed text-gray-500"
            >
              A gestão de Garantias, Trocas e Devoluções da Nova We Have é operada exclusivamente através do ecossistema <strong className="text-gray-900 font-black">TROCAHUB</strong>.
            </p>
          </div>

          <a 
            href="#" 
            target="_blank" 
            rel="noopener noreferrer"
            className="group relative inline-flex items-center justify-center gap-3 overflow-hidden rounded-full bg-gray-900 px-8 py-4 font-black text-white transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_10px_40px_rgba(0,0,0,0.3)] active:scale-95"
          >
            <span 
              className="relative z-10 flex items-center gap-2"
            >
              ACESSAR TROCAHUB 
              <svg 
                className="h-5 w-5 transition-transform group-hover:translate-x-1" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24" 
                xmlns="http://www.w3.org/2000/svg"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={3} 
                  d="M14 5l7 7m0 0l-7 7m7-7H3" 
                />
              </svg>
            </span>
            <div 
              className="absolute inset-0 -z-10 bg-gradient-to-r from-gray-800 to-black opacity-0 transition-opacity duration-300 group-hover:opacity-100"
            >
            </div>
          </a>
          
          <p 
            className="mt-6 text-xs font-bold uppercase tracking-widest text-gray-400"
          >
            Redirecionamento Externo Seguro
          </p>

        </div>
      </div>
    </AppLayoutWrapper>
  );
}
