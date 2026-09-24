'use client';

import { useEffect, useState } from 'react';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { bancoDeDados } from '@/lib/firebase/config';
import { useAuthStore } from '@/store/useAuthStore';
import MenuLateral from '@/components/modulos/pdv/MenuLateral';
import Link from 'next/link';

interface ComandaMetrica {
  id: string;
  fluxo_operacional: string;
  status_atual: string;
  valor_total: number;
  auditoria: { criado_por_nome: string; };
}

interface ProdutoMetrica {
  id: string;
  preco: number;
  saldo_estoque: number;
}

export default function WorkspaceMetricas() {
  const { perfilRbac, carregando: authCarregando } = useAuthStore();
  const [comandas, setComandas] = useState<ComandaMetrica[]>([]);
  const [produtos, setProdutos] = useState<ProdutoMetrica[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const acessoPermitido = ['Master', 'Supervisor', 'Admin/Dev'].includes(perfilRbac || '');

  useEffect(() => {
    if (authCarregando || !acessoPermitido) {
      if (!authCarregando && !acessoPermitido) setCarregando(false);
      return;
    }

    const unComandas = onSnapshot(query(collection(bancoDeDados, 'comandas')), (snap) => {
      setComandas(snap.docs.map(doc => ({ id: doc.id, fluxo_operacional: doc.data().fluxo_operacional, status_atual: doc.data().status_atual, valor_total: Number(doc.data().valor_total) || 0, auditoria: doc.data().auditoria || { criado_por_nome: 'Desconhecido' } })) as ComandaMetrica[]);
      setCarregando(false);
    }, (err) => { setErro('Falha ao carregar as métricas de vendas.'); setCarregando(false); });

    const unProdutos = onSnapshot(query(collection(bancoDeDados, 'produtos')), (snap) => {
      setProdutos(snap.docs.map(doc => ({ id: doc.id, preco: Number(doc.data().preco) || 0, saldo_estoque: Number(doc.data().saldo_estoque) || 0 })) as ProdutoMetrica[]);
    });

    return () => { unComandas(); unProdutos(); };
  }, [acessoPermitido, authCarregando]);

  if (authCarregando) return <div className="flex h-screen items-center justify-center bg-gray-50"><div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div></div>;
  if (!acessoPermitido) return <div className="flex h-screen w-full items-center justify-center bg-gray-100 p-8"><div className="flex max-w-md flex-col items-center text-center"><span className="text-6xl mb-4">⛔</span><h1 className="text-2xl font-black mb-6">Acesso Restrito</h1><Link href="/pdv" className="rounded bg-blue-600 px-6 py-2.5 text-white font-bold">Voltar</Link></div></div>;

  const faturamentoTotal = comandas.filter(c => ['Venda Expressa', 'Assinatura We Have'].includes(c.fluxo_operacional)).reduce((acc, curr) => acc + curr.valor_total, 0);
  const capitalEstoque = produtos.reduce((acc, curr) => acc + (curr.preco * curr.saldo_estoque), 0);
  const osAtivas = comandas.filter(c => c.fluxo_operacional === 'Assistência Técnica' && c.status_atual !== 'Pronto para Retirada').length;
  const mapaRanking = new Map<string, number>();
  comandas.filter(c => ['Venda Expressa', 'Assinatura We Have'].includes(c.fluxo_operacional)).forEach(c => { const v = c.auditoria?.criado_por_nome || 'Desconhecido'; mapaRanking.set(v, (mapaRanking.get(v) || 0) + c.valor_total); });
  const rankingVendedores = Array.from(mapaRanking.entries()).sort((a, b) => b[1] - a[1]);

  return (
    // AÇÃO 1: Wrapper Flex Global
    <div className="flex h-screen w-screen overflow-hidden bg-gray-50 font-sans">
      <MenuLateral />
      <div className="flex-1 flex flex-col overflow-hidden p-6 md:p-8 transition-all duration-300 relative">
        <header className="mb-8 shrink-0 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 pb-6">
          <div><h1 className="text-3xl font-black text-gray-900">Métricas Globais</h1><p className="text-gray-500 mt-1">Dashboard Executivo de Faturamento e Operações.</p></div>
        </header>

        {erro && <div className="mb-4 shrink-0 rounded border-l-4 border-red-500 bg-red-50 p-4 font-semibold text-red-700 shadow-sm">{erro}</div>}

        {carregando ? (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400"><div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent mb-3"></div><p>Calculando métricas em tempo real...</p></div>
        ) : (
          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-3 mb-8">
              <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm"><h3 className="text-sm font-bold text-gray-500 mb-2">Faturamento Bruto</h3><p className="text-3xl font-black text-blue-700">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(faturamentoTotal)}</p></div>
              <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm"><h3 className="text-sm font-bold text-gray-500 mb-2">Capital em Estoque</h3><p className="text-3xl font-black text-emerald-600">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(capitalEstoque)}</p></div>
              <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm"><h3 className="text-sm font-bold text-gray-500 mb-2">OS Ativas</h3><p className="text-3xl font-black text-purple-700">{osAtivas}</p></div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
              <div className="bg-gray-50 p-4 border-b border-gray-200"><h2 className="text-lg font-bold text-gray-800">Ranking de Vendedores</h2></div>
              <table className="w-full text-left text-sm text-gray-600">
                <thead className="bg-white text-xs uppercase text-gray-400 border-b border-gray-100"><tr><th className="px-6 py-4">Posição</th><th className="px-6 py-4">Colaborador</th><th className="px-6 py-4 text-right">Valor Total Vendido</th></tr></thead>
                <tbody className="divide-y divide-gray-100">
                  {rankingVendedores.length === 0 ? <tr><td colSpan={3} className="px-6 py-8 text-center text-gray-400">Sem dados.</td></tr> : rankingVendedores.map(([v, val], i) => (
                    <tr key={v} className="hover:bg-gray-50"><td className="px-6 py-4 font-black">{i === 0 ? '🏆 1º' : i === 1 ? '🥈 2º' : i === 2 ? '🥉 3º' : `${i + 1}º`}</td><td className="px-6 py-4 font-bold">{v}</td><td className="px-6 py-4 text-right font-black text-green-600">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
