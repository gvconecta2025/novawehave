'use client';

import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { bancoDeDados } from '@/lib/firebase/config';
import { useAuthStore } from '@/store/useAuthStore';
import ModalFechamento from '@/components/modulos/caixa/ModalFechamento';
import MenuLateral from '@/components/modulos/pdv/MenuLateral';

interface ComandaPendente {
  id: string;
  valor_total: number;
  fluxo_operacional: string;
  cor_hexadecimal: string;
  status_atual: string;
  itens?: Array<{ nome: string; quantidade: number }>;
  dados_garantia?: {
    produto_defeito: string;
    motivo_troca: string;
    acao_imediata: string;
  };
  dados_os?: {
    cliente_nome: string;
    telefone: string;
    modelo_aparelho: string;
    relato_defeito: string;
    tecnico_id: string | null;
  };
  auditoria: {
    criado_por_nome: string;
    criado_em: any;
  };
}

export default function PainelCaixa() {
  const { usuarioDb } = useAuthStore();
  const [comandas, setComandas] = useState<ComandaPendente[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [modalFechamentoAberto, setModalFechamentoAberto] = useState(false);

  useEffect(() => {
    const q = query(
      collection(bancoDeDados, 'comandas'),
      where('status_atual', 'in', ['Aguardando Caixa', 'Aguardando Estorno Caixa', 'Aguardando NFS-e'])
    );

    const desinscrever = onSnapshot(
      q,
      (snapshot) => {
        const dados = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as ComandaPendente[];

        dados.sort((a, b) => {
          const tempoA = typeof a.auditoria?.criado_em?.toMillis === 'function' ? a.auditoria.criado_em.toMillis() : 0;
          const tempoB = typeof b.auditoria?.criado_em?.toMillis === 'function' ? b.auditoria.criado_em.toMillis() : 0;
          return tempoA - tempoB; 
        });

        setComandas(dados);
        setCarregando(false);
      },
      (err) => {
        console.error('[ERRO FILA CAIXA]', err);
        setErro('Falha ao conectar com a fila de comandas do Caixa.');
        setCarregando(false);
      }
    );

    return () => desinscrever();
  }, []);

  const lidarComProcessamento = async (id: string, fluxo_operacional: string, status_atual: string) => {
    if (!confirm(`Confirmar o processamento fiscal de ${fluxo_operacional}? A comanda sairá da fila.`)) return;
    
    try {
      const comandaRef = doc(bancoDeDados, 'comandas', id);
      await updateDoc(comandaRef, {
        status_atual: 'Faturado/Concluído',
        'auditoria.faturado_por': usuarioDb?.nome_completo || 'Operador Desconhecido',
        'auditoria.faturado_em': serverTimestamp()
      });
      alert('✅ Baixa realizada com sucesso!');
    } catch (err) {
      console.error('[ERRO BAIXA CAIXA]', err);
      alert('⚠️ Falha crítica ao dar baixa na comanda. Verifique a rede.');
    }
  };

  return (
    <>
      <MenuLateral />
      <div className="flex h-screen w-full flex-col bg-gray-100 p-8 pt-20 lg:pt-8 lg:pl-24 font-sans overflow-hidden transition-all">
        
        <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-gray-900">Painel Caixa & Financeiro</h1>
            <p className="text-gray-500 mt-1">Fila Operacional - Emissão de NFe, NFS-e e Notas de Devolução (Bling)</p>
          </div>
          
          <button 
            onClick={() => setModalFechamentoAberto(true)}
            className="flex items-center gap-2 rounded bg-gray-900 px-6 py-3 font-bold text-white shadow-md transition hover:bg-black active:scale-95"
          >
            <span>🔒</span> Fechar Turno
          </button>
        </header>

        {erro && (
          <div className="mb-4 w-full rounded border-l-4 border-red-500 bg-red-100 p-4 font-semibold text-red-700 shadow-sm">
            {erro}
          </div>
        )}

        <div className="flex-1 overflow-x-auto rounded-xl bg-white p-6 shadow-inner border border-gray-200 flex flex-col">
          <div className="flex items-center justify-between mb-6 border-b pb-4">
            <h2 className="text-xl font-bold text-gray-800">Operações Pendentes</h2>
            <span className="rounded bg-gray-800 px-3 py-1 text-sm font-bold text-white shadow-sm">
              {comandas.length} na Fila
            </span>
          </div>

          <div className="flex-1 overflow-y-auto pr-2">
            {carregando ? (
              <div className="flex h-40 items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
              </div>
            ) : comandas.length === 0 ? (
              <div className="flex h-64 flex-col items-center justify-center text-gray-400">
                <span className="text-5xl mb-3">✅</span>
                <p className="font-semibold text-gray-600">Caixa Livre!</p>
                <p className="text-sm">Nenhuma operação aguardando processamento.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 items-start">
                {comandas.map((comanda) => {
                  const isEstorno = comanda.status_atual === 'Aguardando Estorno Caixa';
                  const isServico = comanda.status_atual === 'Aguardando NFS-e';

                  return (
                    <div 
                      key={comanda.id}
                      className="flex flex-col rounded-xl border bg-white shadow-md transition-transform hover:-translate-y-1 overflow-hidden"
                      style={{ borderColor: comanda.cor_hexadecimal }}
                    >
                      <div className="px-4 py-3 text-white" style={{ backgroundColor: comanda.cor_hexadecimal }}>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-xs font-black uppercase tracking-wider">{comanda.fluxo_operacional}</span>
                          {isEstorno && <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded font-bold uppercase">Urgente</span>}
                          {isServico && <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded font-bold uppercase">Serviço</span>}
                        </div>
                        <div className="text-2xl font-black">
                          {isEstorno ? 'DEVOLUÇÃO' : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(comanda.valor_total || 0)}
                        </div>
                      </div>

                      <div className="p-4 flex-1">
                        <div className="mb-4 border-b border-gray-100 pb-2">
                          <p className="text-xs text-gray-400 font-semibold uppercase">
                            {isServico ? 'Técnico Responsável' : 'Operador / Vendedor'}
                          </p>
                          <p className="text-sm text-gray-800 font-bold">{comanda.auditoria?.criado_por_nome || 'Desconhecido'}</p>
                        </div>
                        
                        {isEstorno ? (
                          <div className="space-y-2 bg-red-50 p-2 rounded border border-red-100">
                            <p className="text-xs font-bold text-red-900">Produto: <span className="font-medium">{comanda.dados_garantia?.produto_defeito || 'N/A'}</span></p>
                            <p className="text-xs font-bold text-red-900">Ação: <span className="font-medium">{comanda.dados_garantia?.acao_imediata || 'N/A'}</span></p>
                            <p className="text-xs font-bold text-red-900">Motivo: <span className="font-medium italic">"{comanda.dados_garantia?.motivo_troca || 'Sem motivo detalhado'}"</span></p>
                          </div>
                        ) : isServico ? (
                          <div className="space-y-2 bg-purple-50 p-3 rounded border border-purple-100">
                            <p className="text-xs font-bold text-purple-900">Cliente: <span className="font-medium">{comanda.dados_os?.cliente_nome || 'N/A'}</span></p>
                            <p className="text-xs font-bold text-purple-900">Aparelho: <span className="font-medium">{comanda.dados_os?.modelo_aparelho || 'N/A'}</span></p>
                            <p className="text-xs font-bold text-purple-900 mt-1 pt-1 border-t border-purple-200">
                              Serviço / Defeito Resolvido: <br/>
                              <span className="font-medium italic text-gray-700">"{comanda.dados_os?.relato_defeito || 'Sem relato detalhado'}"</span>
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-1 max-h-32 overflow-y-auto pr-1">
                            {comanda.itens?.map((item, index) => (
                              <p key={index} className="text-sm text-gray-600 border-l-2 border-gray-200 pl-2">
                                {item.quantidade}x {item.nome}
                              </p>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="p-4 bg-gray-50 border-t border-gray-100">
                        <button 
                          onClick={() => lidarComProcessamento(comanda.id, comanda.fluxo_operacional, comanda.status_atual)}
                          className={`w-full flex items-center justify-center gap-2 rounded py-3 text-sm font-bold text-white transition shadow-sm ${
                            isEstorno ? 'bg-red-600 hover:bg-red-700' : 
                            isServico ? 'bg-purple-600 hover:bg-purple-700' : 
                            'bg-blue-600 hover:bg-blue-700'
                          }`}
                        >
                          <span>{isEstorno ? '⚠️' : '🧾'}</span> 
                          {isEstorno ? 'Processar Reversa' : isServico ? 'Emitir NFS-e (Serviço)' : 'Processar NFe'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <ModalFechamento aberto={modalFechamentoAberto} aoFechar={() => setModalFechamentoAberto(false)} />
      </div>
    </>
  );
}
