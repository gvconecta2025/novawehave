'use client';

import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { bancoDeDados } from '@/lib/firebase/config';
import { useComandaStore, ProdutoComanda } from '@/store/useComandaStore';

export default function PdvWorkspace() {
  const { adicionarItem } = useComandaStore();
  const [produtos, setProdutos] = useState<ProdutoComanda[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    // Busca na coleção 'produtos' ordenada por nome. O onSnapshot garante Reatividade e Offline-First
    const q = query(collection(bancoDeDados, 'produtos'), orderBy('nome', 'asc'));

    const desinscrever = onSnapshot(
      q,
      (snapshot) => {
        const produtosData = snapshot.docs.map((doc) => ({
          id: doc.id,
          nome: doc.data().nome,
          preco: doc.data().preco,
          quantidade: 0, // Inicia zero na vitrine
        })) as ProdutoComanda[];
        
        setProdutos(produtosData);
        setCarregando(false);
        setErro(null);
      },
      (erroFirebase) => {
        console.error('[ERRO LISTAGEM PRODUTOS]', erroFirebase);
        setErro('Falha ao carregar os produtos do estoque. Verifique sua conexão e tente novamente.');
        setCarregando(false);
      }
    );

    return () => desinscrever();
  }, []);

  return (
    <div className="flex h-full flex-col font-sans">
      
      {/* Cabeçalho Color-Coded: Verde para Venda Expressa */}
      <header className="mb-6 flex items-center justify-between rounded-lg border border-green-200 bg-green-50 p-4">
        <div>
          <h1 className="text-2xl font-bold text-green-800">Venda Expressa</h1>
          <p className="text-sm text-green-600">Pronta Entrega / Balcão</p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 text-xl shadow-sm">
          ⚡
        </div>
      </header>

      {/* Regra Anti-Silêncio: Exibição explícita do erro para o vendedor */}
      {erro && (
        <div className="mb-6 rounded-md border-l-4 border-red-500 bg-red-50 p-4 text-sm font-medium text-red-700">
          {erro}
        </div>
      )}

      {/* Grid de Produtos Data-Driven */}
      {carregando ? (
        <div className="flex h-64 w-full items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-green-600 border-t-transparent"></div>
            <p className="text-sm font-medium text-gray-500">Sincronizando estoque...</p>
          </div>
        </div>
      ) : produtos.length === 0 && !erro ? (
        // Empty State Elegante
        <div className="flex h-64 w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 p-6 text-center">
          <span className="mb-4 text-4xl">📦</span>
          <h3 className="text-lg font-bold text-gray-700">Estoque Vazio</h3>
          <p className="text-sm text-gray-500 mt-1 max-w-md">
            Nenhum produto cadastrado no banco de dados ainda. Acesse as Configurações ou o Estoque para sincronizar com o ERP.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 pb-10">
          {produtos.map((produto) => (
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
      )}
    </div>
  );
}
