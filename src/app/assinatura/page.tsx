'use client';

import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { bancoDeDados } from '@/lib/firebase/config';
import ModalNovaAssinatura from '@/components/modulos/assinatura/ModalNovaAssinatura';

interface EncomendaVIP {
  id: string;
  status_atual: string;
  cor_hexadecimal: string;
  valor_total: number;
  dados_encomenda: {
    cliente_nome: string;
    telefone: string;
    descricao_produto: string;
    status_pagamento: string;
  };
  auditoria: {
    criado_por_nome: string;
  };
}

const STATUS_LOGISTICA = ['Intenção de Compra', 'Aguardando Pagamento', 'Pedido ao Fornecedor', 'Em Trânsito', 'Retirada VIP'];

export default function WorkspaceAssinatura() {
  const [encomendas, setEncomendas] = useState<EncomendaVIP[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [modalAberto, setModalAberto] = useState(false);

  useEffect(() => {
    const q = query(
      collection(bancoDeDados, 'comandas'),
      where('fluxo_operacional', '==', 'Assinatura We Have')
    );

    const desinscrever = onSnapshot(
      q,
      (snapshot) => {
        const dados = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as EncomendaVIP[];
        
        setEncomendas(dados);
        setCarregando(false);
      },
      (err) => {
        console.error('[ERRO ASSINATURA VIP]', err);
        setErro('Falha de conexão. Impossível carregar a esteira logística. Verifique sua rede.');
        setCarregando(false);
      }
    );

    return () => desinscrever();
  }, []);

  const lidarComWhatsAppVIP = (pedido: EncomendaVIP) => {
    const numeroLimpo = pedido.dados_encomenda.telefone.replace(/\D/g, '');
    const ddi = numeroLimpo.startsWith('55') ? '' : '55';
    
    const mensagens: Record<string, string> = {
      'Intenção de Compra': `Olá ${pedido.dados_encomenda.cliente_nome}, obrigado por nos procurar! Estamos buscando as melhores opções no mercado para a sua encomenda.`,
      'Aguardando Pagamento': `Olá ${pedido.dados_encomenda.cliente_nome}! Seu pedido já está pronto para ser fechado com o fornecedor. Aguardamos apenas a confirmação do pagamento para dar o start.`,
      'Pedido ao Fornecedor': `Boas notícias, ${pedido.dados_encomenda.cliente_nome}! O seu pedido já foi faturado junto ao nosso fornecedor e em breve iniciará o transporte.`,
      'Em Trânsito': `Olá ${pedido.dados_encomenda.cliente_nome}! Sua encomenda está em trânsito e em breve chegará em nossa loja We Have.`,
      'Retirada VIP': `🌟 Seu pedido chegou, ${pedido.dados_encomenda.cliente_nome}! Venha até a loja We Have para fazer a Retirada VIP da sua encomenda.`,
    };

    const texto = mensagens[pedido.status_atual] || `Olá ${pedido.dados_encomenda.cliente_nome}, temos atualizações sobre a sua encomenda VIP.`;
    const url = `https://wa.me/${ddi}${numeroLimpo}?text=${encodeURIComponent(texto)}`;
    
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="flex h-full flex-col font-sans bg-gray-50">
      
      <header className="mb-6 flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 p-5 shadow-sm">
        <div>
          <h1 className="text-2xl font-black text-amber-900 flex items-center gap-2">
            <span>🌟</span> Assinatura We Have
          </h1>
          <p className="text-sm text-amber-700 mt-1">Prateleira Infinita, Encomendas B2B e Retirada VIP.</p>
        </div>
        <button 
          onClick={() => setModalAberto(true)}
          className="flex items-center gap-2 rounded bg-gradient-to-r from-amber-500 to-amber-600 px-6 py-3 font-bold text-white shadow-md transition hover:from-amber-600 hover:to-amber-700 active:scale-95"
        >
          <span>➕</span> Nova Encomenda
        </button>
      </header>

      {erro && (
        <div className="mb-4 w-full rounded border-l-4 border-red-500 bg-red-100 p-4 font-semibold text-red-700 shadow-sm">
          {erro}
        </div>
      )}

      {/* Kanban de Esteira Logística */}
      <div className="flex-1 overflow-x-auto pb-4">
        <div className="flex min-w-max gap-6 h-full px-2">
          {STATUS_LOGISTICA.map((statusColuna) => {
            const pedidosNaColuna = encomendas.filter((enc) => enc.status_atual === statusColuna);
            
            return (
              <div key={statusColuna} className="flex h-full w-80 flex-col rounded-xl bg-gray-200/60 p-3 border border-gray-200">
                <div className="mb-3 flex items-center justify-between px-1 border-b border-gray-300 pb-2">
                  <h3 className="font-bold text-gray-700">{statusColuna}</h3>
                  <span className="rounded-full bg-amber-200 px-2.5 py-0.5 text-xs font-bold text-amber-900 shadow-sm">
                    {pedidosNaColuna.length}
                  </span>
                </div>

                <div className="flex-1 space-y-3 overflow-y-auto">
                  {carregando ? (
                     <div className="mt-4 animate-pulse text-center text-sm text-gray-400">Sincronizando...</div>
                  ) : pedidosNaColuna.length === 0 ? (
                    <div className="rounded-lg border-2 border-dashed border-gray-300 py-8 text-center text-xs font-medium text-gray-400">
                      Nenhum Pedido
                    </div>
                  ) : (
                    pedidosNaColuna.map((pedido) => (
                      <div key={pedido.id} className="relative rounded-lg border-l-4 bg-white p-4 shadow-sm transition hover:shadow-md border border-gray-100" style={{ borderLeftColor: pedido.cor_hexadecimal }}>
                        
                        <div className="mb-2">
                          <p className="line-clamp-1 text-base font-black text-gray-900">{pedido.dados_encomenda.cliente_nome}</p>
                          <p className="mt-1 text-sm font-bold text-green-700">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(pedido.valor_total)}
                          </p>
                        </div>
                        
                        <div className="mb-3 line-clamp-2 rounded bg-amber-50 border border-amber-100 p-2 text-xs text-amber-900 font-medium">
                          {pedido.dados_encomenda.descricao_produto}
                        </div>

                        <div className="mb-3 flex items-center gap-1.5 text-xs">
                          <span className={`px-2 py-0.5 rounded font-bold ${pedido.dados_encomenda.status_pagamento === 'Pendente' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                            {pedido.dados_encomenda.status_pagamento}
                          </span>
                        </div>
                        
                        <div className="flex items-center justify-between border-t border-gray-100 pt-3">
                          <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">Vendedor: {pedido.auditoria.criado_por_nome}</span>
                          
                          <button 
                            onClick={() => lidarComWhatsAppVIP(pedido)}
                            className="flex items-center gap-1.5 rounded-md border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700 transition hover:bg-amber-100 active:bg-amber-200"
                            title="Avisar Cliente VIP via WhatsApp"
                          >
                            <span>📱</span> Notificar
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

      <ModalNovaAssinatura aberto={modalAberto} aoFechar={() => setModalAberto(false)} />
    </div>
  );
}
