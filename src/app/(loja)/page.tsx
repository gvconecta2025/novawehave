'use client';

import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, orderBy, doc } from 'firebase/firestore';
import { bancoDeDados } from '@/lib/firebase/config';

interface ProdutoVitrine {
  id: string;
  nome: string;
  preco: number;
  saldo_estoque: number;
}

interface ConfiguracoesCMS {
  whatsapp_loja: string;
  banner_promocional_texto: string;
  desconto_pix_percentual: number;
}

export default function HomeLoja() {
  const [produtos, setProdutos] = useState<ProdutoVitrine[]>([]);
  const [configuracoes, setConfiguracoes] = useState<ConfiguracoesCMS>({
    whatsapp_loja: '5533999999999', // Fallback seguro
    banner_promocional_texto: 'Lançamentos Exclusivos - Tudo para proteger e potencializar o seu aparelho.',
    desconto_pix_percentual: 10, // 10% padrão
  });
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    // 1. Busca Reativa dos Produtos
    const qProdutos = query(collection(bancoDeDados, 'produtos'), orderBy('nome', 'asc'));
    const desinscreverProdutos = onSnapshot(
      qProdutos,
      (snapshot) => {
        const dados = snapshot.docs.map((d) => ({
          id: d.id,
          nome: d.data().nome,
          preco: d.data().preco,
          saldo_estoque: d.data().saldo_estoque || 0,
        })) as ProdutoVitrine[];
        
        const produtosEmEstoque = dados.filter(p => p.saldo_estoque > 0);
        setProdutos(produtosEmEstoque);
        setCarregando(false);
      },
      (err) => {
        console.error('[ERRO VITRINE PÚBLICA]', err);
        setErro('Não foi possível carregar o catálogo neste momento. Tente atualizar a página.');
        setCarregando(false);
      }
    );

    // 2. Busca Reativa do CMS (Data-Driven UI)
    const desinscreverCMS = onSnapshot(
      doc(bancoDeDados, 'configuracoes', 'geral'),
      (snapshot) => {
        if (snapshot.exists()) {
          const dadosCMS = snapshot.data();
          setConfiguracoes({
            whatsapp_loja: dadosCMS.whatsapp_loja || '5533999999999',
            banner_promocional_texto: dadosCMS.banner_promocional_texto || 'Lançamentos Exclusivos - Tudo para proteger o seu aparelho.',
            desconto_pix_percentual: typeof dadosCMS.desconto_pix_percentual === 'number' ? dadosCMS.desconto_pix_percentual : 10,
          });
        }
      }
    );

    return () => {
      desinscreverProdutos();
      desinscreverCMS();
    };
  }, []);

  // Omnichannel O2O com Variável Dinâmica do CMS
  const lidarComCompraO2O = (produto: ProdutoVitrine) => {
    const numeroLoja = configuracoes.whatsapp_loja;
    const precoFormatado = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(produto.preco);
    
    const texto = `Olá We Have! 👋\n\nTenho interesse em comprar o produto:\n*${produto.nome}*\n\nVi no site por ${precoFormatado}. Como podemos fechar a compra?`;
    const url = `https://wa.me/${numeroLoja}?text=${encodeURIComponent(texto)}`;
    
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      
      {/* Banner Promocional CMS Dinâmico */}
      <div className="mb-12 flex h-48 w-full flex-col items-center justify-center rounded-2xl bg-gradient-to-r from-blue-700 to-indigo-800 p-6 text-center shadow-lg md:h-64">
        <h2 className="mb-2 text-2xl font-black text-white sm:text-4xl">Novidades We Have</h2>
        <p className="text-sm font-medium text-blue-100 sm:text-lg">
          {configuracoes.banner_promocional_texto}
        </p>
      </div>

      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-black tracking-tight text-gray-900">Destaques da Loja</h2>
        <span className="text-sm font-semibold text-gray-500">{produtos.length} produtos</span>
      </div>

      {/* Regra Anti-Silêncio Local */}
      {erro && (
        <div className="mb-8 rounded-md border-l-4 border-red-500 bg-red-50 p-4 font-semibold text-red-700 shadow-sm">
          ⚠️ {erro}
        </div>
      )}

      {carregando ? (
        <div className="flex h-64 w-full flex-col items-center justify-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
          <p className="text-gray-500 font-medium">Carregando catálogo...</p>
        </div>
      ) : produtos.length === 0 && !erro ? (
        <div className="flex h-64 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50 text-center">
          <span className="mb-4 text-5xl">🥺</span>
          <h3 className="text-xl font-bold text-gray-700">Poxa, estamos sem estoque!</h3>
          <p className="text-gray-500 mt-2">Nenhum produto disponível no momento. Volte mais tarde.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {produtos.map((produto) => {
            // Regra Matemática injetada via CMS
            const fatorDesconto = 1 - (configuracoes.desconto_pix_percentual / 100);
            const precoAVista = produto.preco * fatorDesconto;
            const parcela = produto.preco / 12;

            return (
              <div key={produto.id} className="group flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-all hover:shadow-xl">
                
                <div className="relative flex aspect-square w-full items-center justify-center bg-gray-100 transition-colors group-hover:bg-gray-200">
                  <span className="text-6xl opacity-50 grayscale transition-transform group-hover:scale-110 group-hover:opacity-100">📱</span>
                  
                  {produto.saldo_estoque <= 3 && (
                    <span className="absolute left-3 top-3 rounded bg-red-600 px-2 py-1 text-xs font-black text-white shadow-md">
                      ÚLTIMAS {produto.saldo_estoque}
                    </span>
                  )}
                </div>

                <div className="flex flex-1 flex-col p-5">
                  <h3 className="mb-4 line-clamp-2 min-h-[3rem] text-sm font-bold text-gray-800 transition-colors group-hover:text-blue-700">
                    {produto.nome}
                  </h3>
                  
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
                    <p className="mb-4 text-xs font-semibold text-gray-600">
                      ou até 12x de {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(parcela)}
                    </p>
                    
                    <button
                      onClick={() => lidarComCompraO2O(produto)}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-gray-900 py-3 text-sm font-bold text-white transition-all hover:bg-green-600 active:scale-[0.98]"
                    >
                      <span className="text-lg">💬</span> Comprar Agora
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
