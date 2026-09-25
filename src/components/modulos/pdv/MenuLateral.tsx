'use client';

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
  { 
    nome: 'Loja Pública', 
    caminho: '/', 
    icone: '🏠', 
    perfisPermitidos: [
      'Master', 
      'Supervisor', 
      'Admin/Dev', 
      'Vendedores', 
      'Folguista', 
      'Caixa/Financeiro', 
      'Técnicos Credenciados'
    ] 
  },
  { 
    nome: 'Ponto de Venda', 
    caminho: '/pdv', 
    icone: '🛒', 
    perfisPermitidos: [
      'Master', 
      'Supervisor', 
      'Admin/Dev', 
      'Vendedores', 
      'Folguista'
    ] 
  },
  { 
    nome: 'Assinaturas VIP', 
    caminho: '/assinatura', 
    icone: '🌟', 
    perfisPermitidos: [
      'Master', 
      'Supervisor', 
      'Admin/Dev', 
      'Vendedores', 
      'Folguista'
    ] 
  },
  { 
    nome: 'Assistência Técnica', 
    caminho: '/assistencia', 
    icone: '🔧', 
    perfisPermitidos: [
      'Master', 
      'Supervisor', 
      'Admin/Dev', 
      'Técnicos Credenciados'
    ] 
  },
  { 
    nome: 'Painel Caixa', 
    caminho: '/caixa', 
    icone: '💰', 
    perfisPermitidos: [
      'Master', 
      'Supervisor', 
      'Admin/Dev', 
      'Caixa/Financeiro'
    ] 
  },
  { 
    nome: 'Estoque', 
    caminho: '/estoque', 
    icone: '📦', 
    perfisPermitidos: [
      'Master', 
      'Supervisor', 
      'Admin/Dev'
    ] 
  },
  { 
    nome: 'Métricas Globais', 
    caminho: '/metricas', 
    icone: '📊', 
    perfisPermitidos: [
      'Master', 
      'Supervisor', 
      'Admin/Dev'
    ] 
  },
  { 
    nome: 'Histórico Geral', 
    caminho: '/historico', 
    icone: '🕒', 
    perfisPermitidos: [
      'Master', 
      'Supervisor', 
      'Admin/Dev'
    ] 
  },
  { 
    nome: 'Gestão de Equipe', 
    caminho: '/equipe', 
    icone: '👥', 
    perfisPermitidos: [
      'Master', 
      'Supervisor', 
      'Admin/Dev'
    ] 
  },
  { 
    nome: 'Central de Sugestões', 
    caminho: '/sugestoes', 
    icone: '💡', 
    perfisPermitidos: [
      'Master', 
      'Supervisor', 
      'Admin/Dev', 
      'Vendedores', 
      'Folguista', 
      'Caixa/Financeiro', 
      'Técnicos Credenciados'
    ] 
  },
  { 
    nome: 'Painel Vendedor', 
    caminho: '/vendedor', 
    icone: '📈', 
    perfisPermitidos: [
      'Master', 
      'Supervisor', 
      'Admin/Dev', 
      'Vendedores', 
      'Folguista'
    ] 
  },
  { 
    nome: 'Configurações Globais', 
    caminho: '/configuracoes', 
    icone: '⚙️', 
    perfisPermitidos: [
      'Master', 
      'Admin/Dev'
    ] 
  }
];

