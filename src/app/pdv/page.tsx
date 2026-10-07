'use client';

import { useState, useEffect } from 'react';
import { 
  collection, 
  onSnapshot, 
  query, 
  orderBy, 
  serverTimestamp,
  writeBatch,
  doc,
  increment,
  where,
  updateDoc
} from 'firebase/firestore';
import { bancoDeDados } from '@/lib/firebase/config';
import { useAuthStore } from '@/store/useAuthStore';
import AppLayoutWrapper from '@/components/global/AppLayoutWrapper';

// PDV 2.0: Motor de ID, Modal Financeiro e Seletor CRM
import { gerarIdComanda } from '@/lib/utils/geradorIdComanda';
import ModalFechamentoVenda, { PayloadFechamento } from '@/components/modulos/pdv/ModalFechamentoVenda';
import SeletorClienteModal, { ClienteSelecionado } from '@/components/modulos/crm/SeletorClienteModal';

interface ProdutoPDV {
  id: string;
  nome: string;
  preco: number;
  saldo_estoque: number;
  sku: string;
  midia_urls?: string[];
  descricao?: string;
  categoria?: string;
}

interface ItemCarrinho extends ProdutoPDV {
  quantidade: number;
}

interface ItemComandaO2O {
  id_produto: string;
  nome: string;
  preco_unitario: number;
  quantidade: number;
  sku: string;
}

interface ComandaO2O {
  id: string;
  status_atual: string;
  valor_total: number;
  itens: ItemComandaO2O[];
  dados_cliente: {
    nome: string;
    telefone: string;
  };
  auditoria: {
    criado_em: any;
  };
}

