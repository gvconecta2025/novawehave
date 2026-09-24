'use client';

import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where, orderBy } from 'firebase/firestore';
import { bancoDeDados } from '@/lib/firebase/config';
import { useAuthStore } from '@/store/useAuthStore';
import MenuLateral from '@/components/modulos/pdv/MenuLateral';

interface ComandaVendedor { id: string; fluxo_operacional: string; status_atual: string; valor_total: number; cor_hexadecimal: string; auditoria: { criado_em: any; criado_por_nome?: string; }; }
interface UsuarioEquipa { id: string; nome: string; perfil: string; }

export default function WorkspaceVendedor() {
  const { usuarioAuth, usuarioDb, perfilRbac, carregando: authCarregando } = useAuthStore();
  const [comandas, setComandas] = useState<ComandaVendedor[]>([]);
  const [vendedorSelecionadoId, setVendedorSelecionadoId] = useState<string>('');
  const [listaVendedores, setListaVendedores] = useState<UsuarioEquipa[]>([]);
  const [carregandoDados, setCarregandoDados] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const isGestor = ['Master', 'Admin/Dev', 'Supervisor'].includes(perfilRbac || '');

  useEffect(() => { if (!authCarregando && usuarioAuth && !vendedorSelecionadoId) setVendedorSelecionadoId(usuarioAuth.uid); }, [authCarregando, usuarioAuth, vendedorSelecionadoId]);

  useEffect(() => {
    if (!isGestor) return;
    const un = onSnapshot(query(collection(bancoDeDados, 'usuarios'), orderBy('nome_completo', 'asc')), (snap) => {
      setListaVendedores(snap.docs.map(doc => ({ id: doc.id, nome: doc.data().nome_completo || 'Sem Nome', perfil: doc.data().perfil_rbac || 'Sem Perfil' })));
    });
    return () => un();
  }, [isGestor]);

  useEffect(() => {
    if (!vendedorSelecionadoId) return;
    setCarregandoDados(true); setErro(null);
    const un = onSnapshot(query(collection(bancoDeDados, 'comandas'), where('auditoria.criado_por_id', '==', vendedorSelecionadoId)), (snap) => {
      const dados = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as ComandaVendedor[];
      dados.sort((a, b) => {
        const tA = typeof a.auditoria?.criado_em?.toMillis === 'function' ? a.auditoria.criado_em.toMillis() : 0;
        const tB = typeof b.auditoria?.criado_em?.toMillis === 'function' ? b.auditoria.criado_em.toMillis() : 0;
        return tB - tA; 
      });
      setComandas(dados); setCarregandoDados(false);
    }, (err) => { setErro('Falha ao carregar vendas.'); setCarregandoDados(false); });
    return () => un();
  }, [vendedorSelecionadoId]);

  const vendasExpressas = comandas.filter(c => c.fluxo_operacional === 'Venda Expressa');
  const tVendas = vendasExpressas.reduce((acc, c) => acc + (Number(c.valor_total) || 0), 0);
  const tVip = comandas.filter(c => c.fluxo_operacional === 'Assinatura We Have').length;
  const assistAbertas = comandas.filter(c => c.fluxo_operacional === 'Assistência Técnica' && c.status_atual !== 'Pronto para Retirada').length;
  const garantias = comandas.filter(c => c.fluxo_operacional === 'Garantia/Troca').length;

  const nomeFoco = vendedorSelecionadoId === usuarioAuth?.uid ? usuarioDb?.nome_completo : listaVendedores.find(v => v.id === vendedorSelecionadoId)?.nome || 'Colaborador';

  if (authCarregando) return <div className="flex h-screen items-center justify-center bg-gray-50"><div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div></div>;

  return (
    // AÇÃO 1: Wrapper Flex Global
    <div className="flex h-screen w-screen overflow-hidden bg-gray-50 font-sans">
      <MenuLateral />
      <div className="flex-1 flex flex-col overflow-hidden p-6 md:p-8 transition-all duration-300 relative">
        <header className="mb-6 shrink-0 flex flex-col gap-4 border-b border-gray-200 pb-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div><h1 className="text-3xl font-black">Painel de Desempenho</h1><p className="text-gray-500 mt-1">Métricas de: <strong className="text-blue-600 uppercase">{nomeFoco}</strong></p></div>
            <div className="flex items-center gap-2 rounded-full bg-blue-100 px-4 py-2 text-sm font-bold text-blue-800 border border-blue-200"><span>📊</span> {isGestor ? 'Auditoria' : 'Vendedor'}</div>
          </div>
          {isGestor && (
            <div className="mt-2 flex items-center gap-3 bg-white p-3 rounded-lg border border-gray-200 shadow-sm self-start">
              <label className="text-sm font-bold text-gray-700">Auditar:</label>
              <select value={vendedorSelecionadoId} onChange={(e) => setVendedorSelecionadoId(e.target.value)} className="bg-gray-50 border border-gray-300 text-sm rounded-lg p-2 outline-none">
                {listaVendedores.map((v) => <option key={v.id} value={v.id}>{v.nome} ({v.perfil})</option>)}
              </select>
            </div>
          )}
        </header>

        {erro && <div className="mb-4 shrink-0 rounded border-l-4 border-red-500 bg-red-50 p-4 font-semibold text-red-800 shadow-sm">{erro}</div>}

        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
          <div className="mb-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 shrink-0">
            <div className="rounded-xl border border-green-200 bg-white p-5 shadow-sm relative"><div className="absolute top-0 right-0 p-4 opacity-10 text-4xl">🛒</div><h3 className="text-sm font-bold text-gray-500 mb-1">Vendas</h3><p className="text-2xl font-black text-green-700">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(tVendas)}</p></div>
            <div className="rounded-xl border border-amber-200 bg-white p-5 shadow-sm relative"><div className="absolute top-0 right-0 p-4 opacity-10 text-4xl">🌟</div><h3 className="text-sm font-bold text-gray-500 mb-1">VIP</h3><p className="text-2xl font-black text-amber-600">{tVip}</p></div>
            <div className="rounded-xl border border-purple-200 bg-white p-5 shadow-sm relative"><div className="absolute top-0 right-0 p-4 opacity-10 text-4xl">🔧</div><h3 className="text-sm font-bold text-gray-500 mb-1">OS Abertas</h3><p className="text-2xl font-black text-purple-700">{assistAbertas}</p></div>
            <div className="rounded-xl border border-red-200 bg-white p-5 shadow-sm relative"><div className="absolute top-0 right-0 p-4 opacity-10 text-4xl">🔄</div><h3 className="text-sm font-bold text-gray-500 mb-1">Garantias</h3><p className="text-2xl font-black text-red-600">{garantias}</p></div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden flex flex-col shrink-0">
            <div className="bg-gray-50 p-4 border-b border-gray-100"><h2 className="text-lg font-bold">Histórico</h2></div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-600">
                <thead className="bg-white text-xs uppercase text-gray-500 border-b border-gray-200"><tr><th className="px-6 py-4">Data/Hora</th><th className="px-6 py-4">Fluxo</th><th className="px-6 py-4">Status</th><th className="px-6 py-4 text-right">Valor</th></tr></thead>
                <tbody className="divide-y divide-gray-100">
                  {carregandoDados ? <tr><td colSpan={4} className="px-6 py-8 text-center">Processando...</td></tr> : comandas.length === 0 ? <tr><td colSpan={4} className="px-6 py-8 text-center">Sem dados.</td></tr> : comandas.map((c) => (
                    <tr key={c.id} className="hover:bg-gray-50"><td className="px-6 py-4">{c.auditoria?.criado_em?.toDate ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(c.auditoria.criado_em.toDate()) : 'Inválida'}</td><td className="px-6 py-4"><span className="inline-flex rounded-full px-2.5 py-1 text-xs font-bold border" style={{ color: c.cor_hexadecimal, borderColor: `${c.cor_hexadecimal}40`, backgroundColor: `${c.cor_hexadecimal}10` }}>{c.fluxo_operacional}</span></td><td className="px-6 py-4">{c.status_atual}</td><td className="px-6 py-4 text-right font-black">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(c.valor_total || 0)}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
