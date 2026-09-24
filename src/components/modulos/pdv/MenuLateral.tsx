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
  { nome: 'Ponto de Venda', caminho: '/pdv', icone: '🛒', perfisPermitidos: ['Master', 'Supervisor', 'Admin/Dev', 'Vendedores', 'Folguista'] },
  { nome: 'Assinaturas VIP', caminho: '/assinatura', icone: '🌟', perfisPermitidos: ['Master', 'Supervisor', 'Admin/Dev', 'Vendedores', 'Folguista'] },
  { nome: 'Assistência Técnica', caminho: '/assistencia', icone: '🔧', perfisPermitidos: ['Master', 'Supervisor', 'Admin/Dev', 'Técnicos Credenciados'] },
  { nome: 'Painel Caixa', caminho: '/caixa', icone: '💰', perfisPermitidos: ['Master', 'Supervisor', 'Admin/Dev', 'Caixa/Financeiro'] },
  { nome: 'Estoque', caminho: '/estoque', icone: '📦', perfisPermitidos: ['Master', 'Supervisor', 'Admin/Dev'] },
  { nome: 'Métricas Globais', caminho: '/metricas', icone: '📊', perfisPermitidos: ['Master', 'Supervisor', 'Admin/Dev'] },
  { nome: 'Gestão de Equipe', caminho: '/equipe', icone: '👥', perfisPermitidos: ['Master', 'Supervisor', 'Admin/Dev'] },
  { nome: 'Central de Sugestões', caminho: '/sugestoes', icone: '💡', perfisPermitidos: ['Master', 'Supervisor', 'Admin/Dev', 'Vendedores', 'Folguista', 'Caixa/Financeiro', 'Técnicos Credenciados'] },
  { nome: 'Painel Vendedor', caminho: '/vendedor', icone: '📈', perfisPermitidos: ['Master', 'Supervisor', 'Admin/Dev', 'Vendedores', 'Folguista'] },
  { nome: 'Configurações Globais', caminho: '/configuracoes', icone: '⚙️', perfisPermitidos: ['Master', 'Admin/Dev'] }
];

export default function MenuLateral() {
  const { usuarioAuth, perfilRbac, usuarioDb, fazerLogout } = useAuthStore();
  const pathname = usePathname();

  // Bloqueio Logado: Nunca renderiza se o usuário não estiver autenticado e validado
  if (!usuarioAuth || !perfilRbac) return null;

  const rotasAutorizadas = ROTAS_SISTEMA.filter((rota) => 
    rota.perfisPermitidos.includes(perfilRbac)
  );

  return (
    <nav className="fixed left-0 top-0 h-full z-50 bg-zinc-900 text-white shadow-2xl transition-all duration-300 w-16 hover:w-64 group flex flex-col justify-between overflow-hidden whitespace-nowrap border-r border-zinc-800">
      
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Topo / Logo */}
        <div className="flex h-20 items-center justify-start border-b border-zinc-800 bg-black px-4 shrink-0 transition-colors group-hover:bg-zinc-950">
          <div className="flex w-8 justify-center shrink-0">
            <span className="text-xl font-black text-blue-500 group-hover:hidden">W</span>
            <span className="text-xl font-black text-blue-500 hidden group-hover:block transition-opacity duration-300">W<span className="text-white">H</span></span>
          </div>
          <span className="ml-3 text-lg font-black tracking-widest text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            WE<span className="text-white">HAVE</span>
          </span>
        </div>
        
        {/* Navegação */}
        <ul className="flex flex-col gap-2 py-4 px-2 overflow-y-auto overflow-x-hidden custom-scrollbar flex-1">
          {rotasAutorizadas.map((rota) => {
            const isActive = pathname.startsWith(rota.caminho);
            return (
              <li key={rota.caminho}>
                <Link 
                  href={rota.caminho}
                  className={`flex items-center rounded-lg p-3 transition-all duration-200 ${
                    isActive 
                      ? 'bg-blue-600 text-white shadow-md' 
                      : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
                  }`}
                  title={rota.nome}
                >
                  <span className="text-xl w-6 text-center shrink-0">{rota.icone}</span>
                  <span className="ml-4 text-sm font-semibold opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    {rota.nome}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Base / Usuário e Logout */}
      <div className="border-t border-zinc-800 bg-black/20 shrink-0">
        <div className="p-3 flex items-center transition-all duration-300 group-hover:px-4 group-hover:pt-4 group-hover:pb-2">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-black text-white shadow-inner">
            {usuarioDb?.nome_completo?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div className="ml-3 flex flex-col opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <p className="text-sm font-bold text-white truncate max-w-[150px]">
              {usuarioDb?.nome_completo || 'Operador'}
            </p>
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400">
              {perfilRbac}
            </span>
          </div>
        </div>

        <div className="px-2 pb-3 pt-1 group-hover:px-3">
          <button 
            onClick={fazerLogout}
            className="flex w-full items-center rounded-lg p-3 text-red-400 hover:bg-red-900/30 hover:text-red-300 transition-colors"
            title="Encerrar Sessão"
          >
            <span className="text-xl w-6 text-center shrink-0">🚪</span>
            <span className="ml-4 text-sm font-bold opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              Encerrar Sessão
            </span>
          </button>
        </div>
      </div>
    </nav>
  );
}
