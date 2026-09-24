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
  auditoria: {
    criado_por_nome: string;
  };
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

    const desinscreverComandas = onSnapshot(
      query(collection(bancoDeDados, 'comandas')),
      (snapshot) => {
        const dados = snapshot.docs.map(doc => ({
          id: doc.id,
          fluxo_operacional: doc.data().fluxo_operacional,
          status_atual: doc.data().status_atual,
          valor_total: Number(doc.data().valor_total) || 0,
          auditoria: doc.data().auditoria || { criado_por_nome: 'Desconhecido' },
        })) as ComandaMetrica[];
        setComandas(dados);
        setCarregando(false);
      },
      (err) => {
        console.error('[ERRO MÉTRICAS COMANDAS]', err);
        setErro('Falha ao carregar as métricas de vendas.');
        setCarregando(false);
      }
    );

    const desinscreverProdutos = onSnapshot(
      query(collection(bancoDeDados, 'produtos')),
      (snapshot) => {
        const dados = snapshot.docs.map(doc => ({
          id: doc.id,
          preco: Number(doc.data().preco) || 0,
          saldo_estoque: Number(doc.data().saldo_estoque) || 0,
        })) as ProdutoMetrica[];
        setProdutos(dados);
      },
      (err) => console.error('[ERRO MÉTRICAS ESTOQUE]', err)
    );

    return () => {
      desinscreverComandas();
      desinscreverProdutos();
    };
  }, [acessoPermitido, authCarregando]);

  if (authCarregando) {
    return <div className="flex h-screen items-center justify-center bg-gray-50"><div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div></div>;
  }

  if (!acessoPermitido) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-gray-100 p-8 font-sans">
        <div className="flex max-w-md flex-col items-center justify-center rounded-2xl border border-red-200 bg-white p-10 text-center shadow-2xl">
          <span className="mb-4 text-6xl">⛔</span>
          <h1 className="mb-2 text-2xl font-black text-gray-900">Acesso Restrito</h1>
          <p className="mb-6 text-sm text-gray-500">
            Seu perfil ({perfilRbac}) não possui autorização executiva para visualizar as métricas globais.
          </p>
          <Link href="/pdv" className="rounded bg-blue-600 px-6 py-2.5 font-bold text-white transition hover:bg-blue-700">Voltar ao PDV</Link>
        </div>
      </div>
    );
  }

  const faturamentoTotal = comandas
    .filter(c => ['Venda Expressa', 'Assinatura We Have'].includes(c.fluxo_operacional))
    .reduce((acc, curr) => acc + curr.valor_total, 0);

  const capitalEstoque = produtos.reduce((acc, curr) => acc + (curr.preco * curr.saldo_estoque), 0);

  const osAtivas = comandas.filter(c => c.fluxo_operacional === 'Assistência Técnica' && c.status_atual !== 'Pronto para Retirada').length;

  const mapaRanking = new Map<string, number>();
  comandas
    .filter(c => ['Venda Expressa', 'Assinatura We Have'].includes(c.fluxo_operacional))
    .forEach(c => {
      const vendedor = c.auditoria?.criado_por_nome || 'Desconhecido';
      mapaRanking.set(vendedor, (mapaRanking.get(vendedor) || 0) + c.valor_total);
    });
  
  const rankingVendedores = Array.from(mapaRanking.entries()).sort((a, b) => b[1] - a[1]);

  return (
    <>
      <MenuLateral />
      <div className="flex h-screen w-full flex-col bg-gray-50 p-8 pt-20 lg:pt-8 lg:pl-24 font-sans overflow-hidden transition-all">
        <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 pb-6">
          <div>
            <h1 className="text-3xl font-black text-gray-900">Métricas Globais</h1>
            <p className="text-gray-500 mt-1">Dashboard Executivo de Faturamento e Operações.</p>
          </div>
        </header>

        {erro && (
          <div className="mb-6 w-full rounded border-l-4 border-red-500 bg-red-50 p-4 font-semibold text-red-700 shadow-sm">
            ⚠️ {erro}
          </div>
        )}

        {carregando ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent mb-3"></div>
            <p>Calculando métricas em tempo real...</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto pr-2">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-3 mb-8">
              <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2">Faturamento Bruto</h3>
                <p className="text-3xl font-black text-blue-700">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(faturamentoTotal)}
                </p>
              </div>
              
              <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2">Capital em Estoque</h3>
                <p className="text-3xl font-black text-emerald-600">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(capitalEstoque)}
                </p>
              </div>

              <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2">OS Ativas (Assistência)</h3>
                <p className="text-3xl font-black text-purple-700">{osAtivas}</p>
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
              <div className="bg-gray-50 p-4 border-b border-gray-200">
                <h2 className="text-lg font-bold text-gray-800">Ranking de Vendedores (Receita Gerada)</h2>
              </div>
              <div className="p-0">
                <table className="w-full text-left text-sm text-gray-600">
                  <thead className="bg-white text-xs uppercase text-gray-400 border-b border-gray-100">
                    <tr>
                      <th className="px-6 py-4">Posição</th>
                      <th className="px-6 py-4">Colaborador</th>
                      <th className="px-6 py-4 text-right">Valor Total Vendido</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {rankingVendedores.length === 0 ? (
                      <tr><td colSpan={3} className="px-6 py-8 text-center text-gray-400">Nenhum dado de venda registrado.</td></tr>
                    ) : (
                      rankingVendedores.map(([vendedor, valor], index) => (
                        <tr key={vendedor} className="hover:bg-gray-50">
                          <td className="px-6 py-4 font-black text-gray-900">
                            {index === 0 ? '🏆 1º' : index === 1 ? '🥈 2º' : index === 2 ? '🥉 3º' : `${index + 1}º`}
                          </td>
                          <td className="px-6 py-4 font-bold text-gray-700">{vendedor}</td>
                          <td className="px-6 py-4 text-right font-black text-green-600">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
