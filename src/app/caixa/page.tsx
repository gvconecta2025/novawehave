'use client';

import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { bancoDeDados } from '@/lib/firebase/config';
import { useAuthStore } from '@/store/useAuthStore';
import ModalFechamento from '@/components/modulos/caixa/ModalFechamento';
import AppLayoutWrapper from '@/components/global/AppLayoutWrapper';

interface ComandaPendente {
  id: string; valor_total: number; fluxo_operacional: string; cor_hexadecimal: string; status_atual: string;
  itens?: Array<{ nome: string; quantidade: number }>;
  dados_garantia?: { produto_defeito: string; motivo_troca: string; acao_imediata: string; };
  dados_os?: { cliente_nome: string; telefone: string; modelo_aparelho: string; relato_defeito: string; tecnico_id: string | null; };
  auditoria: { criado_por_nome: string; criado_em: any; };
}

export default function PainelCaixa() {
  const { usuarioDb } = useAuthStore();
  const [comandas, setComandas] = useState<ComandaPendente[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [modalFechamentoAberto, setModalFechamentoAberto] = useState(false);

  useEffect(() => {
    const q = query(collection(bancoDeDados, 'comandas'), where('status_atual', 'in', ['Aguardando Caixa', 'Aguardando Estorno Caixa', 'Aguardando NFS-e']));
    const desinscrever = onSnapshot(
      q,
      (snap) => {
        const dados = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as ComandaPendente[];
        dados.sort((a, b) => {
          const tA = typeof a.auditoria?.criado_em?.toMillis === 'function' ? a.auditoria.criado_em.toMillis() : 0;
          const tB = typeof b.auditoria?.criado_em?.toMillis === 'function' ? b.auditoria.criado_em.toMillis() : 0;
          return tA - tB; 
        });
        setComandas(dados); setCarregando(false);
      },
      (err) => { setErro('Falha ao conectar com a fila de comandas.'); setCarregando(false); }
    );
    return () => desinscrever();
  }, []);

  const lidarComProcessamento = async (id: string, fluxo_operacional: string, status_atual: string) => {
    if (!confirm(`Confirmar processamento de ${fluxo_operacional}?`)) return;
    try {
      await updateDoc(doc(bancoDeDados, 'comandas', id), { status_atual: 'Faturado/Concluído', 'auditoria.faturado_por': usuarioDb?.nome_completo || 'Oculto', 'auditoria.faturado_em': serverTimestamp() });
      alert('✅ Baixa realizada!');
    } catch (err) { alert('⚠️ Falha crítica ao dar baixa.'); }
  };

  return (
    <AppLayoutWrapper>
      <div className="flex min-h-full flex-col p-6 md:p-8">
        <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
          <div><h1 className="text-3xl font-black text-gray-900">Painel Caixa & Financeiro</h1><p className="text-gray-500 mt-1">Fila Operacional - NFe, NFS-e e Devoluções</p></div>
          <button onClick={() => setModalFechamentoAberto(true)} className="flex items-center gap-2 rounded-xl bg-gray-900 px-6 py-3 font-bold text-white shadow-md hover:bg-black transition"><span>🔒</span> Fechar Turno</button>
        </header>

        {erro && <div className="mb-6 shrink-0 rounded-xl border-l-4 border-red-500 bg-red-50 p-4 font-semibold text-red-700 shadow-sm">{erro}</div>}

        <div className="flex-1 rounded-xl bg-white p-6 shadow-sm border border-gray-200 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between mb-6 border-b border-gray-100 pb-4 shrink-0"><h2 className="text-xl font-bold">Operações Pendentes</h2><span className="rounded bg-gray-800 px-3 py-1 text-sm font-bold text-white">{comandas.length} na Fila</span></div>
          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
            {carregando ? <div className="flex h-40 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div></div> : comandas.length === 0 ? <div className="flex h-64 flex-col items-center justify-center text-gray-400"><span className="text-5xl mb-3">✅</span><p className="font-semibold">Caixa Livre!</p></div> : (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {comandas.map((c) => {
                  const isEstorno = c.status_atual === 'Aguardando Estorno Caixa';
                  const isServico = c.status_atual === 'Aguardando NFS-e';
                  return (
                    <div key={c.id} className="flex flex-col rounded-xl border bg-white shadow-sm hover:-translate-y-1 transition-transform overflow-hidden" style={{ borderColor: c.cor_hexadecimal }}>
                      <div className="px-4 py-3 text-white" style={{ backgroundColor: c.cor_hexadecimal }}><div className="flex justify-between items-center mb-1"><span className="text-xs font-black uppercase">{c.fluxo_operacional}</span></div><div className="text-2xl font-black">{isEstorno ? 'DEVOLUÇÃO' : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(c.valor_total || 0)}</div></div>
                      <div className="p-4 flex-1">
                        <div className="mb-4 border-b border-gray-100 pb-2"><p className="text-xs text-gray-400 font-semibold uppercase">{isServico ? 'Técnico' : 'Operador'}</p><p className="text-sm font-bold">{c.auditoria?.criado_por_nome || 'Desconhecido'}</p></div>
                        {isEstorno ? <div className="space-y-2 bg-red-50 p-2 rounded text-xs"><p>Produto: {c.dados_garantia?.produto_defeito}</p><p>Ação: {c.dados_garantia?.acao_imediata}</p></div> : isServico ? <div className="space-y-2 bg-purple-50 p-2 rounded text-xs"><p>Aparelho: {c.dados_os?.modelo_aparelho}</p><p>Defeito: {c.dados_os?.relato_defeito}</p></div> : <div className="space-y-1 max-h-32 overflow-y-auto">{c.itens?.map((i, idx) => <p key={idx} className="text-sm border-l-2 border-gray-200 pl-2">{i.quantidade}x {i.nome}</p>)}</div>}
                      </div>
                      <div className="p-4 bg-gray-50 border-t border-gray-100"><button onClick={() => lidarComProcessamento(c.id, c.fluxo_operacional, c.status_atual)} className={`w-full py-3 text-sm font-bold text-white rounded transition ${isEstorno ? 'bg-red-600' : isServico ? 'bg-purple-600' : 'bg-blue-600'}`}>{isEstorno ? 'Processar Reversa' : isServico ? 'Emitir NFS-e' : 'Processar NFe'}</button></div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
        <ModalFechamento aberto={modalFechamentoAberto} aoFechar={() => setModalFechamentoAberto(false)} />
      </div>
    </AppLayoutWrapper>
  );
}
