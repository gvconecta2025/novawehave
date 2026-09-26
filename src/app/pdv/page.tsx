'use client';

import { useEffect, useState } from 'react';
import { 
  collection, 
  onSnapshot, 
  query, 
  orderBy, 
  addDoc, 
  serverTimestamp 
} from 'firebase/firestore';
import { bancoDeDados } from '@/lib/firebase/config';
import { useAuthStore } from '@/store/useAuthStore';
import AppLayoutWrapper from '@/components/global/AppLayoutWrapper';

interface ProdutoPDV {
  id: string;
  nome: string;
  preco: number;
  saldo_estoque: number;
  sku: string;
  midia_urls?: string[];
}

interface ItemCarrinho extends ProdutoPDV {
  quantidade: number;
}

export default function PontoDeVenda() {
  const { 
    usuarioDb, 
    usuarioAuth, 
    perfilRbac, 
    carregando: authCarregando 
  } = useAuthStore();

  const [produtos, setProdutos] = useState<ProdutoPDV[]>([]);
  const [termoPesquisa, setTermoPesquisa] = useState('');
  const [carrinho, setCarrinho] = useState<ItemCarrinho[]>([]);
  
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);

  const acessoPermitido = [
    'Master', 
    'Supervisor', 
    'Admin/Dev', 
    'Vendedores', 
    'Folguista'
  ].includes(perfilRbac || '');

  useEffect(() => {
    if (authCarregando || !acessoPermitido) {
      if (!authCarregando && !acessoPermitido) {
        setCarregando(false);
      }
      return;
    }

    const q = query(
      collection(bancoDeDados, 'produtos'), 
      orderBy('nome', 'asc')
    );

    const desinscrever = onSnapshot(
      q,
      (snapshot) => {
        const dados = snapshot.docs.map(doc => ({
          id: doc.id,
          nome: doc.data().nome || 'Produto Sem Nome',
          preco: Number(doc.data().preco) || 0,
          saldo_estoque: Number(doc.data().saldo_estoque) || 0,
          sku: doc.data().sku || 'N/A',
          midia_urls: doc.data().midia_urls || []
        })) as ProdutoPDV[];

        setProdutos(dados);
        setCarregando(false);
        setErro(null);
      },
      (err: any) => {
        console.error('[ERRO CATÁLOGO PDV]', err);
        setErro(`Falha ao carregar produtos: ${err.message}`);
        setCarregando(false);
      }
    );

    return () => desinscrever();
  }, [acessoPermitido, authCarregando]);

  const produtosFiltrados = produtos.filter(p => 
    p.nome.toLowerCase().includes(termoPesquisa.toLowerCase()) || 
    p.sku.toLowerCase().includes(termoPesquisa.toLowerCase())
  );

  const adicionarAoCarrinho = (produto: ProdutoPDV) => {
    setCarrinho((prev) => {
      const existe = prev.find(item => item.id === produto.id);
      
      if (existe) {
        return prev.map(item => 
          item.id === produto.id 
            ? { ...item, quantidade: item.quantidade + 1 } 
            : item
        );
      }
      
      return [...prev, { ...produto, quantidade: 1 }];
    });
  };

  const removerDoCarrinho = (idProduto: string) => {
    setCarrinho(prev => prev.filter(item => item.id !== idProduto));
  };

  const alterarQuantidade = (idProduto: string, delta: number) => {
    setCarrinho(prev => prev.map(item => {
      if (item.id === idProduto) {
        const novaQtd = item.quantidade + delta;
        return { 
          ...item, 
          quantidade: novaQtd > 0 ? novaQtd : 1 
        };
      }
      return item;
    }));
  };

  const valorTotal = carrinho.reduce(
    (acc, curr) => acc + (curr.preco * curr.quantidade), 
    0
  );

  const lidarComFinalizacao = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (carrinho.length === 0) {
      setErro('O carrinho de vendas não pode estar vazio.');
      return;
    }

    setErro(null);
    setSucesso(null);
    setSalvando(true);

    try {
      const payloadComanda = {
        fluxo_operacional: 'Venda Expressa',
        status_atual: 'Aguardando Caixa',
        cor_hexadecimal: '#3B82F6', // Blue 500
        valor_total: valorTotal,
        itens: carrinho.map(item => ({
          id_produto: item.id,
          nome: item.nome,
          preco_unitario: item.preco,
          quantidade: item.quantidade,
          sku: item.sku
        })),
        auditoria: {
          criado_por_id: usuarioAuth?.uid || 'desconhecido',
          criado_por_nome: usuarioDb?.nome_completo || 'Operador Oculto',
          criado_em: serverTimestamp(),
          faturado_por: null,
          faturado_em: null
        }
      };

      await addDoc(collection(bancoDeDados, 'comandas'), payloadComanda);
      
      setSucesso('✅ Venda Expressa finalizada e enviada ao Caixa!');
      setCarrinho([]);
      
      setTimeout(() => {
        setSucesso(null);
      }, 5000);

    } catch (err: any) {
      console.error('[ERRO FINALIZAR VENDA]', err);
      setErro(`Falha ao registar a venda no sistema: ${err.message}`);
    } finally {
      setSalvando(false);
    }
  };

  if (authCarregando) {
    return (
      <div 
        className="flex h-screen items-center justify-center bg-gray-50"
      >
        <div 
          className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"
        >
        </div>
      </div>
    );
  }

  return (
    <AppLayoutWrapper>
      <div 
        className="flex min-h-full flex-col p-6 md:p-8"
      >
        
        {/* Cabeçalho */}
        <header 
          className="mb-6 shrink-0 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 pb-6"
        >
          <div>
            <h1 
              className="text-3xl font-black text-gray-900"
            >
              Ponto de Venda (PDV)
            </h1>
            <p 
              className="text-gray-500 mt-1"
            >
              Frente de loja rápida para Venda Expressa.
            </p>
          </div>
        </header>

        {/* Regra Anti-Silêncio */}
        {erro && (
          <div 
            className="mb-6 shrink-0 rounded-xl border-l-4 border-red-500 bg-red-50 p-4 font-semibold text-red-800 shadow-sm break-words"
          >
            ⚠️ <strong>Diagnóstico:</strong> {erro}
          </div>
        )}
        
        {sucesso && (
          <div 
            className="mb-6 shrink-0 rounded-xl border-l-4 border-green-500 bg-green-50 p-4 font-semibold text-green-800 shadow-sm"
          >
            {sucesso}
          </div>
        )}

        {/* Workspace Principal (Grid) */}
        <div 
          className="flex flex-col lg:flex-row gap-8 flex-1 overflow-hidden"
        >
          
          {/* COLUNA 1: Pesquisa e Catálogo */}
          <div 
            className="flex-1 flex flex-col rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden"
          >
            
            <div 
              className="border-b border-gray-100 bg-gray-50 p-4 shrink-0"
            >
              <input 
                type="text" 
                placeholder="Pesquisar por nome ou SKU..." 
                value={termoPesquisa}
                onChange={(e) => setTermoPesquisa(e.target.value)}
                className="w-full rounded-lg border border-gray-300 p-3 text-sm outline-none transition focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div 
              className="flex-1 overflow-y-auto p-4 custom-scrollbar"
            >
              {carregando ? (
                <div 
                  className="flex flex-col items-center justify-center py-10"
                >
                  <div 
                    className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent mb-4"
                  >
                  </div>
                  <p 
                    className="text-sm font-medium text-gray-400"
                  >
                    A carregar catálogo...
                  </p>
                </div>
              ) : produtosFiltrados.length === 0 ? (
                <div 
                  className="py-10 text-center text-gray-400 font-medium"
                >
                  Nenhum produto encontrado.
                </div>
              ) : (
                <div 
                  className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4"
                >
                  {produtosFiltrados.map(produto => {
                    const temImagem = produto.midia_urls && produto.midia_urls.length > 0;
                    
                    return (
                      <div 
                        key={produto.id} 
                        className="flex flex-col justify-between rounded-lg border border-gray-100 bg-gray-50 p-4 transition-colors hover:border-blue-200 hover:bg-blue-50/30"
                      >
                        <div 
                          className="flex items-start gap-3"
                        >
                          
                          {/* Miniatura Visual (Ação 2) */}
                          <div 
                            className="w-10 h-10 shrink-0 aspect-square rounded overflow-hidden bg-gray-200 flex items-center justify-center border border-gray-300"
                          >
                            {temImagem ? (
                              /* eslint-disable-next-line @next/next/no-img-element */
                              <img 
                                src={produto.midia_urls![0]} 
                                alt={produto.nome} 
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span 
                                className="text-xl grayscale opacity-50"
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
                              {produto.sku}
                            </p>
                            <h3 
                              className="font-bold text-gray-800 text-sm line-clamp-2 leading-tight mb-1"
                            >
                              {produto.nome}
                            </h3>
                            <p 
                              className="font-black text-blue-700"
                            >
                              {new Intl.NumberFormat('pt-BR', { 
                                style: 'currency', 
                                currency: 'BRL' 
                              }).format(produto.preco)}
                            </p>
                          </div>
                        </div>
                        
                        <div 
                          className="mt-4 flex items-center justify-between"
                        >
                          <span 
                            className={`text-[10px] font-bold px-2 py-1 rounded ${
                              produto.saldo_estoque > 0 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            ESTOQUE: {produto.saldo_estoque}
                          </span>
                          
                          <button 
                            onClick={() => adicionarAoCarrinho(produto)}
                            disabled={produto.saldo_estoque <= 0}
                            className="rounded bg-white border border-gray-300 px-3 py-1.5 text-xs font-bold text-gray-700 transition hover:bg-gray-100 hover:text-blue-700 active:scale-95 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            + Add
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* COLUNA 2: Carrinho e Finalização */}
          <div 
            className="w-full lg:w-[400px] shrink-0 flex flex-col rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden h-[calc(100vh-10rem)]"
          >
            
            <div 
              className="border-b border-gray-100 bg-gray-900 p-4 shrink-0"
            >
              <h2 
                className="text-lg font-bold text-white flex items-center gap-2"
              >
                <span>
                  🛒
                </span> 
                Comanda / Carrinho
              </h2>
            </div>

            <form 
              onSubmit={lidarComFinalizacao} 
              className="flex flex-col flex-1 overflow-hidden"
            >
              
              <div 
                className="flex-1 overflow-y-auto p-4 custom-scrollbar"
              >
                {carrinho.length === 0 ? (
                  <div 
                    className="rounded-lg border-2 border-dashed border-gray-200 py-8 text-center text-sm text-gray-400 font-medium"
                  >
                    O carrinho está vazio.
                  </div>
                ) : (
                  <div 
                    className="space-y-3"
                  >
                    {carrinho.map(item => {
                      const temImagem = item.midia_urls && item.midia_urls.length > 0;
                      
                      return (
                        <div 
                          key={item.id} 
                          className="flex flex-col rounded bg-gray-50 border border-gray-100 p-3"
                        >
                          <div 
                            className="flex justify-between items-start mb-2 gap-2"
                          >
                            
                            {/* Miniatura no Carrinho */}
                            <div 
                              className="w-8 h-8 shrink-0 aspect-square rounded overflow-hidden bg-gray-200 flex items-center justify-center border border-gray-300"
                            >
                              {temImagem ? (
                                /* eslint-disable-next-line @next/next/no-img-element */
                                <img 
                                  src={item.midia_urls![0]} 
                                  alt={item.nome} 
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <span 
                                  className="text-sm grayscale opacity-50"
                                >
                                  📱
                                </span>
                              )}
                            </div>

                            <p 
                              className="text-xs font-bold text-gray-800 line-clamp-2 flex-1"
                            >
                              {item.nome}
                            </p>
                            
                            <button 
                              type="button" 
                              onClick={() => removerDoCarrinho(item.id)}
                              className="text-red-400 hover:text-red-600 transition h-6 w-6 flex items-center justify-center rounded hover:bg-red-50"
                              title="Remover Item"
                            >
                              &times;
                            </button>
                          </div>
                          
                          <div 
                            className="flex justify-between items-center pl-10"
                          >
                            <p 
                              className="text-sm font-black text-blue-700"
                            >
                              {new Intl.NumberFormat('pt-BR', { 
                                style: 'currency', 
                                currency: 'BRL' 
                              }).format(item.preco * item.quantidade)}
                            </p>
                            
                            <div 
                              className="flex items-center gap-3 rounded border border-gray-200 bg-white px-2 py-1"
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
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Rodapé Fixo do Carrinho */}
              <div 
                className="border-t border-gray-200 bg-gray-50 p-4 shrink-0"
              >
                <div 
                  className="flex justify-between items-center mb-4"
                >
                  <span 
                    className="text-sm font-bold text-gray-500 uppercase"
                  >
                    Total
                  </span>
                  <span 
                    className="text-2xl font-black text-gray-900"
                  >
                    {new Intl.NumberFormat('pt-BR', { 
                      style: 'currency', 
                      currency: 'BRL' 
                    }).format(valorTotal)}
                  </span>
                </div>
                
                <button 
                  type="submit" 
                  disabled={salvando || carrinho.length === 0} 
                  className="w-full rounded-xl bg-blue-600 py-3.5 text-sm font-black text-white transition-all hover:bg-blue-700 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-md flex justify-center items-center gap-2"
                >
                  {salvando ? (
                    <>
                      <div 
                        className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"
                      >
                      </div>
                      A Processar...
                    </>
                  ) : (
                    'FINALIZAR VENDA (CAIXA)'
                  )}
                </button>
              </div>

            </form>
          </div>

        </div>
      </div>
    </AppLayoutWrapper>
  );
}
