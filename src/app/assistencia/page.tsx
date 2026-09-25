'use client';

import { useEffect, useState } from 'react';
import { 
  collection, 
  onSnapshot, 
  query, 
  where, 
  doc, 
  updateDoc 
} from 'firebase/firestore';
import { bancoDeDados } from '@/lib/firebase/config';
import { useAuthStore } from '@/store/useAuthStore';
import ModalNovaOS from '@/components/modulos/assistencia/ModalNovaOS';
import AppLayoutWrapper from '@/components/global/AppLayoutWrapper';
import Link from 'next/link';

interface OrdemServico {
  id: string;
  status_atual: string;
  cor_hexadecimal: string;
  dados_os: {
    cliente_nome: string;
    telefone: string;
    modelo_aparelho: string;
    relato_defeito: string;
    tecnico_id: string | null;
  };
  auditoria: {
    criado_por_nome: string;
  };
}

const STATUS_KANBAN = [
  'Entrada/Check-list', 
  'Orçamento Pendente', 
  'Aprovado/Em Conserto', 
  'Pronto para Retirada'
];

export default function WorkspaceAssistencia() {
  const { 
    usuarioAuth, 
    perfilRbac, 
    carregando: authCarregando 
  } = useAuthStore();
  
  const [ordensServico, setOrdensServico] = useState<OrdemServico[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [modalAberto, setModalAberto] = useState(false);

  // Barreira RBAC (Lei 3)
  const acessoPermitido = [
    'Master', 
    'Supervisor', 
    'Admin/Dev', 
    'Técnicos Credenciados'
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
      where('fluxo_operacional', '==', 'Assistência Técnica')
    );

    const desinscrever = onSnapshot(
      q,
      (snapshot) => {
        let dados = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as OrdemServico[];
        
        // Modo Visão em Túnel para Técnicos Credenciados
        if (perfilRbac === 'Técnicos Credenciados' && usuarioAuth) {
          dados = dados.filter(os => 
            os.dados_os?.tecnico_id === null || 
            os.dados_os?.tecnico_id === usuarioAuth.uid
          );
        }
        
        setOrdensServico(dados);
        setCarregando(false);
      },
      (err: any) => {
        console.error('[ERRO ASSISTENCIA]', err);
        setErro('Falha de comunicação com o Firestore. Verifique a rede.');
        setCarregando(false);
      }
    );

    return () => desinscrever();
  }, [acessoPermitido, authCarregando, perfilRbac, usuarioAuth]);

  const lidarComFinalizacaoOS = async (idOs: string) => {
    if (!confirm('Deseja entregar o aparelho ao cliente e enviar a OS para o Caixa faturar a NFS-e?')) {
      return;
    }
    
    try {
      const osRef = doc(bancoDeDados, 'comandas', idOs);
      
      await updateDoc(osRef, { 
        status_atual: 'Aguardando NFS-e' 
      });
      
      alert('OS enviada para faturamento!');
    } catch (err) {
      console.error('[ERRO ATUALIZAR OS]', err);
      alert('Erro ao atualizar OS. Tente novamente.');
    }
  };

  const lidarComWhatsApp = (os: OrdemServico) => {
    if (!os.dados_os?.telefone) return;
    
    const numeroLimpo = os.dados_os.telefone.replace(/\D/g, '');
    const ddi = numeroLimpo.startsWith('55') ? '' : '55';
    const nomeCliente = os.dados_os.cliente_nome || 'Cliente';
    const aparelho = os.dados_os.modelo_aparelho || 'aparelho';
    
    const mensagens: Record<string, string> = {
      'Entrada/Check-list': `Olá ${nomeCliente}, o seu ${aparelho} deu entrada na nossa assistência We Have Resolve e passará por um check-list técnico.`,
      'Orçamento Pendente': `Olá ${nomeCliente}! Já analisámos o seu ${aparelho}. Por favor, entre em contacto connosco para lhe passarmos o orçamento.`,
      'Aprovado/Em Conserto': `Boas notícias, ${nomeCliente}! O serviço no seu ${aparelho} já está em andamento.`,
      'Pronto para Retirada': `Olá ${nomeCliente}! O seu ${aparelho} está pronto e a funcionar na perfeição. Pode vir levantá-lo na loja!`,
    };

    const texto = mensagens[os.status_atual] || `Olá ${nomeCliente}, temos atualizações sobre o seu aparelho.`;
    
    window.open(
      `https://wa.me/${ddi}${numeroLimpo}?text=${encodeURIComponent(texto)}`, 
      '_blank', 
      'noopener,noreferrer'
    );
  };

  if (authCarregando) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-purple-600 border-t-transparent">
        </div>
      </div>
    );
  }

  if (!acessoPermitido) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-gray-100 p-8 font-sans">
        <div className="flex max-w-md flex-col items-center justify-center rounded-2xl border border-red-200 bg-white p-10 text-center shadow-2xl">
          <span className="mb-4 text-6xl">
            ⛔
          </span>
          <h1 className="mb-2 text-2xl font-black text-gray-900">
            Acesso Restrito
          </h1>
          <p className="mb-6 text-sm text-gray-500">
            Seu perfil não possui autorização para aceder à Assistência Técnica.
          </p>
          <Link 
            href="/pdv" 
            className="rounded-xl bg-purple-600 px-6 py-2.5 font-bold text-white transition hover:bg-purple-700 shadow-md"
          >
            Voltar ao PDV
          </Link>
        </div>
      </div>
    );
  }

  return (
    <AppLayoutWrapper>
      <div className="flex min-h-full flex-col p-6 md:p-8">
        
        {/* Cabeçalho da Assistência Técnica */}
        <header className="mb-6 shrink-0 flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-xl border border-purple-200 bg-purple-50 p-5 shadow-sm">
          <div>
            <h1 className="text-2xl font-black text-purple-900">
              We Have Resolve
            </h1>
            <p className="text-sm text-purple-700 mt-1">
              Centro de Assistência Técnica (SLA e Rastreabilidade)
            </p>
            
            {perfilRbac === 'Técnicos Credenciados' && (
              <span className="mt-2 inline-block bg-purple-200 text-purple-800 text-xs font-bold px-2 py-1 rounded">
                Modo: Visão em Túnel
              </span>
            )}
          </div>
          
          <button 
            onClick={() => setModalAberto(true)} 
            className="flex items-center gap-2 rounded-xl bg-purple-600 px-6 py-3 font-bold text-white shadow-md hover:bg-purple-700 transition active:scale-95"
          >
            <span>
              ➕
            </span> 
            Nova OS
          </button>
        </header>

        {/* Alerta de Erro Visual (Anti-Silêncio) */}
        {erro && (
          <div className="mb-4 shrink-0 rounded-xl border-l-4 border-red-500 bg-red-100 p-4 font-semibold text-red-700 shadow-sm">
            ⚠️ {erro}
          </div>
        )}

        {/* Quadro Kanban (Scroll Horizontal) */}
        <div className="flex-1 overflow-x-auto pb-4 custom-scrollbar">
          <div className="flex min-w-max gap-6 h-full">
            
            {STATUS_KANBAN.map((statusColuna) => {
              const osNaColuna = ordensServico.filter((os) => os.status_atual === statusColuna);
              
              return (
                <div 
                  key={statusColuna} 
                  className="flex h-full w-[340px] flex-col rounded-xl border border-gray-200 bg-gray-200/50 p-3 shadow-inner"
                >
                  
                  {/* Cabeçalho da Coluna Kanban */}
                  <div className="mb-3 flex items-center justify-between border-b border-gray-300 pb-2 shrink-0 px-1">
                    <h3 className="font-bold text-gray-700">
                      {statusColuna}
                    </h3>
                    <span className="rounded-full bg-purple-200 px-2.5 py-0.5 text-xs font-bold text-purple-800 shadow-sm">
                      {osNaColuna.length}
                    </span>
                  </div>

                  {/* Lista de OS na Coluna */}
                  <div className="flex-1 space-y-4 overflow-y-auto pr-1 custom-scrollbar">
                    
                    {carregando ? (
                      <div className="text-center text-sm text-gray-400 mt-4 animate-pulse font-medium">
                        A sincronizar fila...
                      </div>
                    ) : osNaColuna.length === 0 ? (
                      <div className="rounded-lg border-2 border-dashed border-gray-300 py-8 text-center text-xs font-medium text-gray-400">
                        Fila Vazia
                      </div>
                    ) : (
                      osNaColuna.map((os) => (
                        <div 
                          key={os.id} 
                          className="rounded-lg border-l-4 bg-white p-4 shadow-sm transition hover:shadow-md border border-gray-100" 
                          style={{ borderLeftColor: os.cor_hexadecimal }}
                        >
                          
                          {/* Info Principal do Cliente e Aparelho */}
                          <div className="mb-2 flex justify-between items-start">
                            <div>
                              <p className="text-sm font-black text-gray-900 line-clamp-1">
                                {os.dados_os?.cliente_nome || 'Cliente Oculto'}
                              </p>
                              <p className="mt-0.5 text-xs font-bold text-purple-700">
                                {os.dados_os?.modelo_aparelho || 'Aparelho Oculto'}
                              </p>
                            </div>
                            
                            {!os.dados_os?.tecnico_id && (
                              <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-1.5 py-0.5 rounded border border-amber-200 shadow-sm">
                                Sem Téc
                              </span>
                            )}
                          </div>
                          
                          {/* Relato do Defeito */}
                          <div className="mb-3 line-clamp-2 rounded bg-gray-50 p-2 text-xs font-medium text-gray-600 border border-gray-200">
                            &quot;{os.dados_os?.relato_defeito || 'Nenhum relato fornecido.'}&quot;
                          </div>
                          
                          {/* Ações e Auditoria */}
                          <div className="flex flex-col gap-2 border-t border-gray-100 pt-3">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-semibold uppercase text-gray-400 tracking-wider">
                                Recepção: {os.auditoria?.criado_por_nome || 'Desconhecido'}
                              </span>
                              
                              <button 
                                onClick={() => lidarComWhatsApp(os)} 
                                className="flex items-center gap-1.5 rounded-md border border-green-200 bg-green-50 px-2.5 py-1 text-xs font-bold text-green-700 transition hover:bg-green-100 active:scale-95"
                                title="Avisar Cliente via WhatsApp"
                              >
                                <span>
                                  💬
                                </span> 
                                Avisar
                              </button>
                            </div>
                            
                            {/* Botão de Finalização (Apenas na última coluna) */}
                            {statusColuna === 'Pronto para Retirada' && (
                              <button 
                                onClick={() => lidarComFinalizacaoOS(os.id)} 
                                className="mt-2 w-full flex items-center justify-center gap-2 rounded-lg bg-purple-600 py-2 text-xs font-bold text-white transition hover:bg-purple-700 active:scale-95 shadow-sm"
                              >
                                ✓ Entregar e Faturar NFS-e
                              </button>
                            )}
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
        
        {/* Modal de Criação de OS */}
        <ModalNovaOS 
          aberto={modalAberto} 
          aoFechar={() => setModalAberto(false)} 
        />
        
      </div>
    </AppLayoutWrapper>
  );
}
