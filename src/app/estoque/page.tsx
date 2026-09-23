'use client';

import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { bancoDeDados } from '@/lib/firebase/config';
import ModalNovoProduto from '@/components/modulos/estoque/ModalNovoProduto';

interface ProdutoEstoque {
  id: string;
  sku: string;
  nome: string;
  preco: number;
  saldo_estoque: number;
  sincronizacao_bling: {
    sincronizado: boolean;
    id_produto_bling: string | null;
  };
}

export default function WorkspaceEstoque() {
  const [produtos, setProdutos] = useState<ProdutoEstoque[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  
  // Estado de controle do Modal
  const [modalAberto, setModalAberto] = useState(false);

  useEffect(() => {
    const q = query(collection(bancoDeDados, 'produtos'), orderBy('nome', 'asc'));

    const desinscrever = onSnapshot(
      q,
      (snapshot) => {
        const dados = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            sku: data.sku || 'N/A',
            nome: data.nome || 'Produto sem nome',
            preco: data.preco || 0,
            saldo_estoque: data.saldo_estoque || 0,
            sincronizacao_bling: {
              sincronizado: data.sincronizacao_bling?.sincronizado || false,
              id_produto_bling: data.sincronizacao_bling?.id_produto_bling || null,
            }
          };
        }) as ProdutoEstoque[];
        
        setProdutos(dados);
        setCarregando(false);
        setErro(null);
      },
      (erroFirebase) => {
        console.error('[ERRO LISTAGEM ESTOQUE]', erroFirebase);
        setErro('Falha ao carregar o catálogo de produtos. Verifique sua conexão com a internet ou contate o suporte técnico.');
        setCarregando(false);
      }
    );

    return () => desinscrever();
  }, []);

  return (
    <div className="flex h-screen w-full flex-col bg-gray-100 p-8 font-sans overflow-hidden">
      
      <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900">Estoque e Catálogo</h1>
          <p className="text-gray-500 mt-1">Gestão local espelhada e sincronização com Bling ERP.</p>
        </div>
        <div className="flex gap-3">
          <button 
            className="flex items-center gap-2 rounded bg-white border border-gray-300 px-5 py-2.5 font-bold text-gray-700 shadow-sm transition hover:bg-gray-50 active:scale-95"
            title="Funcionalidade em construção"
          >
            <span>🔄</span> Sincronizar Bling
          </button>
          <button 
            onClick={() => setModalAberto(true)}
            className="flex items-center gap-2 rounded bg-indigo-600 px-6 py-2.5 font-bold text-white shadow-md transition hover:bg-indigo-700 hover:shadow-lg active:scale-95"
          >
            <span>➕</span> Novo Produto
          </button>
        </div>
      </header>

      {erro && (
        <div className="mb-6 w-full rounded-md border-l-4 border-red-500 bg-red-50 p-4 font-semibold text-red-700 shadow-sm">
          ⚠️ {erro}
        </div>
      )}

      <div className="flex-1 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm flex flex-col">
        <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 p-4">
          <h2 className="text-lg font-bold text-gray-700">Produtos Cadastrados</h2>
          <span className="rounded bg-indigo-100 px-3 py-1 text-xs font-bold text-indigo-700">
            {produtos.length} Itens
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-white text-xs uppercase text-gray-500 border-b border-gray-200">
              <tr>
                <th scope="col" className="px-6 py-4 font-bold">SKU</th>
                <th scope="col" className="px-6 py-4 font-bold">Produto</th>
                <th scope="col" className="px-6 py-4 font-bold text-right">Preço (R$)</th>
                <th scope="col" className="px-6 py-4 font-bold text-center">Saldo Físico</th>
                <th scope="col" className="px-6 py-4 font-bold text-center">Status ERP</th>
                <th scope="col" className="px-6 py-4 font-bold text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {carregando ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
                      <p className="text-sm font-medium text-gray-500">Sincronizando catálogo...</p>
                    </div>
                  </td>
                </tr>
              ) : produtos.length === 0 && !erro ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center justify-center text-gray-400">
                      <span className="text-5xl mb-3">📦</span>
                      <h3 className="text-lg font-bold text-gray-600">Estoque Vazio</h3>
                      <p className="text-sm mt-1">Nenhum produto encontrado. Sincronize com o Bling ou cadastre manualmente.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                produtos.map((produto) => (
                  <tr key={produto.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-mono text-xs font-medium text-gray-500">
                      {produto.sku}
                    </td>
                    <td className="px-6 py-4 font-bold text-gray-900">
                      {produto.nome}
                    </td>
                    <td className="px-6 py-4 text-right font-medium text-gray-900">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(produto.preco)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex min-w-[3rem] items-center justify-center rounded-md px-2 py-1 text-xs font-bold ${
                        produto.saldo_estoque > 5 ? 'bg-emerald-100 text-emerald-800' : 
                        produto.saldo_estoque > 0 ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {produto.saldo_estoque}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {produto.sincronizacao_bling.sincronizado ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 border border-blue-200" title={`ID Bling: ${produto.sincronizacao_bling.id_produto_bling}`}>
                          <span className="h-1.5 w-1.5 rounded-full bg-blue-600"></span>
                          Espelhado
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-600 border border-gray-200">
                          <span className="h-1.5 w-1.5 rounded-full bg-gray-400"></span>
                          Não Sincronizado
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="text-gray-400 hover:text-indigo-600 font-medium text-xs transition-colors" title="Editar Produto">
                        Editar
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Renderização do Modal Controlado pelo Estado */}
      <ModalNovoProduto aberto={modalAberto} aoFechar={() => setModalAberto(false)} />
    </div>
  );
}
