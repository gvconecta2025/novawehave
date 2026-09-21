'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import { PerfilRBAC } from '@/types/auth';

// Interface do Dicionário de Rotas
interface RotaMenu {
  nome: string;
  caminho: string;
  icone: string; // Utilizaremos emojis nativos temporariamente por KISS (evitar dependência massiva inicial)
  perfisPermitidos: PerfilRBAC[];
}

// Matriz de Controle de Acesso (RBAC)
const ROTAS_SISTEMA: RotaMenu[] = [
  {
    nome: 'Ponto de Venda',
    caminho: '/pdv',
    icone: '🛒',
    perfisPermitidos: ['Master', 'Supervisor', 'Admin/Dev', 'Vendedores', 'Folguista'],
  },
  {
    nome: 'Assistência Técnica',
    caminho: '/assistencia',
    icone: '🔧',
    perfisPermitidos: ['Master', 'Supervisor', 'Admin/Dev', 'Técnicos Credenciados'],
  },
  {
    nome: 'Painel Caixa',
    caminho: '/caixa',
    icone: '💰',
    perfisPermitidos: ['Master', 'Supervisor', 'Admin/Dev', 'Caixa/Financeiro'],
  },
  {
    nome: 'Estoque',
    caminho: '/estoque',
    icone: '📦',
    perfisPermitidos: ['Master', 'Supervisor', 'Admin/Dev'],
  },
  {
    nome: 'Gestão de Equipe',
    caminho: '/equipe',
    icone: '👥',
    perfisPermitidos: ['Master', 'Supervisor', 'Admin/Dev'],
  },
  {
    nome: 'Painel Vendedor',
    caminho: '/vendedor',
    icone: '📈',
    perfisPermitidos: ['Master', 'Supervisor', 'Vendedores', 'Folguista'],
  }
];

export default function MenuLateral() {
  const { perfilRbac, usuarioDb, fazerLogout } = useAuthStore();
  const pathname = usePathname();

  // Filtra as rotas que o usuário atual tem permissão de ver
  const rotasAutorizadas = ROTAS_SISTEMA.filter((rota) => 
    perfilRbac && rota.perfisPermitidos.includes(perfilRbac)
  );

  return (
    <nav className="flex h-full w-full flex-col justify-between bg-zinc-900 text-white shadow-lg">
      <div className="flex flex-col">
        {/* Identificação Corporativa */}
        <div className="flex h-20 items-center justify-center border-b border-zinc-800 bg-black p-4 text-center">
          <h1 className="text-xl font-bold tracking-widest text-blue-500">WE<span className="text-white">HAVE</span></h1>
        </div>
        
        {/* Links Dinâmicos */}
        <ul className="flex flex-col gap-2 p-4">
          {rotasAutorizadas.map((rota) => {
            const isActive = pathname.startsWith(rota.caminho);
            return (
              <li key={rota.caminho}>
                <Link 
                  href={rota.caminho}
                  className={`flex items-center gap-3 rounded-md px-4 py-3 transition-colors duration-200 ${
                    isActive ? 'bg-blue-600 text-white font-semibold' : 'hover:bg-zinc-800 text-zinc-300'
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

      {/* Rodapé do Menu - Identidade e Logout */}
      <div className="border-t border-zinc-800 p-4">
        <div className="mb-4">
          <p className="text-xs text-zinc-400">Usuário Logado</p>
          <p className="text-sm font-semibold text-white">{usuarioDb?.nome_completo || 'Carregando...'}</p>
          <span className="mt-1 inline-block rounded bg-zinc-800 px-2 py-1 text-xs font-medium text-blue-400">
            {perfilRbac || 'Sem Perfil'}
          </span>
        </div>
        <button 
          onClick={fazerLogout}
          className="flex w-full items-center gap-2 rounded-md bg-red-900/40 px-4 py-2 text-sm font-semibold text-red-400 hover:bg-red-900/60 transition-colors"
        >
          <span>🚪</span> Sair do Sistema
        </button>
      </div>
    </nav>
  );
}
