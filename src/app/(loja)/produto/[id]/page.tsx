'use client';

import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { bancoDeDados } from '@/lib/firebase/config';
import { useComparadorStore } from '@/store/useComparadorStore';
import Link from 'next/link';

interface DetalheProduto {
  id: string;
  nome: string;
  descricao: string;
  preco: number;
  saldo_estoque: number;
}

export default function PaginaProduto({ params }: { params: { id: string } }) {
  const [produto, setProduto] = useState<DetalheProduto | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  
  const { adicionarProduto } = useComparadorStore();

  useEffect(() => {
    const buscarProduto = async () => {
      try {
        const docRef = doc(bancoDeDados, 'produtos', params.id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          setProduto({
            id: docSnap.id,
            nome: data.nome || 'Produto Sem Nome',
            descricao: data.descricao || 'Nenhuma descrição detalhada fornecida para este item.',
            preco: data.preco || 0,
            saldo_estoque: data.saldo_estoque || 0,
          });
        } else {
          setErro('Produto não encontrado ou removido do catálogo.');
        }
      } catch (err) {
        console.error('[ERRO PRODUTO DINÂMICO]', err);
        setErro('Ocorreu um erro ao carregar os detalhes do produto.');
      } finally {
        setCarregando(false);
      }
    };

    buscarProduto();
  }, [params.id]);

  const lidarComCompraO2O = () => {
    if (!produto) return;
    const numeroLoja = '5533999999999'; // Substituir pelo WhatsApp real da loja
    const precoFormatado = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(produto.preco);
    const texto = `Olá We Have! 👋\n\nEstou a ver o produto *${produto.nome}* no site por ${precoFormatado}.\nGostaria de fechar a compra. Podemos prosseguir?`;
    window.open(`https://wa.me/${numeroLoja}?text=${encodeURIComponent(texto)}`, '_blank', 'noopener,noreferrer');
  };

  if (carregando) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
        <p className="font-medium text-gray-500">A carregar detalhes do produto...</p>
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

  const precoAVista = produto.preco * 0.9;
  const parcela = produto.preco / 12;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Breadcrumb para SEO e Navegação */}
      <nav className="mb-8 flex text-sm text-gray-500">
        <Link href="/" className="hover:text-blue-600">Home</Link>
        <span className="mx-2">/</span>
        <span className="text-gray-900 font-medium line-clamp-1">{produto.nome}</span>
      </nav>

      <div className="grid grid-cols-1 gap-12 lg:grid-cols-2">
        {/* Coluna 1: Imagem Placeholder Ampla */}
        <div className="flex aspect-square w-full items-center justify-center rounded-3xl bg-gray-100 border border-gray-200">
          <span className="text-9xl opacity-20 grayscale">📦</span>
        </div>

        {/* Coluna 2: Informações de Conversão */}
        <div className="flex flex-col justify-center">
          <h1 className="mb-4 text-3xl font-black text-gray-900 sm:text-4xl">{produto.nome}</h1>
          
          <div className="mb-6 flex items-center gap-3">
            <span className={`inline-flex rounded-md px-3 py-1 text-xs font-bold ${produto.saldo_estoque > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              {produto.saldo_estoque > 0 ? `Em Estoque (${produto.saldo_estoque} un)` : 'Esgotado'}
            </span>
            <span className="text-sm font-medium text-gray-500">Ref: {produto.id.substring(0, 8).toUpperCase()}</span>
          </div>

          <div className="mb-8 rounded-2xl bg-gray-50 p-6 border border-gray-100">
            <p className="text-sm font-medium text-gray-500 line-through">
              Preço Original: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(produto.preco)}
            </p>
            <div className="my-1 flex items-end gap-3">
              <p className="text-4xl font-black text-green-600">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(precoAVista)}
              </p>
              <span className="mb-1 text-sm font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded">-10% PIX</span>
            </div>
            <p className="text-sm font-medium text-gray-600">
              ou em até <strong className="text-gray-900">12x de {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(parcela)}</strong> sem juros no cartão.
            </p>
          </div>

          <div className="mb-8">
            <h3 className="mb-2 text-lg font-bold text-gray-900">Descrição do Produto</h3>
            <p className="text-gray-600 leading-relaxed text-sm whitespace-pre-wrap">{produto.descricao}</p>
          </div>

          {/* Botões de Ação */}
          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              onClick={lidarComCompraO2O}
              disabled={produto.saldo_estoque <= 0}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-gray-900 px-8 py-4 text-sm font-bold text-white transition-all hover:bg-green-600 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="text-xl">💬</span> 
              {produto.saldo_estoque > 0 ? 'Comprar pelo WhatsApp' : 'Produto Indisponível'}
            </button>
            <button
              onClick={() => adicionarProduto(produto)}
              className="flex items-center justify-center gap-2 rounded-xl border-2 border-gray-200 bg-white px-8 py-4 text-sm font-bold text-gray-700 transition hover:border-blue-600 hover:text-blue-600 active:scale-[0.98]"
            >
              ⚖️ Comparar
            </button>
          </div>
          
          <div className="mt-6 flex items-center gap-4 border-t border-gray-100 pt-6 text-xs font-medium text-gray-500">
            <span className="flex items-center gap-1">🔒 Compra Segura</span>
            <span className="flex items-center gap-1">⚡ Retirada Rápida</span>
            <span className="flex items-center gap-1">🛡️ Garantia We Have</span>
          </div>
        </div>
      </div>
    </div>
  );
}
