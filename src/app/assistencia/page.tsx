'use client';

import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where, doc, updateDoc } from 'firebase/firestore';
import { bancoDeDados } from '@/lib/firebase/config';
import { useAuthStore } from '@/store/useAuthStore';
import ModalNovaOS from '@/components/modulos/assistencia/ModalNovaOS';
import AppLayoutWrapper from '@/components/global/AppLayoutWrapper';
import Link from 'next/link';

// Interfaces e constantes omitidas no boilerplate visual (idênticas)
interface OrdemServico { id: string; status_atual: string; cor_hexadecimal: string; dados_os: any; auditoria: any; }
const STATUS_KANBAN = ['Entrada/Check-list', 'Orçamento Pendente', 'Aprovado/Em Conserto', 'Pronto para Retirada'];

export default function WorkspaceAssistencia() {
  const { usuarioAuth, perfilRbac, carregando: authCarregando } = useAuthStore();
  const [ordensServico, setOrdensServico] = useState<OrdemServico[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [modalAberto, setModalAberto] = useState(false);

  const acessoPermitido = ['Master', 'Supervisor', 'Admin/Dev', 'Técnicos Credenciados'].includes(perfilRbac || '');

  useEffect(() => {
    if (authCarregando || !acessoPermitido) { if (!authCarregando && !acessoPermitido) setCarregando(false); return; }
    const un = onSnapshot(query(collection(bancoDeDados, 'comandas'), where('fluxo_operacional', '==', 'Assistência Técnica')), (snap) => {
      let dados = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as OrdemServico[];
      if (perfilRbac === 'Técnicos Credenciados' && usuarioAuth) dados = dados.filter(os => os.dados_os?.tecnico_id === null || os.dados_os?.tecnico_id === usuarioAuth.uid);
      setOrdensServico(dados); setCarregando(false);
    }, (err) => { setErro('Falha de comunicação.'); setCarregando(false); });
    return () => un();
  }, [acessoPermitido, authCarregando, perfilRbac, usuarioAuth]);

  if (authCarregando) return <div className="flex h-screen items-center justify-center bg-gray-50"><div className="h-8 w-8 animate-spin rounded-full border-4 border-purple-600 border-t-transparent"></div></div>;
  if (!acessoPermitido) return <div className="flex h-screen w-full items-center justify-center bg-gray-100 p-8"><div className="flex max-w-md flex-col items-center"><span className="mb-4 text-6xl">⛔</span><h1 className="text-2xl font-black">Acesso Restrito</h1><Link href="/pdv" className="mt-6 rounded bg-purple-600 px-6 py-2.5 font-bold text-white">Voltar</Link></div></div>;

  return (
    <AppLayoutWrapper>
      <div className="flex min-h-full flex-col p-6 md:p-8">
        <header className="mb-6 shrink-0 flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-xl border border-purple-200 bg-purple-50 p-5 shadow-sm">
          <div><h1 className="text-2xl font-black text-purple-900">We Have Resolve</h1><p className="text-sm text-purple-700 mt-1">SLA e Rastreabilidade</p></div>
          <button onClick={() => setModalAberto(true)} className="flex items-center gap-2 rounded-xl bg-purple-600 px-6 py-3 font-bold text-white shadow-md hover:bg-purple-700 transition"><span>➕</span> Nova OS</button>
        </header>

        {erro && <div className="mb-4 shrink-0 rounded-xl border-l-4 border-red-500 bg-red-100 p-4 font-semibold text-red-700">{erro}</div>}

        <div className="flex-1 overflow-x-auto pb-4 custom-scrollbar">
          <div className="flex min-w-max gap-6 h-full">
            {STATUS_KANBAN.map((statusColuna) => {
              const osNaColuna = ordensServico.filter(os => os.status_atual === statusColuna);
              return (
                <div key={statusColuna} className="flex h-full w-[340px] flex-col rounded-xl border border-gray-200 bg-gray-200/50 p-3 shadow-inner">
                  <div className="mb-3 flex items-center justify-between border-b border-gray-300 pb-2 shrink-0"><h3 className="font-bold">{statusColuna}</h3><span className="rounded-full bg-purple-200 px-2.5 py-0.5 text-xs font-bold text-purple-800">{osNaColuna.length}</span></div>
                  <div className="flex-1 space-y-4 overflow-y-auto pr-1 custom-scrollbar">
                    {carregando ? <div className="text-center text-xs mt-4 animate-pulse">Sincronizando...</div> : osNaColuna.length === 0 ? <div className="py-8 text-center text-xs text-gray-400 border-2 border-dashed border-gray-300 rounded-lg">Fila Vazia</div> : osNaColuna.map((os) => (
                      <div key={os.id} className="rounded-lg border-l-4 bg-white p-4 shadow-sm border border-gray-100" style={{ borderLeftColor: os.cor_hexadecimal }}>
                        <div className="mb-2"><p className="text-sm font-black line-clamp-1">{os.dados_os?.cliente_nome}</p><p className="text-xs font-bold text-purple-700">{os.dados_os?.modelo_aparelho}</p></div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <ModalNovaOS aberto={modalAberto} aoFechar={() => setModalAberto(false)} />
      </div>
    </AppLayoutWrapper>
  );
}
