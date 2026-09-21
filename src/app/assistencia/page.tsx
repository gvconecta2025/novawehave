'use client';

import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { bancoDeDados } from '@/lib/firebase/config';
import ModalNovaOS from '@/components/modulos/assistencia/ModalNovaOS';

interface OrdemServico {
  id: string;
  status_atual: string;
  cor_hexadecimal: string;
  dados_os: {
    cliente_nome: string;
    telefone: string;
    modelo_aparelho: string;
    relato_defeito: string;
  };
  auditoria: {
    criado_por_nome: string;
  };
}

const STATUS_KANBAN = ['Na Fila', 'Aguardando Orçamento', 'Em Conserto', 'Pronto para Retirada'];

export default function WorkspaceAssistencia() {
  const [ordensServico, setOrdensServico] = useState<OrdemServico[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [modalAberto, setModalAberto] = useState(false);

  useEffect(() => {
    // Busca Reativa (Offline-First) focada estritamente no fluxo de Assistência Técnica
    const q = query(
      collection(bancoDeDados, 'comandas'),
      where('fluxo_operacional', '==', 'Assistência Técnica')
    );

    const desinscrever = onSnapshot(
      q,
      (snapshot) => {
        const dados = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as OrdemServico[];
        
        setOrdensServico(dados);
        setCarregando(false);
      },
      (err) => {
        console.error('[ERRO ASSISTENCIA]', err);
        setErro('Falha de comunicação com o Firestore. Verifique sua rede (Regra Anti-Silêncio).');
        setCarregando(false);
      }
    );

    return () => desinscrever();
  }, []);

  // Geração Dinâmica de URL do WhatsApp Web (Sem APIs pagas)
  const lidarComWhatsApp = (os: OrdemServico) => {
    const numeroLimpo = os.dados_os.telefone.replace(/\D/g, '');
    const ddi = numeroLimpo.startsWith('55') ? '' : '55';
    
    const mensagens: Record<string, string> = {
      'Na Fila': `Olá ${os.dados_os.cliente_nome}, tudo bem? Seu ${os.dados_os.modelo_aparelho} já está em nossa fila técnica e em breve será analisado pela equipe We Have Resolve!`,
      'Aguardando Orçamento': `Olá ${os.dados_os.cliente_nome}! Já analisamos seu ${os.dados_os.modelo_aparelho}. Por favor, entre em contato conosco para passarmos o orçamento.`,
      'Em Conserto': `Olá ${os.dados_os.cliente_nome}, boas notícias! O reparo do seu ${os.dados_os.modelo_aparelho} já foi iniciado pela nossa equipe.`,
      'Pronto para Retirada': `Olá ${os.dados_os.cliente_nome}! O serviço no seu ${os.dados_os.modelo_aparelho} foi finalizado. Já está pronto para retirada em nossa loja We Have!`,
    };

    const texto = mensagens[os.status_atual] || `Olá ${os.dados_os.cliente_nome}, temos atualizações sobre seu aparelho na We Have.`;
    const url = `https://wa.me/${ddi}${numeroLimpo}?text=${encodeURIComponent(texto)}`;
    
    // Abre em nova aba protegida
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="flex h-full flex-col font-sans">
      
      {/* Cabeçalho Color-Coded Roxo */}
      <header className="mb-6 flex items-center justify-between rounded-lg border border-purple-200 bg-purple-50 p-4">
        <div>
          <h1 className="text-2xl font-black text-purple-900">We Have Resolve</h1>
          <p className="text-sm text-purple-700">Centro de Assistência Técnica Especializada</p>
        </div>
        <button 
          onClick={() => setModalAberto(true)}
          className="flex items-center gap-2 rounded bg-purple-600 px-5 py-2.5 font-bold text-white shadow-md transition hover:bg-purple-700 hover:shadow-lg active:scale-95"
        >
          <span>➕</span> Nova OS
        </button>
      </header>

      {/* Regra Anti-Silêncio Local */}
      {erro && (
        <div className="mb-4 w-full rounded border-l-4 border-red-500 bg-red-100 p-4 font-semibold text-red-700 shadow-sm">
          {erro}
        </div>
      )}

      {/* Kanban Grid */}
      <div className="flex-1 overflow-x-auto pb-4">
        <div className="flex min-w-max gap-6 h-full">
          {STATUS_KANBAN.map((statusColuna) => {
            const osNaColuna = ordensServico.filter((os) => os.status_atual === statusColuna);
            
            return (
              <div key={statusColuna} className="flex h-full w-80 flex-col rounded-xl bg-gray-100 p-3 shadow-inner">
                <div className="mb-3 flex items-center justify-between px-1">
                  <h3 className="font-bold text-gray-700">{statusColuna}</h3>
                  <span className="rounded-full bg-purple-200 px-2 py-0.5 text-xs font-bold text-purple-800">
                    {osNaColuna.length}
                  </span>
                </div>

                <div className="flex-1 space-y-3 overflow-y-auto">
                  {carregando ? (
                     <div className="mt-4 animate-pulse text-center text-sm text-gray-400">Carregando...</div>
                  ) : osNaColuna.length === 0 ? (
                    <div className="rounded-lg border-2 border-dashed border-gray-300 py-6 text-center text-xs font-medium text-gray-400">
                      Nenhuma OS
                    </div>
                  ) : (
                    osNaColuna.map((os) => (
                      <div key={os.id} className="rounded-lg border-l-4 bg-white p-3 shadow-sm transition hover:shadow-md" style={{ borderLeftColor: os.cor_hexadecimal }}>
                        <div className="mb-2">
                          <p className="line-clamp-1 text-sm font-black text-gray-800">{os.dados_os.cliente_nome}</p>
                          <p className="mt-0.5 text-xs font-medium text-gray-500">{os.dados_os.modelo_aparelho}</p>
                        </div>
                        
                        <div className="mb-3 line-clamp-2 rounded border border-gray-100 bg-gray-50 p-2 text-xs italic text-gray-600">
                          &quot;{os.dados_os.relato_defeito}&quot;
                        </div>
                        
                        <div className="flex items-center justify-between border-t border-gray-100 pt-2">
                          <span className="text-[10px] text-gray-400">Téc: {os.auditoria.criado_por_nome}</span>
                          
                          <button 
                            onClick={() => lidarComWhatsApp(os)}
                            className="flex items-center gap-1.5 rounded-md border border-green-200 bg-green-50 px-2.5 py-1 text-xs font-bold text-green-700 transition hover:bg-green-100"
                            title="Avisar via WhatsApp"
                          >
                            <span>💬</span> Avisar
                          </button>
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

      {/* Modal de Criação de OS com Barreira LGPD */}
      <ModalNovaOS aberto={modalAberto} aoFechar={() => setModalAberto(false)} />
    </div>
  );
}