export default function PontoDeVenda() {
  const { 
    usuarioDb, 
    usuarioAuth, 
    perfilRbac, 
    carregando: authCarregando 
  } = useAuthStore();

  // Estados Globais de UI e Abas
  const [abaAtiva, setAbaAtiva] = useState<'balcao' | 'online'>('balcao');
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);

  // Estados da Aba Balcão
  const [produtos, setProdutos] = useState<ProdutoPDV[]>([]);
  const [termoPesquisa, setTermoPesquisa] = useState('');
  const [categoriaAtiva, setCategoriaAtiva] = useState<string>('Todas');
  const [carrinho, setCarrinho] = useState<ItemCarrinho[]>([]);
  
  // Estado do CRM e Modais
  const [clienteVinculado, setClienteVinculado] = useState<ClienteSelecionado | null>(null);
  const [modalSeletorAberto, setModalSeletorAberto] = useState(false);
  const [modalFechamentoAberto, setModalFechamentoAberto] = useState(false);
  
  // Estados da Aba Online (O2O)
  const [comandasOnline, setComandasOnline] = useState<ComandaO2O[]>([]);
  const [processandoO2O, setProcessandoO2O] = useState<string | null>(null);

  const acessoPermitido = [
    'Master', 
    'Supervisor', 
    'Admin/Dev', 
    'Vendedores', 
    'Folguista'
  ].includes(perfilRbac || '');

  // Efeito 1: Carregamento do Catálogo (Balcão)
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

    const desinscreverCat = onSnapshot(
      q,
      (snapshot) => {
        const dados = snapshot.docs.map(documento => ({
          id: documento.id,
          nome: documento.data().nome || 'Produto Sem Nome',
          preco: Number(documento.data().preco) || 0,
          saldo_estoque: Number(documento.data().saldo_estoque) || 0,
          sku: documento.data().sku || 'N/A',
          midia_urls: documento.data().midia_urls || [],
          descricao: documento.data().descricao || '',
          categoria: documento.data().categoria || 'Geral'
        })) as ProdutoPDV[];

        setProdutos(dados);
        setCarregando(false);
      },
      (err: any) => {
        console.error('[ERRO CATÁLOGO PDV]', err);
        setErro(`Falha ao carregar produtos: ${err.message}`);
        setCarregando(false);
      }
    );

    return () => desinscreverCat();
  }, [acessoPermitido, authCarregando]);

  // Efeito 2: Monitorização da Fila O2O
  useEffect(() => {
    if (authCarregando || !acessoPermitido) return;

    const qO2O = query(
      collection(bancoDeDados, 'comandas'),
      where('status_atual', '==', 'Aguardando Cliente (WhatsApp)')
    );

    const desinscreverO2O = onSnapshot(
      qO2O,
      (snapshot) => {
        const dadosO2O = snapshot.docs.map(documento => ({
          id: documento.id,
          status_atual: documento.data().status_atual,
          valor_total: Number(documento.data().valor_total) || 0,
          itens: documento.data().itens || [],
          dados_cliente: documento.data().dados_cliente || { nome: 'Desconhecido', telefone: 'N/A' },
          auditoria: documento.data().auditoria || {}
        })) as ComandaO2O[];

        dadosO2O.sort((a, b) => {
          const tempoA = typeof a.auditoria?.criado_em?.toMillis === 'function' ? a.auditoria.criado_em.toMillis() : 0;
          const tempoB = typeof b.auditoria?.criado_em?.toMillis === 'function' ? b.auditoria.criado_em.toMillis() : 0;
          return tempoA - tempoB;
        });

        setComandasOnline(dadosO2O);
      },
      (err: any) => {
        console.error('[ERRO FILA O2O]', err);
      }
    );

    return () => desinscreverO2O();
  }, [acessoPermitido, authCarregando]);

  // --- FUNÇÕES DA ABA BALCÃO ---
  
  const categoriasUnicas = ['Todas', ...Array.from(new Set(produtos.map(p => p.categoria || 'Geral')))];

  const produtosFiltrados = produtos.filter(p => {
    const correspondePesquisa = p.nome.toLowerCase().includes(termoPesquisa.toLowerCase()) || p.sku.toLowerCase().includes(termoPesquisa.toLowerCase());
    const correspondeCategoria = categoriaAtiva === 'Todas' || p.categoria === categoriaAtiva;
    return correspondePesquisa && correspondeCategoria;
  });

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

  const valorTotalCarrinho = carrinho.reduce(
    (acc, curr) => acc + (curr.preco * curr.quantidade), 
    0
  );

  const lidarComAberturaModalFechamento = (e: React.FormEvent) => {
    e.preventDefault();
    if (carrinho.length === 0) {
      setErro('O carrinho de vendas não pode estar vazio.');
      return;
    }
    setErro(null);
    setModalFechamentoAberto(true);
  };

  const lidarComVendaDigital = (nomeProduto: string) => {
    window.open(`/?busca=${encodeURIComponent(nomeProduto)}`, '_blank');
  };

  // --- GRAVAÇÃO COM INTEGRAÇÃO CRM (CUSTOM ID & BATCH WRITE) ---
  const lidarComConfirmacaoVenda = async (payloadModal: PayloadFechamento) => {
    setErro(null);
    setSucesso(null);
    setSalvando(true);

    try {
      const sequenciaAleatoriaDia = Math.floor(Math.random() * 999) + 1;
      const idInteligente = gerarIdComanda('PDV Balcão', sequenciaAleatoriaDia);

      // Injeção prioritária do Cliente Vinculado (CRM)
      const dadosClienteFinal = clienteVinculado ? {
        id_cliente: clienteVinculado.id,
        nome: clienteVinculado.nome,
        whatsapp: clienteVinculado.whatsapp,
        cpf_rg: clienteVinculado.cpf_rg
      } : {
        nome: payloadModal.cliente.nome,
        cpf: payloadModal.cliente.cpf
      };

      const payloadComanda = {
        fluxo_operacional: 'Venda Expressa',
        status_atual: 'Aguardando Caixa',
        cor_hexadecimal: '#3B82F6', 
        valor_total: payloadModal.financeiro.total_final,
        itens: carrinho.map(item => ({
          id_produto: item.id,
          nome: item.nome,
          preco_unitario: item.preco,
          quantidade: item.quantidade,
          sku: item.sku
        })),
        dados_cliente: dadosClienteFinal,
        dados_financeiros: {
          subtotal: payloadModal.financeiro.subtotal,
          desconto: payloadModal.financeiro.desconto,
          justificativa_desconto: payloadModal.financeiro.justificativa_desconto,
          total_final: payloadModal.financeiro.total_final,
          metodos_pagamento: payloadModal.financeiro.metodos_pagamento
        },
        vendedor_responsavel: payloadModal.vendedor_responsavel,
        auditoria: {
          criado_por_id: usuarioAuth?.uid || 'desconhecido',
          criado_por_nome: usuarioDb?.nome_completo || 'Operador Oculto',
          criado_em: serverTimestamp(),
          faturado_por: null,
          faturado_em: null
        }
      };

      const loteEscrita = writeBatch(bancoDeDados);
      
      const comandaRef = doc(bancoDeDados, 'comandas', idInteligente);
      loteEscrita.set(comandaRef, payloadComanda);

      carrinho.forEach(item => {
        const produtoRef = doc(bancoDeDados, 'produtos', item.id);
        loteEscrita.update(produtoRef, { 
          saldo_estoque: increment(-item.quantidade) 
        });
      });

      await loteEscrita.commit();
      
      setSucesso(`✅ Venda Expressa registrada com sucesso! ID: ${idInteligente}`);
      
      // Limpeza Total do Estado
      setCarrinho([]);
      setClienteVinculado(null);
      setModalFechamentoAberto(false);
      
      setTimeout(() => {
        setSucesso(null);
      }, 7000);

    } catch (err: any) {
      console.error('[ERRO FINALIZAR VENDA]', err);
      setErro(`Falha ao registar a venda no sistema: ${err.message}`);
    } finally {
      setSalvando(false);
    }
  };

  // --- FUNÇÕES DA ABA ONLINE (O2O) ---
  const lidarComConfirmacaoO2O = async (comanda: ComandaO2O) => {
    setProcessandoO2O(comanda.id);
    setErro(null);
    setSucesso(null);

    try {
      const loteEscrita = writeBatch(bancoDeDados);

      // Baixa no estoque dos itens vendidos via O2O
      comanda.itens.forEach(item => {
        const produtoRef = doc(bancoDeDados, 'produtos', item.id_produto);
        loteEscrita.update(produtoRef, {
          saldo_estoque: increment(-item.quantidade)
        });
      });

      // Atualização do status da comanda para envio ao Caixa
      const comandaRef = doc(bancoDeDados, 'comandas', comanda.id);
      loteEscrita.update(comandaRef, {
        status_atual: 'Aguardando Caixa',
        'auditoria.atualizado_por_id': usuarioAuth?.uid,
        'auditoria.atualizado_por_nome': usuarioDb?.nome_completo,
        'auditoria.atualizado_em': serverTimestamp()
      });

      await loteEscrita.commit();
      setSucesso(`✅ Venda Online (O2O) ${comanda.id.substring(0, 8).toUpperCase()} confirmada com sucesso!`);
      
      setTimeout(() => {
        setSucesso(null);
      }, 5000);

    } catch (error: any) {
      console.error('[ERRO CONFIRMAR O2O]', error);
      setErro(`Erro ao processar a venda online: ${error.message}`);
    } finally {
      setProcessandoO2O(null);
    }
  };

  const lidarComAbandonoO2O = async (idComanda: string) => {
    if (!confirm('Tem a certeza que deseja marcar este carrinho online como abandonado? O estoque não será alterado.')) return;

    setProcessandoO2O(idComanda);
    setErro(null);

    try {
      const comandaRef = doc(bancoDeDados, 'comandas', idComanda);
      await updateDoc(comandaRef, {
        status_atual: 'Cancelada (Abandono)',
        'auditoria.atualizado_por_id': usuarioAuth?.uid,
        'auditoria.atualizado_por_nome': usuarioDb?.nome_completo,
        'auditoria.atualizado_em': serverTimestamp()
      });
      
    } catch (error: any) {
      console.error('[ERRO ABANDONO O2O]', error);
      setErro(`Erro ao cancelar a venda: ${error.message}`);
    } finally {
      setProcessandoO2O(null);
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
          className="mb-6 shrink-0 flex flex-col gap-4 border-b border-gray-200 pb-6"
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
              Frente de loja física e gestão de pedidos online (O2O).
            </p>
          </div>

          {/* Sistema de Abas */}
          <div 
            className="flex items-center gap-2 bg-gray-100 p-1 rounded-xl w-fit border border-gray-200 shadow-inner"
          >
            <button 
              onClick={() => setAbaAtiva('balcao')}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${
                abaAtiva === 'balcao' 
                  ? 'bg-white text-blue-700 shadow-sm border border-gray-200' 
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'
              }`}
            >
              <span 
                className="text-base"
              >
                🏪
              </span>
              Venda Balcão
            </button>
            <button 
              onClick={() => setAbaAtiva('online')}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${
                abaAtiva === 'online' 
                  ? 'bg-white text-blue-700 shadow-sm border border-gray-200' 
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'
              }`}
            >
              <span 
                className="text-base"
              >
                🌐
              </span>
              Vendas O2O
              {comandasOnline.length > 0 && (
                <span 
                  className="ml-1 bg-blue-600 text-white text-[10px] px-2 py-0.5 rounded-full"
                >
                  {comandasOnline.length}
                </span>
              )}
            </button>
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

        {/* === ABA: VENDA BALCÃO === */}
        {abaAtiva === 'balcao' && (
          <div 
            className="flex flex-col lg:flex-row gap-8 flex-1 overflow-hidden animate-fade-in"
          >
            {/* COLUNA 1: Pesquisa, Filtros e Catálogo */}
            <div 
              className="flex-1 flex flex-col rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden"
            >
              <div 
                className="flex flex-col shrink-0"
              >
                <div 
                  className="border-b border-gray-100 bg-gray-50 p-4"
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
                  className="flex gap-2 overflow-x-auto p-4 border-b border-gray-100 bg-white custom-scrollbar shrink-0"
                >
                  {categoriasUnicas.map(cat => (
                    <button 
                      key={cat}
                      onClick={() => setCategoriaAtiva(cat)}
                      className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap border transition-colors ${
                        categoriaAtiva === cat 
                          ? 'bg-blue-600 text-white border-blue-600 shadow-md' 
                          : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div 
                className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-gray-50/50"
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
                    Nenhum produto encontrado com os filtros atuais.
                  </div>
                ) : (
                  <div 
                    className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
                  >
                    {produtosFiltrados.map((produto) => {
                      const temImagem = produto.midia_urls && produto.midia_urls.length > 0;
                      const emEstoque = produto.saldo_estoque > 0;
                      
                      return (
                        <div 
                          key={produto.id} 
                          className="flex flex-col rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden transition-all hover:shadow-lg group"
                        >
                          {/* Imagem Superior */}
                          <div 
                            className="relative w-full h-40 bg-gray-100 flex items-center justify-center border-b border-gray-100 overflow-hidden"
                          >
                            {temImagem ? (
                              /* eslint-disable-next-line @next/next/no-img-element */
                              <img 
                                src={produto.midia_urls![0]} 
                                alt={produto.nome} 
                                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                              />
                            ) : (
                              <span 
                                className="text-4xl grayscale opacity-30 transition-transform duration-300 group-hover:scale-110"
                              >
                                📱
                              </span>
                            )}
                            
                            <span 
                              className="absolute top-3 left-3 bg-white/90 backdrop-blur text-[10px] font-black text-gray-800 px-2.5 py-1 rounded-md shadow-sm border border-gray-200 uppercase tracking-widest"
                            >
                              {produto.categoria}
                            </span>
                          </div>
                          
                          {/* Corpo do Card */}
                          <div 
                            className="flex flex-col flex-1 p-4"
                          >
                            <div 
                              className="mb-3"
                            >
                              <p 
                                className="text-[10px] font-mono text-gray-400 mb-1 leading-none"
                              >
                                SKU: {produto.sku}
                              </p>
                              <h3 
                                className="font-bold text-gray-900 text-sm line-clamp-2 leading-snug mb-1"
                              >
                                {produto.nome}
                              </h3>
                              {produto.descricao && (
                                <p 
                                  className="text-[10px] text-gray-500 line-clamp-2 mt-1"
                                >
                                  {produto.descricao}
                                </p>
                              )}
                            </div>
                            
                            <div 
                              className="mt-auto pt-2 border-t border-gray-50 flex items-end justify-between mb-4"
                            >
                              <div>
                                <p 
                                  className="text-[10px] text-gray-500 font-semibold mb-0.5"
                                >
                                  Preço Base
                                </p>
                                <p 
                                  className="text-lg font-black text-blue-700 leading-none"
                                >
                                  {new Intl.NumberFormat('pt-BR', { 
                                    style: 'currency', 
                                    currency: 'BRL' 
                                  }).format(produto.preco)}
                                </p>
                              </div>
                              
                              <div 
                                className="flex flex-col items-end"
                              >
                                <span 
                                  className={`text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-wider mb-1 ${
                                    emEstoque 
                                      ? 'bg-green-100 text-green-800' 
                                      : 'bg-red-100 text-red-800'
                                  }`}
                                >
                                  ESTOQUE: {produto.saldo_estoque}
                                </span>
                              </div>
                            </div>

                            {emEstoque ? (
                              <button 
                                onClick={() => adicionarAoCarrinho(produto)}
                                className="w-full rounded-xl bg-blue-50 border border-blue-200 py-2.5 text-xs font-black text-blue-700 transition hover:bg-blue-600 hover:text-white hover:border-blue-600 active:scale-95 flex items-center justify-center gap-2"
                              >
                                <span 
                                  className="text-sm"
                                >
                                  ➕
                                </span> 
                                ADICIONAR (BALCÃO)
                              </button>
                            ) : (
                              <button 
                                onClick={() => lidarComVendaDigital(produto.nome)}
                                className="w-full rounded-xl bg-purple-50 border border-purple-300 py-2.5 text-xs font-black text-purple-700 transition hover:bg-purple-600 hover:text-white hover:border-purple-600 active:scale-95 shadow-sm flex items-center justify-center gap-2"
                                title="Redirecionar para Loja Pública"
                              >
                                <span 
                                  className="text-sm"
                                >
                                  🌐
                                </span> 
                                VENDA DIGITAL (O2O)
                              </button>
                            )}
                            
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
              className="w-full lg:w-[400px] shrink-0 flex flex-col rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden h-[calc(100vh-13rem)]"
            >
              <div 
                className="border-b border-gray-100 bg-gray-900 p-4 shrink-0"
              >
                <h2 
                  className="text-lg font-bold text-white flex items-center gap-2"
                >
                  <span 
                    className="text-xl"
                  >
                    🛒
                  </span> 
                  Comanda de Balcão
                </h2>
              </div>

              {/* BLOCO DE CLIENTE VINCULADO */}
              <div 
                className="border-b border-gray-100 bg-gray-50 p-4 shrink-0 flex flex-col gap-3"
              >
                {!clienteVinculado ? (
                  <button 
                    type="button" 
                    onClick={() => setModalSeletorAberto(true)}
                    className="w-full rounded-lg border border-dashed border-indigo-300 bg-indigo-50/50 py-3 text-xs font-bold text-indigo-700 transition hover:bg-indigo-100 flex items-center justify-center gap-2"
                  >
                    <span 
                      className="text-base"
                    >
                      👤
                    </span>
                    VINCULAR CLIENTE (OPCIONAL)
                  </button>
                ) : (
                  <div 
                    className="flex items-center justify-between rounded-lg border border-indigo-200 bg-indigo-50 p-3 shadow-sm"
                  >
                    <div 
                      className="flex flex-col"
                    >
                      <span 
                        className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-0.5"
                      >
                        Cliente Vinculado
                      </span>
                      <span 
                        className="text-sm font-black text-indigo-900 line-clamp-1"
                      >
                        {clienteVinculado.nome}
                      </span>
                      <span 
                        className="text-xs font-mono text-indigo-600 mt-0.5"
                      >
                        📱 {clienteVinculado.whatsapp || 'Sem Número'}
                      </span>
                    </div>
                    <button 
                      type="button" 
                      onClick={() => setClienteVinculado(null)}
                      className="h-8 w-8 rounded-md bg-white border border-indigo-200 text-red-500 hover:bg-red-50 hover:text-red-700 transition-colors flex items-center justify-center text-lg shadow-sm shrink-0"
                      title="Remover Cliente"
                    >
                      &times;
                    </button>
                  </div>
                )}
              </div>

              <form 
                onSubmit={lidarComAberturaModalFechamento} 
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
                      {carrinho.map((item) => {
                        const temImagem = item.midia_urls && item.midia_urls.length > 0;
                        return (
                          <div 
                            key={item.id} 
                            className="flex flex-col rounded bg-gray-50 border border-gray-100 p-3"
                          >
                            <div 
                              className="flex justify-between items-start mb-2 gap-2"
                            >
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

                <div 
                  className="border-t border-gray-200 bg-gray-50 p-4 shrink-0"
                >
                  <div 
                    className="flex justify-between items-center mb-4"
                  >
                    <span 
                      className="text-sm font-bold text-gray-500 uppercase"
                    >
                      Total Parcial
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
                      'FECHAR VENDA (CAIXA)'
                    )}
                  </button>
                  {clienteVinculado && (
                    <p 
                      className="text-[9px] font-bold text-center mt-2 text-indigo-600 uppercase tracking-widest"
                    >
                      Venda será atribuída a {clienteVinculado.nome.split(' ')[0]}
                    </p>
                  )}
                </div>
              </form>
            </div>
          </div>
        )}

        {/* === ABA: ONLINE (O2O) === */}
        {abaAtiva === 'online' && (
          <div 
            className="flex-1 overflow-y-auto overflow-x-hidden animate-fade-in custom-scrollbar"
          >
            {comandasOnline.length === 0 ? (
              <div 
                className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-gray-200 shadow-sm"
              >
                <span 
                  className="text-6xl mb-4 grayscale opacity-30"
                >
                  🌐
                </span>
                <h3 
                  className="text-xl font-bold text-gray-700"
                >
                  Fila O2O Vazia
                </h3>
                <p 
                  className="text-gray-500 mt-2 text-sm text-center max-w-md"
                >
                  Não há pedidos online aguardando confirmação no momento. As vendas captadas pelo site aparecerão aqui.
                </p>
              </div>
            ) : (
              <div 
                className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 pb-6"
              >
                {comandasOnline.map((comanda) => {
                  const processando = processandoO2O === comanda.id;

                  return (
                    <div 
                      key={comanda.id} 
                      className="flex flex-col rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden transition-all hover:shadow-md"
                    >
                      <div 
                        className="bg-gray-900 px-5 py-4 border-b border-gray-100 flex items-center justify-between shrink-0"
                      >
                        <div>
                          <p 
                            className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-0.5"
                          >
                            Pedido O2O
                          </p>
                          <h3 
                            className="text-sm font-black text-white font-mono tracking-wider"
                          >
                            #{comanda.id.slice(0, 15).toUpperCase()}
                          </h3>
                        </div>
                        <div 
                          className="text-right"
                        >
                          <p 
                            className="text-[10px] font-semibold text-gray-400"
                          >
                            Data / Hora
                          </p>
                          <p 
                            className="text-xs font-bold text-gray-200"
                          >
                            {comanda.auditoria?.criado_em?.toDate 
                              ? new Intl.DateTimeFormat('pt-BR', { 
                                  dateStyle: 'short', 
                                  timeStyle: 'short' 
                                }).format(comanda.auditoria.criado_em.toDate()) 
                              : 'N/A'}
                          </p>
                        </div>
                      </div>

                      <div 
                        className="flex flex-col flex-1 p-5 bg-gray-50/50"
                      >
                        <div 
                          className="mb-4"
                        >
                          <p 
                            className="text-xs font-semibold text-gray-500 mb-1"
                          >
                            Cliente / Contato:
                          </p>
                          <p 
                            className="text-sm font-black text-gray-900"
                          >
                            {comanda.dados_cliente?.nome || 'Não informado'}
                          </p>
                        </div>

                        <div 
                          className="mb-2"
                        >
                          <p 
                            className="text-xs font-semibold text-gray-500 mb-2"
                          >
                            Itens Solicitados:
                          </p>
                          <ul 
                            className="space-y-2"
                          >
                            {comanda.itens.map((item, idx) => (
                              <li 
                                key={`${item.id_produto}-${idx}`} 
                                className="flex items-start justify-between gap-3 p-2.5 rounded-lg bg-white border border-gray-100 shadow-sm"
                              >
                                <div 
                                  className="flex-1"
                                >
                                  <p 
                                    className="text-[10px] font-mono text-gray-400 leading-none mb-1"
                                  >
                                    {item.sku}
                                  </p>
                                  <p 
                                    className="text-xs font-bold text-gray-800 line-clamp-2"
                                  >
                                    {item.quantidade}x {item.nome}
                                  </p>
                                </div>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      <div 
                        className="p-5 border-t border-gray-100 bg-white shrink-0"
                      >
                        <div 
                          className="flex items-center justify-between mb-5"
                        >
                          <span 
                            className="text-xs font-bold text-gray-500 uppercase tracking-wider"
                          >
                            Valor Total
                          </span>
                          <span 
                            className="text-2xl font-black text-green-700"
                          >
                            {new Intl.NumberFormat('pt-BR', { 
                              style: 'currency', 
                              currency: 'BRL' 
                            }).format(comanda.valor_total)}
                          </span>
                        </div>

                        <div 
                          className="flex flex-col gap-2.5"
                        >
                          <button 
                            onClick={() => lidarComConfirmacaoO2O(comanda)} 
                            disabled={processando} 
                            className="w-full flex items-center justify-center gap-2 rounded-xl bg-green-600 py-3.5 text-xs font-black text-white shadow-md transition-all hover:bg-green-700 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {processando ? (
                              <>
                                <div 
                                  className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"
                                >
                                </div>
                                A PROCESSAR...
                              </>
                            ) : (
                              <>
                                <span 
                                  className="text-base"
                                >
                                  📦
                                </span>
                                CONFIRMAR & ENVIAR P/ CAIXA
                              </>
                            )}
                          </button>

                          <button 
                            onClick={() => lidarComAbandonoO2O(comanda.id)} 
                            disabled={processando} 
                            className="w-full rounded-xl border border-gray-300 bg-white py-2.5 text-[10px] font-bold text-gray-600 transition-all hover:bg-gray-50 hover:text-red-600 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-widest"
                          >
                            Carrinho Abandonado
                          </button>
                        </div>
                        
                        <p 
                          className="text-center text-[9px] font-bold text-gray-400 mt-3 uppercase tracking-wider"
                        >
                          A confirmação deduzirá o estoque.
                        </p>
                      </div>
                      
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Modal de Fechamento Financeiro */}
        <ModalFechamentoVenda 
          aberto={modalFechamentoAberto} 
          aoFechar={() => setModalFechamentoAberto(false)} 
          itensCarrinho={carrinho} 
          valorSubtotal={valorTotalCarrinho} 
          aoConfirmarVenda={lidarComConfirmacaoVenda} 
        />

        {/* Modal Seletor de CRM */}
        <SeletorClienteModal 
          aberto={modalSeletorAberto} 
          aoFechar={() => setModalSeletorAberto(false)} 
          aoSelecionar={(cliente) => setClienteVinculado(cliente)} 
        />

      </div>
    </AppLayoutWrapper>
  );
}
