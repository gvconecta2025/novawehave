'use client';

import { useEffect, useState } from 'react';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { bancoDeDados } from '@/lib/firebase/config';
import { useAuthStore } from '@/store/useAuthStore';
import MenuLateral from '@/components/modulos/pdv/MenuLateral';
import Link from 'next/link';

interface ComandaHistorico {
  id: string;
  fluxo_operacional: string;
  status_atual: string;
  valor_total: number;
  cor_hexadecimal: string;
  auditoria: { criado_em: any; criado_por_nome?: string; };
}

export default function WorkspaceHistorico() {
  const { perfilRbac, carregando: authCarregando } = useAuthStore();
  const [historico, setHistorico] = useState<ComandaHistorico[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const acessoPermitido = ['Master', 'Admin/Dev', 'Supervisor'].includes(perfilRbac || '');

  useEffect(() => {
    if (authCarregando || !acessoPermitido) {
      if (!authCarregando && !acessoPermitido) setCarregando(false);
      return;
    }

    const un = onSnapshot(query(collection(bancoDeDados, 'comandas')), (snap) => {
      const dados = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as ComandaHistorico[];
      dados.sort((a, b) => {
        const tA = typeof a.auditoria?.criado_em?.toMillis === 'function' ? a.auditoria.criado_em.toMillis() : 0;
        const tB = typeof b.auditoria?.criado_em?.toMillis === 'function' ? b.auditoria.criado_em.toMillis() : 0;
        return tB - tA; 
      });
      setHistorico(dados); setCarregando(false); setErro(null);
    }, (err) => { setErro(`Falha: ${err.message}`); setCarregando(false); });

    return () => un();
  }, [acessoPermitido, authCarregando]);

  if (authCarregando) return <div className="flex h-screen items-center justify-center bg-gray-50"><div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-900 border-t-transparent"></div></div>;
  if (!acessoPermitido) return <div className="flex h-screen w-full items-center justify-center bg-gray-100 p-8"><div className="flex max-w-md flex-col items-center text-center"><span className="text-6xl mb-4">⛔</span><h1 className="text-2xl font-black">Acesso Restrito</h1><Link href="/pdv" className="mt-4 rounded bg-blue-600 px-6 py-2.5 text-white font-bold">Voltar</Link></div></div>;

  return (
    // AÇÃO 1: Wrapper Flex Global
    <div className="flex h-screen w-screen overflow-hidden bg-gray-50 font-sans">
      <MenuLateral />
      <div className="flex-1 flex flex-col overflow-hidden p-6 md:p-8 transition-all duration-300 relative">
        
        <header className="mb-6 shrink-0 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 pb-6">
          <div><h1 className="text-3xl font-black text-gray-900">Livro Razão</h1><p className="text-gray-500 mt-1">Histórico Cronológico Geral.</p></div>
          <div className="flex items-center gap-3"><span className="flex items-center gap-2 rounded-lg bg-white border border-gray-200 px-5 py-2.5 font-bold text-gray-700 shadow-sm"><span className="text-xl">📊</span> {historico.length} Operações</span></div>
        </header>

        {erro && <div className="mb-4 shrink-0 rounded border-l-4 border-red-500 bg-red-50 p-4 font-semibold text-red-800 shadow-sm">{erro}</div>}

        <div className="flex-1 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm flex flex-col">
          <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 p-4 shrink-0">
            <h2 className="text-lg font-bold text-gray-800">Todas as Transações</h2><span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Ordenado por mais recentes</span>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <table className="w-full text-left text-sm text-gray-600 relative">
              <thead className="bg-white text-xs uppercase text-gray-500 border-b border-gray-200 sticky top-0 z-10 shadow-sm">
                <tr><th className="px-6 py-4">Data/Hora</th><th className="px-6 py-4">Operador</th><th className="px-6 py-4">Fluxo</th><th className="px-6 py-4">Status</th><th className="px-6 py-4 text-right">Valor</th></tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {carregando ? <tr><td colSpan={5} className="px-6 py-12 text-center">A processar Livro Razão...</td></tr> : historico.length === 0 ? <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-400">Vazio.</td></tr> : historico.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">{c.auditoria?.criado_em?.toDate ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(c.auditoria.criado_em.toDate()) : 'Inválida'}</td>
                    <td className="px-6 py-4 font-bold text-gray-700">{c.auditoria?.criado_por_nome || 'Oculto'}</td>
                    <td className="px-6 py-4"><span className="inline-flex rounded-full px-2.5 py-1 text-xs font-bold border" style={{ color: c.cor_hexadecimal || '#6B7280', borderColor: `${c.cor_hexadecimal || '#6B7280'}40`, backgroundColor: `${c.cor_hexadecimal || '#6B7280'}10` }}>{c.fluxo_operacional}</span></td>
                    <td className="px-6 py-4 font-semibold text-gray-700">{c.status_atual}</td>
                    <td className="px-6 py-4 text-right font-black text-gray-900">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(c.valor_total) || 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
