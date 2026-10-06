'use client';

import { useEffect, useState } from 'react';
import { 
  collection, 
  onSnapshot, 
  query, 
  orderBy, 
  doc, 
  setDoc, 
  serverTimestamp 
} from 'firebase/firestore';
import { bancoDeDados } from '@/lib/firebase/config';
import { useComparacaoStore } from '@/store/useComparacaoStore';
import { useCarrinhoO2OStore } from '@/store/useCarrinhoO2OStore';
import Link from 'next/link';
import ModalComparacao from '@/components/modulos/loja/ModalComparacao';
import { gerarIdComanda } from '@/lib/utils/geradorIdComanda';

interface ProdutoVitrine {
  id: string;
  nome: string;
  preco: number;
  saldo_estoque: number;
  sku: string;
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
  const [produtos, setProdutos] = useState<ProdutoVitrine[]>([]);
  
  const [configuracoes, setConfiguracoes] = useState<ConfiguracoesCMS>({
    whatsapp_loja: '5533999999999',
    banners_vitrine_urls: [],
    desconto_pix_percentual: 10,
  });
  
  // Estados da Loja
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  
  // Estados de UI
  const [modalComparacaoAberto, setModalComparacaoAberto] = useState(false);
  const [drawerCarrinhoAberto, setDrawerCarrinhoAberto] = useState(false);
  
  // Estados do Checkout
  const [nomeClienteCheckout, setNomeClienteCheckout] = useState('');
  const [carregandoCheckout, setCarregandoCheckout] = useState(false);
  const [erroCarrinho, setErroCarrinho] = useState<string | null>(null);

  // Stores
  const { 
    itens: itensComparacao, 
    adicionar: adicionarComparacao, 
    remover: removerComparacao 
  } = useComparacaoStore();

  const {
    itens: itensCarrinho,
    adicionarItem: adicionarAoCarrinho,
    removerItem: removerDoCarrinho,
    alterarQuantidade,
    limparCarrinho
  } = useCarrinhoO2OStore();

