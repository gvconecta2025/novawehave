'use client';

import { useState } from 'react';
import { useComandaStore } from '@/store/useComandaStore';
import ModalPagamento from './ModalPagamento';

export default function ComandaFixa() {
  const { itens, removerItem, adicionarItem, limparComanda } = useComandaStore();
  const [modalAberto, setModalAberto] = useState(false);

  const valorTotal = itens.reduce((acc, item) => acc + (item.preco * item.quantidade), 0);
  const totalItens = itens.reduce((acc, item) => acc + item.quantidade, 0);

  return (
    <>
      <div className="flex h-full w-full flex-col bg-white shadow-xl border-l border-gray-200">
        {/* Cabeçalho da Comanda */}
        <div className="flex flex-col border-b border-gray-200 bg-gray-50 p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
              <span>🧾</span> Comanda Aberta
            </h2>
            <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-800">
              {totalItens} itens
            </span>
          </div>
          {itens.length > 0 && (
            <button 
              onClick={limparComanda}
              className="text-xs font-bold text-red-500 hover:text-red-700 transition self-start mt-2"
            >
              Limpar Comanda
            </button>
          )}
        </div>

        {/* Lista de Itens */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {itens.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center text-gray-400">
              <span className="text-6xl mb-4 opacity-50">🛒</span>
              <p className="font-bold text-gray-600">A comanda está vazia.</p>
              <p className="text-sm">Clique nos produtos para adicionar.</p>
            </div>
          ) : (
            itens.map((item) => (
              <div key={item.id} className="flex flex-col gap-2 rounded-lg border border-gray-100 bg-gray-50 p-3 relative group">
                <button 
                  onClick={() => removerItem(item.id)}
                  className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-red-100 text-red-600 font-bold opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-200 flex items-center justify-center"
                >
                  &times;
                </button>
                
                <p className="text-sm font-bold text-gray-900 pr-4 line-clamp-2">{item.nome}</p>
                <div className="flex items-center justify-between mt-1">
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => removerItem(item.id)}
                      className="h-7 w-7 rounded border border-gray-300 bg-white font-bold text-gray-600 hover:bg-gray-100"
                    >-</button>
                    <span className="text-sm font-black">{item.quantidade}</span>
                    <button 
                      onClick={() => adicionarItem(item)}
                      className="h-7 w-7 rounded border border-gray-300 bg-white font-bold text-gray-600 hover:bg-gray-100"
                    >+</button>
                  </div>
                  <p className="font-bold text-green-700">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.preco * item.quantidade)}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Rodapé e Fechamento */}
        <div className="border-t border-gray-200 bg-gray-50 p-5">
          <div className="mb-4 flex items-center justify-between">
            <span className="text-sm font-bold uppercase tracking-wider text-gray-500">Total</span>
            <span className="text-3xl font-black text-green-700">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valorTotal)}
            </span>
          </div>
          
          <button
            onClick={() => setModalAberto(true)}
            disabled={itens.length === 0}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-green-600 py-4 text-sm font-black text-white shadow-lg transition-all hover:bg-green-700 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span>💰</span> PAGAR E FINALIZAR
          </button>
        </div>
      </div>

      <ModalPagamento aberto={modalAberto} aoFechar={() => setModalAberto(false)} />
    </>
  );
}
