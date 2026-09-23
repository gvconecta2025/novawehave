'use client';

import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { bancoDeDados } from '@/lib/firebase/config';
import { useComandaStore, ProdutoComanda } from '@/store/useComandaStore';
import ModalNovaGarantia from '@/components/modulos/pdv/ModalNovaGarantia';

export default function PdvWorkspace() {
  const { adicionarItem } = useComandaStore();
  const [produtos, setProdutos] = useState<ProdutoComanda[]>([]);
  const [busca, setBusca] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  
  const [modalGarantiaAberto, setModalGarantiaAberto] = useState(false);

  useEffect(() => {
    const q = query(collection(bancoDeDados, 'produtos'), orderBy('nome', 'asc'));

    const desinscrever = onSnapshot(
      q,
      (snapshot) => {
        const produtosData = snapshot.docs.map((doc) => {
          const data = doc.data();
          // BLINDAGEM DE RENDERIZAÇÃO: Fallbacks seguros para evitar falhas de Client-Side
          return {
            id: doc.id,
            nome: data.nome || 'Produto Sem Nome',
            preco: Number(data.preco) || 0,
            quantidade: 0,
          };
        }) as ProdutoComanda[];
        
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

  // BLINDAGEM NO FILTRO: Optional Chaining e Coalescência
  const produtosFiltrados = produtos.filter(p => 
    (p.nome || '').toLowerCase().includes((busca || '').toLowerCase())
  );

  return (
    <div className="flex h-full flex-col font-sans relative">
      
      <header className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-lg border border-green-200 bg-green-50 p-4">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-2xl shadow-sm">
            ⚡
          </div>
          <div>
            <h1 className="text-2xl font-bold text-green-800">Venda Expressa</h1>
            <p className="text-sm text-green-600">Pronta Entrega / Balcão</p>
          </div>
        </div>
        
        <button 
          onClick={() => setModalGarantiaAberto(true)}
          className="flex items-center gap-2 rounded bg-red-100 border border-red-200 px-4 py-2 font-bold text-red-700 transition hover:bg-red-200 active:scale-95 shadow-sm"
        >
          <span>🔄</span> Registrar Garantia / Troca
        </button>
      </header>

      {erro && (
        <div className="mb-4 rounded-md border-l-4 border-red-500 bg-red-50 p-4 text-sm font-medium text-red-700">
          {erro}
        </div>
      )}

      <div className="mb-6 relative">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <span className="text-gray-400">🔍</span>
        </div>
        <input
          type="text"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Busque por nome do produto..."
          className="w-full lg:w-1/2 pl-12 pr-4 py-3 rounded-xl border border-gray-300 bg-white shadow-sm focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none transition-all font-medium text-gray-700"
        />
      </div>

      {carregando ? (
        <div className="flex h-64 w-full items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-green-600 border-t-transparent"></div>
            <p className="text-sm font-medium text-gray-500">Sincronizando estoque...</p>
          </div>
        </div>
      ) : produtos.length === 0 && !erro ? (
        <div className="flex h-64 w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 p-6 text-center">
          <span className="mb-4 text-4xl">📦</span>
          <h3 className="text-lg font-bold text-gray-700">Estoque Vazio</h3>
          <p className="text-sm text-gray-500 mt-1 max-w-md">
            Nenhum produto cadastrado no banco de dados. Acesse as Configurações ou o Estoque para cadastrar itens.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 pb-10 overflow-y-auto">
          {produtosFiltrados.length === 0 ? (
            <div className="col-span-full py-12 text-center text-gray-400 font-medium bg-white rounded-xl border border-gray-100">
              Nenhum produto encontrado com o termo &quot;{busca}&quot;.
            </div>
          ) : (
            produtosFiltrados.map((produto) => (
              <div 
                key={produto.id} 
                className="flex flex-col justify-between rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md group"
              >
                <div>
                  <h3 className="font-semibold text-gray-800 line-clamp-2 min-h-[3rem] group-hover:text-green-700 transition-colors">
                    {produto.nome}
                  </h3>
                  <p className="mt-2 text-xl font-black text-gray-900">
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
            ))
          )}
        </div>
      )}

      <ModalNovaGarantia aberto={modalGarantiaAberto} aoFechar={() => setModalGarantiaAberto(false)} />
    </div>
  );
}