  useEffect(() => {
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
            sku: data.sku || 'N/A',
            midia_urls: data.midia_urls || [],
            especificacoes_tecnicas: data.especificacoes_tecnicas || {},
          };
        }) as ProdutoVitrine[];
        
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

  const lidarComAdicaoCarrinho = (produto: ProdutoVitrine) => {
    adicionarAoCarrinho({
      id: produto.id,
      nome: produto.nome,
      preco: produto.preco,
      sku: produto.sku,
      imagem: produto.midia_urls?.[0],
    });
    setDrawerCarrinhoAberto(true);
  };

  const valorTotalCarrinho = itensCarrinho.reduce(
    (acc, curr) => acc + (curr.preco * curr.quantidade), 
    0
  );

  const lidarComCheckoutO2O = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (itensCarrinho.length === 0) {
      setErroCarrinho('O carrinho está vazio.');
      return;
    }
    
    if (!nomeClienteCheckout.trim()) {
      setErroCarrinho('Por favor, informe o seu nome para prosseguirmos com o pedido.');
      return;
    }

    setCarregandoCheckout(true);
    setErroCarrinho(null);

    try {
      // Geração do ID Inteligente (O2O)
      const sequenciaAleatoriaDia = Math.floor(Math.random() * 999) + 1;
      const idInteligente = gerarIdComanda('Loja Virtual', sequenciaAleatoriaDia);

      const payloadComanda = {
        fluxo_operacional: 'Venda Online (O2O)',
        status_atual: 'Aguardando Cliente (WhatsApp)',
        cor_hexadecimal: '#10B981', 
        valor_total: valorTotalCarrinho,
        itens: itensCarrinho.map(item => ({
          id_produto: item.id,
          nome: item.nome,
          preco_unitario: item.preco,
          quantidade: item.quantidade,
          sku: item.sku
        })),
        dados_cliente: {
          nome: nomeClienteCheckout.trim(),
          telefone: 'Contato via WhatsApp Externo'
        },
        auditoria: {
          criado_por_nome: 'Cliente (Autoatendimento O2O)',
          criado_em: serverTimestamp(),
        }
      };

      // Gravação forçando o Custom ID
      await setDoc(doc(bancoDeDados, 'comandas', idInteligente), payloadComanda);

      const saudacao = `Olá We Have! 👋 Me chamo *${nomeClienteCheckout.trim()}* e acabei de montar um pedido no site.\n\n*🛒 MEU PEDIDO (ID: ${idInteligente}):*\n`;
      
      const listaItens = itensCarrinho.map(item => 
        `- ${item.quantidade}x ${item.nome} (SKU: ${item.sku})`
      ).join('\n');

      const precoFormatado = new Intl.NumberFormat('pt-BR', { 
        style: 'currency', 
        currency: 'BRL' 
      }).format(valorTotalCarrinho);
      
      const fechamento = `\n\n*💰 Valor Total: ${precoFormatado}*\n\nComo podemos prosseguir com o pagamento e entrega?`;

      const textoWhatsApp = encodeURIComponent(saudacao + listaItens + fechamento);
      const numeroLoja = configuracoes.whatsapp_loja.replace(/\D/g, '') || '5533999999999';

      limparCarrinho();
      setDrawerCarrinhoAberto(false);
      setNomeClienteCheckout('');
      
      window.open(
        `https://wa.me/${numeroLoja}?text=${textoWhatsApp}`, 
        '_blank', 
        'noopener,noreferrer'
      );

    } catch (err: any) {
      console.error('[ERRO CHECKOUT O2O]', err);
      setErroCarrinho(`Falha ao processar o pedido: ${err.message}`);
    } finally {
      setCarregandoCheckout(false);
    }
  };

  return (
    <div 
      className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 relative pb-28"
    >
      
      {/* Carrossel Dinâmico */}
      {configuracoes.banners_vitrine_urls.length > 0 && (
        <div 
          className="mb-8 sm:mb-12 flex w-full overflow-x-auto snap-x snap-mandatory gap-4 rounded-xl sm:rounded-2xl shadow-lg custom-scrollbar bg-gray-100 border border-gray-200"
        >
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
      <div 
        className="mb-6 flex items-center justify-between"
      >
        <h2 
          className="text-xl sm:text-2xl font-black tracking-tight text-gray-900"
        >
          Catálogo Disponível
        </h2>
        <span 
          className="text-xs sm:text-sm font-semibold text-gray-500"
        >
          {produtos.length} produtos
        </span>
      </div>

      {/* Regra Anti-Silêncio */}
      {erro && (
        <div 
          className="mb-8 rounded-xl border-l-4 border-red-500 bg-red-50 p-4 font-semibold text-red-700 shadow-sm"
        >
          ⚠️ {erro}
        </div>
      )}

      {carregando ? (
        <div 
          className="flex h-64 items-center justify-center"
        >
          <div 
            className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"
          >
          </div>
        </div>
      ) : produtos.length === 0 && !erro ? (
        <div 
          className="flex h-64 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50 text-center p-6"
        >
          <span 
            className="text-5xl mb-4"
          >
            🥺
          </span>
          <h3 
            className="text-lg sm:text-xl font-bold text-gray-700"
          >
            Poxa, estamos sem estoque!
          </h3>
          <p 
            className="text-gray-500 mt-2 text-sm"
          >
            Nenhum produto disponível no momento. Volte mais tarde.
          </p>
        </div>
      ) : (
        
        /* Grid de Produtos (2 colunas mobile) */
        <div 
          className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 sm:gap-6"
        >
          {produtos.map((produto) => {
            const fatorDesconto = 1 - (configuracoes.desconto_pix_percentual / 100);
            const precoAVista = produto.preco * fatorDesconto;
            const primeiraImagem = produto.midia_urls?.[0] || null;
            const noComparador = !!itensComparacao.find(i => i.id === produto.id);

            return (
              <div 
                key={produto.id} 
                className="group flex flex-col overflow-hidden rounded-xl sm:rounded-2xl border border-gray-200 bg-white shadow-sm transition-all hover:shadow-xl relative"
              >
                
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
                    <span 
                      className="text-4xl sm:text-6xl opacity-30 grayscale transition-transform group-hover:scale-110 group-hover:opacity-100"
                    >
                      📱
                    </span>
                  )}
                  
                  {produto.saldo_estoque <= 3 && (
                    <span 
                      className="absolute left-2 top-2 sm:left-3 sm:top-3 rounded bg-red-600 px-1.5 py-0.5 sm:px-2 sm:py-1 text-[10px] sm:text-xs font-black text-white shadow-md"
                    >
                      ÚLTIMAS {produto.saldo_estoque}
                    </span>
                  )}
                </Link>

                <div 
                  className="flex flex-1 flex-col p-3 sm:p-5"
                >
                  <Link 
                    href={`/produto/${produto.id}`}
                  >
                    <h3 
                      className="mb-2 sm:mb-4 line-clamp-2 min-h-[2.5rem] sm:min-h-[3rem] text-xs sm:text-sm font-bold text-gray-800 transition-colors group-hover:text-blue-700 leading-snug"
                    >
                      {produto.nome}
                    </h3>
                  </Link>
                  
                  <div 
                    className="mt-auto"
                  >
                    <p 
                      className="text-[10px] sm:text-xs font-medium text-gray-500 line-through"
                    >
                      De: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(produto.preco)}
                    </p>
                    
                    <div 
                      className="flex flex-wrap items-end gap-1.5 sm:gap-2"
                    >
                      <p 
                        className="text-lg sm:text-2xl font-black text-green-600 leading-none"
                      >
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(precoAVista)}
                      </p>
                      
                      {configuracoes.desconto_pix_percentual > 0 && (
                        <span 
                          className="mb-0.5 rounded bg-green-100 px-1 sm:px-1.5 py-0.5 text-[9px] sm:text-[10px] font-bold text-green-700 whitespace-nowrap"
                        >
                          -{configuracoes.desconto_pix_percentual}% PIX
                        </span>
                      )}
                    </div>
                    
                    <div 
                      className="flex flex-col gap-2 mt-3 sm:mt-4"
                    >
                      <button 
                        onClick={() => lidarComAdicaoCarrinho(produto)} 
                        className="w-full rounded-lg sm:rounded-xl bg-blue-600 py-2 sm:py-3 text-xs sm:text-sm font-black text-white transition hover:bg-blue-700 active:scale-[0.98] shadow-md flex items-center justify-center gap-1 sm:gap-2"
                      >
                        <span 
                          className="text-sm sm:text-lg"
                        >
                          🛒
                        </span> 
                        + Carrinho
                      </button>
                      
                      <label 
                        className="flex w-full items-center justify-center gap-1 sm:gap-2 rounded-lg sm:rounded-xl border border-gray-300 py-2 sm:py-2.5 text-[10px] sm:text-xs font-bold text-gray-700 cursor-pointer hover:bg-gray-50 transition-colors text-center"
                      >
                        <input 
                          type="checkbox" 
                          checked={noComparador} 
                          onChange={() => alternarComparacao(produto)} 
                          className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600 rounded focus:ring-blue-500" 
                        />
                        {noComparador ? 'Adicionado' : 'Comparar'}
                      </label>
                    </div>
                    
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* Widget Flutuante Combinado (Carrinho + Comparador) */}
      {(itensCarrinho.length > 0 || itensComparacao.length > 0) && (
        <div 
          className="fixed bottom-0 left-0 right-0 z-40 bg-gray-900 text-white shadow-[0_-10px_40px_rgba(0,0,0,0.2)] border-t border-gray-800 animate-slide-up"
        >
          <div 
            className="mx-auto max-w-7xl px-4 py-3 sm:py-4 sm:px-6 lg:px-8 flex items-center justify-between gap-2"
          >
            
            <div 
              className="flex items-center gap-4"
            >
              {itensCarrinho.length > 0 && (
                <button
                  onClick={() => setDrawerCarrinhoAberto(true)}
                  className="flex items-center gap-3 transition-transform hover:scale-105"
                >
                  <span 
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-600 text-lg font-black shadow-inner border-2 border-blue-400"
                  >
                    {itensCarrinho.length}
                  </span>
                  <div 
                    className="hidden sm:block text-left"
                  >
                    <p 
                      className="font-bold text-sm"
                    >
                      Carrinho de Compras
                    </p>
                    <p 
                      className="text-xs text-blue-300"
                    >
                      Ver itens e finalizar
                    </p>
                  </div>
                </button>
              )}

              {itensComparacao.length > 0 && (
                <div 
                  className={`flex items-center gap-3 ${itensCarrinho.length > 0 ? 'hidden md:flex pl-4 border-l border-gray-700' : ''}`}
                >
                  <span 
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-700 text-lg font-black shadow-inner"
                  >
                    {itensComparacao.length}
                  </span>
                  <div 
                    className="hidden lg:block text-left"
                  >
                    <p 
                      className="font-bold text-sm"
                    >
                      Na Comparação
                    </p>
                  </div>
                </div>
              )}
            </div>
            
            <div 
              className="flex items-center gap-2"
            >
              {itensComparacao.length > 0 && (
                <button 
                  onClick={() => setModalComparacaoAberto(true)} 
                  className="rounded-lg bg-gray-700 px-4 py-2 sm:px-4 sm:py-2.5 text-xs sm:text-sm font-black text-white hover:bg-gray-600 shadow-md transition-colors active:scale-95 whitespace-nowrap"
                >
                  ⚖️ <span className="hidden sm:inline">Comparar</span>
                </button>
              )}
              
              {itensCarrinho.length > 0 && (
                <button 
                  onClick={() => setDrawerCarrinhoAberto(true)} 
                  className="rounded-lg sm:rounded-xl bg-white px-4 py-2 sm:px-6 sm:py-2.5 text-xs sm:text-sm font-black text-gray-900 hover:bg-gray-100 shadow-md transition-colors active:scale-95 whitespace-nowrap"
                >
                  Ver Carrinho 🛒
                </button>
              )}
            </div>
            
          </div>
        </div>
      )}

      {/* Renderização do Drawer do Carrinho */}
      {drawerCarrinhoAberto && (
        <div 
          className="fixed inset-0 z-50 flex justify-end font-sans"
        >
          {/* Overlay Escuro */}
          <div 
            onClick={() => setDrawerCarrinhoAberto(false)}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
          >
          </div>
          
          {/* Painel Deslizante Direito */}
          <div 
            className="relative z-10 w-full max-w-md bg-white shadow-2xl flex flex-col h-full animate-[slideInRight_0.3s_ease-out_forwards]"
          >
            
            <div 
              className="flex items-center justify-between px-6 py-5 border-b border-gray-100 bg-gray-900 text-white shrink-0"
            >
              <h2 
                className="text-lg font-black flex items-center gap-2"
              >
                <span>
                  🛒
                </span> 
                O Meu Carrinho
              </h2>
              <button 
                onClick={() => setDrawerCarrinhoAberto(false)}
                className="text-gray-400 hover:text-white transition-colors text-2xl leading-none"
              >
                &times;
              </button>
            </div>

            <div 
              className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-gray-50"
            >
              
              {erroCarrinho && (
                <div 
                  className="mb-4 rounded-lg border-l-4 border-red-500 bg-red-50 p-3 text-sm font-semibold text-red-700 shadow-sm"
                >
                  ⚠️ {erroCarrinho}
                </div>
              )}

              {itensCarrinho.length === 0 ? (
                <div 
                  className="flex flex-col items-center justify-center py-20 text-center"
                >
                  <span 
                    className="text-6xl mb-4 grayscale opacity-30"
                  >
                    🛒
                  </span>
                  <p 
                    className="text-gray-500 font-medium"
                  >
                    O seu carrinho está vazio.
                  </p>
                </div>
              ) : (
                <div 
                  className="space-y-4"
                >
                  {itensCarrinho.map(item => (
                    <div 
                      key={item.id} 
                      className="flex flex-col rounded-xl bg-white border border-gray-200 p-4 shadow-sm"
                    >
                      <div 
                        className="flex justify-between items-start gap-3 mb-3"
                      >
                        <div 
                          className="w-12 h-12 shrink-0 rounded bg-gray-100 flex items-center justify-center border border-gray-200 overflow-hidden"
                        >
                          {item.imagem ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img 
                              src={item.imagem} 
                              alt={item.nome} 
                              className="w-full h-full object-cover" 
                            />
                          ) : (
                            <span 
                              className="text-lg grayscale opacity-40"
                            >
                              📱
                            </span>
                          )}
                        </div>
                        <div 
                          className="flex-1"
                        >
                          <p 
                            className="text-[10px] font-mono text-gray-400 mb-0.5 leading-none"
                          >
                            {item.sku}
                          </p>
                          <h4 
                            className="text-xs font-bold text-gray-800 line-clamp-2 leading-tight"
                          >
                            {item.nome}
                          </h4>
                        </div>
                        <button 
                          type="button"
                          onClick={() => removerDoCarrinho(item.id)}
                          className="text-red-400 hover:text-red-600 transition-colors w-6 h-6 flex items-center justify-center bg-red-50 rounded"
                        >
                          &times;
                        </button>
                      </div>

                      <div 
                        className="flex justify-between items-center"
                      >
                        <div 
                          className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 px-2 py-1"
                        >
                          <button 
                            type="button" 
                            onClick={() => alterarQuantidade(item.id, -1)}
                            className="text-gray-500 hover:text-gray-900 font-bold"
                          >
                            -
                          </button>
                          <span 
                            className="text-xs font-bold text-gray-800 w-4 text-center"
                          >
                            {item.quantidade}
                          </span>
                          <button 
                            type="button" 
                            onClick={() => alterarQuantidade(item.id, 1)}
                            className="text-gray-500 hover:text-gray-900 font-bold"
                          >
                            +
                          </button>
                        </div>
                        <p 
                          className="text-sm font-black text-green-700"
                        >
                          {new Intl.NumberFormat('pt-BR', { 
                            style: 'currency', 
                            currency: 'BRL' 
                          }).format(item.preco * item.quantidade)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {itensCarrinho.length > 0 && (
              <form 
                onSubmit={lidarComCheckoutO2O} 
                className="border-t border-gray-200 bg-white p-6 shrink-0 shadow-[0_-10px_30px_rgba(0,0,0,0.05)]"
              >
                
                <div 
                  className="mb-4"
                >
                  <label 
                    className="block text-xs font-bold text-gray-700 mb-1"
                  >
                    Seu Nome Completo *
                  </label>
                  <input 
                    required
                    type="text"
                    value={nomeClienteCheckout}
                    onChange={(e) => setNomeClienteCheckout(e.target.value)}
                    placeholder="Como devemos chamá-lo?"
                    className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition bg-gray-50"
                  />
                </div>

                <div 
                  className="flex justify-between items-center mb-4 pt-2 border-t border-gray-100"
                >
                  <span 
                    className="text-sm font-bold text-gray-500"
                  >
                    Total do Pedido
                  </span>
                  <span 
                    className="text-2xl font-black text-gray-900"
                  >
                    {new Intl.NumberFormat('pt-BR', { 
                      style: 'currency', 
                      currency: 'BRL' 
                    }).format(valorTotalCarrinho)}
                  </span>
                </div>

                <button 
                  type="submit" 
                  disabled={carregandoCheckout} 
                  className="w-full rounded-xl bg-green-600 px-6 py-4 text-sm font-black text-white transition-all hover:bg-green-700 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-md flex items-center justify-center gap-2"
                >
                  {carregandoCheckout ? (
                    <>
                      <div 
                        className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"
                      >
                      </div>
                      A GERAR PEDIDO...
                    </>
                  ) : (
                    <>
                      <span 
                        className="text-lg"
                      >
                        💬
                      </span> 
                      FINALIZAR VIA WHATSAPP
                    </>
                  )}
                </button>
                <p 
                  className="text-center text-[10px] text-gray-400 mt-3"
                >
                  O seu pedido será enviado diretamente para a nossa equipa.
                </p>

              </form>
            )}

          </div>
        </div>
      )}

      {/* Modal de Comparação Lateral */}
      <ModalComparacao 
        aberto={modalComparacaoAberto} 
        aoFechar={() => setModalComparacaoAberto(false)} 
      />

    </div>
  );
}
