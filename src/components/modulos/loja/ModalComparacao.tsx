'use client';

import { useComparacaoStore } from '@/store/useComparacaoStore';
import Image from 'next/link'; // Import fictício para manter a estrutura, mas usaremos a tag <img> com eslint-disable

interface ModalComparacaoProps {
  aberto: boolean;
  aoFechar: () => void;
}

export default function ModalComparacao({ aberto, aoFechar }: ModalComparacaoProps) {
  const { 
    itens, 
    remover 
  } = useComparacaoStore();

  if (!aberto) {
    return null;
  }

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 font-sans backdrop-blur-sm transition-opacity"
    >
      <div 
        className="w-full max-w-5xl rounded-2xl bg-white shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        
        {/* Cabeçalho do Modal */}
        <div 
          className="bg-gray-900 px-6 py-4 flex justify-between items-center shrink-0 border-b border-gray-800"
        >
          <h2 
            className="text-xl font-black text-white flex items-center gap-2 tracking-tight"
          >
            <span>
              ⚖️
            </span> 
            Comparação de Produtos
          </h2>
          
          <button 
            onClick={aoFechar} 
            className="text-gray-400 hover:text-white transition-colors text-3xl leading-none h-8 w-8 flex items-center justify-center rounded-full hover:bg-gray-800"
            title="Fechar Comparação"
          >
            &times;
          </button>
        </div>

        {/* Corpo do Modal (Comparativo) */}
        <div 
          className="p-6 overflow-y-auto flex-1 custom-scrollbar bg-gray-50"
        >
          {itens.length === 0 ? (
            <div 
              className="flex flex-col items-center justify-center py-20 text-center"
            >
              <span 
                className="text-6xl mb-4 opacity-40 grayscale"
              >
                🤷‍♂️
              </span>
              <h3 
                className="text-xl font-bold text-gray-700"
              >
                Nenhum produto selecionado
              </h3>
              <p 
                className="text-gray-500 mt-2"
              >
                Feche o modal e adicione produtos para comparar.
              </p>
              
              <button 
                onClick={aoFechar}
                className="mt-6 rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white transition-all hover:bg-blue-700 active:scale-95 shadow-md"
              >
                Voltar para a Loja
              </button>
            </div>
          ) : (
            <div 
              className={`grid grid-cols-1 gap-6 sm:grid-cols-2 ${itens.length === 3 ? 'lg:grid-cols-3' : 'lg:grid-cols-2'}`}
            >
              {itens.map((item) => (
                <div 
                  key={item.id} 
                  className="flex flex-col rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden relative"
                >
                  
                  {/* Botão Remover Produto da Comparação */}
                  <button 
                    onClick={() => remover(item.id)}
                    className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-red-500 font-bold shadow-md hover:bg-red-500 hover:text-white transition-colors border border-gray-100"
                    title="Remover produto da comparação"
                  >
                    X
                  </button>

                  {/* Foto do Produto */}
                  <div 
                    className="aspect-square w-full bg-gray-100 relative overflow-hidden"
                  >
                    {item.imagem ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img 
                        src={item.imagem} 
                        alt={item.nome} 
                        className="h-full w-full object-cover" 
                      />
                    ) : (
                      <div 
                        className="flex h-full w-full items-center justify-center"
                      >
                        <span 
                          className="text-6xl opacity-20 grayscale"
                        >
                          📱
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Informações Comparativas */}
                  <div 
                    className="flex flex-col flex-1 p-5"
                  >
                    
                    {/* Nome e Preço */}
                    <div 
                      className="border-b border-gray-100 pb-4 mb-4"
                    >
                      <h3 
                        className="text-sm font-bold text-gray-800 line-clamp-2 min-h-[2.5rem] mb-2"
                      >
                        {item.nome}
                      </h3>
                      <p 
                        className="text-2xl font-black text-green-600"
                      >
                        {new Intl.NumberFormat('pt-BR', { 
                          style: 'currency', 
                          currency: 'BRL' 
                        }).format(item.preco)}
                      </p>
                    </div>

                    {/* Especificações Técnicas */}
                    <div 
                      className="space-y-3 flex-1"
                    >
                      
                      <div 
                        className="flex flex-col"
                      >
                        <span 
                          className="text-[10px] font-bold uppercase text-gray-400 tracking-wider mb-0.5"
                        >
                          Marca
                        </span>
                        <span 
                          className="text-sm font-semibold text-gray-800"
                        >
                          {item.especificacoes_tecnicas?.marca || '-'}
                        </span>
                      </div>
                      
                      <div 
                        className="flex flex-col"
                      >
                        <span 
                          className="text-[10px] font-bold uppercase text-gray-400 tracking-wider mb-0.5"
                        >
                          Material
                        </span>
                        <span 
                          className="text-sm font-semibold text-gray-800"
                        >
                          {item.especificacoes_tecnicas?.material || '-'}
                        </span>
                      </div>
                      
                      <div 
                        className="flex flex-col"
                      >
                        <span 
                          className="text-[10px] font-bold uppercase text-gray-400 tracking-wider mb-0.5"
                        >
                          Cor
                        </span>
                        <span 
                          className="text-sm font-semibold text-gray-800"
                        >
                          {item.especificacoes_tecnicas?.cor || '-'}
                        </span>
                      </div>
                      
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