export default function MenuLateral() {
  const { 
    usuarioAuth, 
    perfilRbac, 
    usuarioDb, 
    fazerLogout 
  } = useAuthStore();
  
  const pathname = usePathname();

  if (!usuarioAuth || !perfilRbac) return null;

  const rotasAutorizadas = ROTAS_SISTEMA.filter((rota) => 
    rota.perfisPermitidos.includes(perfilRbac)
  );

  return (
    <nav 
      className="h-full bg-zinc-950 text-zinc-400 transition-all duration-500 ease-in-out w-20 hover:w-72 flex-shrink-0 group flex flex-col justify-between overflow-hidden whitespace-nowrap border-r border-zinc-800/50 relative z-40 shadow-2xl"
    >
      
      <div className="flex flex-col flex-1 overflow-hidden">
        
        {/* Topo / Logo */}
        <div 
          className="flex h-24 items-center justify-start border-b border-zinc-800/50 px-5 shrink-0 transition-colors group-hover:bg-zinc-900/30"
        >
          <div className="flex w-10 justify-center shrink-0">
            <span className="text-2xl font-black text-blue-500 group-hover:hidden transition-all">
              W
            </span>
            <span className="text-2xl font-black text-blue-500 hidden group-hover:block transition-all">
              W<span className="text-white">H</span>
            </span>
          </div>
          <span 
            className="ml-4 text-lg font-black tracking-widest text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
          >
            WE<span className="text-white">HAVE</span>
          </span>
        </div>
        
        {/* Navegação (Scroll Invisível e Espaçamentos Compactos) */}
        <ul 
          className="flex flex-col gap-1 py-4 overflow-y-auto overflow-x-hidden flex-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
        >
          {rotasAutorizadas.map((rota) => {
            const isActive = pathname === rota.caminho || 
                             (rota.caminho !== '/' && pathname.startsWith(rota.caminho));
                             
            return (
              <li key={rota.caminho}>
                <Link 
                  href={rota.caminho}
                  className={`flex items-center px-5 py-2.5 transition-all duration-300 border-r-4 ${
                    isActive 
                      ? 'bg-blue-600/10 text-blue-400 border-blue-500' 
                      : 'border-transparent text-zinc-400 hover:bg-zinc-800/30 hover:text-zinc-100'
                  }`}
                  title={rota.nome}
                >
                  <div 
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-all duration-500 shadow-sm ${
                      isActive 
                        ? 'bg-blue-500/20 grayscale-0' 
                        : 'bg-zinc-800/60 grayscale group-hover:grayscale-0'
                    }`}
                  >
                    <span className="text-lg">
                      {rota.icone}
                    </span>
                  </div>
                  
                  <span 
                    className={`ml-4 text-sm font-semibold opacity-0 transition-all duration-500 group-hover:opacity-100 ${
                      isActive 
                        ? 'text-blue-400' 
                        : 'text-zinc-300'
                    }`}
                  >
                    {rota.nome}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Base / Utilizador e Logout */}
      <div 
        className="border-t border-zinc-800/50 bg-zinc-950 shrink-0 transition-colors group-hover:bg-zinc-900/20"
      >
        <div 
          className="p-5 flex items-center transition-all duration-500"
        >
          <div 
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 text-sm font-black text-white shadow-md border border-blue-400/20"
          >
            {usuarioDb?.nome_completo?.charAt(0).toUpperCase() || 'U'}
          </div>
          
          <div 
            className="ml-4 flex flex-col opacity-0 group-hover:opacity-100 transition-opacity duration-500"
          >
            <p className="text-sm font-bold text-white truncate max-w-[160px]">
              {usuarioDb?.nome_completo || 'Operador'}
            </p>
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400 mt-0.5">
              {perfilRbac}
            </span>
          </div>
        </div>

        <div className="px-3 pb-5 pt-1">
          <button 
            onClick={fazerLogout}
            className="flex w-full items-center rounded-xl p-3 text-red-400/80 hover:bg-red-500/10 hover:text-red-400 transition-all duration-300 group/btn"
            title="Encerrar Sessão"
          >
            <div 
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-500/10 text-lg transition-colors group-hover/btn:bg-red-500/20 ml-1"
            >
              <span>
                🚪
              </span>
            </div>
            <span 
              className="ml-4 text-sm font-bold opacity-0 transition-opacity duration-500 group-hover:opacity-100"
            >
              Encerrar Sessão
            </span>
          </button>
        </div>
        
      </div>
    </nav>
  );
}
