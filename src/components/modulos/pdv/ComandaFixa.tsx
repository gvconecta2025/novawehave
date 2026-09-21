'use client';

import { useComandaStore } from '@/store/useComandaStore';

export default function ComandaFixa() {
  const { itens, valorTotal, removerItem, limparComanda } = useComandaStore();

  const lidarComFinalizacao = () => {
    if (itens.length === 0) return;
    
    // Alerta temporário para simular o fechamento da venda
    alert(`Venda finalizada com sucesso!\nValor Total: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valorTotal)}`);
    limparComanda();
  };

  return (
    <div className="flex h-full w-full flex-col bg-white">
      
      {/* Cabeçalho da Comanda */}
      <div className="flex h-20 items-center justify-between border-b border-gray-200 bg-gray-50 p-4">
        <h2 className="text-lg font-bold text-gray-800">Comanda Atual</h2>
        <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700">
          {itens.length} {itens.length === 1 ? 'Item' : 'Itens'}
        </span>
      </div>

      {/* Lista de Itens (Scroll Independente) */}
      <div className="flex-1 overflow-y-auto p-4 bg-white">
        {itens.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center text-gray-400">
            <span className="text-4xl mb-2">🛒</span>
            <p className="text-sm">Nenhum item adicionado à comanda.</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {itens.map((item) => (
              <li key={item.id} className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 p-3">
                <div className="flex-1 pr-2">
                  <p className="text-sm font-semibold text-gray-800 line-clamp-1">{item.nome}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {item.quantidade}x {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.preco)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-gray-900">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.preco * item.quantidade)}
                  </span>
                  <button
                    onClick={() => removerItem(item.id)}
                    className="flex h-7 w-7 items-center justify-center rounded-md bg-red-100 text-red-600 transition-colors hover:bg-red-200"
                    title="Remover uma unidade"
                  >
                    -
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Rodapé - Total e Botão de Ação */}
      <div className="border-t border-gray-200 bg-gray-50 p-5">
        <div className="mb-4 flex items-center justify-between">
          <span className="text-sm font-semibold text-gray-600">Total a Pagar</span>
          <span className="text-2xl font-black text-green-600">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valorTotal)}
          </span>
        </div>
        
        <button 
          onClick={lidarComFinalizacao}
          disabled={itens.length === 0}
          className="w-full rounded-lg bg-green-600 py-4 text-sm font-bold tracking-wide text-white transition-all hover:bg-green-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500 disabled:active:scale-100 shadow-md"
        >
          FINALIZAR VENDA
        </button>
      </div>
      
    </div>
  );
}
