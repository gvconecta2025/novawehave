'use client';

import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { bancoDeDados } from '@/lib/firebase/config';
import Link from 'next/link';

interface DetalheProduto {
  id: string;
  nome: string;
  descricao: string;
  preco: number;
  saldo_estoque: number;
  midia_urls?: string[];
  video_url?: string;
  especificacoes_tecnicas?: {
    marca?: string;
    material?: string;
    cor?: string;
  };
}

interface ConfiguracoesCMS {
  whatsapp_loja: string;
  desconto_pix_percentual: number;
}

export default function PaginaProdutoLanding({ params }: { params: { id: string } }) {
  const [produto, setProduto] = useState<DetalheProduto | null>(null);
  const [configuracoes, setConfiguracoes] = useState<ConfiguracoesCMS>({
    whatsapp_loja: '5533999999999',
    desconto_pix_percentual: 10,
  });
  
  const [imagemAtiva, setImagemAtiva] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  
  useEffect(() => {
    const buscarDados = async () => {
      try {
        const [docSnapProduto, docSnapConfig] = await Promise.all([
          getDoc(doc(bancoDeDados, 'produtos', params.id)),
          getDoc(doc(bancoDeDados, 'configuracoes', 'geral'))
        ]);

        if (docSnapProduto.exists()) {
          const dataProd = docSnapProduto.data();
          setProduto({
            id: docSnapProduto.id,
            nome: dataProd.nome || 'Produto Sem Nome',
            descricao: dataProd.descricao || 'Nenhuma descrição detalhada fornecida.',
            preco: Number(dataProd.preco) || 0,
            saldo_estoque: Number(dataProd.saldo_estoque) || 0,
            midia_urls: dataProd.midia_urls || [],
            video_url: dataProd.video_url || '',
            especificacoes_tecnicas: dataProd.especificacoes_tecnicas || {},
          });
          
          if (dataProd.midia_urls && dataProd.midia_urls.length > 0) {
            setImagemAtiva(dataProd.midia_urls[0]);
          }
        } else {
          setErro('Produto não encontrado ou removido do catálogo.');
        }

        if (docSnapConfig.exists()) {
          const dataConfig = docSnapConfig.data();
          setConfiguracoes({
            whatsapp_loja: dataConfig.whatsapp_loja || '5533999999999',
            desconto_pix_percentual: typeof dataConfig.desconto_pix_percentual === 'number' ? dataConfig.desconto_pix_percentual : 10,
          });
        }

      } catch (err: any) {
        console.error('[ERRO PRODUTO DINÂMICO]', err);
        setErro(`Ocorreu um erro ao carregar o produto: ${err.message}`);
      } finally {
        setCarregando(false);
      }
    };

    buscarDados();
  }, [params.id]);

  const extrairIdYoutube = (url: string) => {
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const match = url.match(regex);
    return match ? match[1] : null;
  };

  const lidarComCompraO2O = () => {
    if (!produto) return;
    const numeroLoja = configuracoes.whatsapp_loja; 
    const precoFormatado = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(produto.preco);
    const texto = `Olá We Have! 👋\n\nEstou a ver o produto *${produto.nome}* no site por ${precoFormatado}.\nGostaria de fechar a compra. Podemos prosseguir?`;
    window.open(`https://wa.me/${numeroLoja}?text=${encodeURIComponent(texto)}`, '_blank', 'noopener,noreferrer');
  };

  if (carregando) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
        <p className="font-medium text-gray-500">A carregar Landing Page...</p>
      </div>
    );
  }

  if (erro || !produto) {
    return (
      <div className="mx-auto mt-12 flex max-w-2xl flex-col items-center justify-center rounded-2xl bg-red-50 p-12 text-center border border-red-100">
        <span className="mb-4 text-5xl">🚫</span>
        <h2 className="mb-2 text-2xl font-bold text-red-800">Oops!</h2>
        <p className="text-red-600 mb-6">{erro}</p>
        <Link href="/" className="rounded-lg bg-red-600 px-6 py-2 font-bold text-white transition hover:bg-red-700">
          Voltar para a Vitrine
        </Link>
      </div>
    );
  }

  const fatorDesconto = 1 - (configuracoes.desconto_pix_percentual / 100);
  const precoAVista = produto.preco * fatorDesconto;
  const parcela = produto.preco / 12;
  const youtubeId = produto.video_url ? extrairIdYoutube(produto.video_url) : null;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 bg-white pb-20">
      
      {/* Breadcrumb Otimizado */}
      <nav className="mb-8 flex text-xs font-bold uppercase tracking-wider text-gray-400">
        <Link href="/" className="hover:text-blue-600 transition">Vitrine Principal</Link>
        <span className="mx-2">/</span>
        <span className="text-gray-800 line-clamp-1">{produto.nome}</span>
      </nav>

      <div className="grid grid-cols-1 gap-12 lg:grid-cols-2">
        
        {/* COLUNA 1: Apresentação Rica (Galeria Mobile-First) */}
        <div className="flex flex-col gap-4">
          
          {/* Imagem Principal (Hero) */}
          <div className="relative flex aspect-square w-full items-center justify-center rounded-3xl bg-gray-50 border border-gray-100 overflow-hidden shadow-sm">
            {imagemAtiva ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={imagemAtiva} alt={produto.nome} className="h-full w-full object-contain p-4 transition-opacity duration-300" />
            ) : (
              <span className="text-9xl opacity-10 grayscale">📦</span>
            )}
          </div>

          {/* Carrossel de Miniaturas (Scroll-Snap no Mobile) */}
          {produto.midia_urls && produto.midia_urls.length > 1 && (
            <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory py-2 custom-scrollbar">
              {produto.midia_urls.map((url, idx) => (
                <button 
                  key={idx} 
                  onClick={() => setImagemAtiva(url)}
                  className={`relative h-20 w-20 shrink-0 snap-start rounded-xl border-2 overflow-hidden transition-all ${
                    imagemAtiva === url ? 'border-blue-600 shadow-md scale-105' : 'border-gray-200 opacity-60 hover:opacity-100'
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt={`Thumbnail ${idx}`} className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* COLUNA 2: Motor de Conversão O2O e Ficha Técnica */}
        <div className="flex flex-col">
          <h1 className="mb-2 text-3xl font-black text-gray-900 sm:text-4xl md:text-5xl leading-tight">{produto.nome}</h1>
          
          <div className="mb-6 flex items-center gap-3">
            <span className={`inline-flex rounded-md px-3 py-1 text-xs font-bold uppercase tracking-wider ${produto.saldo_estoque > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              {produto.saldo_estoque > 0 ? `Em Estoque (${produto.saldo_estoque} un)` : 'Esgotado'}
            </span>
            <span className="text-xs font-bold text-gray-400">Ref: {produto.id.substring(0, 8).toUpperCase()}</span>
          </div>

          {/* Bloco de Preço Dinâmico */}
          <div className="mb-8 rounded-2xl bg-gray-50 p-6 border border-gray-100 shadow-inner">
            <p className="text-sm font-bold text-gray-400 line-through">
              Preço Original: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(produto.preco)}
            </p>
            <div className="my-1 flex items-end gap-3">
              <p className="text-5xl font-black text-green-600 tracking-tighter">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(precoAVista)}
              </p>
              {configuracoes.desconto_pix_percentual > 0 && (
                <span className="mb-2 text-xs font-black text-green-700 bg-green-200 px-2.5 py-1 rounded-md uppercase tracking-wide">
                  -{configuracoes.desconto_pix_percentual}% PIX
                </span>
              )}
            </div>
            <p className="text-sm font-medium text-gray-500 mt-2">
              ou em até <strong className="text-gray-900">12x de {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(parcela)}</strong> sem juros no cartão.
            </p>
          </div>

          {/* Botão de Compra O2O Principal */}
          <div className="mb-10">
            <button
              onClick={lidarComCompraO2O}
              disabled={produto.saldo_estoque <= 0}
              className="flex w-full items-center justify-center gap-3 rounded-2xl bg-gray-900 px-8 py-5 text-lg font-black text-white shadow-xl transition-all hover:bg-green-600 hover:shadow-2xl active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="text-2xl">💬</span> 
              {produto.saldo_estoque > 0 ? 'Falar com um Consultor (WhatsApp)' : 'Produto Indisponível'}
            </button>
            <div className="mt-4 flex items-center justify-center gap-6 text-xs font-bold text-gray-400 uppercase tracking-wider">
              <span className="flex items-center gap-1">🔒 Compra Segura</span>
              <span className="flex items-center gap-1">⚡ Retirada 2H</span>
            </div>
          </div>

          {/* Descrição Comercial Rica */}
          <div className="mb-10">
            <h3 className="mb-4 text-lg font-black text-gray-900 border-b border-gray-100 pb-2">Sobre o Produto</h3>
            <p className="text-gray-600 leading-relaxed text-sm whitespace-pre-wrap">{produto.descricao}</p>
          </div>

          {/* Ficha Técnica Extraída do Objeto JSON */}
          <div className="mb-10">
            <h3 className="mb-4 text-lg font-black text-gray-900 border-b border-gray-100 pb-2">Ficha Técnica</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                <span className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Marca</span>
                <span className="text-sm font-bold text-gray-900">{produto.especificacoes_tecnicas?.marca || 'N/A'}</span>
              </div>
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                <span className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Material Base</span>
                <span className="text-sm font-bold text-gray-900">{produto.especificacoes_tecnicas?.material || 'N/A'}</span>
              </div>
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 sm:col-span-2">
                <span className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Cor Primária</span>
                <span className="text-sm font-bold text-gray-900">{produto.especificacoes_tecnicas?.cor || 'N/A'}</span>
              </div>
            </div>
          </div>

          {/* Player de YouTube (Condicional) */}
          {youtubeId && (
            <div className="mb-10">
              <h3 className="mb-4 text-lg font-black text-gray-900 border-b border-gray-100 pb-2">Vídeo Demonstrativo</h3>
              <div className="relative w-full aspect-video rounded-2xl overflow-hidden shadow-lg border border-gray-200">
                <iframe
                  className="absolute top-0 left-0 w-full h-full"
                  src={`https://www.youtube.com/embed/${youtubeId}`}
                  title="YouTube video player"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                ></iframe>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
