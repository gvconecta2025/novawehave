'use client';

import { useState, useEffect, useMemo } from 'react';
import { 
  collection, 
  onSnapshot, 
  query, 
  orderBy 
} from 'firebase/firestore';
import { bancoDeDados } from '@/lib/firebase/config';
import { useAuthStore } from '@/store/useAuthStore';
import AppLayoutWrapper from '@/components/global/AppLayoutWrapper';
import ModalCliente, { ClienteCRM } from '@/components/modulos/crm/ModalCliente';
import Link from 'next/link';

// Tipagens Auxiliares para o Histórico Unificado
interface ComandaMini {
  id: string;
  status_atual: string;
  valor_total: number;
  fluxo_operacional: string;
  dados_cliente?: {
    nome?: string;
    telefone?: string;
    cpf?: string;
  };
  auditoria?: {
    criado_em?: any;
  };
}

interface OSMini {
  id: string;
  status_atual: string;
  valor_total: number;
  cliente?: {
    nome?: string;
    telefone?: string;
    cpf?: string;
  };
  auditoria?: {
    criado_em?: any;
  };
}

interface ItemHistoricoUnificado {
  id: string;
  tipo: 'VENDA' | 'ASSISTENCIA';
  data: Date | null;
  valor: number;
  status: string;
  descricao: string;
}

