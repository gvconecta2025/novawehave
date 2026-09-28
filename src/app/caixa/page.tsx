'use client';

import { useEffect, useState } from 'react';
import { 
  collection, 
  onSnapshot, 
  query, 
  where, 
  doc, 
  updateDoc, 
  serverTimestamp 
} from 'firebase/firestore';
import { bancoDeDados } from '@/lib/firebase/config';
import { useAuthStore } from '@/store/useAuthStore';
import AppLayoutWrapper from '@/components/global/AppLayoutWrapper';
import Link from 'next/link';

interface ItemComanda {
  id_produto: string;
  nome: string;
  preco_unitario: number;
  quantidade: number;
  sku: string;
}

interface ComandaCaixa {
  id: string;
  fluxo_operacional: string;
  status_atual: string;
  valor_total: number;
  cor_hexadecimal?: string;
  itens?: ItemComanda[];
  dados_cliente?: {
    nome: string;
    telefone: string;
    termo_aceite?: boolean;
  };
  auditoria: {
    criado_por_nome: string;
    criado_em: any;
  };
}

export default function WorkspaceCaixa() {
  const { 
    usuarioDb, 
    perfilRbac, 
    carregando: authCarregando 
  } = useAuthStore();
  
  const [comandas, setComandas] = useState<ComandaCaixa[]>([]);
  const [comandaSelecionadaId, setComandaSelecionadaId] = useState<string | null>(null);
  
  const [carregando, setCarregando] = useState(true);
  const [faturando, setFaturando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);

  // Barreira RBAC (Lei 3)
  const acessoPermitido = [
    'Master', 
    'Supervisor', 
    'Admin/Dev', 
    'Caixa/Financeiro'
  ].includes(perfilRbac || '');

  useEffect(() => {
    if (authCarregando || !acessoPermitido) {
      if (!authCarregando && !acessoPermitido) {
        setCarregando(false);
      }
      return;
    }

    const q = query(
      collection(bancoDeDados, 'comandas'), 
      where('status_atual', '==', 'Aguardando Caixa')
    );

    const desinscrever = onSnapshot(
      q,
      (snapshot) => {
        const dados = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as ComandaCaixa[];
        
        // Ordenação Client-Side: Mais antigos primeiro (FIFO)
        dados.sort((a, b) => {
          const tempoA = typeof a.auditoria?.criado_em?.toMillis === 'function' 
            ? a.auditoria.criado_em.toMillis() 
            : 0;
          const tempoB = typeof b.auditoria?.criado_em?.toMillis === 'function' 
            ? b.auditoria.criado_em.toMillis() 
            : 0;
          return tempoA - tempoB; 
        });

        setComandas(dados);
        
        // Se a comanda selecionada sumir (foi faturada), limpar a seleção
        setComandaSelecionadaId((prevId) => {
          if (prevId && !dados.find(d => d.id === prevId)) {
            return null;
          }
          return prevId;
        });

        setCarregando(false);
        setErro(null);
      },
      (err: any) => {
        console.error('[ERRO FILA CAIXA]', err);
        setErro(`Falha ao conectar com a fila do caixa: ${err.message}`);
        setCarregando(false);
      }
    );

    return () => desinscrever();
  }, [acessoPermitido, authCarregando]);

  const comandaSelecionada = comandas.find(c => c.id === comandaSelecionadaId);

  const lidarComFaturamentoBling = async () => {
    if (!comandaSelecionada) return;
    
    setErro(null);
    setSucesso(null);
    setFaturando(true);

    try {
      const docRef = doc(bancoDeDados, 'comandas', comandaSelecionada.id);
      
      await updateDoc(docRef, {
        status_atual: 'Faturado no Bling',
        'auditoria.faturado_por_nome': usuarioDb?.nome_completo || 'Operador Financeiro',
        'auditoria.faturado_em': serverTimestamp(),
      });
      
      setSucesso(`✅ Venda / Contrato ${comandaSelecionada.id.slice(0, 6).toUpperCase()} faturado e lançado no Bling!`);
      
      setTimeout(() => {
        setSucesso(null);
      }, 5000);

    } catch (err: any) {
      console.error('[ERRO FATURAMENTO BLING]', err);
      setErro(`Falha ao faturar no sistema: ${err.message}`);
    } finally {
      setFaturando(false);
    }
  };

  const formatarData = (timestamp: any) => {
    if (!timestamp || typeof timestamp.toDate !== 'function') {
      return 'Data Indisponível';
    }
    return new Intl.DateTimeFormat('pt-BR', { 
      dateStyle: 'short', 
      timeStyle: 'short' 
    }).format(timestamp.toDate());
  };

  if (authCarregando) {
    return (
      <div 
        className="flex h-screen items-center justify-center bg-gray-50"
      >
        <div 
          className="h-8 w-8 animate-spin rounded-full border-4 border-green-600 border-t-transparent"
        >
        </div>
      </div>
    );
  }

  if (!acessoPermitido) {
    return (
      <div 
        className="flex h-screen w-full flex-col items-center justify-center bg-gray-100 p-8 font-sans"
      >
        <div 
          className="flex max-w-md flex-col items-center justify-center rounded-2xl border border-red-200 bg-white p-10 text-center shadow-2xl"
        >
          <span 
            className="mb-4 text-6xl"
          >
            ⛔
          </span>
          <h1 
            className="mb-2 text-2xl font-black text-gray-900"
          >
            Acesso Restrito
          </h1>
          <p 
            className="mb-6 text-sm text-gray-500"
          >
            O seu perfil ({perfilRbac}) não possui autorização para aceder ao Painel Financeiro/Caixa.
          </p>
          <Link 
            href="/pdv" 
            className="rounded-xl bg-green-600 px-6 py-2.5 font-bold text-white transition hover:bg-green-700 shadow-md"
          >
            Voltar ao PDV
          </Link>
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
              Painel do Caixa
            </h1>
            <p 
              className="text-gray-500 mt-1"
            >
              Ponte operacional: Vendas Expressas e Pedidos sem Estoque.
            </p>
          </div>
          <div 
            className="flex items-center gap-3"
          >
            <span 
              className="inline-flex items-center gap-2 rounded-full bg-green-100 px-4 py-2 text-sm font-bold text-green-800 shadow-sm border border-green-200"
            >
              <span>
                💰
              </span> 
              Fila: {comandas.length}
            </span>
          </div>
        </header>

        {/* Lei Anti-Silêncio */}
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

        {/* Workspace Principal (2 Colunas) */}
        <div 
          className="flex flex-col lg:flex-row gap-8 flex-1 overflow-hidden"
        >
          
          {/* COLUNA ESQUERDA: Fila de Comandas (FIFO) */}
          <div 
            className="w-full lg:w-1/3 flex flex-col rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden"
          >
            <div 
              className="border-b border-gray-100 bg-gray-50 p-4 shrink-0 flex items-center justify-between"
            >
              <h2 
                className="text-lg font-bold text-gray-800"
              >
                Fila de Processamento
              </h2>
              <span 
                className="text-[10px] uppercase font-bold text-gray-400 tracking-wider"
              >
                Mais antigos primeiro
              </span>
            </div>

            <div 
              className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-gray-50/50"
            >
              {carregando ? (
                <div 
                  className="flex flex-col items-center justify-center py-10"
                >
                  <div 
                    className="h-8 w-8 animate-spin rounded-full border-4 border-green-600 border-t-transparent mb-4"
                  >
                  </div>
                  <p 
                    className="text-sm font-medium text-gray-400"
                  >
                    A carregar fila do caixa...
                  </p>
                </div>
              ) : comandas.length === 0 ? (
                <div 
                  className="py-16 text-center flex flex-col items-center"
                >
                  <span 
                    className="text-5xl mb-4 grayscale opacity-40"
                  >
                    ✨
                  </span>
                  <p 
                    className="text-gray-400 font-medium"
                  >
                    Fila vazia! Nenhum pedido aguardando.
                  </p>
                </div>
              ) : (
                <div 
                  className="flex flex-col gap-3"
                >
                  {comandas.map((comanda) => {
                    const estaSelecionada = comandaSelecionadaId === comanda.id;
                    
                    return (
                      <button 
                        key={comanda.id}
                        onClick={() => setComandaSelecionadaId(comanda.id)}
                        className={`text-left flex flex-col p-4 rounded-xl border transition-all ${
                          estaSelecionada 
                            ? 'bg-green-50 border-green-400 shadow-md' 
                            : 'bg-white border-gray-200 hover:border-green-300 hover:shadow-sm'
                        }`}
                      >
                        <div 
                          className="flex justify-between items-start mb-2 w-full"
                        >
                          <span 
                            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold border"
                            style={{ 
                              color: comanda.cor_hexadecimal || '#6B7280',
                              borderColor: `${comanda.cor_hexadecimal || '#6B7280'}40`,
                              backgroundColor: `${comanda.cor_hexadecimal || '#6B7280'}10`
                            }}
                          >
                            {comanda.fluxo_operacional}
                          </span>
                          <span 
                            className="text-[10px] font-semibold text-gray-400"
                          >
                            {formatarData(comanda.auditoria?.criado_em)}
                          </span>
                        </div>
                        
                        <div 
                          className="flex justify-between items-end w-full mt-2"
                        >
                          <div>
                            <p 
                              className="text-xs text-gray-500 font-medium"
                            >
                              Operador:
                            </p>
                            <p 
                              className="text-sm font-bold text-gray-900"
                            >
                              {comanda.auditoria?.criado_por_nome || 'Oculto'}
                            </p>
                          </div>
                          
                          <p 
                            className="text-lg font-black text-green-700"
                          >
                            {new Intl.NumberFormat('pt-BR', { 
                              style: 'currency', 
                              currency: 'BRL' 
                            }).format(comanda.valor_total)}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* COLUNA DIREITA: Detalhes e Ação (Bling) */}
          <div 
            className="flex-1 flex flex-col rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden"
          >
            {!comandaSelecionada ? (
              <div 
                className="flex flex-col items-center justify-center flex-1 py-20 bg-gray-50/30"
              >
                <span 
                  className="text-7xl mb-4 grayscale opacity-20"
                >
                  🧾
                </span>
                <h3 
                  className="text-xl font-bold text-gray-400"
                >
                  Selecione uma comanda
                </h3>
                <p 
                  className="text-gray-400 text-sm mt-2"
                >
                  Clique num item da fila à esquerda para ver os detalhes e faturar.
                </p>
              </div>
            ) : (
              <div 
                className="flex flex-col flex-1 h-full"
              >
                
                {/* Cabeçalho dos Detalhes */}
                <div 
                  className="border-b border-gray-100 bg-gray-900 p-6 shrink-0"
                >
                  <div 
                    className="flex items-center justify-between"
                  >
                    <div>
                      <h2 
                        className="text-xl font-black text-white flex items-center gap-2"
                      >
                        Resumo da Operação
                      </h2>
                      <p 
                        className="text-gray-400 text-sm mt-1 font-mono"
                      >
                        ID: {comandaSelecionada.id.toUpperCase()}
                      </p>
                    </div>
                    <span 
                      className="px-3 py-1 rounded bg-white/10 border border-white/20 text-white text-xs font-bold"
                    >
                      {comandaSelecionada.fluxo_operacional}
                    </span>
                  </div>
                </div>

                {/* Corpo dos Detalhes */}
                <div 
                  className="flex-1 overflow-y-auto p-6 custom-scrollbar"
                >
                  
                  {/* Dados do Cliente (Se houver) */}
                  {comandaSelecionada.dados_cliente && (
                    <div 
                      className="mb-8 p-4 rounded-xl border border-blue-100 bg-blue-50"
                    >
                      <h3 
                        className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-3"
                      >
                        Dados do Cliente (Logística)
                      </h3>
                      <div 
                        className="grid grid-cols-2 gap-4"
                      >
                        <div>
                          <p 
                            className="text-xs text-blue-800 font-medium"
                          >
                            Nome:
                          </p>
                          <p 
                            className="text-sm font-bold text-blue-900"
                          >
                            {comandaSelecionada.dados_cliente.nome}
                          </p>
                        </div>
                        <div>
                          <p 
                            className="text-xs text-blue-800 font-medium"
                          >
                            Telefone / WhatsApp:
                          </p>
                          <p 
                            className="text-sm font-bold text-blue-900 font-mono"
                          >
                            {comandaSelecionada.dados_cliente.telefone}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Itens do Pedido */}
                  <h3 
                    className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3"
                  >
                    Itens do Pedido ({comandaSelecionada.itens?.length || 0})
                  </h3>
                  
                  <div 
                    className="space-y-3 mb-8"
                  >
                    {comandaSelecionada.itens?.map((item, idx) => (
                      <div 
                        key={`${item.id_produto}-${idx}`} 
                        className="flex justify-between items-center p-4 rounded-xl border border-gray-100 bg-gray-50"
                      >
                        <div>
                          <p 
                            className="text-[10px] font-mono text-gray-400 mb-0.5"
                          >
                            {item.sku}
                          </p>
                          <p 
                            className="text-sm font-bold text-gray-800"
                          >
                            {item.quantidade}x {item.nome}
                          </p>
                        </div>
                        <p 
                          className="text-base font-black text-gray-900"
                        >
                          {new Intl.NumberFormat('pt-BR', { 
                            style: 'currency', 
                            currency: 'BRL' 
                          }).format(item.preco_unitario * item.quantidade)}
                        </p>
                      </div>
                    ))}
                  </div>

                </div>

                {/* Rodapé Fixo (Ação Bling) */}
                <div 
                  className="border-t border-gray-200 bg-gray-50 p-6 shrink-0"
                >
                  <div 
                    className="flex justify-between items-center mb-6"
                  >
                    <span 
                      className="text-sm font-bold text-gray-500 uppercase"
                    >
                      Total a Faturar
                    </span>
                    <span 
                      className="text-4xl font-black text-green-700"
                    >
                      {new Intl.NumberFormat('pt-BR', { 
                        style: 'currency', 
                        currency: 'BRL' 
                      }).format(comandaSelecionada.valor_total)}
                    </span>
                  </div>
                  
                  <button 
                    type="button"
                    onClick={lidarComFaturamentoBling}
                    disabled={faturando}
                    className="w-full rounded-xl bg-green-600 px-6 py-4 text-sm font-black text-white transition-all hover:bg-green-700 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg flex items-center justify-center gap-3"
                  >
                    {faturando ? (
                      <>
                        <div 
                          className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"
                        >
                        </div>
                        A COMUNICAR COM O ERP...
                      </>
                    ) : (
                      <>
                        <span 
                          className="text-xl"
                        >
                          🚀
                        </span> 
                        MARCAR COMO LANÇADO NO BLING
                      </>
                    )}
                  </button>
                  <p 
                    className="text-center text-[10px] font-bold text-gray-400 mt-3 uppercase tracking-wider"
                  >
                    Ação irreversível no painel. Confirme o lançamento no ERP antes de clicar.
                  </p>
                </div>

              </div>
            )}
          </div>

        </div>
      </div>
    </AppLayoutWrapper>
  );
}
