'use client';

import Link from 'next/link';
import { useComparadorStore } from '@/store/useComparadorStore';

export default function PaginaComparacao() {
  const { produtos, removerProduto, limparComparacao } = useComparadorStore();

  if (produtos.length === 0) {
    return (
      <div className="mx-auto mt-16 flex max-w-2xl flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50 p-12 text-center">
        <span className="mb-4 text-6xl text-gray-300">⚖️</span>
        <h2 className="mb-2 text-2xl font-bold text-gray-700">O Comparador está vazio</h2>
        <p className="text-gray-500 mb-6">Navegue pela loja e adicione até 3 produtos para compará-los lado a lado.</p>
        <Link href="/" className="rounded-lg bg-blue-600 px-8 py-3 font-bold text-white transition hover:bg-blue-700">
          Explorar Produtos
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900">Comparação de Produtos</h1>
          <p className="text-gray-500 mt-1">Analisando {produtos.length} {produtos.length === 1 ? 'item' : 'itens'}.</p>
        </div>
        <button 
          onClick={limparComparacao}
          className="text-sm font-bold text-red-600 hover:text-red-800 transition"
        >
          🗑️ Limpar Comparador
        </button>
      </div>

      {/* Grid de Comparação com Scroll Horizontal para Mobile */}
      <div className="overflow-x-auto pb-8">
        <div className="flex min-w-max gap-6">
          {produtos.map((produto) => (
            <div key={produto.id} className="flex w-72 flex-col rounded-2xl border border-gray-200 bg-white p-5 shadow-sm relative group">
              
              <button 
                onClick={() => removerProduto(produto.id)}
                className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-red-100 text-red-600 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-red-200"
                title="Remover"
              >
                &times;
              </button>

              <div className="mb-4 flex aspect-square w-full items-center justify-center rounded-xl bg-gray-100">
                <span className="text-5xl opacity-20">📱</span>
              </div>
              
              <h3 className="mb-2 text-lg font-bold text-gray-900 line-clamp-2 min-h-[3.5rem]">
                {produto.nome}
              </h3>
              
              <div className="mb-4">
                <p className="text-2xl font-black text-green-600">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(produto.preco * 0.9)}
                </p>
                <p className="text-xs font-semibold text-gray-500">À vista no PIX</p>
              </div>

              <div className="mb-6 flex-1">
                <h4 className="mb-1 text-xs font-bold uppercase tracking-wider text-gray-400">Status</h4>
                <p className={`text-sm font-semibold mb-4 ${produto.saldo_estoque > 0 ? 'text-green-700' : 'text-red-600'}`}>
                  {produto.saldo_estoque > 0 ? 'Disponível' : 'Esgotado'}
                </p>

                <h4 className="mb-1 text-xs font-bold uppercase tracking-wider text-gray-400">Diferenciais</h4>
                <p className="text-sm text-gray-600 line-clamp-4">
                  {produto.descricao || 'Sem descrição detalhada.'}
                </p>
              </div>

              <Link
                href={`/produto/${produto.id}`}
                className="mt-auto flex w-full items-center justify-center rounded-lg bg-blue-50 py-2.5 text-sm font-bold text-blue-700 transition hover:bg-blue-100 border border-blue-200"
              >
                Ver Detalhes
              </Link>
            </div>
          ))}
          
          {/* Card Fantasma para sugerir adição de mais itens se < 3 */}
          {produtos.length < 3 && (
            <div className="flex w-72 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50/50 p-5">
              <span className="text-4xl text-gray-300 mb-2">➕</span>
              <p className="text-sm font-bold text-gray-400 text-center">Adicione mais um produto para comparar</p>
              <Link href="/" className="mt-4 text-sm font-bold text-blue-600 hover:underline">
                Voltar à Vitrine
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
