'use client';

import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where, orderBy } from 'firebase/firestore';
import { bancoDeDados } from '@/lib/firebase/config';
import { useAuthStore } from '@/store/useAuthStore';
import MenuLateral from '@/components/modulos/pdv/MenuLateral';

interface ComandaVendedor {
  id: string;
  fluxo_operacional: string;
  status_atual: string;
  valor_total: number;
  cor_hexadecimal: string;
  auditoria: {
    criado_em: any;
    criado_por_nome?: string;
  };
}

interface UsuarioEquipa {
  id: string;
  nome: string;
  perfil: string;
}

export default function WorkspaceVendedor() {
  const { usuarioAuth, usuarioDb, perfilRbac, carregando: authCarregando } = useAuthStore();
  
  const [comandas, setComandas] = useState<ComandaVendedor[]>([]);
  const [vendedorSelecionadoId, setVendedorSelecionadoId] = useState<string>('');
  
  const [listaVendedores, setListaVendedores] = useState<UsuarioEquipa[]>([]);
  
  const [carregandoDados, setCarregandoDados] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const isGestor = ['Master', 'Admin/Dev', 'Supervisor'].includes(perfilRbac || '');

  useEffect(() => {
    if (!authCarregando && usuarioAuth && !vendedorSelecionadoId) {
      setVendedorSelecionadoId(usuarioAuth.uid);
    }
  }, [authCarregando, usuarioAuth, vendedorSelecionadoId]);

  useEffect(() => {
    if (!isGestor) return;

    const q = query(collection(bancoDeDados, 'usuarios'), orderBy('nome_completo', 'asc'));
    
    const desinscreverUsuarios = onSnapshot(
      q,
      (snapshot) => {
        const dados = snapshot.docs.map(doc => ({
          id: doc.id,
          nome: doc.data().nome_completo || 'Sem Nome',
          perfil: doc.data().perfil_rbac || 'Sem Perfil',
        })) as UsuarioEquipa[];
        setListaVendedores(dados);
      },
      (err: any) => {
        console.error('[ERRO LISTA VENDEDORES]', err);
        setErro(`Falha ao carregar lista de equipe [${err.code}]: ${err.message}`);
      }
    );

    return () => desinscreverUsuarios();
  }, [isGestor]);

  useEffect(() => {
    if (!vendedorSelecionadoId) return;
    
    setCarregandoDados(true);
    setErro(null);

    const q = query(
      collection(bancoDeDados, 'comandas'),
      where('auditoria.criado_por_id', '==', vendedorSelecionadoId)
    );

    const desinscreverComandas = onSnapshot(
      q,
      (snapshot) => {
        const dados = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as ComandaVendedor[];
        
        dados.sort((a, b) => {
          const tempoA = typeof a.auditoria?.criado_em?.toMillis === 'function' ? a.auditoria.criado_em.toMillis() : 0;
          const tempoB = typeof b.auditoria?.criado_em?.toMillis === 'function' ? b.auditoria.criado_em.toMillis() : 0;
          return tempoB - tempoA; 
        });

        setComandas(dados);
        setCarregandoDados(false);
      },
      (err: any) => {
        console.error('[ERRO PAINEL VENDEDOR]', err);
        setErro(`Falha ao carregar métricas de vendas [${err.code}]: ${err.message}`);
        setCarregandoDados(false);
      }
    );

    return () => desinscreverComandas();
  }, [vendedorSelecionadoId]);

  const vendasExpressas = comandas.filter(c => c.fluxo_operacional === 'Venda Expressa');
  const totalRendimentoVendas = vendasExpressas.reduce((acc, curr) => acc + (Number(curr.valor_total) || 0), 0);
  
  const assinaturasVip = comandas.filter(c => c.fluxo_operacional === 'Assinatura We Have');
  const totalAssinaturas = assinaturasVip.length;
  
  const assistenciasAbertas = comandas.filter(c => c.fluxo_operacional === 'Assistência Técnica' && c.status_atual !== 'Pronto para Retirada');
  const garantiasRegistadas = comandas.filter(c => c.fluxo_operacional === 'Garantia/Troca').length;

  const formatarData = (timestamp: any) => {
    if (!timestamp || typeof timestamp.toDate !== 'function') return 'Data Inválida';
    return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(timestamp.toDate());
  };

  const nomeVendedorEmFoco = vendedorSelecionadoId === usuarioAuth?.uid 
    ? usuarioDb?.nome_completo 
    : listaVendedores.find(v => v.id === vendedorSelecionadoId)?.nome || 'Colaborador';

  if (authCarregando) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-gray-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <>
      <MenuLateral />
      {/* PADRONIZAÇÃO: pl-20 (mobile) e md:pl-24 */}
      <div className="flex h-screen w-full flex-col bg-gray-50 p-6 pl-20 md:p-8 md:pl-24 font-sans overflow-hidden transition-all">
        
        <header className="mb-6 flex flex-col gap-4 border-b border-gray-200 pb-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-black text-gray-900">Painel de Desempenho</h1>
              <p className="text-gray-500 mt-1">
                Visualizando métricas de: <strong className="text-blue-600 uppercase">{nomeVendedorEmFoco}</strong>
              </p>
            </div>
            <div className="flex items-center gap-2 rounded-full bg-blue-100 px-4 py-2 text-sm font-bold text-blue-800 shadow-sm border border-blue-200">
              <span>📊</span> {isGestor ? 'Auditoria Ativa' : 'Vendedor Ativo'}
            </div>
          </div>

          {isGestor && (
            <div className="mt-2 flex items-center gap-3 bg-white p-3 rounded-lg border border-gray-200 shadow-sm w-full md:w-auto self-start">
              <label htmlFor="auditorSelect" className="text-sm font-bold text-gray-700">Auditar Colaborador:</label>
              <select
                id="auditorSelect"
                value={vendedorSelecionadoId}
                onChange={(e) => setVendedorSelecionadoId(e.target.value)}
                className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2 outline-none font-semibold cursor-pointer"
              >
                {listaVendedores.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.nome} ({v.perfil})
                  </option>
                ))}
              </select>
            </div>
          )}
        </header>

        {erro && (
          <div className="mb-6 w-full rounded border-l-4 border-red-500 bg-red-50 p-4 font-semibold text-red-800 shadow-sm break-words">
            ⚠️ <strong>Diagnóstico:</strong> {erro}
          </div>
        )}

        <div className="mb-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          
          <div className="rounded-xl border border-green-200 bg-white p-5 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10 text-4xl">🛒</div>
            <h3 className="text-sm font-bold text-gray-500 mb-1">Vendas Expressas (Total)</h3>
            <p className="text-2xl font-black text-green-700">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalRendimentoVendas)}
            </p>
            <p className="text-xs font-semibold text-green-600 mt-2">{vendasExpressas.length} pedidos finalizados</p>
          </div>

          <div className="rounded-xl border border-amber-200 bg-white p-5 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10 text-4xl">🌟</div>
            <h3 className="text-sm font-bold text-gray-500 mb-1">Encomendas VIP Fechadas</h3>
            <p className="text-2xl font-black text-amber-600">{totalAssinaturas}</p>
            <p className="text-xs font-semibold text-amber-700 mt-2">Prateleira Infinita</p>
          </div>

          <div className="rounded-xl border border-purple-200 bg-white p-5 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10 text-4xl">🔧</div>
            <h3 className="text-sm font-bold text-gray-500 mb-1">OS em Andamento</h3>
            <p className="text-2xl font-black text-purple-700">{assistenciasAbertas.length}</p>
            <p className="text-xs font-semibold text-purple-600 mt-2">Aparelhos na fila técnica</p>
          </div>

          <div className="rounded-xl border border-red-200 bg-white p-5 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10 text-4xl">🔄</div>
            <h3 className="text-sm font-bold text-gray-500 mb-1">Garantias / Trocas</h3>
            <p className="text-2xl font-black text-red-600">{garantiasRegistadas}</p>
            <p className="text-xs font-semibold text-red-500 mt-2">Registradas pelo operador</p>
          </div>

        </div>

        <div className="flex-1 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm flex flex-col">
          <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 p-4">
            <h2 className="text-lg font-bold text-gray-800">Histórico de Transações</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-white text-xs uppercase text-gray-500 border-b border-gray-200">
                <tr>
                  <th scope="col" className="px-6 py-4 font-bold">Data/Hora</th>
                  <th scope="col" className="px-6 py-4 font-bold">Fluxo Operacional</th>
                  <th scope="col" className="px-6 py-4 font-bold">Status Atual</th>
                  <th scope="col" className="px-6 py-4 font-bold text-right">Valor Registrado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {carregandoDados ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent"></div>
                        <p className="text-sm font-medium text-gray-500">A processar o histórico...</p>
                      </div>
                    </td>
                  </tr>
                ) : comandas.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-gray-400 font-medium">
                      Nenhuma operação encontrada para este colaborador.
                    </td>
                  </tr>
                ) : (
                  comandas.map((comanda) => (
                    <tr key={comanda.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 font-medium text-gray-900">
                        {formatarData(comanda.auditoria?.criado_em)}
                      </td>
                      <td className="px-6 py-4">
                        <span 
                          className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold border"
                          style={{ color: comanda.cor_hexadecimal, borderColor: `${comanda.cor_hexadecimal}40`, backgroundColor: `${comanda.cor_hexadecimal}10` }}
                        >
                          {comanda.fluxo_operacional}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-semibold text-gray-700">
                        {comanda.status_atual}
                      </td>
                      <td className="px-6 py-4 text-right font-black text-gray-900">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(comanda.valor_total || 0)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