export default function WorkspaceCRM() {
  const { 
    perfilRbac, 
    carregando: authCarregando 
  } = useAuthStore();

  // Estados de Dados (Firebase)
  const [clientes, setClientes] = useState<ClienteCRM[]>([]);
  const [comandas, setComandas] = useState<ComandaMini[]>([]);
  const [ordensServico, setOrdensServico] = useState<OSMini[]>([]);
  
  // Estados de UI e Buscas
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [termoPesquisa, setTermoPesquisa] = useState('');

  // Estados dos Modais / Drawers
  const [modalClienteAberto, setModalClienteAberto] = useState(false);
  const [clienteEmEdicao, setClienteEmEdicao] = useState<ClienteCRM | null>(null);
  
  const [drawerHistoricoAberto, setDrawerHistoricoAberto] = useState(false);
  const [clienteHistorico, setClienteHistorico] = useState<ClienteCRM | null>(null);

  // Barreira RBAC
  const acessoPermitido = [
    'Master', 
    'Supervisor', 
    'Admin/Dev', 
    'Vendedores', 
    'Caixa/Financeiro'
  ].includes(perfilRbac || '');

  // Conexão com o Firebase (Leitura Tripla para Histórico e Métricas)
  useEffect(() => {
    if (authCarregando || !acessoPermitido) {
      if (!authCarregando && !acessoPermitido) {
        setCarregando(false);
      }
      return;
    }

    // 1. Inscrição na coleção de Clientes
    const qClientes = query(
      collection(bancoDeDados, 'clientes'), 
      orderBy('nome', 'asc')
    );
    
    const desinscreverClientes = onSnapshot(
      qClientes,
      (snapshot) => {
        const dados = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as ClienteCRM[];
        setClientes(dados);
      },
      (err: any) => {
        console.error('[ERRO CRM CLIENTES]', err);
        setErro('Falha ao carregar a base de clientes.');
      }
    );

    // 2. Inscrição na coleção de Comandas (Vendas)
    const desinscreverComandas = onSnapshot(
      collection(bancoDeDados, 'comandas'),
      (snapshot) => {
        const dados = snapshot.docs.map(doc => ({
          id: doc.id,
          status_atual: doc.data().status_atual || '',
          valor_total: Number(doc.data().valor_total) || 0,
          fluxo_operacional: doc.data().fluxo_operacional || '',
          dados_cliente: doc.data().dados_cliente || {},
          auditoria: doc.data().auditoria || {}
        })) as ComandaMini[];
        setComandas(dados);
      }
    );

    // 3. Inscrição na coleção de Ordens de Serviço (Assistência)
    const desinscreverOS = onSnapshot(
      collection(bancoDeDados, 'ordens_servico'),
      (snapshot) => {
        const dados = snapshot.docs.map(doc => ({
          id: doc.id,
          status_atual: doc.data().status_atual || '',
          valor_total: Number(doc.data().valor_total) || 0,
          cliente: doc.data().cliente || {},
          auditoria: doc.data().auditoria || {}
        })) as OSMini[];
        setOrdensServico(dados);
        setCarregando(false);
      }
    );

    return () => {
      desinscreverClientes();
      desinscreverComandas();
      desinscreverOS();
    };
  }, [acessoPermitido, authCarregando]);

  // Função Auxiliar para Cruzamento de Dados do Cliente
  const clienteCorresponde = (
    nomeAlvo?: string, 
    telAlvo?: string, 
    cpfAlvo?: string, 
    cliente?: ClienteCRM
  ) => {
    if (!cliente) return false;
    
    const formatarTel = (t?: string) => t?.replace(/\D/g, '') || '';
    const formatarCpf = (c?: string) => c?.replace(/\D/g, '') || '';
    
    const telCliente = formatarTel(cliente.whatsapp);
    const cpfCliente = formatarCpf(cliente.cpf_rg);
    
    const matchesNome = !!nomeAlvo && nomeAlvo.toLowerCase() === cliente.nome.toLowerCase();
    const matchesTel = !!telAlvo && telCliente.length > 5 && formatarTel(telAlvo).includes(telCliente);
    const matchesCpf = !!cpfAlvo && cpfCliente.length > 5 && formatarCpf(cpfAlvo) === cpfCliente;

    return matchesNome || matchesTel || matchesCpf;
  };

  // Extração do Histórico Unificado de um Cliente Específico
  const obterHistoricoCliente = (cliente: ClienteCRM): ItemHistoricoUnificado[] => {
    const historico: ItemHistoricoUnificado[] = [];

    comandas.forEach(comanda => {
      if (clienteCorresponde(comanda.dados_cliente?.nome, comanda.dados_cliente?.telefone, comanda.dados_cliente?.cpf, cliente)) {
        historico.push({
          id: comanda.id,
          tipo: 'VENDA',
          data: comanda.auditoria?.criado_em?.toDate ? comanda.auditoria.criado_em.toDate() : null,
          valor: comanda.valor_total,
          status: comanda.status_atual,
          descricao: comanda.fluxo_operacional
        });
      }
    });

    ordensServico.forEach(os => {
      if (clienteCorresponde(os.cliente?.nome, os.cliente?.telefone, os.cliente?.cpf, cliente)) {
        historico.push({
          id: os.id,
          tipo: 'ASSISTENCIA',
          data: os.auditoria?.criado_em?.toDate ? os.auditoria.criado_em.toDate() : null,
          valor: os.valor_total,
          status: os.status_atual,
          descricao: 'Serviço de Manutenção'
        });
      }
    });

    // Ordenação: Mais recentes primeiro
    return historico.sort((a, b) => {
      const dataA = a.data ? a.data.getTime() : 0;
      const dataB = b.data ? b.data.getTime() : 0;
      return dataB - dataA;
    });
  };

  // Cálculo das Métricas de LTV para Lista e Dashboard
  const metricasCalculadas = useMemo(() => {
    let ltvGlobal = 0;
    let maiorVip = { nome: '-', ltv: 0 };
    
    const clientesComMetricas = clientes.map(cliente => {
      const historico = obterHistoricoCliente(cliente);
      const totalGasto = historico.reduce((acc, curr) => acc + curr.valor, 0);
      const quantidadeTransacoes = historico.length;
      const ticketMedio = quantidadeTransacoes > 0 ? totalGasto / quantidadeTransacoes : 0;
      const ultimaVisita = historico.length > 0 ? historico[0].data : null;

      ltvGlobal += totalGasto;
      
      if (totalGasto > maiorVip.ltv) {
        maiorVip = { nome: cliente.nome, ltv: totalGasto };
      }

      return {
        ...cliente,
        metricas: {
          ltv: totalGasto,
          transacoes: quantidadeTransacoes,
          ticketMedio: ticketMedio,
          ultimaVisita: ultimaVisita
        }
      };
    });

    const ticketMedioGlobal = clientes.length > 0 ? ltvGlobal / clientes.length : 0;

    return {
      lista: clientesComMetricas,
      totalLtv: ltvGlobal,
      ticketGlobal: ticketMedioGlobal,
      vip: maiorVip
    };
  }, [clientes, comandas, ordensServico]);

  // Sistema de Pesquisa Inteligente
  const clientesFiltrados = metricasCalculadas.lista.filter(cliente => {
    const termo = termoPesquisa.toLowerCase();
    const matchesNome = cliente.nome.toLowerCase().includes(termo);
    const matchesWpp = (cliente.whatsapp || '').includes(termo);
    const matchesCpf = (cliente.cpf_rg || '').includes(termo);
    const matchesTag = (cliente.tags || []).some(t => t.toLowerCase().includes(termo));
    
    return matchesNome || matchesWpp || matchesCpf || matchesTag;
  });

  const lidarComWhatsApp = (cliente: ClienteCRM) => {
    if (!cliente.whatsapp) {
      alert('Este cliente não possui WhatsApp cadastrado.');
      return;
    }
    const numeroLimpo = cliente.whatsapp.replace(/\D/g, '');
    const ddi = numeroLimpo.startsWith('55') ? '' : '55';
    const texto = encodeURIComponent(`Olá ${cliente.nome}, tudo bem? Falo da We Have...`);
    window.open(`https://wa.me/${ddi}${numeroLimpo}?text=${texto}`, '_blank', 'noopener,noreferrer');
  };

  const abrirModalEdicao = (cliente: ClienteCRM) => {
    setClienteEmEdicao(cliente);
    setModalClienteAberto(true);
  };

  const abrirNovoCliente = () => {
    setClienteEmEdicao(null);
    setModalClienteAberto(true);
  };

  const abrirDrawerHistorico = (cliente: ClienteCRM) => {
    setClienteHistorico(cliente);
    setDrawerHistoricoAberto(true);
  };

  if (authCarregando) {
    return (
      <div 
        className="flex h-screen items-center justify-center bg-gray-50"
      >
        <div 
          className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"
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
            O seu perfil ({perfilRbac}) não possui autorização para aceder ao CRM.
          </p>
          <Link 
            href="/pdv" 
            className="rounded-xl bg-indigo-600 px-6 py-2.5 font-bold text-white transition hover:bg-indigo-700 shadow-md"
          >
            Voltar ao PDV
          </Link>
        </div>
      </div>
    );
  }

  const historicoAtivo = clienteHistorico ? obterHistoricoCliente(clienteHistorico) : [];

  return (
    <AppLayoutWrapper>
      <div 
        className="flex min-h-full flex-col p-6 md:p-8"
      >
        
        {/* CABEÇALHO DO MÓDULO */}
        <header 
          className="mb-6 shrink-0 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 pb-6"
        >
          <div>
            <h1 
              className="text-3xl font-black text-gray-900"
            >
              Gestão de Clientes (CRM)
            </h1>
            <p 
              className="text-gray-500 mt-1"
            >
              Base inteligente, histórico unificado e métricas de LTV.
            </p>
          </div>
          
          <button 
            onClick={abrirNovoCliente} 
            className="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-black text-white shadow-md hover:bg-indigo-700 transition active:scale-95"
          >
            <span 
              className="text-lg"
            >
              ➕
            </span> 
            NOVO CLIENTE
          </button>
        </header>

        {/* REGRA ANTI-SILÊNCIO */}
        {erro && (
          <div 
            className="mb-6 shrink-0 rounded-xl border-l-4 border-red-500 bg-red-50 p-4 font-semibold text-red-800 shadow-sm"
          >
            ⚠️ <strong>Diagnóstico:</strong> {erro}
          </div>
        )}

        {carregando ? (
          <div 
            className="flex flex-col items-center justify-center py-20"
          >
            <div 
              className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent mb-4"
            >
            </div>
            <p 
              className="text-sm font-medium text-gray-400"
            >
              A consolidar base de inteligência CRM...
            </p>
          </div>
        ) : (
          <div 
            className="flex-1 flex flex-col"
          >
            
            {/* AÇÃO 3: DASHBOARD DE MÉTRICAS GLOBAIS */}
            <div 
              className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8 shrink-0"
            >
              
              <div 
                className="flex flex-col rounded-2xl border border-indigo-100 bg-white p-6 shadow-sm"
              >
                <div 
                  className="flex items-center gap-3 mb-2"
                >
                  <span 
                    className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 text-xl"
                  >
                    👥
                  </span>
                  <h3 
                    className="text-xs font-bold text-gray-500 uppercase tracking-widest"
                  >
                    Base de Clientes
                  </h3>
                </div>
                <p 
                  className="text-3xl font-black text-gray-900 mt-2"
                >
                  {clientes.length}
                </p>
                <p 
                  className="text-[10px] text-gray-400 font-bold mt-1 uppercase"
                >
                  Registos Únicos
                </p>
              </div>

              <div 
                className="flex flex-col rounded-2xl border border-emerald-100 bg-white p-6 shadow-sm"
              >
                <div 
                  className="flex items-center gap-3 mb-2"
                >
                  <span 
                    className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 text-xl"
                  >
                    💸
                  </span>
                  <h3 
                    className="text-xs font-bold text-gray-500 uppercase tracking-widest"
                  >
                    Ticket Médio Base
                  </h3>
                </div>
                <p 
                  className="text-3xl font-black text-gray-900 mt-2"
                >
                  {new Intl.NumberFormat('pt-BR', { 
                    style: 'currency', 
                    currency: 'BRL' 
                  }).format(metricasCalculadas.ticketGlobal)}
                </p>
                <p 
                  className="text-[10px] text-gray-400 font-bold mt-1 uppercase"
                >
                  Por Cliente (LTV Geral)
                </p>
              </div>

              <div 
                className="flex flex-col rounded-2xl border border-amber-100 bg-white p-6 shadow-sm"
              >
                <div 
                  className="flex items-center gap-3 mb-2"
                >
                  <span 
                    className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 text-amber-600 text-xl"
                  >
                    👑
                  </span>
                  <h3 
                    className="text-xs font-bold text-gray-500 uppercase tracking-widest"
                  >
                    Maior VIP (LTV)
                  </h3>
                </div>
                <p 
                  className="text-xl font-black text-gray-900 mt-2 line-clamp-1 leading-none"
                >
                  {metricasCalculadas.vip.nome}
                </p>
                <p 
                  className="text-sm font-bold text-amber-600 mt-1"
                >
                  {new Intl.NumberFormat('pt-BR', { 
                    style: 'currency', 
                    currency: 'BRL' 
                  }).format(metricasCalculadas.vip.ltv)}
                </p>
              </div>

            </div>

            {/* BARRA DE PESQUISA */}
            <div 
              className="mb-6 shrink-0 relative"
            >
              <span 
                className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-lg"
              >
                🔍
              </span>
              <input 
                type="text" 
                placeholder="Pesquisar por Nome, WhatsApp, CPF/RG ou Tag de Segmentação..." 
                value={termoPesquisa}
                onChange={(e) => setTermoPesquisa(e.target.value)}
                className="w-full rounded-xl border border-gray-300 pl-12 pr-4 py-4 text-sm outline-none transition focus:ring-2 focus:ring-indigo-500 shadow-sm"
              />
            </div>

            {/* LISTAGEM DE CLIENTES EM CARDS (Grid) */}
            <div 
              className="flex-1 overflow-y-auto custom-scrollbar pb-6"
            >
              {clientesFiltrados.length === 0 ? (
                <div 
                  className="py-16 text-center bg-white rounded-2xl border border-gray-200"
                >
                  <span 
                    className="text-5xl mb-4 grayscale opacity-30"
                  >
                    🕵️
                  </span>
                  <p 
                    className="text-gray-500 font-medium"
                  >
                    Nenhum cliente encontrado para esta pesquisa.
                  </p>
                </div>
              ) : (
                <div 
                  className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6"
                >
                  {clientesFiltrados.map((cliente) => (
                    <div 
                      key={cliente.id} 
                      className="flex flex-col rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden hover:shadow-lg transition-all group"
                    >
                      
                      <div 
                        className="p-5 border-b border-gray-100 flex items-start justify-between"
                      >
                        <div 
                          className="flex-1 pr-4"
                        >
                          <h3 
                            className="text-lg font-black text-gray-900 leading-tight mb-1 group-hover:text-indigo-600 transition-colors"
                          >
                            {cliente.nome}
                          </h3>
                          <div 
                            className="flex flex-col gap-0.5"
                          >
                            <p 
                              className="text-xs font-mono text-gray-500 flex items-center gap-1.5"
                            >
                              <span 
                                className="text-[10px]"
                              >
                                📱
                              </span> 
                              {cliente.whatsapp || 'Não Cadastrado'}
                            </p>
                            {cliente.cpf_rg && (
                              <p 
                                className="text-xs font-mono text-gray-400 flex items-center gap-1.5"
                              >
                                <span 
                                  className="text-[10px]"
                                >
                                  🪪
                                </span> 
                                {cliente.cpf_rg}
                              </p>
                            )}
                          </div>
                        </div>
                        
                        <div 
                          className="shrink-0 flex items-center gap-2"
                        >
                          <button 
                            onClick={() => abrirModalEdicao(cliente)}
                            className="h-8 w-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-indigo-100 hover:text-indigo-700 transition"
                            title="Editar Perfil"
                          >
                            ✏️
                          </button>
                        </div>
                      </div>

                      <div 
                        className="p-5 flex-1 bg-gray-50/50"
                      >
                        <div 
                          className="flex flex-wrap gap-1.5 mb-4"
                        >
                          {(cliente.tags && cliente.tags.length > 0) ? (
                            cliente.tags.map((tag, idx) => (
                              <span 
                                key={idx} 
                                className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-indigo-100 text-indigo-800 border border-indigo-200"
                              >
                                {tag}
                              </span>
                            ))
                          ) : (
                            <span 
                              className="px-2 py-0.5 rounded text-[10px] font-bold text-gray-400 border border-gray-200 bg-gray-100"
                            >
                              Sem Tags
                            </span>
                          )}
                        </div>

                        <div 
                          className="grid grid-cols-2 gap-4"
                        >
                          <div 
                            className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm"
                          >
                            <p 
                              className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1"
                            >
                              Total LTV
                            </p>
                            <p 
                              className="text-sm font-black text-emerald-600"
                            >
                              {new Intl.NumberFormat('pt-BR', { 
                                style: 'currency', 
                                currency: 'BRL' 
                              }).format(cliente.metricas?.ltv || 0)}
                            </p>
                          </div>
                          
                          <div 
                            className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm"
                          >
                            <p 
                              className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1"
                            >
                              Transações
                            </p>
                            <p 
                              className="text-sm font-black text-gray-800"
                            >
                              {cliente.metricas?.transacoes || 0}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div 
                        className="p-4 border-t border-gray-100 bg-white flex items-center gap-3 shrink-0"
                      >
                        <button 
                          onClick={() => lidarComWhatsApp(cliente)}
                          className="flex-1 rounded-xl bg-green-50 border border-green-200 py-2.5 text-xs font-black text-green-700 hover:bg-green-600 hover:text-white transition-colors flex items-center justify-center gap-2 active:scale-95"
                        >
                          <span 
                            className="text-sm"
                          >
                            💬
                          </span> 
                          WHATSAPP
                        </button>
                        
                        <button 
                          onClick={() => abrirDrawerHistorico(cliente)}
                          className="flex-1 rounded-xl bg-gray-900 border border-gray-800 py-2.5 text-xs font-black text-white hover:bg-indigo-600 transition-colors flex items-center justify-center gap-2 active:scale-95 shadow-md"
                        >
                          <span 
                            className="text-sm"
                          >
                            📜
                          </span> 
                          HISTÓRICO
                        </button>
                      </div>

                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        )}

        {/* Modal de Cadastro/Edição Progressiva */}
        <ModalCliente 
          aberto={modalClienteAberto} 
          clienteEmEdicao={clienteEmEdicao} 
          aoFechar={() => setModalClienteAberto(false)} 
        />

        {/* AÇÃO 4: DRAWER DE HISTÓRICO UNIFICADO */}
        {drawerHistoricoAberto && clienteHistorico && (
          <div 
            className="fixed inset-0 z-50 flex justify-end font-sans"
          >
            <div 
              onClick={() => setDrawerHistoricoAberto(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            >
            </div>
            
            <div 
              className="relative z-10 w-full max-w-lg bg-white shadow-2xl flex flex-col h-full animate-[slideInRight_0.3s_ease-out_forwards]"
            >
              
              <div 
                className="flex items-center justify-between px-6 py-5 border-b border-gray-100 bg-gray-900 text-white shrink-0"
              >
                <div>
                  <h2 
                    className="text-lg font-black flex items-center gap-2 leading-tight"
                  >
                    <span>
                      📜
                    </span> 
                    Linha do Tempo
                  </h2>
                  <p 
                    className="text-xs text-gray-400 mt-1 font-mono"
                  >
                    {clienteHistorico.nome}
                  </p>
                </div>
                <button 
                  onClick={() => setDrawerHistoricoAberto(false)}
                  className="text-gray-400 hover:text-white transition-colors text-3xl leading-none"
                >
                  &times;
                </button>
              </div>

              <div 
                className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-gray-50"
              >
                {historicoAtivo.length === 0 ? (
                  <div 
                    className="flex flex-col items-center justify-center py-20 text-center"
                  >
                    <span 
                      className="text-6xl mb-4 grayscale opacity-30"
                    >
                      📭
                    </span>
                    <p 
                      className="text-gray-500 font-medium text-sm max-w-[250px]"
                    >
                      Nenhum histórico de Vendas ou Assistência localizado para este cliente.
                    </p>
                  </div>
                ) : (
                  <div 
                    className="relative border-l-2 border-indigo-200 ml-3 space-y-8 pb-10"
                  >
                    {historicoAtivo.map((item, idx) => (
                      <div 
                        key={`${item.id}-${idx}`} 
                        className="relative pl-6"
                      >
                        <div 
                          className={`absolute -left-[17px] top-1 flex h-8 w-8 items-center justify-center rounded-full border-4 border-gray-50 shadow-sm ${
                            item.tipo === 'VENDA' ? 'bg-emerald-500' : 'bg-purple-500'
                          }`}
                        >
                          <span 
                            className="text-[10px]"
                          >
                            {item.tipo === 'VENDA' ? '🛒' : '🔧'}
                          </span>
                        </div>
                        
                        <div 
                          className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
                        >
                          <div 
                            className="flex justify-between items-start mb-2"
                          >
                            <div>
                              <span 
                                className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${
                                  item.tipo === 'VENDA' ? 'bg-emerald-50 text-emerald-700' : 'bg-purple-50 text-purple-700'
                                }`}
                              >
                                {item.tipo}
                              </span>
                              <p 
                                className="text-xs font-bold text-gray-900 mt-2"
                              >
                                {item.descricao}
                              </p>
                            </div>
                            <p 
                              className="text-xs font-semibold text-gray-400"
                            >
                              {item.data 
                                ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' }).format(item.data)
                                : 'Data N/A'}
                            </p>
                          </div>
                          
                          <div 
                            className="mt-3 pt-3 border-t border-gray-100 flex items-end justify-between"
                          >
                            <div>
                              <p 
                                className="text-[10px] text-gray-400 uppercase tracking-wider mb-0.5"
                              >
                                Status
                              </p>
                              <p 
                                className="text-[11px] font-bold text-gray-700"
                              >
                                {item.status}
                              </p>
                            </div>
                            <p 
                              className="text-base font-black text-gray-900"
                            >
                              {new Intl.NumberFormat('pt-BR', { 
                                style: 'currency', 
                                currency: 'BRL' 
                              }).format(item.valor)}
                            </p>
                          </div>
                          
                          <div 
                            className="mt-3"
                          >
                            <p 
                              className="text-[9px] font-mono text-gray-400"
                            >
                              ID REF: {item.id.slice(0,10).toUpperCase()}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          </div>
        )}

      </div>
    </AppLayoutWrapper>
  );
}
