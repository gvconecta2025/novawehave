'use client';

import { useComandaStore } from '@/store/useComandaStore';

// Mock de Produtos Vitais para teste imediato do fluxo
const PRODUTOS_MOCK = [
  { id: 'p1', nome: 'Película de Vidro 3D', preco: 35.00 },
  { id: 'p2', nome: 'Capa Anti-Impacto Transparente', preco: 45.00 },
  { id: 'p3', nome: 'Carregador Turbo 20W Original', preco: 120.00 },
  { id: 'p4', nome: 'Fone Bluetooth Intra-auricular', preco: 150.00 },
];

export default function PdvWorkspace() {
  const { adicionarItem } = useComandaStore();

  return (
    <div className="flex h-full flex-col font-sans">
      
      {/* Cabeçalho Color-Coded: Verde para Venda Expressa */}
      <header className="mb-6 flex items-center justify-between rounded-lg bg-green-50 p-4 border border-green-200">
        <div>
          <h1 className="text-2xl font-bold text-green-800">Venda Expressa</h1>
          <p className="text-sm text-green-600">Pronta Entrega / Balcão</p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 text-xl">
          ⚡
        </div>
      </header>

      {/* Grid de Produtos Data-Driven */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {PRODUTOS_MOCK.map((produto) => (
          <div 
            key={produto.id} 
            className="flex flex-col justify-between rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
          >
            <div>
              <h3 className="font-semibold text-gray-800 line-clamp-2 min-h-[3rem]">
                {produto.nome}
              </h3>
              <p className="mt-2 text-xl font-bold text-gray-900">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(produto.preco)}
              </p>
            </div>
            
            <button
              onClick={() => adicionarItem(produto)}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-gray-900 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-green-600 active:bg-green-700"
            >
              <span>+</span> Adicionar
            </button>
          </div>
        ))}
      </div>

    </div>
  );
}
