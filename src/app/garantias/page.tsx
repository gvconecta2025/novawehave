'use client';

import { useEffect, useState } from 'react';
import { 
  collection, 
  onSnapshot, 
  query, 
  where 
} from 'firebase/firestore';
import { bancoDeDados } from '@/lib/firebase/config';
import { useAuthStore } from '@/store/useAuthStore';
import AppLayoutWrapper from '@/components/global/AppLayoutWrapper';
import Link from 'next/link';

interface GarantiaTroca {
  id: string;
  status_atual: string;
  cor_hexadecimal: string;
  dados_garantia?: {
    cliente_nome: string;
    telefone: string;
    produto_defeito: string;
    motivo_troca: string;
  };
  auditoria: {
    criado_por_nome: string;
    criado_em: any;
  };
}

const STATUS_KANBAN = [
  'Em Análise (Fila)', 
  'Troca Aprovada', 
  'Reembolso Aprovado', 
  'Garantia Recusada'
];

export default function WorkspaceGarantias() {
  const { 
    perfilRbac, 
    carregando: authCarregando 
  } = useAuthStore();
  
  const [garantias, setGarantias] = useState<GarantiaTroca[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

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
      collection(bancoDeDados, 'comandas'), 
      where('fluxo_operacional', '==', 'Garantia/Troca')
    );

    const desinscrever = onSnapshot(
      q,
      (snapshot) => {
        const dados = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as GarantiaTroca[];
        
        dados.sort((a, b) => {
          const tempoA = typeof a.auditoria?.criado_em?.toMillis === 'function' 
            ? a.auditoria.criado_em.toMillis() 
            : 0;
          const tempoB = typeof b.auditoria?.criado_em?.toMillis === 'function' 
            ? b.auditoria.criado_em.toMillis() 
            : 0;
          return tempoB - tempoA; 
        });

        setGarantias(dados);
        setCarregando(false);
        setErro(null);
      },
      (err: any) => {
        console.error('[ERRO GARANTIAS]', err);
        setErro(`Falha ao carregar as garantias: ${err.message}`);
        setCarregando(false);
      }
    );

    return () => desinscrever();
  }, [acessoPermitido, authCarregando]);

  const lidarComWhatsApp = (garantia: GarantiaTroca) => {
    if (!garantia.dados_garantia?.telefone) return;
    
    const numeroLimpo = garantia.dados_garantia.telefone.replace(/\D/g, '');
    const ddi = numeroLimpo.startsWith('55') ? '' : '55';
    const nomeCliente = garantia.dados_garantia.cliente_nome || 'Cliente';
    const produto = garantia.dados_garantia.produto_defeito || 'produto';
    
    const mensagens: Record<string, string> = {
      'Em Análise (Fila)': `Olá ${nomeCliente}, recebemos o seu ${produto} e ele já está na fila de análise para garantia/troca. Retornaremos em breve!`,
      'Troca Aprovada': `Boas notícias, ${nomeCliente}! A troca do seu ${produto} foi aprovada. Por favor, venha até a loja para efetuar a substituição.`,
      'Reembolso Aprovado': `Olá ${nomeCliente}. Informamos que o reembolso referente ao seu ${produto} foi aprovado. A nossa equipa financeira entrará em contacto.`,
      'Garantia Recusada': `Olá ${nomeCliente}. Após análise técnica do seu ${produto}, a garantia foi recusada por não se enquadrar na política do fabricante. O produto está disponível para retirada.`,
    };

    const texto = mensagens[garantia.status_atual] || `Olá ${nomeCliente}, temos uma atualização sobre a sua garantia.`;
    
    window.open(
      `https://wa.me/${ddi}${numeroLimpo}?text=${encodeURIComponent(texto)}`, 
      '_blank', 
      'noopener,noreferrer'
    );
  };

  const lidarComNovaGarantia = () => {
    alert('Modal de Nova Garantia em breve! (Próximo Briefing)');
  };

  if (authCarregando) {
    return (
      <div 
        className="flex h-screen items-center justify-center bg-gray-50"
      >
        <div 
          className="h-8 w-8 animate-spin rounded-full border-4 border-red-600 border-t-transparent"
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
            O seu perfil ({perfilRbac}) não tem permissões para gerir Trocas e Garantias.
          </p>
          <Link 
            href="/pdv" 
            className="rounded-xl bg-red-600 px-6 py-2.5 font-bold text-white transition hover:bg-red-700 shadow-md"
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
          className="mb-6 shrink-0 flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-xl border border-red-200 bg-red-50 p-5 shadow-sm"
        >
          <div>
            <h1 
              className="text-2xl font-black text-red-900"
            >
              Central de Garantias e Trocas (RMA)
            </h1>
            <p 
              className="text-sm text-red-700 mt-1"
            >
              Gestão de devoluções, análise técnica e reembolsos.
            </p>
          </div>
          
          <button 
            onClick={lidarComNovaGarantia} 
            className="flex items-center gap-2 rounded-xl bg-red-600 px-6 py-3 font-bold text-white shadow-md hover:bg-red-700 transition active:scale-95"
          >
            <span>
              🛡️
            </span> 
            Nova Garantia
          </button>
        </header>

        {/* Alerta de Erro Visual (Anti-Silêncio) */}
        {erro && (
          <div 
            className="mb-4 shrink-0 rounded-xl border-l-4 border-red-500 bg-red-100 p-4 font-semibold text-red-700 shadow-sm"
          >
            ⚠️ <strong>Diagnóstico:</strong> {erro}
          </div>
        )}

        {/* Quadro Kanban (Scroll Horizontal) */}
        <div 
          className="flex-1 overflow-x-auto pb-4 custom-scrollbar"
        >
          <div 
            className="flex min-w-max gap-6 h-full"
          >
            
            {STATUS_KANBAN.map((statusColuna) => {
              const garantiasNaColuna = garantias.filter((g) => g.status_atual === statusColuna);
              
              return (
                <div 
                  key={statusColuna} 
                  className="flex h-full w-[340px] flex-col rounded-xl border border-gray-200 bg-gray-200/50 p-3 shadow-inner"
                >
                  
                  {/* Cabeçalho da Coluna Kanban */}
                  <div 
                    className="mb-3 flex items-center justify-between border-b border-gray-300 pb-2 shrink-0 px-1"
                  >
                    <h3 
                      className="font-bold text-gray-700"
                    >
                      {statusColuna}
                    </h3>
                    <span 
                      className="rounded-full bg-red-200 px-2.5 py-0.5 text-xs font-bold text-red-800 shadow-sm"
                    >
                      {garantiasNaColuna.length}
                    </span>
                  </div>

                  {/* Lista de Cards na Coluna */}
                  <div 
                    className="flex-1 space-y-4 overflow-y-auto pr-1 custom-scrollbar"
                  >
                    
                    {carregando ? (
                      <div 
                        className="text-center text-sm text-gray-400 mt-4 animate-pulse font-medium"
                      >
                        A carregar fila...
                      </div>
                    ) : garantiasNaColuna.length === 0 ? (
                      <div 
                        className="rounded-lg border-2 border-dashed border-gray-300 py-8 text-center text-xs font-medium text-gray-400"
                      >
                        Fila Vazia
                      </div>
                    ) : (
                      garantiasNaColuna.map((garantia) => (
                        <div 
                          key={garantia.id} 
                          className="rounded-lg border-l-4 bg-white p-4 shadow-sm transition hover:shadow-md border border-gray-100 flex flex-col" 
                          style={{ borderLeftColor: garantia.cor_hexadecimal || '#EF4444' }}
                        >
                          
                          {/* Info do Cliente e Produto */}
                          <div 
                            className="mb-2"
                          >
                            <p 
                              className="text-sm font-black text-gray-900 line-clamp-1"
                            >
                              {garantia.dados_garantia?.cliente_nome || 'Cliente Não Identificado'}
                            </p>
                            <p 
                              className="mt-0.5 text-xs font-bold text-red-700"
                            >
                              {garantia.dados_garantia?.produto_defeito || 'Produto Não Identificado'}
                            </p>
                          </div>
                          
                          {/* Motivo do Acionamento */}
                          <div 
                            className="mb-3 line-clamp-2 rounded bg-gray-50 p-2 text-xs font-medium text-gray-600 border border-gray-200 flex-1"
                          >
                            &quot;{garantia.dados_garantia?.motivo_troca || 'Nenhum relato fornecido.'}&quot;
                          </div>
                          
                          {/* Ações e Auditoria */}
                          <div 
                            className="flex flex-col gap-2 border-t border-gray-100 pt-3 mt-auto"
                          >
                            <div 
                              className="flex items-center justify-between"
                            >
                              <span 
                                className="text-[10px] font-semibold uppercase text-gray-400 tracking-wider"
                              >
                                Por: {garantia.auditoria?.criado_por_nome || 'Desconhecido'}
                              </span>
                              
                              <button 
                                onClick={() => lidarComWhatsApp(garantia)} 
                                className="flex items-center gap-1.5 rounded-md border border-green-200 bg-green-50 px-2.5 py-1 text-xs font-bold text-green-700 transition hover:bg-green-100 active:scale-95"
                                title="Avisar Cliente via WhatsApp"
                              >
                                <span>
                                  💬
                                </span> 
                                Avisar
                              </button>
                            </div>
                          </div>
                          
                        </div>
                      ))
                    )}
                  </div>
                  
                </div>
              );
            })}
            
          </div>
        </div>
        
      </div>
    </AppLayoutWrapper>
  );
}
