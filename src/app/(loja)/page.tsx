'use client';

import { useEffect, useState } from 'react';
import { 
  collection, 
  onSnapshot, 
  query, 
  orderBy, 
  doc 
} from 'firebase/firestore';
import { bancoDeDados } from '@/lib/firebase/config';
import { 
  useComparacaoStore, 
  ItemComparacao 
} from '@/store/useComparacaoStore';
import Link from 'next/link';

interface ProdutoVitrine {
  id: string;
  nome: string;
  preco: number;
  saldo_estoque: number;
  midia_urls?: string[];
  especificacoes_tecnicas?: {
    marca?: string;
    material?: string;
    cor?: string;
  };
}

interface ConfiguracoesCMS {
  whatsapp_loja: string;
  banners_vitrine_urls: string[];
  desconto_pix_percentual: number;
}

export default function HomeLoja() {
  // Estados da Página
  const [produtos, setProdutos] = useState<ProdutoVitrine[]>([]);
  const [configuracoes, setConfiguracoes] = useState<ConfiguracoesCMS>({
    whatsapp_loja: '5533999999999',
    banners_vitrine_urls: [],
    desconto_pix_percentual: 10,
  });
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  // Store Global de Comparação
  const { 
    itens: itensComparacao, 
    adicionar: adicionarComparacao, 
    remover: removerComparacao 
  } = useComparacaoStore();

  useEffect(() => {
    // 1. Inscrição na Coleção de Produtos
    const qProdutos = query(
      collection(bancoDeDados, 'produtos'), 
      orderBy('nome', 'asc')
    );
    
    const desinscreverProdutos = onSnapshot(
      qProdutos,
      (snapshot) => {
        const dados = snapshot.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            nome: data.nome || 'Produto Sem Nome',
            preco: Number(data.preco) || 0,
            saldo_estoque: Number(data.saldo_estoque) || 0,
            midia_urls: data.midia_urls || [],
            especificacoes_tecnicas: data.especificacoes_tecnicas || {},
          };
        }) as ProdutoVitrine[];
        
        // Apenas produtos com saldo positivo aparecem na vitrine O2O
        const produtosEmEstoque = dados.filter(p => p.saldo_estoque > 0);
        setProdutos(produtosEmEstoque);
        setCarregando(false);
      },
      (err) => {
        console.error('[ERRO VITRINE]', err);
        setErro('Não foi possível carregar o catálogo neste momento.');
        setCarregando(false);
      }
    );

    // 2. Inscrição nas Configurações Globais (CMS)
    const desinscreverCMS = onSnapshot(
      doc(bancoDeDados, 'configuracoes', 'geral'),
      (snapshot) => {
        if (snapshot.exists()) {
          const dadosCMS = snapshot.data();
          setConfiguracoes({
            whatsapp_loja: dadosCMS.whatsapp_loja || '5533999999999',
            banners_vitrine_urls: dadosCMS.banners_vitrine_urls || [],
            desconto_pix_percentual: typeof dadosCMS.desconto_pix_percentual === 'number' 
              ? dadosCMS.desconto_pix_percentual 
              : 10,
          });
        }
      }
    );

    return () => {
      desinscreverProdutos();
      desinscreverCMS();
    };
  }, []);

  const lidarComCompraO2O = (produto: ProdutoVitrine) => {
    const numeroLoja = configuracoes.whatsapp_loja;
    const precoFormatado = new Intl.NumberFormat('pt-BR', { 
      style: 'currency', 
      currency: 'BRL' 
    }).format(produto.preco);
    
    const texto = `Olá We Have! 👋\n\nTenho interesse em comprar o produto:\n*${produto.nome}*\n\nVi no site por ${precoFormatado}. Como podemos fechar a compra?`;
    
    window.open(
      `https://wa.me/${numeroLoja}?text=${encodeURIComponent(texto)}`, 
      '_blank', 
      'noopener,noreferrer'
    );
  };

  const alternarComparacao = (produto: ProdutoVitrine) => {
    const estaNoComparador = itensComparacao.find(i => i.id === produto.id);
    
    if (estaNoComparador) {
      removerComparacao(produto.id);
    } else {
      adicionarComparacao({
        id: produto.id,
        nome: produto.nome,
        preco: produto.preco,
        imagem: produto.midia_urls?.[0],
        especificacoes_tecnicas: produto.especificacoes_tecnicas,
      });
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 relative pb-24">
      
      {/* Carrossel Dinâmico de Banners via CMS (Snap-X Nativo) */}
      {configuracoes.banners_vitrine_urls.length > 0 && (
        <div className="mb-12 flex w-full overflow-x-auto snap-x snap-mandatory gap-4 rounded-2xl shadow-lg custom-scrollbar bg-gray-100 border border-gray-200">
          {configuracoes.banners_vitrine_urls.map((url, idx) => (
            <div 
              key={idx} 
              className="shrink-0 w-full aspect-video sm:aspect-[3/1] lg:aspect-[4/1] snap-start relative"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img 
                src={url} 
                alt={`Destaque Promocional ${idx + 1}`} 
                className="w-full h-full object-cover" 
              />
            </div>
          ))}
        </div>
      )}

      {/* Cabeçalho da Vitrine */}
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-black tracking-tight text-gray-900">
          Catálogo Disponível
        </h2>
        <span className="text-sm font-semibold text-gray-500">
          {produtos.length} produtos em loja
        </span>
      </div>

      {/* Regra Anti-Silêncio */}
      {erro && (
        <div className="mb-8 rounded-xl border-l-4 border-red-500 bg-red-50 p-4 font-semibold text-red-700 shadow-sm">
          ⚠️ {erro}
        </div>
      )}

      {/* Estados de Carregamento e Vazio */}
      {carregando ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
        </div>
      ) : produtos.length === 0 && !erro ? (
        <div className="flex h-64 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50 text-center">
          <span className="text-5xl mb-4">
            🥺
          </span>
          <h3 className="text-xl font-bold text-gray-700">
            Poxa, estamos sem estoque!
          </h3>
          <p className="text-gray-500 mt-2">
            Nenhum produto disponível no momento. Volte mais tarde.
          </p>
        </div>
      ) : (
        
        /* Grid de Produtos */
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {produtos.map((produto) => {
            const fatorDesconto = 1 - (configuracoes.desconto_pix_percentual / 100);
            const precoAVista = produto.preco * fatorDesconto;
            const primeiraImagem = produto.midia_urls?.[0] || null;
            const noComparador = !!itensComparacao.find(i => i.id === produto.id);

            return (
              <div 
                key={produto.id} 
                className="group flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-all hover:shadow-xl relative"
              >
                
                {/* Imagem e Link do Produto */}
                <Link 
                  href={`/produto/${produto.id}`} 
                  className="relative flex aspect-square w-full items-center justify-center bg-gray-50 transition-colors group-hover:bg-gray-100 overflow-hidden"
                >
                  {primeiraImagem ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img 
                      src={primeiraImagem} 
                      alt={produto.nome} 
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" 
                    />
                  ) : (
                    <span className="text-6xl opacity-30 grayscale transition-transform group-hover:scale-110 group-hover:opacity-100">
                      📱
                    </span>
                  )}
                  
                  {produto.saldo_estoque <= 3 && (
                    <span className="absolute left-3 top-3 rounded bg-red-600 px-2 py-1 text-xs font-black text-white shadow-md">
                      ÚLTIMAS {produto.saldo_estoque}
                    </span>
                  )}
                </Link>

                {/* Detalhes e Ações */}
                <div className="flex flex-1 flex-col p-5">
                  
                  <Link href={`/produto/${produto.id}`}>
                    <h3 className="mb-4 line-clamp-2 min-h-[3rem] text-sm font-bold text-gray-800 transition-colors group-hover:text-blue-700">
                      {produto.nome}
                    </h3>
                  </Link>
                  
                  <div className="mt-auto">
                    
                    <p className="text-xs font-medium text-gray-500 line-through">
                      De: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(produto.preco)}
                    </p>
                    
                    <div className="flex items-end gap-2">
                      <p className="text-2xl font-black text-green-600">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(precoAVista)}
                      </p>
                      
                      {configuracoes.desconto_pix_percentual > 0 && (
                        <span className="mb-1 rounded bg-green-100 px-1.5 py-0.5 text-[10px] font-bold text-green-700">
                          -{configuracoes.desconto_pix_percentual}% PIX
                        </span>
                      )}
                    </div>
                    
                    <div className="flex flex-col gap-2 mt-4">
                      
                        <button 
                          onClick={() => lidarComCompraO2O(produto)} 
                          className="w-full rounded-xl bg-gray-900 py-3 text-sm font-black text-white transition hover:bg-green-600 active:scale-[0.98] shadow-md flex items-center justify-center gap-2"
                        >
                          <span className="text-lg">
                            💬
                          </span> 
                          Comprar Agora
                        </button>
                      
                      <label className="flex w-full items-center justify-center gap-2 rounded-xl border border-gray-300 py-2.5 text-xs font-bold text-gray-700 cursor-pointer hover:bg-gray-50 transition-colors">
                        <input 
                          type="checkbox" 
                          checked={noComparador} 
                          onChange={() => alternarComparacao(produto)} 
                          className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500" 
                        />
                        {noComparador ? 'Adicionado à Comparação' : 'Comparar Produto'}
                      </label>
                      
                    </div>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* Widget Flutuante de Comparação */}
      {itensComparacao.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-gray-900 text-white shadow-[0_-10px_40px_rgba(0,0,0,0.2)] border-t border-gray-800 animate-slide-up">
          <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-lg font-black shadow-inner">
                {itensComparacao.length}
              </span>
              <div>
                <p className="font-bold text-sm sm:text-base">
                  Produtos para comparação
                </p>
                <p className="text-xs text-gray-400">
                  Limite de 3 simultâneos.
                </p>
              </div>
            </div>
            
            <button 
              onClick={() => alert('Modal de Comparação (Próximo Briefing)')} 
              className="rounded-xl bg-white px-6 py-2.5 text-sm font-black text-gray-900 hover:bg-gray-100 shadow-md transition-colors active:scale-95"
            >
              Ver Comparação ⚖️
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
