'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import { PerfilRBAC } from '@/types/auth';

interface RotaMenu {
  nome: string;
  caminho: string;
  icone: string;
  perfisPermitidos: PerfilRBAC[];
}

const ROTAS_SISTEMA: RotaMenu[] = [
  { nome: 'Ponto de Venda', caminho: '/pdv', icone: '🛒', perfisPermitidos: ['Master', 'Supervisor', 'Admin/Dev', 'Vendedores', 'Folguista'] },
  { nome: 'Assinaturas VIP', caminho: '/assinatura', icone: '🌟', perfisPermitidos: ['Master', 'Supervisor', 'Admin/Dev', 'Vendedores', 'Folguista'] },
  { nome: 'Assistência Técnica', caminho: '/assistencia', icone: '🔧', perfisPermitidos: ['Master', 'Supervisor', 'Admin/Dev', 'Técnicos Credenciados'] },
  { nome: 'Painel Caixa', caminho: '/caixa', icone: '💰', perfisPermitidos: ['Master', 'Supervisor', 'Admin/Dev', 'Caixa/Financeiro'] },
  { nome: 'Estoque', caminho: '/estoque', icone: '📦', perfisPermitidos: ['Master', 'Supervisor', 'Admin/Dev'] },
  { nome: 'Métricas Globais', caminho: '/metricas', icone: '📊', perfisPermitidos: ['Master', 'Supervisor', 'Admin/Dev'] },
  { nome: 'Gestão de Equipe', caminho: '/equipe', icone: '👥', perfisPermitidos: ['Master', 'Supervisor', 'Admin/Dev'] },
  { nome: 'Central de Sugestões', caminho: '/sugestoes', icone: '💡', perfisPermitidos: ['Master', 'Supervisor', 'Admin/Dev', 'Vendedores', 'Folguista', 'Caixa/Financeiro', 'Técnicos Credenciados'] },
  { nome: 'Painel Vendedor', caminho: '/vendedor', icone: '📈', perfisPermitidos: ['Master', 'Supervisor', 'Vendedores', 'Folguista'] },
  { nome: 'Configurações Globais', caminho: '/configuracoes', icone: '⚙️', perfisPermitidos: ['Master', 'Admin/Dev'] }
];

export default function MenuLateral() {
  const { perfilRbac, usuarioDb, fazerLogout } = useAuthStore();
  const pathname = usePathname();
  const [aberto, setAberto] = useState(false);

  // Impede renderização se o usuário não estiver autenticado/carregado
  if (!perfilRbac) return null;

  const rotasAutorizadas = ROTAS_SISTEMA.filter((rota) => 
    rota.perfisPermitidos.includes(perfilRbac)
  );

  return (
    <>
      {/* Botão Hamburger (Fixo Globalmente) */}
      <button 
        onClick={() => setAberto(true)}
        className="fixed top-5 left-5 z-40 flex items-center justify-center rounded-lg bg-gray-900 p-3 text-white shadow-lg transition-transform hover:scale-105 hover:bg-black focus:outline-none"
        title="Abrir Menu"
      >
        <span className="text-xl">☰</span>
      </button>

      {/* Overlay Escuro */}
      {aberto && (
        <div 
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity"
          onClick={() => setAberto(false)}
        />
      )}

      {/* Sidebar Drawer */}
      <nav 
        className={`fixed top-0 left-0 h-full w-72 bg-zinc-900 text-white shadow-2xl z-50 transform transition-transform duration-300 flex flex-col justify-between ${
          aberto ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col">
          <div className="flex h-20 items-center justify-between border-b border-zinc-800 bg-black p-4">
            <h1 className="text-xl font-black tracking-widest text-blue-500 ml-2">WE<span className="text-white">HAVE</span></h1>
            <button onClick={() => setAberto(false)} className="text-gray-400 hover:text-white text-2xl pr-2">&times;</button>
          </div>
          
          <ul className="flex flex-col gap-2 p-4 overflow-y-auto max-h-[calc(100vh-200px)] custom-scrollbar">
            {rotasAutorizadas.map((rota) => {
              const isActive = pathname.startsWith(rota.caminho);
              return (
                <li key={rota.caminho}>
                  <Link 
                    href={rota.caminho}
                    onClick={() => setAberto(false)}
                    className={`flex items-center gap-3 rounded-md px-4 py-3 transition-colors duration-200 ${
                      isActive ? 'bg-blue-600 text-white font-bold shadow-md' : 'hover:bg-zinc-800 text-zinc-300 font-medium'
                    }`}
                  >
                    <span className="text-xl">{rota.icone}</span>
                    <span className="text-sm">{rota.nome}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="border-t border-zinc-800 p-5 bg-black/20">
          <div className="mb-4">
            <p className="text-xs text-zinc-400 uppercase tracking-wider font-bold mb-1">Operador Logado</p>
            <p className="text-sm font-bold text-white line-clamp-1">{usuarioDb?.nome_completo || 'Carregando...'}</p>
            <span className="mt-1.5 inline-block rounded border border-blue-900/50 bg-blue-900/30 px-2 py-1 text-xs font-bold text-blue-400 shadow-sm">
              {perfilRbac}
            </span>
          </div>
          <button 
            onClick={() => { fazerLogout(); setAberto(false); }}
            className="flex w-full items-center justify-center gap-2 rounded-md bg-red-900/30 border border-red-900/50 px-4 py-2.5 text-sm font-bold text-red-400 hover:bg-red-900/60 transition-colors active:scale-95"
          >
            <span>🚪</span> Encerrar Sessão
          </button>
        </div>
      </nav>
    </>
  );
}
